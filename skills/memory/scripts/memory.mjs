#!/usr/bin/env node
// memory.mjs — 项目级记忆，供 coding agent 使用。
// 存储：<project>/.agent-memory/memory.md（单个 markdown 文件）
// 作用域：从 process.cwd() 向上找最近的 .agent-memory/。
// 依赖：仅 Node.js 内置模块。跨平台（Linux/macOS/Windows）。用 `node memory.mjs <cmd>` 运行。
import fs from "node:fs";
import path from "node:path";

const STORE_DIR = ".agent-memory";
const FILE_NAME = "memory.md";
// 条目头：## [id] title · type · tags · date
const HEADER_RE = /^## \[(\d+)\] (.*)$/;

const TEMPLATE = `# Memory — <project>

> 项目级记忆，供 coding agent 使用。通过 memory.mjs 读写。只存 durable、非显而易见的事实。

`;

function die(msg) {
  console.error("memory: " + msg);
  process.exit(1);
}

// 从 cwd 向上查找最近的 store 目录，返回绝对路径或 null
function resolveStore() {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, STORE_DIR, FILE_NAME))) {
      return path.join(dir, STORE_DIR);
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null; // 到达根目录
    dir = parent;
  }
}

function storeFile(store) {
  return path.join(store, FILE_NAME);
}

// 不存在则在 cwd 创建 store，返回 store 路径
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

// 解析全文 → { preamble: string[], entries: [{id,meta,headerLine,body:[]}] }
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

// 重新序列化：preamble 收尾去空行，条目之间以空行分隔
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
  parts.push(""); // 末尾换行
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
      if (body === undefined) die("add: --body 需要一个值");
    } else if (a === "--file") {
      const p = args[++i];
      if (!p) die("add: --file 需要一个路径");
      if (!fs.existsSync(p)) die("add: 文件不存在 " + p);
      body = fs.readFileSync(p, "utf8");
    } else die("add: 未知参数 " + a);
  }
  if (!title) die("add: 需要 --title");
  if (body === null) die("add: 需要 --body 或 --file");
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
    console.log("（此处无 memory store）");
    return;
  }
  const content = readContent(storeFile(store));
  if (!content) return;
  for (const e of parse(content).entries) {
    console.log(`[#${e.id}] ${e.meta}`);
  }
}

function cmdShow(args) {
  if (!args[0]) die("show: 需要 <id>");
  const id = parseInt(args[0], 10);
  const store = resolveStore();
  if (!store) die("show: 未启用 store");
  const content = readContent(storeFile(store));
  if (!content) return;
  const e = parse(content).entries.find((x) => x.id === id);
  if (!e) die("show: 无 #" + id);
  console.log(e.headerLine);
  console.log("");
  const body = e.body.slice();
  while (body.length && body[0].trim() === "") body.shift();
  console.log(body.join("\n"));
}

function cmdSearch(args) {
  if (!args[0]) die("search: 需要 <query>");
  const store = resolveStore();
  if (!store) die("search: 未启用 store");
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
  if (!matched) console.log("（无匹配）");
}

function cmdUpdate(args) {
  let id = null,
    body = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--body") {
      body = args[++i];
      if (body === undefined) die("update: --body 需要一个值");
    } else if (a === "--file") {
      const p = args[++i];
      if (!p) die("update: --file 需要一个路径");
      if (!fs.existsSync(p)) die("update: 文件不存在 " + p);
      body = fs.readFileSync(p, "utf8");
    } else if (id === null && /^\d+$/.test(a)) {
      id = parseInt(a, 10);
    } else die("update: 未知参数 " + a);
  }
  if (id === null) die("update: 需要 <id>");
  if (body === null) die("update: 需要 --body 或 --file");
  body = body.replace(/\s+$/, "");
  const store = resolveStore();
  if (!store) die("update: 未启用 store");
  const file = storeFile(store);
  const content = readContent(file);
  if (!content) die("update: store 为空");
  const { preamble, entries } = parse(content);
  const e = entries.find((x) => x.id === id);
  if (!e) die("update: 无 #" + id);
  e.body = body ? body.split(/\r?\n/) : [];
  fs.writeFileSync(file, serialize(preamble, entries), "utf8");
  console.log("updated #" + id);
}

function cmdRemove(args) {
  if (!args[0]) die("remove: 需要 <id>");
  const id = parseInt(args[0], 10);
  const store = resolveStore();
  if (!store) die("remove: 未启用 store");
  const file = storeFile(store);
  const content = readContent(file);
  if (!content) die("remove: store 为空");
  const { preamble, entries } = parse(content);
  const idx = entries.findIndex((x) => x.id === id);
  if (idx === -1) die("remove: 无 #" + id);
  entries.splice(idx, 1);
  fs.writeFileSync(file, serialize(preamble, entries), "utf8");
  console.log("removed #" + id);
}

function help() {
  console.log(`用法: node scripts/memory.mjs <command>
  path                 显示当前生效的 store 路径（none=未启用）
  init                 在当前目录创建 store
  add --title "..." [--type T] [--tags a,b] --body "正文" | --file <path>
  list                 列出所有条目（id + 标题 + 元信息）
  show <id>            查看某条正文
  search <query>       全文搜索
  update <id> --body "正文" | --file <path>
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
    die("未知命令: " + cmd + "（用 --help 查看用法）");
}
