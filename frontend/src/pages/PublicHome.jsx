import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { ensureGuestSession, isLoggedIn, isGuest } from "../utils/guestSession";
import { GAME_TYPES, GAME_TYPE_TO_ROUTE, GAME_TYPE_TO_ICON } from "../games/gameRegistry";
import { useScrollReveal } from "../utils/useScrollReveal";
import { useDrawerA11y } from "../utils/useDrawerA11y";
import ProgressBar from "../components/ProgressBar";
import "../PublicHome.css";

const LAST_PLAYED_KEY = "lastPlayed";

// Grade bands are purely descriptive — the real, clickable grade list
// still comes from /public/standards below. This just frames the 4-12
// range for a first-time visitor before they've picked anything.
const GRADE_BANDS = [
  { label: "Primary", range: "4–5" },
  { label: "Middle School", range: "6–8" },
  { label: "High School", range: "9–10" },
  { label: "Senior Secondary", range: "11–12" },
];

// One tile per subject folder that actually exists under src/games/
// (minus the shared "core" utilities folder) — kept separate from the
// subjectIcons lookup below, which has legacy aliases ("Math" and
// "Mathematics") that would otherwise render as duplicate tiles here.
const SUBJECT_SHOWCASE = [
  { name: "Mathematics", icon: "🧮" },
  { name: "Biology", icon: "🧬" },
  { name: "Physics", icon: "⚡" },
  { name: "Chemistry", icon: "🧪" },
  { name: "Computer Science", icon: "💻" },
  { name: "Geography", icon: "🗺️" },
  { name: "English", icon: "✍️" },
  { name: "Tamil", icon: "📖" },
  { name: "Social Science", icon: "🏛️" },
  { name: "Commerce", icon: "💼" },
  { name: "History", icon: "📜" },
];

// Mechanic families actually present across the game registry — not
// every chapter is the same "read question, pick answer" loop.
const GAME_MECHANICS = [
  { icon: "🛠️", name: "Builder", blurb: "Construct equations, molecules or circuits piece by piece." },
  { icon: "🧩", name: "Match", blurb: "Pair concepts and values, avoiding the decoys mixed in." },
  { icon: "🔬", name: "Simulation & Lab", blurb: "Run a virtual experiment and see the result play out." },
  { icon: "⏱️", name: "Speed Challenge", blurb: "Race the clock to build fluency and recall." },
  { icon: "🐉", name: "Boss Challenge", blurb: "Multi-step problems that test everything at once." },
  { icon: "♟️", name: "Strategy Challenge", blurb: "Plan your moves within a limited budget of resources." },
];

