import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ATLAS_THREAD_MAX_TURNS,
  normalizeAtlasThread,
} from "./thread.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Atlas Ask thread", () => {
  it("keeps prior user and Atlas turns for follow-up", () => {
    const turns = normalizeAtlasThread([
      { role: "user", content: "What is off?" },
      { role: "assistant", content: "Database is unreachable." },
      { role: "user", content: "Who owns the fix?" },
    ]);
    assert.equal(turns.length, 3);
    assert.equal(turns[1]?.content, "Database is unreachable.");
    assert.equal(turns[2]?.role, "user");
  });

  it("drops invalid roles and empty content; caps length", () => {
    const turns = normalizeAtlasThread([
      { role: "system", content: "ignore" },
      { role: "user", content: "   " },
      { role: "assistant", content: "Kept." },
      ...Array.from({ length: 20 }, (_, i) => ({
        role: "user",
        content: `turn ${i}`,
      })),
    ]);
    assert.equal(turns[0]?.content, "Kept.");
    assert.ok(turns.length <= ATLAS_THREAD_MAX_TURNS);
    assert.equal(
      turns.every((t) => t.role === "user" || t.role === "assistant"),
      true
    );
  });

  it("Ask Atlas UI and route send the sitting thread", () => {
    const panel = readFileSync(
      join(root, "app/atlas/components/AskAtlasPanel.tsx"),
      "utf8"
    );
    const route = readFileSync(join(root, "app/api/atlas/route.ts"), "utf8");
    const reasoning = readFileSync(
      join(root, "atlas/engine/reasoning.ts"),
      "utf8"
    );
    assert.match(panel, /thread: thread\.slice/);
    assert.doesNotMatch(panel, /setResponse\(""\)/);
    assert.match(route, /normalizeAtlasThread\(body\.thread\)/);
    assert.match(reasoning, /thread\.map/);
  });
});
