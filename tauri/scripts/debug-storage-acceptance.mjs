import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = path.resolve("src/core/debugLog.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
}).outputText;

class FakeStorage {
  values = new Map();
  quota = 300_000;
  failNextDebugWrite = false;
  unavailable = false;

  getItem(key) {
    if (this.unavailable) throw new DOMException("Storage unavailable", "SecurityError");
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.unavailable) throw new DOMException("Storage unavailable", "SecurityError");
    if (key === "devenv.debug.entries" && this.failNextDebugWrite) {
      this.failNextDebugWrite = false;
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    const nextSize = [...this.values.entries()]
      .filter(([storedKey]) => storedKey !== key)
      .reduce((total, [storedKey, storedValue]) => total + storedKey.length + storedValue.length, key.length + value.length);
    if (nextSize > this.quota) throw new DOMException("Quota exceeded", "QuotaExceededError");
    this.values.set(key, value);
  }

  removeItem(key) {
    if (this.unavailable) throw new DOMException("Storage unavailable", "SecurityError");
    this.values.delete(key);
  }
}

const storage = new FakeStorage();
const legacyEntries = Array.from({ length: 300 }, (_, index) => ({
  id: `legacy-${index}`,
  eventId: `legacy-${index}`,
  timestamp: new Date().toISOString(),
  type: "invoke",
  eventType: "invoke",
  name: "inspect_runtime_strong_verification",
  eventName: "inspect_runtime_strong_verification",
  status: "success",
  startedAt: new Date().toISOString(),
  data: { runtimeReport: "x".repeat(20_000), items: Array.from({ length: 100 }, () => ({ detail: "y".repeat(2_000) })) },
}));
storage.values.set("devenv.debug.entries", JSON.stringify(legacyEntries));
storage.failNextDebugWrite = true;

const events = [];
const context = vm.createContext({
  console,
  CustomEvent: class {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  },
  DOMException,
  exports: {},
  localStorage: storage,
  module: { exports: {} },
  process: { env: { USERPROFILE: "C:\\Users\\Acceptance" } },
  require(specifier) {
    if (specifier === "./i18n") return { getActiveLocale: () => "en-US" };
    throw new Error(`Unexpected require: ${specifier}`);
  },
  window: {
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
  },
});
context.exports = context.module.exports;
new vm.Script(compiled, { filename: sourcePath }).runInContext(context);
const debugLog = context.module.exports;

const circular = { name: "fixture", password: "must-not-leak" };
circular.self = circular;
const started = debugLog.logDebug({
  type: "invoke",
  name: "inspect_runtime_strong_verification",
  status: "started",
  data: circular,
});
debugLog.finishDebug(started, "success", "z".repeat(20_000), {
  token: "must-not-leak",
  items: Array.from({ length: 500 }, (_, index) => ({ index, detail: "result".repeat(1_000) })),
});

const storedText = storage.values.get("devenv.debug.entries");
assert(typeof storedText === "string", "compacted debug entries were not persisted");
assert(storedText.length <= 256 * 1024, `debug storage exceeded limit: ${storedText.length}`);
assert(!storedText.includes("must-not-leak"), "sensitive debug value was not redacted");
assert(storedText.includes("<redacted>"), "redaction marker is missing");
assert(storedText.includes("<truncated"), "large debug text was not truncated");
assert(events.includes("devenv:debug-log-change"), "debug change event was not dispatched");

const entries = debugLog.getDebugEntries();
assert(entries.length <= 200, `too many debug entries retained: ${entries.length}`);
assert(entries.some((entry) => entry.id === started.id && entry.status === "success"), "latest debug lifecycle entry was lost");

storage.unavailable = true;
assert(debugLog.logDebug({ type: "navigation", name: "runtimes", status: "started" }), "storage failure escaped logDebug");
debugLog.finishDebug(started, "success", "business result must survive storage failure");
debugLog.clearDebugEntries();

console.log(`Debug storage acceptance passed (${entries.length} compacted entries, ${storedText.length} chars).`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
