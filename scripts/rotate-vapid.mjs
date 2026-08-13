/**
 * Rotates the Web Push (VAPID) keypair in the local `.env`.
 *
 * Run with `node scripts/rotate-vapid.mjs`.
 *
 * The new private key is written straight to `.env` and never printed, so it
 * does not end up in terminal scrollback, shell history, or a chat transcript.
 * Only the public half — which ships in the client bundle anyway — is echoed.
 *
 * `.env` is gitignored. The old values are backed up next to it in case a
 * rollback is needed before the new keys reach the hosting platform.
 */

// web-push is CommonJS, so its functions come off the default export rather
// than as named ESM bindings.
import webpush from "web-push";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const { generateVAPIDKeys } = webpush;

const ENV_PATH = ".env";
const BACKUP_PATH = ".env.backup-before-vapid-rotation";

/** Replaces `KEY=...` in place, or appends it when absent. */
function upsertVar(contents, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(contents)) return contents.replace(pattern, line);
  return `${contents.replace(/\s*$/, "")}\n${line}\n`;
}

if (!existsSync(ENV_PATH)) {
  console.error(`No ${ENV_PATH} found. Copy .env.example to .env first.`);
  process.exit(1);
}

await copyFile(ENV_PATH, BACKUP_PATH);

const { publicKey, privateKey } = generateVAPIDKeys();

let contents = await readFile(ENV_PATH, "utf8");
contents = upsertVar(contents, "VITE_VAPID_PUBLIC_KEY", publicKey);
contents = upsertVar(contents, "VAPID_PRIVATE_KEY", privateKey);
await writeFile(ENV_PATH, contents);

console.log("New VAPID keypair written to .env");
console.log(`Previous values backed up to ${BACKUP_PATH}`);
console.log("");
console.log("Public key (safe to share — it ships in the client bundle):");
console.log(`  ${publicKey}`);
console.log("");
console.log("The private key was written to .env but deliberately not printed.");
console.log("Open .env to copy it into your hosting platform's environment settings.");
