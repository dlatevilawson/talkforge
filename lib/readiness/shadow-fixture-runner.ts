import OpenAI from "openai";
import {
  buildShadowEvaluationPrompt,
  SHADOW_OUTPUT_JSON_SCHEMA,
} from "./shadow-contract.ts";
import {
  checkShadowBoundaryFixtureOutput,
  SHADOW_BOUNDARY_FIXTURES,
} from "./shadow-fixtures.ts";

export type ShadowFixtureRunResult = {
  id: string;
  category: string;
  passed: boolean;
  code: string | null;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type ShadowFixturePassSummary = {
  requestedModel: string;
  passed: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  results: ShadowFixtureRunResult[];
};

async function evaluateFixture(
  client: OpenAI,
  model: string,
  fixture: (typeof SHADOW_BOUNDARY_FIXTURES)[number]
): Promise<ShadowFixtureRunResult> {
  try {
    const response = await client.responses.create({
      model,
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
    let raw: unknown;
    try {
      raw = JSON.parse(response.output_text);
    } catch {
      raw = response.output_text;
    }
    const checked = checkShadowBoundaryFixtureOutput(fixture, raw);
    return {
      id: fixture.id,
      category: fixture.category,
      passed: checked.ok,
      code: checked.ok ? null : checked.code,
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    };
  } catch {
    return {
      id: fixture.id,
      category: fixture.category,
      passed: false,
      code: "MODEL_REQUEST_FAILED",
      model,
      inputTokens: null,
      outputTokens: null,
    };
  }
}

export async function runReadinessBoundaryFixturePass({
  apiKey,
  model,
  concurrency = 2,
}: {
  apiKey: string;
  model: string;
  concurrency?: number;
}): Promise<ShadowFixturePassSummary> {
  const client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 0 });
  const results: ShadowFixtureRunResult[] = [];
  const pending = [...SHADOW_BOUNDARY_FIXTURES];
  const workerCount = Math.max(1, Math.min(concurrency, pending.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (pending.length > 0) {
        const fixture = pending.shift();
        if (!fixture) return;
        results.push(await evaluateFixture(client, model, fixture));
      }
    })
  );

  results.sort(
    (left, right) =>
      SHADOW_BOUNDARY_FIXTURES.findIndex((item) => item.id === left.id) -
      SHADOW_BOUNDARY_FIXTURES.findIndex((item) => item.id === right.id)
  );

  return {
    requestedModel: model,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    inputTokens: results.reduce(
      (total, result) => total + (result.inputTokens ?? 0),
      0
    ),
    outputTokens: results.reduce(
      (total, result) => total + (result.outputTokens ?? 0),
      0
    ),
    results,
  };
}
