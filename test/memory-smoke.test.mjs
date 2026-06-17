import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const script = path.join(root, "skills", "project-memory", "scripts", "memory.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "project-memory-skill-"));

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: tmp,
    encoding: "utf8",
    ...options,
  });
  assert.equal(
    result.status,
    0,
    `command failed: ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result.stdout.trim();
}

try {
  assert.equal(run(["path"]), "none");
  assert.equal(run(["list"]), "(no memory store here)");
  assert.match(run(["help"]), /^Usage: node scripts\/memory\.mjs <command>/);

  const storePath = run(["init"]);
  assert.equal(storePath, path.join(fs.realpathSync(tmp), ".agent-memory"));
  assert.ok(fs.existsSync(path.join(tmp, ".agent-memory", "memory.md")));

  assert.equal(
    run([
      "add",
      "--title",
      "Queue checkpoint",
      "--type",
      "decision",
      "--tags",
      "queue,checkpoint",
      "--body",
      "Use the stable queue checkpoint.",
    ]),
    "added #1",
  );

  assert.match(run(["list"]), /\[#1\] Queue checkpoint .* decision .* queue,checkpoint/);
  assert.match(run(["show", "1"]), /Use the stable queue checkpoint\./);
  assert.match(run(["search", "checkpoint"]), /Queue checkpoint/);

  assert.equal(run(["update", "1", "--body", "Updated durable detail."]), "updated #1");
  assert.match(run(["show", "1"]), /Updated durable detail\./);

  assert.equal(run(["remove", "1"]), "removed #1");
  assert.equal(run(["list"]), "");

  console.log("memory-smoke: ok");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
