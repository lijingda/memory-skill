#!/usr/bin/env node
// memory.mjs - project-level memory for coding agents.
// Store: <project>/.agent-memory/memory.md as one Markdown file.
// Scope: walk up from process.cwd() to find the nearest .agent-memory/.
// Dependencies: Node.js built-ins only. Cross-platform. Run with `node memory.mjs <cmd>`.
import fs from "node:fs";
import path from "node:path";

const STORE_DIR = ".agent-memory";
const FILE_NAME = "memory.md";
// Entry header: ## [id] title · type · tags · date
const HEADER_RE = /^## \[(\d+)\] (.*)$/;

const TEMPLATE = `# Memory — <project>

> Project-level memory for coding agents. Read and write through memory.mjs. Store only durable, non-obvious facts.

`;

function die(msg) {
  console.error("memory: " + msg);
  process.exit(1);
}

// Walk up from cwd to find the nearest store directory. Return an absolute path or null.
function resolveStore() {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, STORE_DIR, FILE_NAME))) {
      return path.join(dir, STORE_DIR);
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null; // Reached filesystem root.
    dir = parent;
  }
}

function storeFile(store) {
  return path.join(store, FILE_NAME);
}

// Create a store in cwd if none exists. Return the store path.
function ensureStore() {
  let store = resolveStore();
  if (!store) {
    store = path.join(process.cwd(), STORE_DIR);
    fs.mkdirSync(store, { recursive: true });
  }
  const file = storeFile(store);
  if (!fs.existsSync(file)) fs.writeFileSync(file, TEMPLATE, "utf8");
  return store;
}

function readContent(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

// Parse the file into { preamble: string[], entries: [{ id, meta, headerLine, body: [] }] }.
function parse(content) {
  const lines = content.split(/\r?\n/);
  const preamble = [];
  const entries = [];
  let cur = null;
  let inPreamble = true;
  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m) {
      inPreamble = false;
      if (cur) entries.push(cur);
      cur = { id: parseInt(m[1], 10), meta: m[2], headerLine: line, body: [] };
    } else if (inPreamble) {
      preamble.push(line);
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) entries.push(cur);
  return { preamble, entries };
}

