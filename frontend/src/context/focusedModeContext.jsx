import { createContext, useContext } from "react";

// Provided once in AppLayout (App.jsx), same pattern as
// GradeBandContext right next to it. This is the signal GameFrame
// (frontend/src/games/core/GameFrame.jsx) uses to tell AppLayout to
// suppress the global MobileHeader/BottomNav chrome while a
// representative game is mounted (Phase 1B §10-14), without AppLayout
// needing to know about game routes/paths, and without games needing
// a second user/context provider — this is purely a visibility signal
// layered on top of the context/provider infrastructure AppLayout
// already owns (/auth/me, GradeBandProvider), which is left untouched.
//
// Deliberately just a boolean setter, not a duplicate router or state
// machine: GameFrame calls setFocused(true) on mount and setFocused
// (false) on unmount (see GameFrame.jsx), so leaving a focused game
// (by any navigation path — Back to Chapter, Next Game, Dashboard, or
// browser back) automatically restores the chrome as soon as React
// unmounts the game's component tree.
const FocusedModeContext = createContext(() => {});

export function FocusedModeProvider({ setFocused, children }) {
  return <FocusedModeContext.Provider value={setFocused}>{children}</FocusedModeContext.Provider>;
}

export function useSetFocusedMode() {
  return useContext(FocusedModeContext);
}
