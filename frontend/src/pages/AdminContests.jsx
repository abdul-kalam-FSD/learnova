import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import Modal from "../components/Modal";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

const REASON_MIN = 5; // mirrors backend utils/contestLifecycle.js
const REASON_MAX = 500;

const STATUS_LABELS = {
  PENDING_APPROVAL: "Pending",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

const STATUS_BADGE_CLASS = {
  PENDING_APPROVAL: "role-badge--pending",
  PUBLISHED: "role-badge--published",
  REJECTED: "role-badge--rejected",
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

function StatusBadge({ status }) {
  return (
    <span className={`role-badge ${STATUS_BADGE_CLASS[status] || ""}`}>{STATUS_LABELS[status] || status}</span>
  );
}

// Everything an admin needs to decide, fetched fresh when opened (so the
// admin never decides on a stale list row). The server never sends game
// answer keys — only title / type / difficulty.
function ReviewModal({ contestId, onClose, onReviewed }) {
  const [contest, setContest] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const loadDetail = () =>
    api
      .get(`/admin/contests/${contestId}`)
      .then((res) => setContest(res.data))
      .catch((err) => setLoadError(err.response?.data?.message || err.message));

  useEffect(() => {
    // React's documented "fetching data in an Effect" pattern.
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const isPending = contest?.status === "PENDING_APPROVAL";

  const handleError = (err) => {
    setActionError(err.response?.data?.message || err.message);
    // 409 = someone else already reviewed it (or its status changed).
    // Show the up-to-date state and refresh the list behind the modal.
    if (err.response?.status === 409) {
      setRejecting(false);
      loadDetail();
      onReviewed({ keepOpen: true });
    }
  };

  const handleApprove = () => {
    if (
      !window.confirm(
        `Approve "${contest.title}"? It will be published and teachers/students will be able to see it as an approved contest.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setActionError("");
    api
      .post(`/admin/contests/${contestId}/approve`, {})
      .then(() => onReviewed({ keepOpen: false }))
      .catch(handleError)
      .finally(() => setSaving(false));
  };

  const handleReject = () => {
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN) {
      setActionError(`Please give a reason of at least ${REASON_MIN} characters`);
      return;
    }
    setSaving(true);
    setActionError("");
    api
      .post(`/admin/contests/${contestId}/reject`, { note: trimmed })
      .then(() => onReviewed({ keepOpen: false }))
      .catch(handleError)
      .finally(() => setSaving(false));
  };

  return (
    <Modal title="Review contest" onClose={onClose}>
      {loadError && <p className="admin-modal__error">{loadError}</p>}
      {!contest && !loadError && <PageLoading label="Loading contest..." />}

      {contest && (
        <>
          <h3 className="admin-modal__title" style={{ marginBottom: 8 }}>
            {contest.title} <StatusBadge status={contest.status} />
          </h3>

          <dl className="admin-contest__meta">
            <dt>Teacher</dt>
            <dd>
              {contest.teacher.name}
              {contest.teacher.email ? ` (${contest.teacher.email})` : ""}
            </dd>
            <dt>Grade</dt>
            <dd>Grade {contest.grade}</dd>
            <dt>Subject</dt>
            <dd>{contest.subject || "—"}</dd>
            <dt>Chapter</dt>
            <dd>{contest.chapterTitle || "All chapters"}</dd>
            <dt>Starts</dt>
            <dd>{formatDateTime(contest.startAt)}</dd>
            <dt>Ends</dt>
            <dd>{formatDateTime(contest.endAt)}</dd>
            <dt>Submitted</dt>
            <dd>{formatDateTime(contest.submittedAt)}</dd>
            <dt>Created</dt>
            <dd>{formatDateTime(contest.createdAt)}</dd>
          </dl>

          {contest.description && (
            <>
              <p className="admin-contest__section-title">Instructions</p>
              <p className="admin-contest__description">{contest.description}</p>
            </>
          )}

          <p className="admin-contest__section-title">Games ({contest.challenges.length})</p>
          <ul className="admin-contest__games">
            {contest.challenges.map((g) => (
              <li key={g.id}>
                <span>
                  {g.title}
                  {g.label ? ` · ${g.label}` : ""}
                </span>
                <span className="admin-contest__games-meta">{g.difficulty || ""}</span>
              </li>
            ))}
          </ul>

          {contest.reviewedBy && (
            <>
              <p className="admin-contest__section-title">Last review</p>
              <p className="admin-contest__description">
                {STATUS_LABELS[contest.status] === "Rejected" ? "Rejected" : "Reviewed"} by {contest.reviewedBy.name} on{" "}
                {formatDateTime(contest.reviewedAt)}
                {contest.reviewNote ? ` — “${contest.reviewNote}”` : ""}
              </p>
            </>
          )}

          {actionError && <p className="admin-modal__error">{actionError}</p>}

          {rejecting && isPending && (
            <div className="admin-modal__field">
              <label className="admin-modal__label">
                Reason for rejection (shown to the teacher)
                <textarea
                  className="admin-modal__input"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={REASON_MAX}
                  placeholder="e.g. The games are too easy for Grade 6 — please add a harder one."
                />
              </label>
            </div>
          )}

          <div className="admin-modal__actions">
            {!isPending && (
              <button className="admin-page__page-btn" type="button" onClick={onClose}>
                Close
              </button>
            )}

            {isPending && !rejecting && (
              <>
                <button className="admin-page__page-btn" type="button" onClick={onClose} disabled={saving}>
                  Close
                </button>
                <button
                  className="admin-page__danger-btn"
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setRejecting(true);
                  }}
                  disabled={saving}
                >
                  Reject
                </button>
                <button className="admin-page__export-btn" type="button" onClick={handleApprove} disabled={saving}>
                  {saving ? "Approving..." : "Approve"}
                </button>
              </>
            )}

            {isPending && rejecting && (
              <>
                <button
                  className="admin-page__page-btn"
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setActionError("");
                  }}
                  disabled={saving}
                >
                  Back
                </button>
                <button className="admin-page__danger-btn" type="button" onClick={handleReject} disabled={saving}>
                  {saving ? "Rejecting..." : "Confirm rejection"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

function AdminContests() {
  // Pending is the default view: it's the queue the admin came to work.
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Same react.dev "fetching data in an Effect" pattern as AdminStaff.jsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    const params = { page, limit: 20 };
    if (status) params.status = status;

    api
      .get("/admin/contests", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [status, page, refreshKey]);

  const counts = data?.counts;
  const pendingCount = counts?.PENDING_APPROVAL ?? 0;
  const optionLabel = (value, label) => (counts && value ? `${label} (${counts[value]})` : label);

  const handleReviewed = ({ keepOpen }) => {
    if (!keepOpen) setReviewId(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">Contest Review</h1>
      <p className="admin-page__subtitle mb-4">
        {counts ? `${pendingCount} contest${pendingCount === 1 ? "" : "s"} awaiting review` : "\u00A0"}
      </p>

      <AdminTabs />

      <div className="admin-page__toolbar mb-4">
        <select
          className="admin-page__select"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="PENDING_APPROVAL">{optionLabel("PENDING_APPROVAL", "Pending approval")}</option>
          <option value="PUBLISHED">{optionLabel("PUBLISHED", "Published")}</option>
          <option value="REJECTED">{optionLabel("REJECTED", "Rejected")}</option>
          <option value="">All submitted</option>
        </select>
      </div>

      {loading && <PageLoading label="Loading contests..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && data && data.contests.length === 0 && (
        <EmptyState
          icon="🏆"
          title={status === "PENDING_APPROVAL" ? "Nothing waiting for review" : "No contests found"}
          subtitle={
            status === "PENDING_APPROVAL"
              ? "Contests teachers submit for approval will show up here."
              : "Try a different status filter."
          }
        />
      )}

      {!loading && !error && data && data.contests.length > 0 && (
        <>
          <div className="admin-table__wrapper mb-4">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-table__head-cell">Contest</th>
                  <th className="admin-table__head-cell">Teacher</th>
                  <th className="admin-table__head-cell">Grade</th>
                  <th className="admin-table__head-cell">Subject / Chapter</th>
                  <th className="admin-table__head-cell">Games</th>
                  <th className="admin-table__head-cell">Window</th>
                  <th className="admin-table__head-cell">Submitted</th>
                  <th className="admin-table__head-cell">Status</th>
                  <th className="admin-table__head-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.contests.map((c) => (
                  <tr key={c.id} className="admin-table__row">
                    <td className="admin-table__cell">{c.title}</td>
                    <td className="admin-table__cell">{c.teacher.name}</td>
                    <td className="admin-table__cell">{c.grade}</td>
                    <td className="admin-table__cell">
                      {c.subject || "—"} · {c.chapterTitle || "All chapters"}
                    </td>
                    <td className="admin-table__cell">{c.challengeCount}</td>
                    <td className="admin-table__cell">
                      {formatDateTime(c.startAt)} → {formatDateTime(c.endAt)}
                    </td>
                    <td className="admin-table__cell">{formatDateTime(c.submittedAt)}</td>
                    <td className="admin-table__cell">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="admin-table__cell">
                      <button
                        type="button"
                        className="admin-page__page-btn"
                        onClick={() => setReviewId(c.id)}
                        aria-label={`${c.status === "PENDING_APPROVAL" ? "Review" : "View"} ${c.title}`}
                      >
                        {c.status === "PENDING_APPROVAL" ? "Review" : "View"}
                      </button>
                      {c.status === "PUBLISHED" && (
                        <Link
                          to={`/admin/contests/${c.id}/results`}
                          className="admin-page__page-btn"
                          style={{ marginLeft: 8, textDecoration: "none" }}
                          aria-label={`Results for ${c.title}`}
                        >
                          Results
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="admin-page__pagination">
              <button
                className={`admin-page__page-btn${page <= 1 ? " admin-page__page-btn--disabled" : ""}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span className="admin-page__page-info">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className={`admin-page__page-btn${page >= data.totalPages ? " admin-page__page-btn--disabled" : ""}`}
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {reviewId && <ReviewModal contestId={reviewId} onClose={() => setReviewId(null)} onReviewed={handleReviewed} />}
    </div>
  );
}

export default AdminContests;
