# memory-skill

Project-level durable memory for coding agents.

This repository follows the common Agent Skills shape used by public skill
collections such as `anthropics/skills`: a repository-level README and one
self-contained skill directory with `SKILL.md`, optional metadata, and bundled
scripts.

## Structure

```text
skills/
  memory/
    SKILL.md
    agents/openai.yaml
    scripts/memory.mjs
test/
  memory-smoke.test.mjs
  validate-skill.mjs
```

## Skill

`skills/memory` teaches an agent when to read, write, update, and remove
project-level memory entries. Entries are stored per project in
`.agent-memory/memory.md`; that store is intentionally ignored by git.

The script has no third-party dependencies and runs with Node.js:

```bash
node skills/memory/scripts/memory.mjs help
```

## Checks

```bash
npm test
python3 /Users/admin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/memory
```
