/**
 * Canonical JSON Serializer & Deterministic Cryptographic Hashing Utility
 * 
 * Guarantees byte-identical serialization across runs and platforms:
 * 1. Recursive object key sorting.
 * 2. Deterministic numeric precision normalization (avoids IEEE-754 serialization drift).
 * 3. Standardized ISO 8601 UTC timestamp formatting.
 * 4. Deterministic array handling.
 */

import crypto from 'crypto';

/**
 * Recursively normalizes an arbitrary value into a canonical JSON representation.
 */
export function canonicalizeValue(val) {
  if (val === null || val === undefined) {
    return null;
  }

  if (val instanceof Date) {
    return val.toISOString();
  }

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return null;
    // Format to 6 decimal places to eliminate floating point serialization jitter
    return Number(val.toFixed(6));
  }

  if (typeof val === 'boolean' || typeof val === 'string') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map(canonicalizeValue);
  }

  if (typeof val === 'object') {
    const sortedKeys = Object.keys(val).sort();
    const result = {};
    for (const key of sortedKeys) {
      // Exclude non-deterministic transient fields if present
      if (['created_at', 'updated_at', 'run_id', 'execution_duration_ms'].includes(key)) {
        continue;
      }
      result[key] = canonicalizeValue(val[key]);
    }
    return result;
  }

  return String(val);
}

/**
 * Serializes an object to a canonical JSON string.
 */
export function canonicalJson(obj) {
  return JSON.stringify(canonicalizeValue(obj));
}

/**
 * Computes a deterministic SHA256 hash of any JavaScript object.
 */
export function computeCanonicalHash(obj) {
  const canonicalStr = canonicalJson(obj);
  return crypto.createHash('sha256').update(canonicalStr).digest('hex');
}
