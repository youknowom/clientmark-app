/**
 * scripts/migrateCredentials.js
 *
 * Canonical alias for scripts/encryptExistingCredentials.js.
 * Encrypts existing plaintext credentials (SMTP password, Gemini API key, WhatsApp token & instance ID)
 * using AES-256-GCM.
 *
 * Usage:
 *   node scripts/migrateCredentials.js [--dry-run]
 */

import "./encryptExistingCredentials.js";
