import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const routePath = new URL(
  "../../app/api/readiness/shadow/route.ts",
  import.meta.url
);
const serverPath = new URL("./shadow-server.ts", import.meta.url);
const sessionPath = new URL("../session.ts", import.meta.url);

describe("readiness shadow route boundary", () => {
  it("authenticates, allowlists, defers work, and returns only a generic receipt", async () => {
    const source = await readFile(routePath, "utf8");
    assert.match(source, /requireApiUser\(\)/);
    assert.match(source, /shadowEvaluationAllowed\(gate\.userId\)/);
    assert.match(source, /after\(async \(\) =>/);
    assert.match(source, /\{ accepted: true \}.*status: 202/s);
    assert.doesNotMatch(source, /overallBand|primaryFocusSignal|signals:/);
  });

  it("loads only the owned completed session and its report", async () => {
    const source = await readFile(serverPath, "utf8");
    assert.match(source, /\.from\("practice_sessions"\)/);
    assert.match(source, /\.eq\("user_id", input\.userId\)/);
    assert.match(source, /if \(!session\?\.completed_at\)/);
    assert.match(source, /\.from\("session_reports"\)/);
    assert.doesNotMatch(source, /living_profiles|coach_memory|listSessionReports/);
  });

  it("uses strict JSON schema output and never asks the model for the band", async () => {
    const source = await readFile(serverPath, "utf8");
    assert.match(source, /type: "json_schema"/);
    assert.match(source, /strict: true/);
    assert.doesNotMatch(source, /modelOverallBand|modelBand/);
  });

  it("queues evaluation after the report without changing a member-facing value", async () => {
    const source = await readFile(sessionPath, "utf8");
    const report = source.indexOf("await saveSessionReport(report)");
    const shadow = source.indexOf("queueShadowReadinessEvaluation(completed.id)");
    assert.ok(report >= 0 && shadow > report);
    assert.doesNotMatch(source, /return.*readiness/i);
  });
});
