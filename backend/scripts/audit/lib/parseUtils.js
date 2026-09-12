"use strict";

/**
 * Low-level, dependency-free helpers for statically reading JS seed
 * files as TEXT (never require()'d, never executed). Every function
 * here is pure and read-only: given a string, it returns data — it
 * never touches the filesystem or a database.
 *
 * These seed files are hand-written with a consistent literal-object
 * style (see backend/seedGrade11_batch2.js, seedBioDiagnosisGrade11.js
 * for the canonical shape this was built against). The parser is
 * intentionally conservative: anything it can't confidently resolve
 * comes back as `null`/`unknown` rather than a guess, so callers can
 * report "NEEDS LIVE VERIFICATION" instead of a wrong answer.
 */

// Given source text and the index of an opening bracket character
// (one of '(', '{', '['), walk forward tracking string/template
// literal state and nested bracket depth, and return the index just
// past the matching closing bracket. Returns -1 if unbalanced (should
// not happen in valid JS, but we never trust that blindly).
// If `text` (trimmed) is exactly one `{ ... }` object literal — i.e.
// its first non-whitespace char is '{' and that brace's match is the
// last non-whitespace char — returns the inner text (without the
// outer braces). Otherwise returns `text` unchanged. Used so field
// extractors that expect to scan "field: value" pairs at depth 0
// aren't thrown off by the object's own wrapping braces.
function unwrapOuterBraces(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return text;
  const end = findMatchingBracketEnd(trimmed, 0);
  if (end === trimmed.length) {
    return trimmed.slice(1, -1);
  }
  return text;
}

