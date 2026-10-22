import { spawn } from "child_process";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;

async function run() {
  console.log("🚀 Spawning headless Chrome on port", PORT);

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--disable-extensions",
    `--user-data-dir=${process.env.TEMP || "C:\\temp"}\\chrome_csp_audit_${Date.now()}`,
  ]);

  // Wait for Chrome to bind port
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch (e) {
      // waiting
    }
  }

  if (!wsUrl) {
    console.error("Could not obtain Chrome WebSocket URL");
    chromeProc.kill();
    process.exit(1);
  }

  console.log("Connected to Chrome CDP WebSocket:", wsUrl);
  const ws = new WebSocket(wsUrl);

  const results = {
    landing: [],
    login: [],
    dashboard: [],
    portal: [],
  };

  let currentCategory = "landing";

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }

    // Capture console messages
    if (msg.method === "Console.messageAdded") {
      const item = msg.params.message;
      results[currentCategory].push({
        type: "console",
        level: item.level,
        text: item.text,
        url: item.url,
        line: item.line,
      });
    }

    // Capture Log entries (including CSP violations)
    if (msg.method === "Log.entryAdded") {
      const entry = msg.params.entry;
      results[currentCategory].push({
        type: "log",
        source: entry.source,
        level: entry.level,
        text: entry.text,
        url: entry.url,
      });
    }

    // Capture Security state or issues
    if (msg.method === "Audits.issueAdded") {
      results[currentCategory].push({
        type: "audit_issue",
        issue: msg.params.issue,
      });
    }
  };

  // Create new target / page
  const targetRes = await send("Target.createTarget", { url: "about:blank" });
  const targetId = targetRes.targetId;

  // Connect to target page
  const pageRes = await fetch(`http://127.0.0.1:${PORT}/json`);
  const pages = await pageRes.json();
  const pageTarget = pages.find((p) => p.id === targetId) || pages[0];
  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve) => {
    pageWs.onopen = resolve;
  });

  let pageMsgId = 1;
  const pagePending = new Map();

  function sendPage(method, params = {}) {
    return new Promise((resolve) => {
      const id = pageMsgId++;
      pagePending.set(id, resolve);
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  }

  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pagePending.has(msg.id)) {
      pagePending.get(msg.id)(msg.result);
      pagePending.delete(msg.id);
    }

    if (msg.method === "Console.messageAdded") {
      const item = msg.params.message;
      results[currentCategory].push({
        type: "console",
        level: item.level,
        text: item.text,
        url: item.url,
        line: item.line,
      });
    }

    if (msg.method === "Log.entryAdded") {
      const entry = msg.params.entry;
      results[currentCategory].push({
        type: "log",
        source: entry.source,
        level: entry.level,
        text: entry.text,
        url: entry.url,
      });
    }

    if (msg.method === "Audits.issueAdded") {
      results[currentCategory].push({
        type: "audit_issue",
        issue: msg.params.issue,
      });
    }
  };

  await sendPage("Console.enable");
  await sendPage("Log.enable");
  await sendPage("Page.enable");
  await sendPage("Audits.enable");

  // Helper to load and wait
  async function auditUrl(category, url) {
    console.log(`\n--- Auditing ${category}: ${url} ---`);
    currentCategory = category;
    await sendPage("Page.navigate", { url });
    await new Promise((r) => setTimeout(r, 3000));
  }

  try {
    await auditUrl("landing", "http://localhost:3001/");
    await auditUrl("login", "http://localhost:3001/login");
    await auditUrl("dashboard", "http://localhost:3001/admin-dashboard");
    await auditUrl("portal", "http://localhost:3001/preview-project/demo-workspace");
  } finally {
    console.log("\n==========================================");
    console.log("📊 CSP & CONSOLE AUDIT REPORT (RAW OUTPUT)");
    console.log("==========================================");
    console.log(JSON.stringify(results, null, 2));

    ws.close();
    pageWs.close();
    chromeProc.kill();
  }
}

run().catch((e) => {
  console.error("Audit error:", e);
  process.exit(1);
});
