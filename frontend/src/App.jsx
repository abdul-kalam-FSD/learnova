import { useEffect, useRef, useState, lazy } from "react";
import { Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import Login from "./pages/Login";
import SessionExpired from "./pages/SessionExpired";import Signup from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PublicHome from "./pages/PublicHome";
import Home from "./pages/Home";
import Chapters from "./pages/Chapters";
import SubjectWorld from "./pages/SubjectWorld";
import SubjectChapters from "./pages/SubjectChapters";
import Practice from "./pages/Practice";
import CaseInvestigation from "./pages/CaseInvestigation";
import ProgressPage from "./pages/Progress";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/LeaderBoard";
import BottomNav from "./components/BottomNav";
import MobileHeader from "./components/MobileHeader";
import HamburgerDrawer from "./components/HamburgerDrawer";
import ChapterDetails from "./pages/ChapterDetails";
import ChapterMission from "./pages/ChapterMission";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStudents from "./pages/AdminStudents";
import AdminStudentDetail from "./pages/AdminStudentDetail";
import AdminResults from "./pages/AdminResults";
import AdminStaff from "./pages/AdminStaff";
import AdminContent from "./pages/AdminContent";
import AdminGameContent from "./pages/AdminGameContent";
import AdminCases from "./pages/AdminCases";
import AdminCaseEditor from "./pages/AdminCaseEditor";
import AdminSections from "./pages/AdminSections";
import TeacherOverview from "./pages/TeacherOverview";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherStudentDetail from "./pages/TeacherStudentDetail";
import TeacherWeakAreas from "./pages/TeacherWeakAreas";
import TeacherAssignments from "./pages/TeacherAssignments";
import api from "./api/axios";
import { LazyGameBoundary } from "./games/core/LazyGameBoundary";
import GuestBanner from "./components/GuestBanner";
import PortalEntry from "./components/PortalEntry";
import { consumeBackIntent } from "./utils/navigationIntent";
import AccessDenied from "./components/AccessDenied";
import TeacherPendingApproval from "./components/TeacherPendingApproval";
import RouteLoading from "./components/RouteLoading";
import AuthenticationRequired from "./components/AuthenticationRequired";
import NotFound from "./components/NotFound";
import { GradeBandProvider } from "./context/gradeBandContext";
import { FocusedModeProvider } from "./context/focusedModeContext";
import { gradeBandOf } from "./utils/gradeBand";

// Section 4 (code splitting): every game module below is fetched on
// demand via a dynamic import instead of bundled into the initial
// app load, since a student only ever plays one game at a time.
// LazyGameBoundary (Suspense + error boundary) wraps each usage
// below so a slow/failed chunk load never shows a blank screen.
const FractionBuilder = lazy(() => import("./games/mathematics/FractionBuilder"));
const FractionMatch = lazy(() => import("./games/mathematics/FractionMatch"));
const FractionSpeedChallenge = lazy(() => import("./games/mathematics/FractionSpeedChallenge"));
const FractionBossChallenge = lazy(() => import("./games/mathematics/FractionBossChallenge"));
const FractionStrategyChallenge = lazy(() => import("./games/mathematics/FractionStrategyChallenge"));
const EquationBuilder = lazy(() => import("./games/mathematics/EquationBuilder"));
const NumberMachine = lazy(() => import("./games/mathematics/NumberMachine"));
const EquationSpeedCalculation = lazy(() => import("./games/mathematics/EquationSpeedCalculation"));
const EquationWordProblemMatch = lazy(() => import("./games/mathematics/EquationWordProblemMatch"));
const EquationBalanceStrategy = lazy(() => import("./games/mathematics/EquationBalanceStrategy"));
const ShapeMatch = lazy(() => import("./games/mathematics/ShapeMatch"));
const PlaceValueMatch = lazy(() => import("./games/mathematics/PlaceValueMatch"));
const RatioMatch = lazy(() => import("./games/mathematics/RatioMatch"));
const FunctionMatch = lazy(() => import("./games/mathematics/FunctionMatch"));
const TrigMatch = lazy(() => import("./games/mathematics/TrigMatch"));
const InequalityMatch = lazy(() => import("./games/mathematics/InequalityMatch"));
const ChemistryMatch = lazy(() => import("./games/chemistry/ChemistryMatch"));
const GeometryBuilder = lazy(() => import("./games/mathematics/GeometryBuilder"));
const AngleSpeedChallenge = lazy(() => import("./games/mathematics/AngleSpeedChallenge"));
const PermCombSpeedChallenge = lazy(() => import("./games/mathematics/PermCombSpeedChallenge"));
const PascalTriangleBuilder = lazy(() => import("./games/mathematics/PascalTriangleBuilder"));
const ApSpeedChallenge = lazy(() => import("./games/mathematics/ApSpeedChallenge"));
const LineEquationMatch = lazy(() => import("./games/mathematics/LineEquationMatch"));
const GeometryStrategyChallenge = lazy(() => import("./games/mathematics/GeometryStrategyChallenge"));
const GeometryBossChallenge = lazy(() => import("./games/mathematics/GeometryBossChallenge"));
const EquationBossChallenge = lazy(() => import("./games/mathematics/EquationBossChallenge"));
const VirtualLab = lazy(() => import("./games/biology/VirtualLab"));
const EcosystemBalance = lazy(() => import("./games/biology/EcosystemBalance"));
const GeneticsSimulator = lazy(() => import("./games/biology/GeneticsSimulator"));
const Diagnosis = lazy(() => import("./games/biology/Diagnosis"));
const SpecimenAnalysis = lazy(() => import("./games/biology/SpecimenAnalysis"));
const CircuitBuilder = lazy(() => import("./games/physics/CircuitBuilder"));
const PhysicsMatch = lazy(() => import("./games/physics/PhysicsMatch"));
const ForceMotionSimulator = lazy(() => import("./games/physics/ForceMotionSimulator"));
const OhmsLawSpeedChallenge = lazy(() => import("./games/physics/OhmsLawSpeedChallenge"));
const WorkEnergyPowerSpeedChallenge = lazy(() => import("./games/physics/WorkEnergyPowerSpeedChallenge"));
const CapacitanceSpeedChallenge = lazy(() => import("./games/physics/CapacitanceSpeedChallenge"));
const EquationBalancer = lazy(() => import("./games/chemistry/EquationBalancer"));
const MoleculeBuilder = lazy(() => import("./games/chemistry/MoleculeBuilder"));
const ReactionLab = lazy(() => import("./games/chemistry/ReactionLab"));
const RouteBuilder = lazy(() => import("./games/geography/RouteBuilder"));
const FeatureMatch = lazy(() => import("./games/geography/FeatureMatch"));
const WordForge = lazy(() => import("./games/english/WordForge"));
const SentenceBuilder = lazy(() => import("./games/english/SentenceBuilder"));
const TamilSentenceBuilder = lazy(() => import("./games/tamil/SentenceBuilder"));
const DebuggingLab = lazy(() => import("./games/computerscience/DebuggingLab"));
const CodeOrderBuilder = lazy(() => import("./games/computerscience/CodeOrderBuilder"));
const ProverbMatch = lazy(() => import("./games/tamil/ProverbMatch"));
const CivicDecision = lazy(() => import("./games/socialscience/CivicDecision"));
const ProcessBuilder = lazy(() => import("./games/socialscience/ProcessBuilder"));
const CommerceConceptMatch = lazy(() => import("./games/commerce/ConceptMatch"));
const CommerceProcessBuilder = lazy(() => import("./games/commerce/ProcessBuilder"));
const TimelineBuilder = lazy(() => import("./games/history/TimelineBuilder"));
const CauseEffectMatch = lazy(() => import("./games/history/CauseEffectMatch"));

// Part 14 of the redesign spec: no silent redirects, ever. Previously
// this rendered `<Navigate to="/login" />` with zero context whenever
// there was no token at all (e.g. a bookmarked deep link opened after
// clearing storage) — now it explains what happened and offers both
// ways forward (guest play or sign-in).
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <AuthenticationRequired />;
}