// Serialize with trailing blank lines trimmed from the preamble and one blank line between entries.
function serialize(preamble, entries) {
  const parts = preamble.slice();
  while (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
  for (const e of entries) {
    const b = e.body.slice();
    while (b.length && b[0].trim() === "") b.shift();
    while (b.length && b[b.length - 1].trim() === "") b.pop();
    parts.push("", e.headerLine, "");
    if (b.length) parts.push(...b);
  }
  parts.push(""); // Final newline.
  return parts.join("\n");
}

function nextId(entries) {
  let max = 0;
  for (const e of entries) if (e.id > max) max = e.id;
  return max + 1;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ---- commands ----

function cmdPath() {
  const store = resolveStore();
  console.log(store ? store : "none");
}

function cmdInit() {
  console.log(ensureStore());
}

function cmdAdd(args) {
  let title = "",
    type = "note",
    tags = "",
    body = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--title") title = args[++i];
    else if (a === "--type") type = args[++i];
    else if (a === "--tags") tags = args[++i];
    else if (a === "--body") {
      body = args[++i];
      if (body === undefined) die("add: --body requires a value");
    } else if (a === "--file") {
      const p = args[++i];
      if (!p) die("add: --file requires a path");
      if (!fs.existsSync(p)) die("add: file does not exist: " + p);
      body = fs.readFileSync(p, "utf8");
    } else die("add: unknown argument " + a);
  }
  if (!title) die("add: requires --title");
  if (body === null) die("add: requires --body or --file");
  body = body.replace(/\s+$/, "");
  const store = ensureStore();
  const file = storeFile(store);
  const { preamble, entries } = parse(readContent(file) || TEMPLATE);
  const id = nextId(entries);
  const headerLine = `## [${id}] ${title} · ${type} · ${tags} · ${today()}`;
  entries.push({
    id,
    meta: `${title} · ${type} · ${tags} · ${today()}`,
    headerLine,
    body: body ? body.split(/\r?\n/) : [],
  });
  fs.writeFileSync(file, serialize(preamble, entries), "utf8");
  console.log("added #" + id);
}

function cmdList() {
  const store = resolveStore();
  if (!store) {
    console.log("(no memory store here)");
    return;
  }
  const content = readContent(storeFile(store));
  if (!content) return;
  for (const e of parse(content).entries) {
    console.log(`[#${e.id}] ${e.meta}`);
  }
}

function cmdShow(args) {
  if (!args[0]) die("show: requires <id>");
  const id = parseInt(args[0], 10);
  const store = resolveStore();
  if (!store) die("show: memory store is not initialized");
  const content = readContent(storeFile(store));
  if (!content) return;
  const e = parse(content).entries.find((x) => x.id === id);
  if (!e) die("show: no entry #" + id);
  console.log(e.headerLine);
  console.log("");
  const body = e.body.slice();
  while (body.length && body[0].trim() === "") body.shift();
  console.log(body.join("\n"));
}

function cmdSearch(args) {
  if (!args[0]) die("search: requires <query>");
  const store = resolveStore();
  if (!store) die("search: memory store is not initialized");
  const content = readContent(storeFile(store));
  if (!content) return;
  let re;
  try {
    re = new RegExp(args[0], "i");
  } catch {
    re = new RegExp(args[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  let curId = "";
  let matched = false;
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(HEADER_RE);
    if (m) curId = m[1];
    if (re.test(line)) {
      matched = true;
      console.log((m ? "" : "  (#" + curId + ") ") + line);
    }
  }
  if (!matched) console.log("(no matches)");
}

function cmdUpdate(args) {
  let id = null,
    body = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--body") {
      body = args[++i];
      if (body === undefined) die("update: --body requires a value");
    } else if (a === "--file") {
      const p = args[++i];
      if (!p) die("update: --file requires a path");
      if (!fs.existsSync(p)) die("update: file does not exist: " + p);
      body = fs.readFileSync(p, "utf8");
    } else if (id === null && /^\d+$/.test(a)) {
      id = parseInt(a, 10);
    } else die("update: unknown argument " + a);
  }
  if (id === null) die("update: requires <id>");
  if (body === null) die("update: requires --body or --file");
  body = body.replace(/\s+$/, "");
  const store = resolveStore();
  if (!store) die("update: memory store is not initialized");
  const file = storeFile(store);
  const content = readContent(file);
  if (!content) die("update: memory store is empty");
  const { preamble, entries } = parse(content);
  const e = entries.find((x) => x.id === id);
  if (!e) die("update: no entry #" + id);
  e.body = body ? body.split(/\r?\n/) : [];
  fs.writeFileSync(file, serialize(preamble, entries), "utf8");
  console.log("updated #" + id);
}

function cmdRemove(args) {
  if (!args[0]) die("remove: requires <id>");
  const id = parseInt(args[0], 10);
  const store = resolveStore();
  if (!store) die("remove: memory store is not initialized");
  const file = storeFile(store);
  const content = readContent(file);
  if (!content) die("remove: memory store is empty");
  const { preamble, entries } = parse(content);
  const idx = entries.findIndex((x) => x.id === id);
  if (idx === -1) die("remove: no entry #" + id);
  entries.splice(idx, 1);
  fs.writeFileSync(file, serialize(preamble, entries), "utf8");
  console.log("removed #" + id);
}

function help() {
  console.log(`Usage: node scripts/memory.mjs <command>
  path                 Print the active store path (none = not initialized)
  init                 Create a store in the current directory
  add --title "..." [--type T] [--tags a,b] --body "Text" | --file <path>
  list                 List all entries (id + title + metadata)
  show <id>            Print one entry body
  search <query>       Search all headers and bodies
  update <id> --body "Text" | --file <path>
  remove <id>`);
}

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case undefined:
  case "help":
  case "-h":
  case "--help":
    help();
    break;
  case "path":
    cmdPath();
    break;
  case "init":
    cmdInit();
    break;
  case "add":
    cmdAdd(args);
    break;
  case "list":
    cmdList();
    break;
  case "show":
    cmdShow(args);
    break;
  case "search":
    cmdSearch(args);
    break;
  case "update":
    cmdUpdate(args);
    break;
  case "remove":
    cmdRemove(args);
    break;
  default:
    die("unknown command: " + cmd + " (use --help for usage)");
}
