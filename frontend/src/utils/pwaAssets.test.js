// @vitest-environment node
//
// Static guards for the installable-PWA setup: manifest + icons, index.html
// linkage, the untouched push-only service worker (V1 = installability, NOT
// offline), single-worker architecture, and startup wiring.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

function listSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(rel));
    else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\.(js|jsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

// PNG header: width, height, colour type (2 = RGB, 6 = RGBA).
function pngInfo(rel) {
  const b = fs.readFileSync(path.join(ROOT, rel));
  expect(b.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
}

const manifest = JSON.parse(read("public/manifest.webmanifest"));

describe("web app manifest", () => {
  it("exists, parses, and has the required Learnova values", () => {
    expect(manifest.name).toBe("Learnova");
    expect(manifest.short_name).toBe("Learnova");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
    expect(manifest.description).toEqual(expect.any(String));
    expect(manifest.description.length).toBeGreaterThan(10);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  it("declares 192 any, 512 any and 512 maskable PNG icons", () => {
    const key = (i) => `${i.sizes}/${i.purpose}/${i.type}`;
    const declared = manifest.icons.map(key);
    expect(declared).toEqual(
      expect.arrayContaining(["192x192/any/image/png", "512x512/any/image/png", "512x512/maskable/image/png"]),
    );
  });

  it("every icon reference exists and has exactly the declared dimensions", () => {
    for (const icon of manifest.icons) {
      const rel = `public${icon.src}`;
      expect(exists(rel), `${icon.src} exists`).toBe(true);
      const [w, h] = icon.sizes.split("x").map(Number);
      const info = pngInfo(rel);
      expect([info.width, info.height], icon.src).toEqual([w, h]);
    }
  });

  it("the maskable icon is opaque/full-bleed (no alpha channel to be cropped)", () => {
    const maskable = manifest.icons.find((i) => i.purpose === "maskable");
    expect(pngInfo(`public${maskable.src}`).colorType).toBe(2);
  });

  it("apple-touch-icon exists at 180x180", () => {
    const info = pngInfo("public/icons/apple-touch-icon.png");
    expect([info.width, info.height]).toEqual([180, 180]);
  });
});

describe("index.html linkage", () => {
  const html = read("index.html");

  it("links the manifest, the apple-touch-icon and a matching theme-color", () => {
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?>/);
    expect(html).toMatch(/<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png"\s*\/?>/);
    const theme = html.match(/<meta name="theme-color" content="([^"]+)"/);
    expect(theme?.[1].toLowerCase()).toBe(manifest.theme_color.toLowerCase());
    expect(exists("public/icons/apple-touch-icon.png")).toBe(true);
  });

  it("links the Learnova favicon and Vite entry script", () => {
    expect(html).toMatch(/<link rel="icon" type="image\/png" sizes="64x64" href="\/favicon\.png"/);
    expect(exists("public/favicon.png")).toBe(true);
    expect(html).toMatch(/<script type="module" src="\/src\/main\.jsx">/);
  });
});

describe("service worker: push-only, single worker, no caching (Option A)", () => {
  const sw = read("public/sw.js");

  it("still handles push and notificationclick exactly as before", () => {
    expect(sw).toMatch(/addEventListener\(\s*"push"/);
    expect(sw).toMatch(/showNotification\(/);
    expect(sw).toMatch(/addEventListener\(\s*"notificationclick"/);
    expect(sw).toMatch(/clients\.openWindow\(\s*"\/home"\s*\)/);
  });

  it("has no fetch handler and no Cache API (installability only, not offline)", () => {
    expect(sw).not.toMatch(/addEventListener\(\s*["']fetch["']/);
    expect(sw).not.toMatch(/\bonfetch\b/);
    expect(sw).not.toMatch(/\bcaches\b/);
    expect(sw).not.toMatch(/CacheStorage|new Cache|\.match\(|cache\.(add|put)/);
  });

  it("is the only worker script: one file in public/, one registration call site in src", () => {
    const workerFiles = fs
      .readdirSync(path.join(ROOT, "public"))
      .filter((f) => /^(sw|service-?worker|workbox)[^/]*\.js$/i.test(f));
    expect(workerFiles).toEqual(["sw.js"]);

    const registerCalls = listSourceFiles("src").filter((f) =>
      /serviceWorker\s*\.\s*register\s*\(/.test(read(f)),
    );
    expect(registerCalls).toEqual(["src/utils/serviceWorker.js"]);
  });
});

describe("startup wiring and permission safety", () => {
  const sources = listSourceFiles("src");

  it("Notification.requestPermission is only ever called from push.js (user-initiated subscribe)", () => {
    const callers = sources.filter((f) => /requestPermission\s*\(/.test(read(f)));
    expect(callers).toEqual(["src/utils/push.js"]);
    const push = read("src/utils/push.js");
    const fn = push.slice(push.indexOf("export async function subscribeToPush"));
    expect(fn.indexOf("requestPermission(")).toBeGreaterThan(-1);
    expect(push.slice(0, push.indexOf("export async function subscribeToPush"))).not.toMatch(
      /requestPermission\s*\(/,
    );
  });

  it("beforeinstallprompt is only listened for in the singleton", () => {
    const listeners = sources.filter((f) => /["']beforeinstallprompt["']/.test(read(f)));
    expect(listeners).toEqual(["src/utils/pwaInstall.js"]);
  });

  it("main.jsx captures install events before render and registers the worker at startup", () => {
    const main = read("src/main.jsx");
    expect(main).toMatch(/import \{ initPwaInstall \} from "\.\/utils\/pwaInstall"/);
    expect(main).toMatch(/import \{ registerServiceWorkerOnLoad \} from "\.\/utils\/serviceWorker"/);
    const init = main.indexOf("initPwaInstall();");
    const render = main.indexOf("createRoot(");
    expect(init).toBeGreaterThan(-1);
    expect(init).toBeLessThan(render); // listener attached before React renders
    expect(main).toMatch(/^registerServiceWorkerOnLoad\(\);/m);
  });

  it("main.jsx never triggers install or push by itself", () => {
    const main = read("src/main.jsx");
    expect(main).not.toMatch(/promptInstall|subscribeToPush|requestPermission/);
  });
});

describe("vercel SPA fallback does not swallow PWA files", () => {
  const vercel = JSON.parse(read("vercel.json"));

  it("only has the catch-all rewrite to /index.html (static files win over rewrites on Vercel)", () => {
    expect(vercel.rewrites).toEqual([{ source: "/(.*)", destination: "/index.html" }]);
  });

  it("manifest, icons and sw.js are real static files in public/", () => {
    for (const rel of [
      "public/manifest.webmanifest",
      "public/sw.js",
      "public/icons/icon-192.png",
      "public/icons/icon-512.png",
      "public/icons/icon-maskable-512.png",
      "public/icons/apple-touch-icon.png",
    ]) {
      expect(exists(rel), rel).toBe(true);
    }
  });
});

describe("no misleading claims in PWA-facing text", () => {
  const files = [
    "public/manifest.webmanifest",
    "index.html",
    "src/components/InstallAppButton.jsx",
    "src/InstallAppButton.css",
    "src/utils/pwaInstall.js",
    "src/utils/usePwaInstall.js",
    "src/utils/serviceWorker.js",
  ];

  it("makes no offline-capability or native-app (APK / app store) claims", () => {
    for (const rel of files) {
      const text = read(rel);
      expect(text, rel).not.toMatch(/works? offline|offline (mode|learning|support|capable)|available offline/i);
      expect(text, rel).not.toMatch(/\bapk\b|app store|play store|native app/i);
    }
  });

  it("copies no FarmRent branding", () => {
    for (const rel of files) expect(read(rel), rel).not.toMatch(/farm\s*rent/i);
  });
});