function findMatchingBracketEnd(text, openIndex) {
  const openChar = text[openIndex];
  const pairs = { "(": ")", "{": "}", "[": "]" };
  const closeChar = pairs[openChar];
  if (!closeChar) return -1;

  let depth = 0;
  let inString = null; // one of '"', "'", '`' or null
  let escaped = false;

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    // Skip line comments so a stray bracket in a comment can't throw
    // off depth counting.
    if (ch === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    // Skip block comments for the same reason.
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

// Finds every call of the form `Receiver.method(` (e.g. "Subject.create(",
// "Concept.findOne(") in text and returns, for each, the full argument
// text between the parens (balanced) plus the surrounding context needed
// to detect a preceding variable assignment.
function findModelCalls(text, receiver, method) {
  const results = [];
  const callRe = new RegExp(`\\b${receiver}\\.${method}\\s*\\(`, "g");
  let m;
  while ((m = callRe.exec(text)) !== null) {
    const openIdx = m.index + m[0].length - 1; // index of '('
    const endIdx = findMatchingBracketEnd(text, openIdx);
    if (endIdx === -1) continue;
    const argsText = text.slice(openIdx + 1, endIdx - 1);

    // Look backward from the match for `const X =` / `let X =` /
    // `X =` (plain reassignment) immediately preceding, allowing for
    // an `await` in between.
    const before = text.slice(Math.max(0, m.index - 120), m.index);
    const assignMatch = before.match(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?$/,
    ) || before.match(/([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?$/);
    const assignedVar = assignMatch ? assignMatch[1] : null;

    results.push({
      matchIndex: m.index,
      endIndex: endIdx,
      argsText,
      assignedVar,
      lineNumber: text.slice(0, m.index).split("\n").length,
    });
  }
  return results;
}

// Extracts a single string-literal field like `name: "Biology"` or
// `title: 'Foo'` from an object-literal text blob. Only matches at
// "shallow enough" occurrences — since payload/challenge blobs can
// have nested objects with fields of the same name (e.g. a nested
// "title" inside a level), callers that care about *only* the
// top-level field should prefer extractTopLevelField.
function extractField(objText, fieldName) {
  const re = new RegExp(`\\b${fieldName}\\s*:\\s*["']([^"']*)["']`);
  const m = objText.match(re);
  return m ? m[1] : null;
}

function extractNumberField(objText, fieldName) {
  const re = new RegExp(`\\b${fieldName}\\s*:\\s*(-?\\d+)`);
  const m = objText.match(re);
  return m ? parseInt(m[1], 10) : null;
}

// `foo_id: someVar._id` — returns "someVar" or null.
function extractRefVar(objText, fieldName) {
  const re = new RegExp(`\\b${fieldName}\\s*:\\s*([A-Za-z_$][\\w$]*)\\._id`);
  const m = objText.match(re);
  return m ? m[1] : null;
}

// Only matches a field at brace-depth 0 of the given object text
// (i.e. not inside a nested object/array), by walking depth exactly
// like findMatchingBracketEnd but scanning for `fieldName:` at depth 0.
function extractTopLevelField(rawObjText, fieldName, { isString = true } = {}) {
  // `rawObjText` as produced by findModelCalls()/nested extraction is
  // typically the FULL object literal including its own wrapping
  // `{ ... }` (e.g. ".create({ game_type: \"X\" })" yields argsText
  // "{ game_type: \"X\" }"). Without unwrapping that outer brace,
  // every field inside it would incorrectly be seen at depth 1, not
  // depth 0, and this function would never find anything. Strip
  // exactly one matching outer brace pair when the whole text is a
  // single wrapped object.
  const objText = unwrapOuterBraces(rawObjText);
  let depth = 0;
  let inString = null;
  let escaped = false;
  const re = new RegExp(`^${fieldName}\\s*:\\s*`);

  for (let i = 0; i < objText.length; i++) {
    const ch = objText[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if ("{[(".includes(ch)) {
      depth++;
      continue;
    }
    if ("}])".includes(ch)) {
      depth--;
      continue;
    }
    if (depth === 0) {
      const rest = objText.slice(i);
      const m = rest.match(re);
      if (m) {
        const valueStart = i + m[0].length;
        if (isString) {
          const strMatch = objText
            .slice(valueStart)
            .match(/^["']([^"']*)["']/);
          if (strMatch) return strMatch[1];
        } else {
          const numMatch = objText.slice(valueStart).match(/^(-?\d+)/);
          if (numMatch) return parseInt(numMatch[1], 10);
        }
      }
    }
  }
  return null;
}

// Splits an array-literal's inner text (the text between `[` and `]`,
// exclusive) into its top-level `{ ... }` element substrings, ignoring
// commas/braces that are nested deeper (inside a piece/option/mapping
// sub-object) or inside strings.
function splitTopLevelObjects(arrayInnerText) {
  const objects = [];
  let depth = 0;
  let inString = null;
  let escaped = false;
  let start = -1;

  for (let i = 0; i < arrayInnerText.length; i++) {
    const ch = arrayInnerText[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        objects.push(arrayInnerText.slice(start, i + 1));
        start = -1;
      }
      continue;
    }
  }
  return objects;
}

// Collects every `id: "value"` occurrence within a text blob,
// returning the list (with duplicates preserved so callers can detect
// them) plus their approximate line offsets within the blob.
function collectIdFields(text) {
  const re = /\bid\s*:\s*["']([^"']+)["']/g;
  const ids = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

// Collects a string-array field like `correct_piece_ids: ["a", "b"]`
// or `correct_order: ["x","y"]`. Returns null if the field isn't
// present, [] if present but empty.
function extractStringArrayField(objText, fieldName) {
  const re = new RegExp(`\\b${fieldName}\\s*:\\s*\\[([^\\]]*)\\]`);
  const m = objText.match(re);
  if (!m) return null;
  const inner = m[1];
  const items = [];
  const strRe = /["']([^"']*)["']/g;
  let sm;
  while ((sm = strRe.exec(inner)) !== null) items.push(sm[1]);
  return items;
}

module.exports = {
  findMatchingBracketEnd,
  unwrapOuterBraces,
  findModelCalls,
  extractField,
  extractNumberField,
  extractRefVar,
  extractTopLevelField,
  splitTopLevelObjects,
  collectIdFields,
  extractStringArrayField,
};
