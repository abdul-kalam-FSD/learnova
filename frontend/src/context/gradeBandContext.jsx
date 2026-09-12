import { createContext, useContext } from "react";

// Provided once in AppLayout (App.jsx), which already fetches the
// logged-in user (including grade) for the header/drawer. GameShell's
// GameTopBar/GameHint/GameFeedback read this as a fallback whenever a
// game doesn't explicitly pass its own gradeBand prop — which today
// is every game except FractionBuilder. This is what lets the other
// ~40 games pick up Section 14's age-appropriate tone/sizing without
// each of them needing to fetch grade and thread a prop through their
// own screens individually.
const GradeBandContext = createContext(null);

export function GradeBandProvider({ value, children }) {
  return <GradeBandContext.Provider value={value}>{children}</GradeBandContext.Provider>;
}

export function useGradeBand() {
  return useContext(GradeBandContext);
}
