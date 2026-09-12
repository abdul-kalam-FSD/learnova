import { createContext, useContext } from "react";

// Phase 5C-B: optional "what chapter/mission am I playing this game as
// part of" context, surfaced in GameShell's GameTopBar (see GameShell.jsx).
//
// Provided once, by GameFrame (see GameFrame.jsx) — which already wraps
// all 54/54 games as of Phase 5C-A — from real navigation state that
// ChapterMission.jsx sets when it launches a game (chapterTitle,
// subjectName). This is the exact same pattern gradeBandContext.jsx
// already established (a single provider high up, consumed via a
// fallback hook wherever it's needed) so that none of the 54 individual
// game files need to be touched, read location state themselves, or
// thread a new prop through their own screens.
//
// Deliberately a plain React context (not tied to react-router) so that
// GameTopBar itself never needs a Router in its own tests — it just reads
// whatever value (or null) this context currently holds.
//
// When a game is launched from anywhere other than ChapterMission (Home's
// recommended card, Practice, a direct game URL, a refresh), there is no
// real chapter to attribute the session to, so the provided value is null
// and GameTopBar renders no mission line at all — nothing here invents a
// chapter/subject when one wasn't actually passed forward.
const MissionContext = createContext(null);

export function MissionProvider({ value, children }) {
  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
}

export function useMissionContext() {
  return useContext(MissionContext);
}