// Requires not just a valid login (like ProtectedRoute) but an admin
// role — checked server-side on every /api/admin/* call regardless,
// but this keeps a non-admin from ever seeing the admin UI at all,
// even by typing the URL directly.
//
// IMPORTANT (Part 3 of the redesign spec): this used to silently
// `<Navigate>` a guest to /login and a denied user to /home, with no
// explanation either way — the exact "silent redirect" bug called
// out as high priority. It now renders an explicit state for every
// outcome: a real Admin Portal entry page for guests, a clear
// Access Denied page for the wrong role, and a visible loading state
// while the role check is in flight (never a blank screen).
function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const [status, setStatus] = useState(token ? "checking" : "no-token");
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!token) return;
    api
      .get("/auth/me")
      .then((res) => {
        const userRole = res.data.user?.role;
        setRole(userRole);
        setStatus(userRole === "admin" ? "allowed" : "denied");
      })
      .catch(() => setStatus("denied"));
  }, [token]);

  if (status === "no-token") {
    return <PortalEntry role="admin" returnTo={location.pathname} />;
  }
  if (status === "checking") return <RouteLoading label="Checking administrator access..." />;
  if (status === "denied") return <AccessDenied requiredRole="admin" currentRole={role} />;
  return children;
}

// Mirrors AdminRoute, but allows "teacher" as well as "admin" —
// matching the backend's requireTeacher middleware, which lets
// admins through too since they already have full access elsewhere.
// Same fix as AdminRoute above: explicit portal/denied/loading states
// instead of a silent redirect to /login or /home.
function TeacherRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const [status, setStatus] = useState(token ? "checking" : "no-token");
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!token) return;
    api
      .get("/auth/me")
      .then((res) => {
        const userRole = res.data.user?.role;
        const userStatus = res.data.user?.status;
        setRole(userRole);
        // A self-registered teacher (authControllers.register) starts
        // status: "pending" until an admin approves them — allowed to
        // be logged in (their JWT is real) but not into the actual
        // Teacher Portal yet. Students and admins are always "active",
        // so this branch only ever fires for a pending teacher.
        if (userRole === "teacher" && userStatus === "pending") {
          setStatus("pending");
        } else {
          setStatus(userRole === "teacher" || userRole === "admin" ? "allowed" : "denied");
        }
      })
      .catch(() => setStatus("denied"));
  }, [token]);

  if (status === "no-token") {
    return <PortalEntry role="teacher" returnTo={location.pathname} />;
  }
  if (status === "checking") return <RouteLoading label="Checking teacher access..." />;
  if (status === "pending") return <TeacherPendingApproval />;
  if (status === "denied") return <AccessDenied requiredRole="teacher" currentRole={role} />;
  return children;
}

