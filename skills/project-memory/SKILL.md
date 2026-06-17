---
name: project-memory
description: "Project-level memory for durable, non-obvious knowledge that should survive across agent sessions: hard-won gotchas, decisions and their reasons, non-obvious conventions, personalized commands, and similar project facts. Read at the start of work and reread whenever memory may have fallen out of context after long tool loops, context compaction, or recent memory updates. Write only facts that will likely save a future session time and are not obvious from code or docs. Do not write one-off task details, obvious facts, or duplicates. Maintain entries by searching first, checking current code before edits, updating stale entries, and removing entries that are no longer meaningful. Use this skill's scripts/memory.mjs for all reads and writes."
---

# Project Memory

Project memory stores durable, non-obvious project knowledge across agent sessions. It is not always present in context, so reread it when needed instead of trusting a remembered summary. Use this skill's `scripts/memory.mjs` for all reads and writes; do not edit the memory file directly.

## When To Read

1. Read once at the start of work: run `node <skill-dir>/scripts/memory.mjs list`, then `show` any relevant entries. If `list` is empty, the current project has no memory store yet; create one with `add` when there is something worth remembering.
2. Reread whenever memory may no longer be in your working context: after long tool or reasoning loops, after context compaction or summarization, or after this session has just added or updated memory. Use `list` and `show` again instead of relying on recall.

## When To Write

Default to not writing. Before adding memory, ask: "Will a future agent be materially better because this exists?" If not, do not write it.

Worth writing: counterintuitive or time-consuming gotchas, decisions plus their rationale, non-obvious conventions, non-obvious build/test/deploy commands, and ownership or operational facts that are not clear from code.

Do not write: facts that are obvious from the repository or docs, one-off task details, guesses that may change next session, or duplicates of existing entries. Search first; if an existing entry covers the point, update that entry instead of adding a new one.

## When To Maintain

- If an entry is stale or conflicts with current code, update it.
- If an entry is no longer meaningful because the related code was removed or a decision was reversed, remove it.

Before maintaining memory, search for the relevant entry and verify the current code or docs. Treat memory as an observation from a point in time, not as guaranteed current truth. Do not update memory from memory alone.

## Script Usage

The script is `scripts/memory.mjs` inside this skill directory. Run it with Node.js:

```bash
node <skill-dir>/scripts/memory.mjs <command>
```

Pass entry bodies in one of two ways:

- `--body "text"` for short text without complicated shell characters.
- `--file <path>` for multiline text or content containing quotes, backticks, `$`, or code snippets. The file is read as-is and avoids shell escaping problems.

Commands:

- `add --title "Title" [--type T] [--tags a,b] --body "Text" | --file <path>` creates the memory store on first use.
- `list` lists entries; `show <id>` prints one entry; `search <query>` searches all entry headers and bodies.
- `update <id> --body "Text" | --file <path>` replaces an entry body.
- `remove <id>` deletes an entry.

Argument order is flexible. For example, `--body "..." --title "..."` is valid.

## Memory Format

Each memory entry uses this shape:

```markdown
## [id] Title · type · tags · date
Body text goes here.
```

Example:

```markdown
## [3] subscriptions table is append-only · gotcha · db,postgres · 2026-05-02
The latest subscription row is selected by MAX(version), not latest created_at. Using created_at can pick an older version.
```

- `id` is assigned automatically and is not reused or renumbered after deletion.
- Do not write body lines that start with `## [number]`; the parser will treat them as new entry headers. Refer to other entries as `[#3]` or `entry 3` instead.
- Suggested types: `gotcha`, `decision`, `convention`, `command`, `reference`, `note`. Use judgment; the script does not enforce types.
- Tags are comma-separated and are useful for `search`.
- Dates are context for judgment, not an expiration rule. If an old entry conflicts with current code, update or remove it.
