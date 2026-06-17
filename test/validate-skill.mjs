import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillDir = path.join(root, "skills", "project-memory");
const skillFile = path.join(skillDir, "SKILL.md");
const scriptFile = path.join(skillDir, "scripts", "memory.mjs");
const agentFile = path.join(skillDir, "agents", "openai.yaml");

const skill = fs.readFileSync(skillFile, "utf8");
assert.match(skill, /^---\n[\s\S]+?\n---\n/, "SKILL.md must start with YAML frontmatter");
assert.match(skill, /^name: project-memory$/m, "SKILL.md must declare the project-memory skill name");
assert.match(skill, /^description: .+/m, "SKILL.md must include a description");
assert.ok(fs.existsSync(scriptFile), "memory.mjs must live under skill scripts/");
assert.ok(fs.existsSync(agentFile), "agents/openai.yaml must exist");

const script = fs.readFileSync(scriptFile, "utf8");
assert.match(script, /^#!\/usr\/bin\/env node/, "memory.mjs must be directly executable");
assert.match(script, /STORE_DIR = "\.agent-memory"/, "memory store directory must remain project-scoped");

console.log("validate-skill: ok");