// Bug found in the routing/guards audit: AppLayout is shared by every
// authenticated route — including /admin/* and /teacher/*, which are
// wrapped in AdminRoute/TeacherRoute further down — but it always
// rendered the student BottomNav (Home/Chapters/Practice/Progress)
// underneath whatever the page itself rendered. A teacher or admin
// working in their portal would see a persistent "Home" tab that, if
// tapped, silently pulled them out of the portal and into the
// student dashboard (Home.jsx) — exactly the "incorrectly redirects
// to Home" symptom called out in the audit. AdminTabs/TeacherTabs
// (rendered by each admin/teacher page already) are the correct
// in-portal navigation for those roles, so BottomNav is now suppressed
// whenever the current route is under /admin or /teacher, regardless
// of role — matching what the route guards above actually protect.
function AppLayout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  // Phase 1B §10-14: set true only while a representative game's
  // <GameFrame> is mounted (see focusedModeContext.jsx / GameFrame.jsx)
  // — this is the only thing focused mode changes here. Everything
  // else in this component (the /auth/me fetch, GradeBandProvider,
  // drawer, guest banner) is untouched and still wraps every route,
  // focused or not.
  const [focused, setFocused] = useState(false);

  // Back-button smooth-navigation, Task 1 (transition system only —
  // Back-button targets/wiring themselves are a separate task).
  // AppLayout is a fresh mount per navigation (see comment above this
  // component), so this ref is naturally scoped to exactly one
  // navigation's worth of direction: computed once on mount, guarded so
  // React StrictMode's dev-only double-render never consumes the
  // one-shot back-intent flag twice.
  const navigationType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"
  const transitionDirectionRef = useRef(null);
  if (transitionDirectionRef.current === null) {
    transitionDirectionRef.current =
      navigationType === "POP"
        ? "back"
        : navigationType === "PUSH"
        ? consumeBackIntent()
          ? "back"
          : "forward"
        : "fade"; // REPLACE (e.g. session-expiry redirects) — plain fade, no slide
  }
  const transitionClass = `page-transition-${transitionDirectionRef.current}`;

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null));
  }, []);

  const isPortalRoute =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/teacher");
  const hideChrome = isPortalRoute || focused;

  return (
    <div>
      {!focused && (
        <MobileHeader
          onMenuClick={() => setDrawerOpen(true)}
          streak={user?.streak_count ?? 0}
        />
      )}
      <HamburgerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        grade={user?.grade}
        role={user?.role}
      />
      <GuestBanner />
      <GradeBandProvider value={user?.grade != null ? gradeBandOf(user.grade) : null}>
        <FocusedModeProvider setFocused={setFocused}>
          <div className={hideChrome ? undefined : "md:flex"}>
            {!isPortalRoute && !focused && <BottomNav />}
            <div
              className={
                hideChrome ? transitionClass : `flex-1 pb-16 md:pb-0 ${transitionClass}`
              }
            >
              {children}
            </div>
          </div>
        </FocusedModeProvider>
      </GradeBandProvider>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Public no-login hub: Standard -> Subject -> Chapter -> Game.
          This is the primary landing experience — the old signup-first
          Landing.jsx screen (built before guest mode existed) has been
          removed; see Login.jsx / SignUp.jsx for the optional account
          flow, still reachable via "Sign In" in the header. */}
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/session-expired" element={<SessionExpired />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Home />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chapters"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Chapters />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Phase 0 vertical slice: Subject World -> Chapter World, the
          new primary way into chapters (see Home's "Browse Chapters"
          / hero fallback). The old flat /chapters list above is left
          in place and untouched for now — nav consolidation is a
          later phase, not part of this slice. */}
      <Route
        path="/subjects"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SubjectWorld />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subjects/:subjectName"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SubjectChapters />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Practice />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice/case"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CaseInvestigation />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProgressPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Leaderboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/fraction-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <FractionBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/fraction-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <FractionMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/fraction-speed-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <FractionSpeedChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/fraction-boss-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <FractionBossChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/fraction-strategy-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <FractionStrategyChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/equation-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <EquationBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/number-machine"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <NumberMachine />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/equation-speed-calculation"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <EquationSpeedCalculation />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/equation-word-problem-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <EquationWordProblemMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/equation-balance-strategy"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <EquationBalanceStrategy />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/shape-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <ShapeMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/place-value-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <PlaceValueMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/ratio-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <RatioMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/function-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <FunctionMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/trig-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <TrigMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/inequality-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <InequalityMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/chemistry-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <ChemistryMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/geometry-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <GeometryBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/angle-speed-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <AngleSpeedChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/permcomb-speed-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <PermCombSpeedChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/pascal-triangle-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <PascalTriangleBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/ap-speed-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <ApSpeedChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/line-equation-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <LineEquationMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/geometry-strategy-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <GeometryStrategyChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/geometry-boss-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <GeometryBossChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/equation-boss-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <EquationBossChallenge />
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
      <Route
        path="/games/ecosystem-balance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <EcosystemBalance />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/genetics-simulator"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <GeneticsSimulator />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
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
        path="/games/specimen-analysis"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <SpecimenAnalysis />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/circuit-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <CircuitBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/magnetism-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <PhysicsMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/force-simulator"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <ForceMotionSimulator />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/ohms-law-speed-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <OhmsLawSpeedChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/work-energy-power-speed-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <WorkEnergyPowerSpeedChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/capacitance-speed-challenge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <CapacitanceSpeedChallenge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/equation-balancer"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <EquationBalancer />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/molecule-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <MoleculeBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/reaction-lab"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <ReactionLab />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/route-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <RouteBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/feature-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <FeatureMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/word-forge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <WordForge />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/sentence-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <SentenceBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/debugging-lab"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <DebuggingLab />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/code-order-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <CodeOrderBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/proverb-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <ProverbMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/tamil-sentence-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <TamilSentenceBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/civic-decision"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <CivicDecision />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/civic-process-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <ProcessBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/commerce-concept-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <CommerceConceptMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/commerce-process-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <CommerceProcessBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/timeline-builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <TimelineBuilder />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/cause-effect-match"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LazyGameBoundary>
                <CauseEffectMatch />
              </LazyGameBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Unmatched paths fall back to the public no-login hub, not
          /login — the whole point of guest mode is that a visitor is
          never forced through a login screen just to land somewhere
          on the site. */}
      <Route path="*" element={<NotFound />} />
      <Route
        path="/chapters/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ChapterDetails />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Phase 0C: the new mission-framed entry point for a chapter,
          reached from the Subject World's chapter journey. Reuses the
          exact same GET /chapters/:id data as ChapterDetails above —
          /chapters/:id itself is untouched and still works for any
          existing link/bookmark into it. */}
      <Route
        path="/mission/:chapterId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ChapterMission />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminStudents />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/students/:id"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminStudentDetail />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/results"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminResults />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminStaff />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/content"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminContent />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/sections"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminSections />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/game-content"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminGameContent />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/cases"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminCases />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/cases/new"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminCaseEditor />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/cases/:id"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminCaseEditor />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherStudents />
            </AppLayout>
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/students/:id"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherStudentDetail />
            </AppLayout>
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/weak-areas"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherWeakAreas />
            </AppLayout>
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/assignments"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherAssignments />
            </AppLayout>
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherOverview />
            </AppLayout>
          </TeacherRoute>
        }
      />
    </Routes>
  );
}

export default App;