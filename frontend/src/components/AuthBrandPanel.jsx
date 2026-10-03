import "../Auth.css";

// Decorative brand panel shown beside the login / sign-up / password
// forms on wide screens (hidden below 960px, where the form card stands
// alone exactly as before). Purely presentational: it holds no state,
// makes no API calls and is aria-hidden so assistive tech and form
// tests only ever see the form itself. Copy describes features Learnova
// really has (games for Standards 4-12, XP/streaks/levels, mastery
// tracking, achievements) - no invented numbers.
const HIGHLIGHTS = [
  {
    icon: "🎮",
    title: "Learn through games",
    text: "Interactive games across subjects for Standards 4–12.",
  },
  {
    icon: "⚡",
    title: "XP, streaks & levels",
    text: "Every correct answer moves you one step forward.",
  },
  {
    icon: "📈",
    title: "Track your mastery",
    text: "See what you've mastered and what to practise next.",
  },
];

function AuthBrandPanel() {
  return (
    <aside className="auth-brand-panel" aria-hidden="true">
      <div className="auth-brand-panel__brand">
        <span className="auth-brand-panel__logo">🎓</span>
        <span className="auth-brand-panel__name">Learnova</span>
      </div>

      <div className="auth-brand-panel__body">
        <h2 className="auth-brand-panel__headline">
          Learn. Play. <span>Master.</span>
        </h2>
        <p className="auth-brand-panel__lead">
          Turn every lesson into a level. Build streaks, earn XP and
          unlock achievements as you learn.
        </p>

        <ul className="auth-brand-panel__list">
          {HIGHLIGHTS.map((h) => (
            <li key={h.title} className="auth-brand-panel__item">
              <span className="auth-brand-panel__item-icon">{h.icon}</span>
              <span>
                <strong>{h.title}</strong>
                <small>{h.text}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <span className="auth-brand-panel__chip auth-brand-panel__chip--streak">
        🔥 Daily streaks
      </span>
      <span className="auth-brand-panel__chip auth-brand-panel__chip--achv">
        🏅 Achievements
      </span>
    </aside>
  );
}

export default AuthBrandPanel;