function readLastPlayed() {
  try {
    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function PublicHome() {
  const navigate = useNavigate();
  const standardSectionRef = useRef(null);
  const drawerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useDrawerA11y(drawerRef, menuOpen, closeMenu);

  const [standards, setStandards] = useState([]);
  const [standardsError, setStandardsError] = useState("");

  const [selectedGrade, setSelectedGrade] = useState(null);
  const [streams, setStreams] = useState([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [units, setUnits] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterPreview, setChapterPreview] = useState(null);
  const [gamesLoading, setGamesLoading] = useState(false);

  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");

  // Chapter-id -> mastery breakdown, from /api/progress. Only ever
  // populated for a visitor who already holds a token — a real
  // login OR a returning guest session (ensureGuestSession mints a
  // real, playable account, so /progress works for guests too).
  // A brand-new visitor has no token yet and simply sees the plain
  // browse cards below, same as before.
  const [progressByChapterId, setProgressByChapterId] = useState({});

  const lastPlayed = readLastPlayed();
  const alreadyIn = isLoggedIn();

  useEffect(() => {
    api
      .get("/public/standards")
      .then((res) => setStandards(res.data.standards || []))
      .catch((err) =>
        setStandardsError(err.response?.data?.message || "Couldn't load standards"),
      );

    if (alreadyIn) {
      api
        .get("/progress")
        .then((res) => {
          const map = {};
          for (const ch of res.data.chapters || []) {
            const mastered = ch.breakdown.learning + ch.breakdown.strong;
            map[ch.chapter_id] = {
              pct:
                ch.total_concepts > 0
                  ? Math.round((mastered / ch.total_concepts) * 100)
                  : 0,
              completed: ch.total_concepts > 0 && mastered === ch.total_concepts,
              breakdown: ch.breakdown,
            };
          }
          setProgressByChapterId(map);
        })
        // Browsing still works without this — it's a nice-to-have
        // overlay, never a blocker.
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useScrollReveal(null, []);

  const subjectIcons = {
    Mathematics: "🧮",
    Math: "🧮",
    Science: "🔬",
    Biology: "🧬",
    Physics: "⚡",
    Chemistry: "🧪",
    "Computer Science": "💻",
    History: "📜",
    Geography: "🗺️",
    English: "✍️",
    Tamil: "📖",
    "Social Science": "🏛️",
  };

  const handleSelectStandard = (grade) => {
    setSelectedGrade(grade);
    setSelectedStream(null);
    setStreams([]);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setChapterPreview(null);
    setUnits([]);
    setSubjects([]);

    setStreamsLoading(true);
    api
      .get(`/public/standards/${grade}/streams`)
      .then((res) => {
        const gradeStreams = res.data.streams || [];
        setStreams(gradeStreams);
        // No streams for this standard (grades 4-10, or 11/12 with
        // none seeded yet) — behave exactly like before and load the
        // flat subject list right away.
        if (gradeStreams.length === 0) {
          fetchSubjects(grade);
        }
      })
      .catch(() => fetchSubjects(grade)) // fail open to the flat list rather than dead-ending the flow
      .finally(() => setStreamsLoading(false));
  };

  const fetchSubjects = (grade, streamId) => {
    setSubjectsLoading(true);
    api
      .get(`/public/standards/${grade}/subjects`, { params: streamId ? { streamId } : {} })
      .then((res) => setSubjects(res.data.subjects || []))
      .catch(() => setSubjects([]))
      .finally(() => setSubjectsLoading(false));
  };

  const handleSelectStream = (stream) => {
    setSelectedStream(stream);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setChapterPreview(null);
    setUnits([]);
    fetchSubjects(selectedGrade, stream.id);
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setChapterPreview(null);
    setChaptersLoading(true);
    api
      .get(`/public/subjects/${subject.id}/chapters`)
      .then((res) => setUnits(res.data.units || []))
      .catch(() => setUnits([]))
      .finally(() => setChaptersLoading(false));
  };

  const handleSelectChapter = (chapter) => {
    setSelectedChapter(chapter);
    setGamesLoading(true);
    api
      .get(`/public/chapters/${chapter.id}`)
      .then((res) => setChapterPreview(res.data))
      .catch(() => setChapterPreview(null))
      .finally(() => setGamesLoading(false));
  };

  const handlePlay = async (game) => {
    setLaunchError("");
    setLaunching(true);
    try {
      await ensureGuestSession(selectedGrade, selectedStream?.id);
      localStorage.setItem(
        LAST_PLAYED_KEY,
        JSON.stringify({
          grade: selectedGrade,
          subject: selectedSubject?.name,
          chapterTitle: selectedChapter?.title,
          gameType: game.game_type,
          gameLabel: game.label,
        }),
      );
      navigate(GAME_TYPE_TO_ROUTE[game.game_type] || "/chapters");
    } catch (err) {
      setLaunchError(err.response?.data?.message || "Couldn't start the game. Try again.");
    } finally {
      setLaunching(false);
    }
  };

  const scrollToStandards = () => {
    standardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Phase 2 Batch B: wizard-style "change this step" resets. Each one
  // clears exactly the state a fresh pick at that step would clear —
  // mirrors the resets already done in handleSelectStandard /
  // handleSelectStream / handleSelectSubject / handleSelectChapter,
  // just without re-fetching anything, since we're re-opening a step
  // rather than moving forward into a new one. No new routes, no new
  // fetches, no change to handlePlay or guest logic.
  const changeGrade = () => {
    setSelectedGrade(null);
    setSelectedStream(null);
    setStreams([]);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setChapterPreview(null);
    setUnits([]);
    setSubjects([]);
  };

  const changeStream = () => {
    setSelectedStream(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setChapterPreview(null);
    setUnits([]);
    setSubjects([]);
  };

  const changeSubject = () => {
    setSelectedSubject(null);
    setSelectedChapter(null);
    setChapterPreview(null);
    setUnits([]);
  };

  const changeChapter = () => {
    setSelectedChapter(null);
    setChapterPreview(null);
  };

  return (
    <div className="public-home">
      {/* ================= HEADER ================= */}
      <header className="ph-header">
        <div className="ph-header__inner">
          <div className="ph-header__brand">
            <span aria-hidden="true">🎓</span> Learnova
          </div>

          <nav className="ph-header__nav" aria-label="Primary">
            <button onClick={scrollToStandards} className="ph-header__link">
              Play
            </button>
            <a href="#how-it-works" className="ph-header__link">
              How It Works
            </a>
            <a href="#about" className="ph-header__link">
              About
            </a>
          </nav>

          <div className="ph-header__actions">
            <Link to="/teacher" className="ph-header__ghost-link">
              Teacher Portal
            </Link>
            <Link to="/admin" className="ph-header__ghost-link">
              Admin Portal
            </Link>
            {alreadyIn && !isGuest() ? (
              <Link to="/home" className="ph-header__signin">
                My Dashboard
              </Link>
            ) : isGuest() ? (
              <Link to="/signup" className="ph-header__signin">
                Save Progress
              </Link>
            ) : (
              <Link to="/login" className="ph-header__signin">
                Sign In
              </Link>
            )}
          </div>

          <button
            className="ph-header__hamburger"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      {/* ================= MOBILE DRAWER ================= */}
      <div
        className={`ph-drawer__backdrop${menuOpen ? " ph-drawer__backdrop--open" : ""}`}
        onClick={closeMenu}
        aria-hidden="true"
      />
      <nav
        ref={drawerRef}
        className={`ph-drawer${menuOpen ? " ph-drawer--open" : ""}`}
        aria-label="Menu"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        tabIndex={-1}
      >
        <div className="ph-drawer__header">
          <span>Menu</span>
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>
        <div className="ph-drawer__group-label">Play</div>
        <button
          className="ph-drawer__link"
          onClick={() => {
            setMenuOpen(false);
            scrollToStandards();
          }}
        >
          Standards
        </button>
        <div className="ph-drawer__group-label">Teacher</div>
        <Link to="/teacher" className="ph-drawer__link" onClick={() => setMenuOpen(false)}>
          Teacher Portal
        </Link>
        <div className="ph-drawer__group-label">Administration</div>
        <Link to="/admin" className="ph-drawer__link" onClick={() => setMenuOpen(false)}>
          Admin Portal
        </Link>
        <div className="ph-drawer__group-label">Account</div>
        {alreadyIn && !isGuest() ? (
          <Link to="/home" className="ph-drawer__link" onClick={() => setMenuOpen(false)}>
            My Dashboard
          </Link>
        ) : isGuest() ? (
          <Link to="/signup" className="ph-drawer__link" onClick={() => setMenuOpen(false)}>
            Save Progress
          </Link>
        ) : (
          <Link to="/login" className="ph-drawer__link" onClick={() => setMenuOpen(false)}>
            Sign In
          </Link>
        )}
      </nav>

      {/* ================= HERO ================= */}
      <section className="ph-hero">
        <div className="ph-hero__orbit" aria-hidden="true">
          {SUBJECT_SHOWCASE.slice(0, 6).map((s, i) => (
            <span key={s.name} className={`ph-hero__orbit-icon ph-hero__orbit-icon--${i}`}>
              {s.icon}
            </span>
          ))}
        </div>
        <p className="ph-hero__eyebrow">PLAY WITHOUT LOGIN</p>
        <h1 className="ph-hero__title">
          LEARN. PLAY. <span className="ph-hero__accent">MASTER.</span>
        </h1>
        <p className="ph-hero__sub">
          Educational games for Standards 4–12. Choose your standard and start
          learning through interactive gameplay — no signup needed.
        </p>
        <button className="ph-hero__cta" onClick={scrollToStandards}>
          START PLAYING <span aria-hidden="true">→</span>
        </button>
        <div className="ph-hero__stats">
          <div className="ph-hero__stat">
            <span className="ph-hero__stat-num">4–12</span>
            <span className="ph-hero__stat-label">Standards</span>
          </div>
          <div className="ph-hero__stat">
            <span className="ph-hero__stat-num">{SUBJECT_SHOWCASE.length}+</span>
            <span className="ph-hero__stat-label">Subjects</span>
          </div>
          <div className="ph-hero__stat">
            <span className="ph-hero__stat-num">{GAME_TYPES.length}+</span>
            <span className="ph-hero__stat-label">Game Types</span>
          </div>
        </div>
      </section>

      {/* ================= CONTINUE PLAYING =================
          Moved up from below Subject Showcase (Phase 2) so a
          returning student sees it immediately after the hero,
          per the brief's "surface the real continuation path"
          guidance — still purely driven by the real lastPlayed
          localStorage entry, nothing fabricated. */}
      {lastPlayed && (
        <section className="ph-continue ph-reveal">
          <div className="ph-continue__card">
            <div>
              <p className="ph-continue__eyebrow">CONTINUE PLAYING</p>
              <p className="ph-continue__title">
                Standard {lastPlayed.grade} · {lastPlayed.subject}
              </p>
              <p className="ph-continue__sub">
                {lastPlayed.chapterTitle} — {lastPlayed.gameLabel}
              </p>
            </div>
            <button
              className="ph-continue__btn"
              onClick={() => navigate(GAME_TYPE_TO_ROUTE[lastPlayed.gameType] || "/chapters")}
            >
              CONTINUE
            </button>
          </div>
        </section>
      )}

      {/* ================= ZONE 1: START LEARNING =================
          Grade Bands (context) + the full Standard -> Stream ->
          Subject -> Chapter -> Game wizard, grouped into one visual
          panel instead of reading as 5 separate stacked page
          sections (Phase 2 accordion fix). No change to any step's
          internal logic, data-fetching, or trail-chip behavior. */}
      <div className="ph-zone ph-zone--start">
      {/* ================= GRADE BANDS OVERVIEW ================= */}
      <section className="ph-section ph-bands ph-reveal">
        <h2 className="ph-section__title">ONE PLATFORM, EVERY STAGE</h2>
        <div className="ph-bands__grid">
          {GRADE_BANDS.map((band) => (
            <div key={band.label} className="ph-bands__card">
              <p className="ph-bands__range">Grades {band.range}</p>
              <p className="ph-bands__label">{band.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= STANDARD SELECTION ================= */}
      <section className="ph-section ph-reveal" ref={standardSectionRef}>
        <h2 className="ph-section__title">CHOOSE YOUR STANDARD</h2>
        {standardsError && <p className="ph-error">{standardsError}</p>}
        {selectedGrade ? (
          <button className="ph-trail-chip" onClick={changeGrade}>
            <span className="ph-trail-chip__label">Standard {selectedGrade}</span>
            <span className="ph-trail-chip__change">Change</span>
          </button>
        ) : (
          <div className="ph-standard-grid">
            {standards.map((g) => (
              <button
                key={g}
                className={`ph-standard-card${selectedGrade === g ? " ph-standard-card--active" : ""}`}
                onClick={() => handleSelectStandard(g)}
              >
                <span className="ph-standard-card__num">{g}</span>
                <span className="ph-standard-card__label">Standard</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ================= STREAM SELECTION (Grade 11/12 only) ================= */}
      {selectedGrade && streams.length > 0 && (
        <section className="ph-section">
          <h2 className="ph-section__title">CHOOSE YOUR STREAM — STANDARD {selectedGrade}</h2>
          {streamsLoading ? (
            <p className="ph-loading">Loading streams…</p>
          ) : selectedStream ? (
            <button className="ph-trail-chip" onClick={changeStream}>
              <span className="ph-trail-chip__label">{selectedStream.name}</span>
              <span className="ph-trail-chip__change">Change</span>
            </button>
          ) : (
            <div className="ph-subject-grid">
              {streams.map((s) => (
                <button
                  key={s.id}
                  className={`ph-subject-card${selectedStream?.id === s.id ? " ph-subject-card--active" : ""}`}
                  onClick={() => handleSelectStream(s)}
                >
                  <span className="ph-subject-card__icon" aria-hidden="true">
                    🎯
                  </span>
                  <span className="ph-subject-card__title">{s.name}</span>
                  <span className="ph-chapter-card__meta">{s.core_subjects.join(", ")}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= SUBJECT SELECTION ================= */}
      {selectedGrade && (streams.length === 0 || selectedStream) && (
        <section className="ph-section">
          <h2 className="ph-section__title">
            CHOOSE A SUBJECT — STANDARD {selectedGrade}
            {selectedStream ? ` · ${selectedStream.name.toUpperCase()}` : ""}
          </h2>
          {subjectsLoading ? (
            <p className="ph-loading">Loading subjects…</p>
          ) : subjects.length === 0 ? (
            <p className="ph-empty">No subjects published for this standard yet.</p>
          ) : selectedSubject ? (
            <button className="ph-trail-chip" onClick={changeSubject}>
              <span className="ph-trail-chip__label">
                {subjectIcons[selectedSubject.name] || "📘"} {selectedSubject.name}
              </span>
              <span className="ph-trail-chip__change">Change</span>
            </button>
          ) : (
            <div className="ph-subject-grid">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  className={`ph-subject-card${selectedSubject?.id === s.id ? " ph-subject-card--active" : ""}`}
                  onClick={() => handleSelectSubject(s)}
                >
                  <span className="ph-subject-card__icon" aria-hidden="true">
                    {subjectIcons[s.name] || "📘"}
                  </span>
                  <span className="ph-subject-card__title">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= CHAPTER SELECTION ================= */}
      {selectedSubject && (
        <section className="ph-section">
          <h2 className="ph-section__title">CHAPTERS — {selectedSubject.name.toUpperCase()}</h2>
          {chaptersLoading ? (
            <p className="ph-loading">Loading chapters…</p>
          ) : units.length === 0 ? (
            <p className="ph-empty">No chapters published for this subject yet.</p>
          ) : selectedChapter ? (
            <button className="ph-trail-chip" onClick={changeChapter}>
              <span className="ph-trail-chip__label">{selectedChapter.title}</span>
              <span className="ph-trail-chip__change">Change</span>
            </button>
          ) : (
            units.map((unit) => (
              <div key={unit.unit_name} className="ph-unit-group">
                <p className="ph-unit-group__label">{unit.unit_name}</p>
                <div className="ph-chapter-list">
                  {unit.chapters.map((ch) => {
                    const progress = progressByChapterId[ch.id];
                    return (
                      <button
                        key={ch.id}
                        className={`ph-chapter-card${selectedChapter?.id === ch.id ? " ph-chapter-card--active" : ""}`}
                        onClick={() => handleSelectChapter(ch)}
                      >
                        <div className="ph-chapter-card__titlerow">
                          <span className="ph-chapter-card__title">{ch.title}</span>
                          {progress?.completed && (
                            <span className="ph-chapter-card__badge ph-chapter-card__badge--done">
                              ✓ Completed
                            </span>
                          )}
                          {progress && !progress.completed && progress.pct > 0 && (
                            <span className="ph-chapter-card__badge">In Progress</span>
                          )}
                        </div>
                        {progress && (
                          <>
                            <ProgressBar value={progress.pct} max={100} variant="primary" height={5} />
                            <span className="ph-chapter-card__meta">{progress.pct}% mastered</span>
                          </>
                        )}
                        <span className="ph-chapter-card__meta">
                          {ch.game_count} Interactive Game{ch.game_count === 1 ? "" : "s"}
                          {ch.difficulty_label ? ` · ${ch.difficulty_label}` : ""}
                          {ch.estimated_minutes ? ` · ~${ch.estimated_minutes} min` : ""}
                        </span>
                        <span className="ph-chapter-card__cta">
                          {progress?.completed
                            ? "Replay Chapter →"
                            : progress?.pct > 0
                              ? "Continue Chapter →"
                              : "Explore Chapter →"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ================= GAME SELECTION ================= */}
      {selectedChapter && (
        <section className="ph-section">
          <h2 className="ph-section__title">{selectedChapter.title.toUpperCase()} — GAMES</h2>
          {gamesLoading ? (
            <p className="ph-loading">Loading games…</p>
          ) : !chapterPreview || chapterPreview.games.length === 0 ? (
            <p className="ph-empty">No games published for this chapter yet.</p>
          ) : (
            <div className="ph-game-grid">
              {chapterPreview.games.map((g) => (
                <div key={g.game_type} className="ph-game-card">
                  <div className="ph-game-card__icon" aria-hidden="true">
                    {GAME_TYPE_TO_ICON[g.game_type] || "🎮"}
                  </div>
                  <div className="ph-game-card__body">
                    <p className="ph-game-card__title">{g.label}</p>
                    {g.objective && (
                      <p className="ph-game-card__objective">Learn: {g.objective}</p>
                    )}
                    <div className="ph-game-card__tags">
                      <span className="ph-game-card__tag">{g.mechanic}</span>
                      {g.difficulty_label && (
                        <span className="ph-game-card__tag">{g.difficulty_label}</span>
                      )}
                      {g.estimated_minutes && (
                        <span className="ph-game-card__tag">~{g.estimated_minutes} min</span>
                      )}
                      <span className="ph-game-card__tag">
                        {g.count} level{g.count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="ph-game-card__play"
                    disabled={launching}
                    onClick={() => handlePlay(g)}
                  >
                    {launching ? "Starting…" : "PLAY NOW"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {launchError && <p className="ph-error">{launchError}</p>}
        </section>
      )}
      </div>
      {/* ================= END ZONE 1 ================= */}

      {/* ================= ZONE 2: DISCOVER =================
          "What can I learn/play" — Subject Showcase (moved up from
          below Grade Bands) grouped with Game Mechanics, since both
          answer the same north-star question (brief section 6). */}
      <div className="ph-zone ph-zone--discover">
      {/* ================= SUBJECT SHOWCASE ================= */}
      <section className="ph-section ph-showcase ph-reveal">
        <h2 className="ph-section__title">SUBJECTS YOU CAN PLAY</h2>
        <div className="ph-showcase__grid">
          {SUBJECT_SHOWCASE.map((s) => (
            <div key={s.name} className="ph-showcase__card">
              <span className="ph-showcase__icon" aria-hidden="true">
                {s.icon}
              </span>
              <span className="ph-showcase__label">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= GAME MECHANICS ================= */}
      <section className="ph-section ph-mechanics ph-reveal">
        <h2 className="ph-section__title">NOT JUST ANOTHER QUIZ</h2>
        <div className="ph-mechanics__grid">
          {GAME_MECHANICS.map((m) => (
            <div key={m.name} className="ph-mechanics__card">
              <span className="ph-mechanics__icon" aria-hidden="true">
                {m.icon}
              </span>
              <p className="ph-mechanics__title">{m.name}</p>
              <p className="ph-mechanics__blurb">{m.blurb}</p>
            </div>
          ))}
        </div>
      </section>
      </div>
      {/* ================= END ZONE 2 ================= */}

      {/* ================= ZONE 3: WHY LEARNOVA =================
          Progress/XP + How It Works + Teacher/Admin Roles grouped —
          the platform's credibility/trust content (brief section 8). */}
      <div className="ph-zone ph-zone--why">
      {/* ================= PROGRESS / XP / ACHIEVEMENTS ================= */}
      <section className="ph-section ph-progress-showcase ph-reveal">
        <h2 className="ph-section__title">TRACK EVERY STEP FORWARD</h2>
        <div className="ph-progress-showcase__grid">
          <div className="ph-progress-showcase__card">
            <span className="ph-progress-showcase__icon" aria-hidden="true">⭐</span>
            <p className="ph-progress-showcase__title">XP & Levels</p>
            <p className="ph-progress-showcase__desc">
              Earn XP for every game you complete and watch your total grow.
            </p>
          </div>
          <div className="ph-progress-showcase__card">
            <span className="ph-progress-showcase__icon" aria-hidden="true">🔥</span>
            <p className="ph-progress-showcase__title">Daily Streaks</p>
            <p className="ph-progress-showcase__desc">
              Play a little each day to keep your streak alive.
            </p>
          </div>
          <div className="ph-progress-showcase__card">
            <span className="ph-progress-showcase__icon" aria-hidden="true">🏅</span>
            <p className="ph-progress-showcase__title">Achievements</p>
            <p className="ph-progress-showcase__desc">
              Unlock badges as you master chapters and build habits.
            </p>
          </div>
        </div>
        <p className="ph-progress-showcase__note">
          Playing as a guest? Your XP and streak start counting the moment you
          play — sign up anytime to keep them.
        </p>
      </section>

      {/* ================= TEACHER & ADMIN ================= */}
      <section className="ph-section ph-roles ph-reveal">
        <h2 className="ph-section__title">BUILT FOR THE WHOLE SCHOOL</h2>
        <div className="ph-roles__grid">
          <div className="ph-roles__card">
            <p className="ph-roles__eyebrow">FOR TEACHERS</p>
            <p className="ph-roles__title">See exactly where your class stands</p>
            <p className="ph-roles__desc">
              Track class progress, spot weak areas, and review results from
              one dashboard.
            </p>
            <Link to="/teacher" className="ph-roles__link">
              Open Teacher Portal →
            </Link>
          </div>
          <div className="ph-roles__card">
            <p className="ph-roles__eyebrow">FOR ADMINISTRATORS</p>
            <p className="ph-roles__title">Manage the whole platform</p>
            <p className="ph-roles__desc">
              Oversee students, staff, content and results across every
              grade and subject.
            </p>
            <Link to="/admin" className="ph-roles__link">
              Open Admin Portal →
            </Link>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      {/* Moved to sit directly before the Final CTA (was previously
          the reverse order): a "Ready to play?" CTA followed by two
          more explanatory sections and then the footer undercut the
          whole point of a *final* CTA — it wasn't actually last. Content
          is unchanged, just reordered so the page closes on the CTA. */}
      <section id="how-it-works" className="ph-section ph-howitworks ph-reveal">
        <h2 className="ph-section__title">HOW IT WORKS</h2>
        <div className="ph-howitworks__grid">
          <div className="ph-howitworks__step">
            <span className="ph-howitworks__num">1</span>
            <p>Pick your standard and subject</p>
          </div>
          <div className="ph-howitworks__step">
            <span className="ph-howitworks__num">2</span>
            <p>Choose a chapter and a game</p>
          </div>
          <div className="ph-howitworks__step">
            <span className="ph-howitworks__num">3</span>
            <p>Play instantly — no login needed</p>
          </div>
          <div className="ph-howitworks__step">
            <span className="ph-howitworks__num">4</span>
            <p>Sign in anytime to save your progress</p>
          </div>
        </div>
      </section>
      </div>
      {/* ================= END ZONE 3 ================= */}

      {/* ================= FINAL CTA ================= */}
      <section className="ph-final-cta ph-reveal">
        <h2 className="ph-final-cta__title">Ready to play?</h2>
        <p className="ph-final-cta__sub">
          No account needed to start — jump in as a guest right now.
        </p>
        <button className="ph-hero__cta" onClick={scrollToStandards}>
          START PLAYING <span aria-hidden="true">→</span>
        </button>
      </section>

      {/* ================= ABOUT / FOOTER ================= */}
      <section id="about" className="ph-about ph-reveal">
        <div className="ph-about__grid">
          <div className="ph-about__brand-col">
            <p className="ph-about__brand">🎓 Learnova</p>
            <p className="ph-about__tagline">
              An interactive learning platform for Standards 4–12 — build,
              solve, and investigate your way through the curriculum.
            </p>
          </div>
          <div className="ph-about__col">
            <p className="ph-about__col-title">Play</p>
            <button className="ph-about__link" onClick={scrollToStandards}>
              Choose a Standard
            </button>
            <a href="#how-it-works" className="ph-about__link">
              How It Works
            </a>
            {alreadyIn && !isGuest() ? (
              <Link to="/home" className="ph-about__link">
                My Dashboard
              </Link>
            ) : (
              <Link to="/signup" className="ph-about__link">
                Create an Account
              </Link>
            )}
          </div>
          <div className="ph-about__col">
            <p className="ph-about__col-title">Portals</p>
            <Link to="/teacher" className="ph-about__link">
              Teacher Portal
            </Link>
            <Link to="/admin" className="ph-about__link">
              Admin Portal
            </Link>
            <Link to="/login" className="ph-about__link">
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PublicHome;
