import { useLocation, useNavigate } from "react-router-dom";

// Shared Back target for a game's level-select and error-state Back
// buttons (Phase 1C pilot). All 54 games previously hardcoded
// navigate("/home") for these two Back buttons regardless of how the
// student got there — so a student who tapped Back from inside a
// chapter's game lost their place and landed on the dashboard instead
// of back on the chapter they came from.
//
// ChapterMission ("/mission/:chapterId") is the canonical entry point
// that passes { state: { chapterId } } when launching a game — the
// same contract useGameCompletionNav.js already relies on for
// onBackToChapter. When that context is present, Back returns to that
// mission; when it's absent (direct game entry, Home's recommended
// card, Practice, PublicHome, etc.) there's no chapter to go back to,
// so the existing /home fallback is preserved exactly as before —
// nothing here invents a chapterId.
//
// This intentionally does NOT touch the legitimate onHome / result
// "Back to Home" Dashboard button, which always means "go to the
// dashboard" — each game still wires that directly to
// navigate("/home") itself, untouched.
export function useGameBackTarget() {
  const navigate = useNavigate();
  const location = useLocation();
  const chapterId = location.state?.chapterId || null;

  return () => {
    navigate(chapterId ? `/mission/${chapterId}` : "/home");
  };
}
