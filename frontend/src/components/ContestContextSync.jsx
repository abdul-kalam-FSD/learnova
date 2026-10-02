import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { setContestContext } from "../api/contestContext";

// Publishes the contest the current navigation entry was launched from
// (location.state.contest, set by ContestDetails when the student taps
// Play) so api/axios.js can attach it to the game's content/start calls.
//
// Tied to the navigation entry on purpose: it disappears as soon as the
// student navigates anywhere else, so ordinary practice can never
// accidentally inherit a contest. useLayoutEffect (not useEffect) so the
// value is set before any game's own data-loading effect fires.
function ContestContextSync() {
  const location = useLocation();
  const contest = location.state?.contest ?? null;
  const id = contest?.id ?? null;
  const gameType = contest?.gameType ?? null;
  const title = contest?.title ?? "";

  useLayoutEffect(() => {
    setContestContext(id && gameType ? { id, gameType, title } : null);
    return () => setContestContext(null);
  }, [location.key, id, gameType, title]);

  return null;
}

export default ContestContextSync;
