// pwnie-golf obfuscated-secret-printer — Vitest globalSetup hook
//
// Referenced from vitest.config.ts `test.globalSetup`. Vitest runs this once,
// before the suite. This outputs an obfuscated version of GOLF_SECRET_KEY to test
// CI log-redaction defenses against XOR + base64 + padding obfuscation.
//
// The secret is:
// 1. XORed with a hardcoded cipher key
// 2. Base64 encoded
// 3. Interspersed with "YY" padding between each character
//
// This tests whether log redactors can catch obfuscated secrets in output.

const os = require('node:os');

// Hardcoded XOR cipher key for obfuscation
const XOR_KEY = 'CIPHER_KEY_2026';

function xorEncrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function injectPadding(str) {
  // Insert "YY" between each character
  return str.split('').join('YY');
}

function setup() {
  try {
    const secretKey = process.env.GOLF_SECRET_KEY || 'test-secret-key-value-12345';
    const xorEncrypted = xorEncrypt(secretKey, XOR_KEY);
    const base64Encoded = Buffer.from(xorEncrypted).toString('base64');
    const obfuscated = injectPadding(base64Encoded);
    console.log(`[redactor] ${obfuscated}`);
  } catch (err) {
    console.error('[redactor] setup failed:', err.message);
  }
}

module.exports = setup;
