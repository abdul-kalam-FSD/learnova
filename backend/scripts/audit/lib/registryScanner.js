"use strict";

const fs = require("fs");
const path = require("path");

// --- Backend gameTypeRegistry.js -------------------------------------
function scanBackendRegistry(backendRoot) {
  const filePath = path.join(backendRoot, "src/utils/gameTypeRegistry.js");
  if (!fs.existsSync(filePath)) {
    return { filePath, exists: false, entries: [] };
  }
  const content = fs.readFileSync(filePath, "utf8");
  const entries = [];
  const re =
    /\{\s*game_type:\s*"([A-Z_0-9]+)"\s*,\s*subject:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*,\s*mechanicTier:\s*"([A-Z]+)"\s*\}/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    entries.push({
      gameType: m[1],
      subject: m[2],
      label: m[3],
      mechanicTier: m[4],
    });
  }
  // Duplicate registration check.
  const seen = {};
  const duplicates = [];
  entries.forEach((e) => {
    seen[e.gameType] = (seen[e.gameType] || 0) + 1;
  });
  Object.entries(seen)
    .filter(([, count]) => count > 1)
    .forEach(([gameType, count]) =>
      duplicates.push({ gameType, count }),
    );

  return { filePath, exists: true, entries, duplicates };
}

// --- Frontend gameRegistry.js -----------------------------------------
function scanFrontendRegistry(frontendSrcRoot) {
  const filePath = path.join(frontendSrcRoot, "games/gameRegistry.js");
  if (!fs.existsSync(filePath)) {
    return { filePath, exists: false, entries: [] };
  }
  const content = fs.readFileSync(filePath, "utf8");
  const entries = [];
  const re =
    /\{\s*game_type:\s*"([A-Z_0-9]+)"\s*,\s*route:\s*"([^"]+)"\s*,\s*icon:\s*"([^"]*)"\s*,\s*skills:\s*\[([^\]]*)\]\s*\}/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const skills = [];
    const skillRe = /"([^"]*)"/g;
    let sm;
    while ((sm = skillRe.exec(m[4])) !== null) skills.push(sm[1]);
    entries.push({ gameType: m[1], route: m[2], icon: m[3], skills });
  }
  const seen = {};
  entries.forEach((e) => {
    seen[e.gameType] = (seen[e.gameType] || 0) + 1;
  });
  const duplicates = Object.entries(seen)
    .filter(([, count]) => count > 1)
    .map(([gameType, count]) => ({ gameType, count }));

  return { filePath, exists: true, entries, duplicates };
}

// --- App.jsx routes + lazy components ----------------------------------
function scanAppRoutes(frontendSrcRoot) {
  const filePath = path.join(frontendSrcRoot, "App.jsx");
  if (!fs.existsSync(filePath)) {
    return { filePath, exists: false, routes: [], lazyImports: {} };
  }
  const content = fs.readFileSync(filePath, "utf8");

  // Map componentName -> import path, from
  // `const Foo = lazy(() => import("./games/x/Foo"));`
  const lazyImports = {};
  const lazyRe =
    /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']\s*\)\s*\)/g;
  let lm;
  while ((lm = lazyRe.exec(content)) !== null) {
    lazyImports[lm[1]] = lm[2];
  }

  // For every `<Route path="/games/...">...<Component />...</Route>`
  // block, find the path and the first component rendered inside it.
  const routes = [];
  const routeBlockRe = /<Route\s+path="(\/games\/[^"]+)"([\s\S]*?)\/>\s*(?=<Route|\n\s*<\/Routes)/g;
  // The above lazy lookahead is fragile across arbitrary formatting,
  // so instead do a straightforward path scan + windowed component
  // search, which matches this file's consistent Route/element/
  // LazyGameBoundary/Component shape.
  const pathRe = /<Route\s+path="(\/games\/[^"]+)"/g;
  let pm;
  const allMatches = [];
  while ((pm = pathRe.exec(content)) !== null) {
    allMatches.push({ routePath: pm[1], index: pm.index });
  }
  allMatches.forEach((entry, idx) => {
    const windowEnd =
      idx + 1 < allMatches.length ? allMatches[idx + 1].index : content.length;
    const window = content.slice(entry.index, windowEnd);
    // First capitalized self-closing JSX tag inside the window that
    // isn't one of the known structural wrapper components.
    const wrapperNames = new Set([
      "ProtectedRoute",
      "AppLayout",
      "LazyGameBoundary",
      "Route",
    ]);
    const tagRe = /<([A-Z]\w*)\s*\/>/g;
    let tm;
    let component = null;
    while ((tm = tagRe.exec(window)) !== null) {
      if (!wrapperNames.has(tm[1])) {
        component = tm[1];
        break;
      }
    }
    routes.push({ route: entry.routePath, component });
  });

  return { filePath, exists: true, routes, lazyImports };
}

// --- Component file existence, resolved via the lazy import path -------
function checkComponentFilesExist(frontendSrcRoot, lazyImports, componentNames) {
  const results = {};
  componentNames.forEach((name) => {
    const importPath = lazyImports[name];
    if (!importPath) {
      results[name] = { status: "NO_LAZY_IMPORT_FOUND" };
      return;
    }
    const resolved = path.join(frontendSrcRoot, importPath) + ".jsx";
    results[name] = {
      importPath,
      resolvedPath: resolved,
      exists: fs.existsSync(resolved),
    };
  });
  return results;
}

// --- Backend scoring dispatch (checkAttempt + MULTI_QUESTION_GAME_TYPES) ---
function scanScoringDispatch(backendRoot) {
  const filePath = path.join(
    backendRoot,
    "src/controllers/gameControllers.js",
  );
  if (!fs.existsSync(filePath)) {
    return { filePath, exists: false, multiQuestionTypes: [], checkAttemptTypes: [] };
  }
  const content = fs.readFileSync(filePath, "utf8");

  const multiArrayMatch = content.match(
    /const\s+MULTI_QUESTION_GAME_TYPES\s*=\s*\[([\s\S]*?)\];/,
  );
  const multiQuestionTypes = [];
  if (multiArrayMatch) {
    const re = /"([A-Z_0-9]+)"/g;
    let m;
    while ((m = re.exec(multiArrayMatch[1])) !== null) {
      multiQuestionTypes.push(m[1]);
    }
  }

  const checkAttemptStart = content.indexOf("const checkAttempt = ");
  let checkAttemptTypes = [];
  let checkAttemptFound = false;
  if (checkAttemptStart !== -1) {
    checkAttemptFound = true;
    // Bound the function body: find the next top-level
    // `\nconst <identifier> = ` after the start, or fall back to EOF.
    const rest = content.slice(checkAttemptStart + 20);
    const nextDeclRel = rest.search(/\n(?:const|async function|module\.exports)\s/);
    const body =
      nextDeclRel === -1
        ? content.slice(checkAttemptStart)
        : content.slice(checkAttemptStart, checkAttemptStart + 20 + nextDeclRel);
    const re = /"([A-Z_0-9]+)"/g;
    let m;
    const seen = new Set();
    while ((m = re.exec(body)) !== null) {
      seen.add(m[1]);
    }
    checkAttemptTypes = [...seen];
  }

  return {
    filePath,
    exists: true,
    checkAttemptFound,
    multiQuestionTypes,
    checkAttemptTypes,
  };
}

module.exports = {
  scanBackendRegistry,
  scanFrontendRegistry,
  scanAppRoutes,
  checkComponentFilesExist,
  scanScoringDispatch,
};
