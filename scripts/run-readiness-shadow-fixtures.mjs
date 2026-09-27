import OpenAI from "openai";
import {
  buildShadowEvaluationPrompt,
  SHADOW_OUTPUT_JSON_SCHEMA,
} from "../lib/readiness/shadow-contract.ts";
import {
  checkShadowBoundaryFixtureOutput,
  SHADOW_BOUNDARY_FIXTURES,
} from "../lib/readiness/shadow-fixtures.ts";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_READINESS_MODEL?.trim();

if (!apiKey || !model) {
  console.error(
    "Set OPENAI_API_KEY and OPENAI_READINESS_MODEL before running fixtures."
  );
  process.exit(1);
}

const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 });
const results = [];

for (const fixture of SHADOW_BOUNDARY_FIXTURES) {
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
    let raw;
    try {
      raw = JSON.parse(response.output_text);
    } catch {
      raw = response.output_text;
    }
    const checked = checkShadowBoundaryFixtureOutput(fixture, raw);
    results.push({
      id: fixture.id,
      category: fixture.category,
      passed: checked.ok,
      code: checked.ok ? null : checked.code,
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    });
  } catch {
    results.push({
      id: fixture.id,
      category: fixture.category,
      passed: false,
      code: "MODEL_REQUEST_FAILED",
      model,
      inputTokens: null,
      outputTokens: null,
    });
  }
}

const summary = {
  requestedModel: model,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  results,
};
console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.failed === 0 ? 0 : 1;
