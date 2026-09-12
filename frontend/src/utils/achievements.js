// Achievements derived purely from data Profile.jsx already fetches
// (stats + progress + user). No backend model, no stored "unlocked"
// events — an achievement is simply "true" whenever its threshold is
// met right now. Transparent and deterministic, same philosophy as
// the mastery/level system: no hidden state, no fake unlock history.
export function getAchievements({ user, stats, progress }) {
  const quizzesPlayed = stats?.quizzesPlayed ?? 0;
  const accuracy = stats?.accuracy ?? 0;
  const streak = user?.streak_count ?? 0;
  const xp = user?.xp_total ?? 0;
  const chapters = progress?.chapters ?? [];

  const hasMasteredChapter = chapters.some(
    (ch) =>
      ch.total_concepts > 0 &&
      ch.breakdown.strong === ch.total_concepts,
  );

  return [
    {
      id: "first-case",
      icon: "🔍",
      // Phase 8 (item #2 — legacy wording audit): quizzesPlayed counts
      // every completed session type (game-session, weak-concept
      // practice, chapter review, case investigation, etc.), not just
      // cases — for most students the majority are games. Title
      // updated to match what actually earns it; id/icon left
      // unchanged since they're not user-facing labels.
      title: "First Game Completed",
      earned: quizzesPlayed >= 1,
    },
    {
      id: "five-cases",
      icon: "🧪",
      title: "5 Games Completed",
      earned: quizzesPlayed >= 5,
    },
    {
      id: "streak-3",
      icon: "🔥",
      title: "3-Day Streak",
      earned: streak >= 3,
    },
    {
      id: "streak-7",
      icon: "🔥",
      title: "7-Day Streak",
      earned: streak >= 7,
    },
    {
      id: "sharp-shooter",
      icon: "🎯",
      title: "Sharp Shooter (80%+ accuracy)",
      earned: quizzesPlayed >= 1 && accuracy >= 80,
    },
    {
      id: "chapter-mastered",
      icon: "🏅",
      title: "Chapter Mastered",
      earned: hasMasteredChapter,
    },
    {
      id: "rising-scholar",
      icon: "⚡",
      title: "500 XP Milestone",
      earned: xp >= 500,
    },
  ];
}