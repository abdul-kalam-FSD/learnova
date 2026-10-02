import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import Modal from "../components/Modal";
import TeacherTabs from "../components/TeacherTabs";
import "../Teacher.css";

// Same grade range the backend enforces (models/Section.js, User.js,
// teacherControllers.getContentTree). Subjects/chapters/games below are
// NOT hardcoded — they always come from the API for the chosen grade.
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const MAX_CHALLENGES = 20; // mirrors backend utils/contestLifecycle.js

const formatWindow = (startAt, endAt) => {
  const opts = { dateStyle: "medium", timeStyle: "short" };
  return `${new Date(startAt).toLocaleString(undefined, opts)} → ${new Date(endAt).toLocaleString(undefined, opts)}`;
};

// One human label + style per stored status. PUBLISHED is refined by
// the server-derived `phase` (upcoming / live / ended).
function statusInfo(contest) {
  switch (contest.status) {
    case "DRAFT":
      return { label: "Draft", className: "teacher-contests__pill--draft" };
    case "PENDING_APPROVAL":
      return { label: "Awaiting approval", className: "teacher-contests__pill--pending" };
    case "REJECTED":
      return { label: "Needs changes", className: "teacher-contests__pill--rejected" };
    case "PUBLISHED":
      if (contest.phase === "ACTIVE") return { label: "Live", className: "teacher-assignments__progress-pill--done" };
      if (contest.phase === "ENDED") return { label: "Ended", className: "teacher-contests__pill--draft" };
      return { label: "Published · Upcoming", className: "teacher-assignments__progress-pill--done" };
    default:
      return { label: contest.status, className: "" };
  }
}

// <input type="datetime-local"> gives a local wall-clock string with no
// timezone; new Date(...) interprets it as local time, .toISOString()
// then sends an unambiguous UTC instant to the server.
const toIso = (localValue) => (localValue ? new Date(localValue).toISOString() : "");

function CreateContestModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState("");

  const [tree, setTree] = useState(null);
  const [treeError, setTreeError] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");

  const [games, setGames] = useState(null);
  const [gamesError, setGamesError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Guards against a slow response for a previous grade/subject/chapter
  // overwriting the list for the current one (teacher changes their
  // mind quickly).
  const treeRequest = useRef(0);
  const gamesRequest = useRef(0);

  const loadGames = (nextSubjectId, nextChapterId) => {
    const requestId = ++gamesRequest.current;
    setGames(null);
    setGamesError("");
    setSelectedIds([]);
    if (!nextSubjectId) return;
    api
      .get("/contests/game-options", {
        params: { subjectId: nextSubjectId, chapterId: nextChapterId || undefined },
      })
      .then((res) => {
        if (requestId === gamesRequest.current) setGames(res.data.games);
      })
      .catch((err) => {
        if (requestId === gamesRequest.current) setGamesError(err.response?.data?.message || err.message);
      });
  };

  const handleGradeChange = (value) => {
    setGrade(value);
    setSubjectId("");
    setChapterId("");
    setTree(null);
    setTreeError("");
    loadGames("", "");
    if (!value) return;
    const requestId = ++treeRequest.current;
    api
      .get("/teacher/content-tree", { params: { grade: Number(value) } })
      .then((res) => {
        if (requestId === treeRequest.current) setTree(res.data.subjects);
      })
      .catch((err) => {
        if (requestId === treeRequest.current) setTreeError(err.response?.data?.message || err.message);
      });
  };

  const handleSubjectChange = (value) => {
    setSubjectId(value);
    setChapterId("");
    loadGames(value, "");
  };

  const handleChapterChange = (value) => {
    setChapterId(value);
    loadGames(subjectId, value);
  };

  const toggleGame = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CHALLENGES) return prev;
      return [...prev, id];
    });
  };

  const subject = tree?.find((s) => s.id === subjectId);

  // Group the picker by chapter (only meaningful when "All chapters"
  // is chosen) while keeping the server's syllabus order.
  const groupedGames = [];
  if (games) {
    for (const g of games) {
      const last = groupedGames[groupedGames.length - 1];
      if (last && last.chapterId === g.chapterId) last.items.push(g);
      else groupedGames.push({ chapterId: g.chapterId, chapterTitle: g.chapterTitle, items: [g] });
    }
  }

  const validate = () => {
    if (!title.trim()) return "Give the contest a title";
    if (!grade) return "Choose a grade";
    if (!subjectId) return "Choose a subject";
    if (selectedIds.length === 0) return "Pick at least one game for the contest";
    if (!startAt || !endAt) return "Set both a start and an end date/time";
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) return "The end time must be after the start time";
    return "";
  };

  const save = async (submitForApproval) => {
    const problem = validate();
    if (problem) {
      setSubmitError(problem);
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      await api.post("/contests", {
        title: title.trim(),
        description: description.trim(),
        grade: Number(grade),
        subjectId,
        chapterId: chapterId || undefined,
        challengeIds: selectedIds,
        startAt: toIso(startAt),
        endAt: toIso(endAt),
        submitForApproval,
      });
      onCreated();
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Contest" onClose={onClose}>
      {submitError && <p className="admin-modal__error">{submitError}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <div className="admin-modal__field">
          <label className="admin-modal__label">
            Contest title
            <input
              className="admin-modal__input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Weekly Fractions Blitz"
            />
          </label>
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label">
            Description / instructions (optional)
            <textarea
              className="admin-modal__input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </label>
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label">
            Grade
            <select className="admin-modal__input" value={grade} onChange={(e) => handleGradeChange(e.target.value)}>
              <option value="">Choose a grade...</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </label>
        </div>

        {grade && (
          <>
            {treeError && <p className="admin-modal__error">{treeError}</p>}
            <div className="admin-modal__field">
              <label className="admin-modal__label">
                Subject
                <select
                  className="admin-modal__input"
                  value={subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  disabled={!tree}
                >
                  <option value="">{tree ? "Choose a subject..." : "Loading..."}</option>
                  {tree?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        {subject && (
          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Chapter
              <select
                className="admin-modal__input"
                value={chapterId}
                onChange={(e) => handleChapterChange(e.target.value)}
              >
                <option value="">All chapters</option>
                {subject.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {subjectId && (
          <div className="admin-modal__field">
            <p className="admin-modal__label">
              Games / challenges ({selectedIds.length} selected, max {MAX_CHALLENGES})
            </p>
            {gamesError && <p className="admin-modal__error">{gamesError}</p>}
            {!games && !gamesError && <p className="teacher-page__loading">Loading games...</p>}
            {games && games.length === 0 && (
              <p className="teacher-page__subtitle">
                No playable games exist for this selection yet. Try another chapter or subject.
              </p>
            )}
            {games && games.length > 0 && (
              <div className="teacher-contests__picker" role="group" aria-label="Contest games">
                {groupedGames.map((group) => (
                  <div key={group.chapterId || "none"}>
                    {!chapterId && <p className="teacher-contests__picker-group">{group.chapterTitle}</p>}
                    {group.items.map((g) => (
                      <label key={g.id} className="teacher-contests__picker-row">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(g.id)}
                          onChange={() => toggleGame(g.id)}
                          disabled={!selectedIds.includes(g.id) && selectedIds.length >= MAX_CHALLENGES}
                        />
                        <span>
                          {g.title} · {g.label}
                        </span>
                        <span className="teacher-contests__picker-meta">{g.difficulty}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="admin-modal__field">
          <label className="admin-modal__label">
            Starts
            <input
              className="admin-modal__input"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </label>
        </div>
        <div className="admin-modal__field">
          <label className="admin-modal__label">
            Ends
            <input
              className="admin-modal__input"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </label>
        </div>

        <div className="admin-modal__actions">
          <button className="teacher-page__page-btn" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="teacher-page__page-btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button className="btn-primary" type="button" onClick={() => save(true)} disabled={saving}>
            Submit for Approval
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TeacherContests() {
  const [contests, setContests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Separate from `error`: a failed submit on one contest must not hide
  // the rest of the list (same split TeacherAssignments uses).
  const [actionError, setActionError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/contests/my")
      .then((res) => setContests(res.data.contests))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Same react.dev "fetching data in an Effect" pattern the other
    // teacher pages use (see TeacherAssignments.jsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const handleSubmitForApproval = async (id) => {
    setSubmittingId(id);
    setActionError("");
    try {
      const res = await api.post(`/contests/${id}/submit`);
      setContests((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="teacher-page p-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="teacher-page__title">Contests</h1>
        <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
          + Create Contest
        </button>
      </div>
      <p className="teacher-page__subtitle mb-4">
        {contests ? `${contests.length} contest${contests.length === 1 ? "" : "s"}` : "\u00A0"}
      </p>

      <TeacherTabs />

      <p className="teacher-contests__note mb-4">
        Build a contest from Learnova games for a whole grade, then submit it for admin approval. Student
        participation and results are coming in a later update.
      </p>

      {loading && <PageLoading label="Loading contests..." />}
      {error && <p className="teacher-page__error">{error}</p>}
      {actionError && <p className="teacher-page__error">{actionError}</p>}

      {!loading && !error && contests && contests.length === 0 && (
        <EmptyState
          icon="🏆"
          title="No contests yet"
          subtitle="Tap Create Contest to pick a grade, choose games, and set a start and end time."
        />
      )}

      {!loading && !error && contests && contests.length > 0 && (
        <div className="flex flex-col gap-3">
          {contests.map((c) => {
            const info = statusInfo(c);
            const canSubmit = c.status === "DRAFT" || c.status === "REJECTED";
            return (
              <div key={c.id} className="teacher-assignments__card">
                <div className="teacher-assignments__card-top">
                  <div>
                    <p className="teacher-assignments__concept">{c.title}</p>
                    <p className="teacher-assignments__meta">
                      {[`Grade ${c.grade}`, c.subject, c.chapterTitle || "All chapters"].filter(Boolean).join(" · ")}
                    </p>
                    <p className="teacher-assignments__meta">{formatWindow(c.startAt, c.endAt)}</p>
                  </div>
                  <span className={`teacher-assignments__progress-pill ${info.className}`}>{info.label}</span>
                </div>

                {c.description && <p className="teacher-assignments__note">“{c.description}”</p>}

                {c.status === "PENDING_APPROVAL" && (
                  <p className="teacher-contests__review-note teacher-contests__review-note--info">
                    Submitted — waiting for an admin to review it.
                  </p>
                )}

                {c.status === "REJECTED" && (
                  <p className="teacher-contests__review-note" role="note">
                    <strong>Admin feedback:</strong> {c.reviewNote || "No reason was given."}
                    <span className="teacher-contests__review-hint">
                      Contests can&apos;t be edited yet. You can resubmit it as-is, or create a new contest with the fixes.
                    </span>
                  </p>
                )}

                <ul className="teacher-contests__challenges" aria-label={`Games in ${c.title}`}>
                  {c.challenges.map((ch) => (
                    <li key={ch.id} className="teacher-contests__challenge">
                      {ch.title}
                      {ch.label ? ` · ${ch.label}` : ""}
                    </li>
                  ))}
                </ul>

                {c.status === "PUBLISHED" && c.phase !== "UPCOMING" && (
                  <div className="flex items-center gap-3 mt-2">
                    <Link to={`/teacher/contests/${c.id}/results`} className="teacher-detail__assign-btn">
                      View results
                    </Link>
                  </div>
                )}

                {canSubmit && (
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      className="teacher-detail__assign-btn"
                      onClick={() => handleSubmitForApproval(c.id)}
                      disabled={submittingId === c.id}
                    >
                      {submittingId === c.id ? "Submitting..." : "Submit for approval"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateContestModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

export default TeacherContests;
