---
name: project-memory
description: "Use for project-level memory: a durable project notebook shared across agent sessions. Read memory before starting work in a project, and read it again whenever it may have fallen out of context. Use it to remember project knowledge that is not merely one-off task state and may help future agents, including facts, decisions, conventions, commands, preferences, gotchas, and operational notes that are not obvious from code or docs. When writing, search first, update existing entries instead of duplicating, remove stale or obsolete entries, and keep entries grounded in observed or verified project context."
---

# Project Memory

Project memory stores durable, non-obvious project knowledge across agent sessions. It is not always present in context, so reread it when needed instead of trusting a remembered summary. Use this skill's `scripts/memory.mjs` for all reads and writes; do not bypass the script.

Run the script from the intended project root. If the agent runtime supports an explicit working-directory parameter, use that mechanism.

## When To Read

1. From the intended project root, read once at the start of non-trivial work: run `node <skill-dir>/scripts/memory.mjs list`, then `show` any relevant entries. If `list` prints no entries, continue with no extra setup.
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

The script is `scripts/memory.mjs` inside this skill directory. Run it with Node.js from the intended project root:

```bash
node <skill-dir>/scripts/memory.mjs <command>
```

Pass entry bodies in one of two ways. Do not pass bodies as shell arguments;
use `--stdin` or `--file` so Markdown, code, backticks, `$`, and quotes remain intact.

- `--stdin` for short or moderate content. Prefer a single-quoted heredoc so shells do not expand backticks, `$`, or quotes.
- `--file <path>` for larger prepared content or content that already exists in a file. The file is read as-is.

Recommended `--stdin` pattern:

```bash
node <skill-dir>/scripts/memory.mjs add --title "Current plan path" --type reference --tags docs --stdin <<'EOF'
The durable planning file is `docs/current-plan.md`; do not replace `$PROJECT_ROOT` before reading it.
EOF
```

Recommended `--file` pattern:

```bash
node <skill-dir>/scripts/memory.mjs update 3 --file /tmp/project-memory-entry.md
```

Commands:

- `add --title "Title" [--type T] [--tags a,b] --stdin | --file <path>` creates an entry.
- `list` lists entries; `show <id>` prints one entry; `search <query>` searches all entry headers and bodies.
- `update <id> --stdin | --file <path>` replaces an entry body.
- `remove <id>` deletes an entry.

Argument order is flexible. For example, `--stdin --title "..."` is valid.

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
