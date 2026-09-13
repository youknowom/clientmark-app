import fs from "fs";
import path from "path";

const dir = "c:/Users/omdb2/Downloads/crm";

function findFiles(d, ext, results = []) {
  const items = fs.readdirSync(d);
  for (const i of items) {
    const p = path.join(d, i);
    if (i === "node_modules" || i === ".git" || i === "verify-permissions.js" || i === "check-code.js") continue;
    try {
      const s = fs.statSync(p);
      if (s.isDirectory()) findFiles(p, ext, results);
      else if (ext.some((e) => p.endsWith(e))) results.push(p);
    } catch {}
  }
  return results;
}

const files = findFiles(dir, [".jsx", ".js"]);
const allCodes = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");

  // hasPermission(userData, 'code')
  const re1 = /hasPermission\(userData,\s*['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re1.exec(content)) !== null) allCodes.add(m[1]);

  // permission: 'code'
  const re2 = /permission:\s*['"]([^'"]+)['"]/g;
  while ((m = re2.exec(content)) !== null) allCodes.add(m[1]);

  // authAccess('code')
  const re3 = /authAccess\(['"]([^'"]+)['"]\)/g;
  while ((m = re3.exec(content)) !== null) allCodes.add(m[1]);
}

const dbCodes = [
  "view:dashboard-master", "add:lead", "view:lead-master", "view:lead",
  "update:lead", "delete:lead", "add:project", "view:project-master",
  "view:project", "add:branch", "view:branch", "update:branch",
  "delete:branch", "add:role", "view:role", "update:role", "delete:role",
  "view:user-master", "add:user", "view:user", "update:user", "delete:user",
  "view:profile", "view:setting-master", "view:theme-setting",
  "update:theme-setting", "view:site-setting", "update:site-setting",
  "view:whatsapp-setting", "view:report-master", "view:telecaller-lead-report",
  "view:bde-lead-report", "view:lead-status-report", "view:project-status-report",
  "view:whatsapp-chat-record",
];

console.log("=== CODES USED IN CODE BUT NOT IN DB ===");
let missing = 0;
for (const c of allCodes) {
  if (!dbCodes.includes(c)) {
    console.log("  ❌", c);
    missing++;
  }
}
if (missing === 0) console.log("  ✅ None — all good!");

console.log("\n=== CODES IN DB BUT NOT USED IN CODE ===");
let unused = 0;
for (const c of dbCodes) {
  if (!allCodes.has(c)) {
    console.log("  ⚠️", c);
    unused++;
  }
}
if (unused === 0) console.log("  ✅ None — all used!");

console.log("\n=== SUMMARY ===");
console.log(`Total codes in codebase: ${allCodes.size}`);
console.log(`Total codes in DB: ${dbCodes.length}`);
console.log(`Missing from DB: ${missing}`);
console.log(`Unused in code: ${unused}`);
console.log(missing === 0 ? "\n✅ PERFECT — everything matches!" : "\n❌ FIX NEEDED");
