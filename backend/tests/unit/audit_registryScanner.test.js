const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  scanBackendRegistry,
  scanFrontendRegistry,
  scanAppRoutes,
  checkComponentFilesExist,
  scanScoringDispatch,
} = require("../../scripts/audit/lib/registryScanner");

function makeFixtureProject() {
  const backendRoot = fs.mkdtempSync(path.join(os.tmpdir(), "audit-backend-"));
  const frontendSrcRoot = fs.mkdtempSync(path.join(os.tmpdir(), "audit-frontend-"));
  fs.mkdirSync(path.join(backendRoot, "src/utils"), { recursive: true });
  fs.mkdirSync(path.join(backendRoot, "src/controllers"), { recursive: true });
  fs.mkdirSync(path.join(frontendSrcRoot, "games/biology"), { recursive: true });

  fs.writeFileSync(
    path.join(backendRoot, "src/utils/gameTypeRegistry.js"),
    `
    const GAME_TYPES = [
      { game_type: "BIO_DIAGNOSIS", subject: "Biology", label: "Diagnosis", mechanicTier: "PRACTICE" },
      { game_type: "BIO_VIRTUAL_LAB", subject: "Biology", label: "Virtual Lab", mechanicTier: "PRACTICE" },
    ];
    module.exports = { GAME_TYPES };
    `,
  );

  fs.writeFileSync(
    path.join(frontendSrcRoot, "games/gameRegistry.js"),
    `
    export const GAME_TYPES = [
      { game_type: "BIO_DIAGNOSIS", route: "/games/diagnosis", icon: "🩺", skills: ["Biology"] },
      { game_type: "BIO_VIRTUAL_LAB", route: "/games/virtual-lab", icon: "🔬", skills: ["Biology"] },
    ];
    `,
  );

  fs.writeFileSync(
    path.join(frontendSrcRoot, "App.jsx"),
    `
    import { lazy } from "react";
    const Diagnosis = lazy(() => import("./games/biology/Diagnosis"));
    const VirtualLab = lazy(() => import("./games/biology/VirtualLab"));

    function App() {
      return (
        <Routes>
          <Route
            path="/games/diagnosis"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <LazyGameBoundary>
                    <Diagnosis />
                  </LazyGameBoundary>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/virtual-lab"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <LazyGameBoundary>
                    <VirtualLab />
                  </LazyGameBoundary>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      );
    }
    `,
  );

  // Only Diagnosis.jsx actually exists on disk — VirtualLab.jsx is
  // deliberately missing so the file-existence check has something
  // real to catch.
  fs.writeFileSync(path.join(frontendSrcRoot, "games/biology/Diagnosis.jsx"), "export default function Diagnosis() { return null; }");

  fs.writeFileSync(
    path.join(backendRoot, "src/controllers/gameControllers.js"),
    `
    const MULTI_QUESTION_GAME_TYPES = [
      "MATH_AP_SPEED_CHALLENGE",
    ];

    const checkAttempt = (gameType, payload, attempt) => {
      if (gameType === "BIO_DIAGNOSIS") {
        return true;
      }
      // Note: BIO_VIRTUAL_LAB deliberately NOT handled here, to test
      // the "registered but no scoring path" detection.
      return false;
    };

    module.exports = { checkAttempt };
    `,
  );

  return { backendRoot, frontendSrcRoot };
}

describe("audit/registryScanner", () => {
  let backendRoot, frontendSrcRoot;
  beforeAll(() => {
    ({ backendRoot, frontendSrcRoot } = makeFixtureProject());
  });
  afterAll(() => {
    fs.rmSync(backendRoot, { recursive: true, force: true });
    fs.rmSync(frontendSrcRoot, { recursive: true, force: true });
  });

  test("scanBackendRegistry reads every entry", () => {
    const result = scanBackendRegistry(backendRoot);
    expect(result.entries.map((e) => e.gameType)).toEqual([
      "BIO_DIAGNOSIS",
      "BIO_VIRTUAL_LAB",
    ]);
  });

  test("scanFrontendRegistry reads every entry with its route", () => {
    const result = scanFrontendRegistry(frontendSrcRoot);
    expect(result.entries).toEqual([
      { gameType: "BIO_DIAGNOSIS", route: "/games/diagnosis", icon: "🩺", skills: ["Biology"] },
      { gameType: "BIO_VIRTUAL_LAB", route: "/games/virtual-lab", icon: "🔬", skills: ["Biology"] },
    ]);
  });

  test("scanAppRoutes maps each /games route to its rendered component and lazy import path", () => {
    const result = scanAppRoutes(frontendSrcRoot);
    expect(result.routes).toEqual(
      expect.arrayContaining([
        { route: "/games/diagnosis", component: "Diagnosis" },
        { route: "/games/virtual-lab", component: "VirtualLab" },
      ]),
    );
    expect(result.lazyImports.Diagnosis).toBe("./games/biology/Diagnosis");
    expect(result.lazyImports.VirtualLab).toBe("./games/biology/VirtualLab");
  });

  test("checkComponentFilesExist correctly distinguishes an existing file from a missing one", () => {
    const appRoutes = scanAppRoutes(frontendSrcRoot);
    const result = checkComponentFilesExist(frontendSrcRoot, appRoutes.lazyImports, [
      "Diagnosis",
      "VirtualLab",
    ]);
    expect(result.Diagnosis.exists).toBe(true);
    expect(result.VirtualLab.exists).toBe(false);
  });

  test("scanScoringDispatch finds checkAttempt-branch types and MULTI_QUESTION_GAME_TYPES separately, and does NOT report an unhandled type as covered", () => {
    const result = scanScoringDispatch(backendRoot);
    expect(result.checkAttemptTypes).toContain("BIO_DIAGNOSIS");
    expect(result.checkAttemptTypes).not.toContain("BIO_VIRTUAL_LAB");
    expect(result.multiQuestionTypes).toEqual(["MATH_AP_SPEED_CHALLENGE"]);
  });
});
