import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSetFocusedMode } from "../../context/focusedModeContext";
import { MissionProvider } from "../../context/missionContext";

// Focused game-session mode (Phase 1B §10-15 of
// GAMEPLAY_UX_AUDIT_PHASE_1A.md). Every /games/* route today renders
// inside AppLayout, so the global MobileHeader and BottomNav stay
// visible through level select, lobby, gameplay, and results — making
// a game feel like a page inside a website rather than a focused
// session.
//
// GameFrame does NOT remove AppLayout or its context/provider
// infrastructure (GradeBandContext, the /auth/me-derived user, etc.)
// — only the visual chrome. A game wrapped in <GameFrame> still lives
// inside AppLayout's existing GradeBandProvider, so gradeBandOf/
// age-adaptive hints and feedback keep working exactly as before.
//
// How it works: mounting GameFrame tells AppLayout (via
// FocusedModeContext, see focusedModeContext.jsx) to hide its global
// header/bottom-nav; unmounting restores them. Because this is driven
// by mount/unmount rather than a route-path allowlist inside
// AppLayout, it stays correct across every stage of a game (loading,
// select, lobby, play, result) and however the student eventually
// leaves (Back to Chapter, Next Game, Dashboard, or browser back) —
// whichever of those unmounts the game's component tree restores the
// chrome automatically.
//
// As of Phase 5C-A, all 54/54 games wrap their content in <GameFrame> —
// see each file's top-level export for the wrapper. Nothing about this
// component assumes all /games/* routes use it, so `focused` was adopted
// per-game incrementally (Phase 1B §14-15) without a flag day.
// Phase 5C-B: GameFrame is also where real chapter/mission context (see
// missionContext.jsx) enters the game tree, since it's the one place that
// already wraps every one of the 54/54 games (Phase 5C-A) and already sits
// inside the router. `chapterTitle`/`subjectName` only ever come from
// ChapterMission.jsx's real navigation state — direct game URLs, Home's
// recommended card, and Practice all leave location.state empty, so
// `mission` below is simply null there and GameTopBar shows nothing extra
// (see GameShell.jsx). Wrapping with <MissionProvider> adds no DOM element
// of its own, so this doesn't change GameFrame's existing "renders exactly
// what its children render" contract.
export function GameFrame({ children }) {
  const setFocused = useSetFocusedMode();
  const location = useLocation();

  useEffect(() => {
    setFocused(true);
    return () => setFocused(false);
  }, [setFocused]);

  const chapterTitle = location.state?.chapterTitle || null;
  const subjectName = location.state?.subjectName || null;
  const mission = chapterTitle ? { chapterTitle, subjectName } : null;

  return <MissionProvider value={mission}>{children}</MissionProvider>;
}
