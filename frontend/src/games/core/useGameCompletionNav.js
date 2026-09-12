import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { GAME_TYPE_TO_ROUTE } from "../gameRegistry";
import { getRecommendationReasonText } from "../../utils/recommendationReason";

// GameShell's <GameResults> already supports four post-level actions
// (see its own comment: "onPlayAgain and onDashboard are required...
// onNextGame and onBackToChapter are optional and simply don't
// render" if the prop is falsy) — but until now every one of the 54
// games only ever wired up onPlayAgain/onDashboard. This hook fills
// in the other two consistently, in one place, instead of leaving
// each game to reinvent (or skip) the same logic.
//
// onBackToChapter: only meaningful if the game was launched from a
// specific chapter — ChapterDetails.jsx is the one entry point that
// passes { state: { chapterId } } when navigating in. Every other
// launch point (Home's recommended card, PublicHome, Practice)
// doesn't have a single chapter to go back to, so location.state is
// empty there and the button correctly doesn't render, rather than
// guessing at a chapter.
//
// onNextGame: reuses the existing GET /games/recommended endpoint —
// the same "what should this student play next" logic already
// driving Home's recommended card — rather than inventing a second,
// different notion of "next" here. If the top recommendation is the
// very game the student is just finishing, there's no second choice
// from this one endpoint, so the button omits itself (that case is
// already covered by "Play Again").
//
// Phase 6B (P1-1): chapterId/chapterTitle/subjectName are only ever
// non-null when ChapterMission.jsx was the one that launched this
// game (see its own `navigate(route, { state: {...} })` call) — every
// other entry point (Home, Practice, a direct game URL) never sets
// this location.state, so chapterId stays null there and nothing
// below is fabricated. Forwarding all three together, gated on the
// same chapterId check onBackToChapter already uses, means the next
// game's own GameFrame/MissionContext picks up real chapter context
// again instead of losing it the moment "Recommended Next" is used.
export function useGameCompletionNav(currentGameType) {
  const navigate = useNavigate();
  const location = useLocation();
  const chapterId = location.state?.chapterId || null;
  const chapterTitle = location.state?.chapterTitle || null;
  const subjectName = location.state?.subjectName || null;
  const [nextGame, setNextGame] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/games/recommended")
      .then((res) => {
        if (cancelled) return;
        if (res.data?.gameType && res.data.gameType !== currentGameType) {
          setNextGame(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setNextGame(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentGameType]);

  // Phase 6C-B: every one of the 54 games forwards this exact function
  // reference, unmodified, all the way down to <GameResults onNextGame=.../>
  // (see GameShell.jsx). Attaching the recommendation's reason text
  // directly to that reference (via Object.assign at creation time, so
  // no variable is mutated after its own declaration) lets GameResults
  // show *why* this game was recommended without threading a new prop
  // through all 54 per-game ResultScreen wrappers — the shared-layer
  // alternative Phase 5A's audit already flagged as out of scope for a
  // single component change. This does not affect how onNextGame is
  // invoked (it's still called with no meaningful arguments on click);
  // it only carries along one extra piece of already-fetched,
  // already-centralized copy. Reuses the same getRecommendationReasonText
  // Home/Practice/ChapterMission already use — no new reason-copy map.
  // Returns null (not fabricated text) when the reason is missing or
  // unrecognized.
  //
  // Phase 6C-C: alreadyCompleted rides along the exact same way `reason`
  // already does — attached to this same onNextGame reference so
  // GameResults can show truthful "Review Recommended" wording without
  // threading a new prop through any of the 54 per-game wrappers. It comes
  // straight from the backend's QuizSession-based completion check (see
  // getRecommendedGame); when the field is absent (older cached response
  // shape, or the request failed and nextGame is null) this defaults to
  // false, i.e. the existing "Recommended Next" wording — never guessed
  // into "Review".
  const onNextGame =
    nextGame && GAME_TYPE_TO_ROUTE[nextGame.gameType]
      ? Object.assign(
          () =>
            navigate(
              GAME_TYPE_TO_ROUTE[nextGame.gameType],
              chapterId ? { state: { chapterId, chapterTitle, subjectName } } : undefined,
            ),
          {
            reason: getRecommendationReasonText(nextGame?.reason),
            alreadyCompleted: Boolean(nextGame?.alreadyCompleted),
          },
        )
      : undefined;

  return {
    onBackToChapter: chapterId ? () => navigate(`/mission/${chapterId}`) : undefined,
    onNextGame,
  };
}
