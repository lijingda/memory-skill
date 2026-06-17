# project-memory skill

A project-level memory skill for coding agents.

`project-memory` gives an agent a small, durable place to store knowledge that
should survive across sessions but does not belong in source code: hard-won
debugging lessons, non-obvious project conventions, decisions and their reasons,
and local commands that are easy to forget.

The skill is intentionally conservative. It tells the agent to read memory at
the start of work, write only durable and non-obvious facts, update stale entries
when code proves them wrong, and avoid bypassing the bundled script.

## Install

Install with the `skills` CLI:

```bash
npx skills add https://github.com/lijingda/memory-skill --skill project-memory
```

To list available skills before installing:

```bash
npx skills add https://github.com/lijingda/memory-skill --list
```

To install specifically for Codex:

```bash
npx skills add https://github.com/lijingda/memory-skill --skill project-memory --agent codex
```

Manual fallback: copy or symlink `skills/project-memory` into the skills
directory used by your agent runtime.

## What It Does

`project-memory` teaches an agent when to read, write, update, and remove
project-level memory entries. Entries are stored per project in
`.agent-memory/memory.md`; that store is intentionally ignored by git.

The bundled script has no third-party dependencies and runs with Node.js:

```bash
node skills/project-memory/scripts/memory.mjs help
```

## Development

For local development in this repository, use the script from the repo root:

```bash
node skills/project-memory/scripts/memory.mjs list
```

Run the checks:

```bash
npm test
```
