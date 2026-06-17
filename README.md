# project-memory skill

A project-level memory skill for coding agents.

`project-memory` gives an agent a small, durable place to store knowledge that
should survive across sessions but does not belong in source code: hard-won
debugging lessons, non-obvious project conventions, decisions and their reasons,
and local commands that are easy to forget.

The skill is intentionally conservative. It tells the agent to read memory at
the start of work, write only durable and non-obvious facts, update stale entries
when code proves them wrong, and avoid bypassing the bundled script.

## Structure

```text
skills/
  project-memory/
    SKILL.md
    agents/openai.yaml
    scripts/memory.mjs
test/
  memory-smoke.test.mjs
  validate-skill.mjs
```

## Skill

`skills/project-memory` teaches an agent when to read, write, update, and remove
project-level memory entries. Entries are stored per project in
`.agent-memory/memory.md`; that store is intentionally ignored by git.

The script has no third-party dependencies and runs with Node.js:

```bash
node skills/project-memory/scripts/memory.mjs help
```

## Install

Install by copying or symlinking `skills/project-memory` into the skills
directory used by your agent runtime. The folder is self-contained: `SKILL.md`
contains the agent instructions, `agents/openai.yaml` contains UI metadata, and
`scripts/memory.mjs` performs all reads and writes.

For local development in this repository, use the script from the repo root:

```bash
node skills/project-memory/scripts/memory.mjs list
```

## Checks

```bash
npm test
```
