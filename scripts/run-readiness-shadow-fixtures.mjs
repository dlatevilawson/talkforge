import OpenAI from "openai";
import {
  buildShadowEvaluationPrompt,
  SHADOW_OUTPUT_JSON_SCHEMA,
  validateShadowModelOutput,
} from "../lib/readiness/shadow-contract.ts";
import {
  checkShadowBoundaryFixtureOutput,
  SHADOW_BOUNDARY_FIXTURES,
} from "../lib/readiness/shadow-fixtures.ts";
import {
  DEFAULT_READINESS_FIXTURE_TIMEOUT_MS,
  estimateFixtureCostUsd,
  MAX_READINESS_FIXTURE_TIMEOUT_MS,
  MIN_READINESS_FIXTURE_TIMEOUT_MS,
  parseBoundedInteger,
  READINESS_FIXTURE_RUNS,
  sanitizeOpenAIError,
  summarizeFixtureStability,
} from "../lib/readiness/fixture-diagnostics.ts";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const requestedModel = process.env.OPENAI_READINESS_MODEL?.trim();

if (!apiKey || !requestedModel) {
  console.error(
    "Set OPENAI_API_KEY and OPENAI_READINESS_MODEL=gpt-5 before running fixtures."
  );
  process.exit(1);
}
if (requestedModel !== "gpt-5") {
  console.error("This frozen validation command requires OPENAI_READINESS_MODEL=gpt-5.");
  process.exit(1);
}

let timeoutMs;
let concurrency;
try {
  timeoutMs = parseBoundedInteger(
    process.env.OPENAI_READINESS_FIXTURE_TIMEOUT_MS,
    DEFAULT_READINESS_FIXTURE_TIMEOUT_MS,
    MIN_READINESS_FIXTURE_TIMEOUT_MS,
    MAX_READINESS_FIXTURE_TIMEOUT_MS
  );
  concurrency = parseBoundedInteger(
    process.env.OPENAI_READINESS_FIXTURE_CONCURRENCY,
    2,
    1,
    3
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid fixture configuration.");
  process.exit(1);
}

function optionalRate(name) {
  const value = process.env[name]?.trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.error(`${name} must be a non-negative number.`);
    process.exit(1);
  }
  return parsed;
}

const inputRate = optionalRate("OPENAI_READINESS_INPUT_USD_PER_MILLION");
const outputRate = optionalRate("OPENAI_READINESS_OUTPUT_USD_PER_MILLION");
if ((inputRate === null) !== (outputRate === null)) {
  console.error("Set both readiness token-price variables or neither.");
  process.exit(1);
}
const costRates =
  inputRate === null || outputRate === null
    ? null
    : { inputUsdPerMillion: inputRate, outputUsdPerMillion: outputRate };

const client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });

async function evaluateFixture(run, fixture) {
  const startedAt = Date.now();
  try {
    const response = await client.responses.create({
      model: requestedModel,
      input: buildShadowEvaluationPrompt(fixture.input),
      text: {
        format: {
          type: "json_schema",
          name: "talkforge_readiness_shadow_fixture_v1",
          strict: true,
          schema: SHADOW_OUTPUT_JSON_SCHEMA,
        },
      },
    });
    let raw;
    try {
      raw = JSON.parse(response.output_text);
    } catch {
      raw = response.output_text;
    }
    const validated = validateShadowModelOutput(raw, fixture.input.transcript);
    const checked = checkShadowBoundaryFixtureOutput(fixture, raw);
    return {
      publicResult: {
        run,
        id: fixture.id,
        category: fixture.category,
        passed: checked.ok,
        code: checked.ok ? null : checked.code,
        failure: checked.ok ? null : checked.failure,
        requestedModel,
        actualModel: response.model,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        durationMs: Date.now() - startedAt,
        providerErrorClass: null,
        providerErrorType: null,
        providerErrorCode: null,
        providerStatus: null,
        providerRequestId: null,
      },
      stability: {
        id: fixture.id,
        run,
        output: validated.ok ? validated.value : null,
      },
    };
  } catch (error) {
    return {
      publicResult: {
        run,
        id: fixture.id,
        category: fixture.category,
        passed: false,
        code: "MODEL_REQUEST_FAILED",
        failure: null,
        requestedModel,
        actualModel: null,
        inputTokens: null,
        outputTokens: null,
        durationMs: Date.now() - startedAt,
        ...sanitizeOpenAIError(error),
      },
      stability: { id: fixture.id, run, output: null },
    };
  }
}

async function runFrozenPass(run) {
  const queue = [...SHADOW_BOUNDARY_FIXTURES];
  const completed = [];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const fixture = queue.shift();
        if (!fixture) return;
        completed.push(await evaluateFixture(run, fixture));
      }
    })
  );
  return completed.sort(
    (left, right) =>
      SHADOW_BOUNDARY_FIXTURES.findIndex(
        (fixture) => fixture.id === left.publicResult.id
      ) -
      SHADOW_BOUNDARY_FIXTURES.findIndex(
        (fixture) => fixture.id === right.publicResult.id
      )
  );
}

const completed = [];
for (let run = 1; run <= READINESS_FIXTURE_RUNS; run += 1) {
  completed.push(...(await runFrozenPass(run)));
}

const results = completed.map((entry) => entry.publicResult);
const stability = summarizeFixtureStability(
  completed.map((entry) => entry.stability)
);
const inputTokens = results.reduce(
  (total, result) => total + (result.inputTokens ?? 0),
  0
);
const outputTokens = results.reduce(
  (total, result) => total + (result.outputTokens ?? 0),
  0
);
const allPassed = results.every((result) => result.passed);
const actualModels = [
  ...new Set(results.map((result) => result.actualModel).filter(Boolean)),
];
const sameModelSnapshot = actualModels.length === 1;
const stabilityPass =
  stability.evaluable &&
  (stability.assessedVsNullPercent ?? 0) >= 95 &&
  (stability.exactEvidenceStrengthPercent ?? 0) >= 85 &&
  (stability.exactLevelPercent ?? 0) >= 85 &&
  (stability.withinOneLevelPercent ?? 0) === 100;

const summary = {
  requestedModel,
  actualModels,
  sameModelSnapshot,
  runCount: READINESS_FIXTURE_RUNS,
  fixtureCount: SHADOW_BOUNDARY_FIXTURES.length,
  modelCalls: results.length,
  timeoutMs,
  concurrency,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  inputTokens,
  outputTokens,
  estimatedCostUsd: estimateFixtureCostUsd(inputTokens, outputTokens, costRates),
  costRateSource: costRates ? "explicit_environment" : "not_configured",
  stability,
  stabilityPass,
  results,
};

console.log(JSON.stringify(summary, null, 2));
process.exitCode = allPassed && sameModelSnapshot && stabilityPass ? 0 : 1;
