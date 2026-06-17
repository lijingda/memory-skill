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

function runFail(args, options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: tmp,
    encoding: "utf8",
    ...options,
  });
  assert.notEqual(result.status, 0, `command unexpectedly succeeded: ${args.join(" ")}\nstdout:\n${result.stdout}`);
  return result.stderr.trim();
}

try {
  assert.match(run(["help"]), /^Usage: node scripts\/memory\.mjs <command>/);
  assert.equal(run(["path"]), path.join(fs.realpathSync(tmp), ".agent-memory"));
  assert.ok(fs.existsSync(path.join(tmp, ".agent-memory", "memory.md")));
  assert.equal(run(["list"]), "");

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
      "--stdin",
    ], { input: "Use the stable queue checkpoint with `literal` and $VALUE.\n" }),
    "added #1",
  );

  assert.match(run(["list"]), /\[#1\] Queue checkpoint .* decision .* queue,checkpoint/);
  assert.match(run(["show", "1"]), /Use the stable queue checkpoint with `literal` and \$VALUE\./);
  assert.match(run(["search", "checkpoint"]), /Queue checkpoint/);

  assert.equal(run(["update", "1", "--stdin"], { input: "Updated durable detail.\n" }), "updated #1");
  assert.match(run(["show", "1"]), /Updated durable detail\./);

  const fileEntry = path.join(tmp, "memory-entry.md");
  fs.writeFileSync(fileEntry, "File-backed detail.\nSecond line with `literal` and $VALUE.\n", "utf8");
  assert.equal(run(["add", "--title", "File source", "--file", fileEntry]), "added #2");
  assert.match(run(["show", "2"]), /Second line with `literal` and \$VALUE\./);

  assert.match(
    runFail(["add", "--title", "Legacy body", "--body", "Unsafe text."]),
    /add: --body was removed; use --stdin or --file/,
  );

  assert.equal(run(["remove", "1"]), "removed #1");
  assert.equal(run(["remove", "2"]), "removed #2");
  assert.equal(run(["list"]), "");

  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "project-memory-parent-"));
  const child = path.join(parent, "child");
  fs.mkdirSync(child);
  const parentResult = spawnSync(process.execPath, [script, "add", "--title", "Parent only", "--stdin"], {
    cwd: parent,
    encoding: "utf8",
    input: "Parent memory.\n",
  });
  assert.equal(parentResult.status, 0, parentResult.stderr);
  const childList = spawnSync(process.execPath, [script, "list"], {
    cwd: child,
    encoding: "utf8",
  });
  assert.equal(childList.status, 0, childList.stderr);
  assert.equal(childList.stdout.trim(), "");
  assert.ok(fs.existsSync(path.join(child, ".agent-memory", "memory.md")));
  assert.doesNotMatch(fs.readFileSync(path.join(child, ".agent-memory", "memory.md"), "utf8"), /Parent only/);
  fs.rmSync(parent, { recursive: true, force: true });

  console.log("memory-smoke: ok");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
