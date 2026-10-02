// Pure unit tests for contest lifecycle + input validation. No DB.
const {
  computeContestPhase,
  validateContestInput,
  MAX_CHALLENGES,
  START_GRACE_MS,
} = require("../../src/utils/contestLifecycle");

const oid = (n) => n.toString(16).padStart(24, "0");
const NOW = new Date("2026-06-01T10:00:00.000Z");
const hours = (h) => new Date(NOW.getTime() + h * 3600 * 1000).toISOString();

const validBody = () => ({
  title: "  Weekly Fractions Blitz ",
  description: " Play all three ",
  grade: 6,
  subjectId: oid(1),
  chapterId: oid(2),
  challengeIds: [oid(3), oid(4)],
  startAt: hours(1),
  endAt: hours(25),
});

describe("computeContestPhase", () => {
  const published = { status: "PUBLISHED", start_at: hours(1), end_at: hours(2) };

  test("derives UPCOMING / ACTIVE / ENDED from the clock for PUBLISHED contests", () => {
    expect(computeContestPhase(published, NOW)).toBe("UPCOMING");
    expect(computeContestPhase(published, new Date(hours(1)))).toBe("ACTIVE");
    expect(computeContestPhase(published, new Date(hours(1.5)))).toBe("ACTIVE");
    expect(computeContestPhase(published, new Date(hours(2)))).toBe("ENDED");
  });

  test("non-published contests have no phase (they are not live)", () => {
    for (const status of ["DRAFT", "PENDING_APPROVAL", "REJECTED"]) {
      expect(computeContestPhase({ ...published, status }, new Date(hours(1.5)))).toBeNull();
    }
    expect(computeContestPhase(null, NOW)).toBeNull();
  });
});

describe("validateContestInput", () => {
  test("accepts a valid body, trims text, defaults to DRAFT", () => {
    const { error, value } = validateContestInput(validBody(), NOW);
    expect(error).toBeUndefined();
    expect(value.title).toBe("Weekly Fractions Blitz");
    expect(value.description).toBe("Play all three");
    expect(value.grade).toBe(6);
    expect(value.status).toBe("DRAFT");
    expect(value.challengeIds).toEqual([oid(3), oid(4)]);
    expect(value.startAt).toBeInstanceOf(Date);
  });

  test("submitForApproval === true selects PENDING_APPROVAL; nothing else does", () => {
    expect(validateContestInput({ ...validBody(), submitForApproval: true }, NOW).value.status).toBe("PENDING_APPROVAL");
    expect(validateContestInput({ ...validBody(), submitForApproval: "true" }, NOW).value.status).toBe("DRAFT");
  });

  test("a client-sent status can never choose PUBLISHED", () => {
    const { value } = validateContestInput({ ...validBody(), status: "PUBLISHED" }, NOW);
    expect(value.status).toBe("DRAFT");
  });

  test("chapter is optional", () => {
    const { chapterId: _omit, ...rest } = validBody();
    const { error, value } = validateContestInput(rest, NOW);
    expect(error).toBeUndefined();
    expect(value.chapterId).toBeNull();
  });

  test("de-duplicates challenge ids", () => {
    const { value } = validateContestInput({ ...validBody(), challengeIds: [oid(3), oid(3), oid(4)] }, NOW);
    expect(value.challengeIds).toEqual([oid(3), oid(4)]);
  });

  test.each([
    ["missing title", { title: "" }],
    ["whitespace title", { title: "   " }],
    ["non-string title", { title: 42 }],
    ["overlong title", { title: "x".repeat(121) }],
    ["overlong description", { description: "x".repeat(1001) }],
    ["non-string description", { description: 5 }],
    ["grade too low", { grade: 3 }],
    ["grade too high", { grade: 13 }],
    ["grade not a number", { grade: "six" }],
    ["fractional grade", { grade: 6.5 }],
    ["missing subject", { subjectId: undefined }],
    ["malformed subject id", { subjectId: "not-an-id" }],
    ["malformed chapter id", { chapterId: "nope" }],
    ["no challenges", { challengeIds: [] }],
    ["challenges not an array", { challengeIds: oid(3) }],
    ["malformed challenge id", { challengeIds: [oid(3), "bad"] }],
    ["too many challenges", { challengeIds: Array.from({ length: MAX_CHALLENGES + 1 }, (_, i) => oid(100 + i)) }],
    ["missing start", { startAt: undefined }],
    ["garbage start", { startAt: "tomorrow-ish" }],
    ["missing end", { endAt: undefined }],
    ["end equals start", { endAt: hours(1) }],
    ["end before start", { endAt: hours(0.5) }],
    ["start in the past", { startAt: new Date(NOW.getTime() - START_GRACE_MS - 1000).toISOString(), endAt: hours(2) }],
  ])("rejects %s", (_label, override) => {
    const { error, value } = validateContestInput({ ...validBody(), ...override }, NOW);
    expect(typeof error).toBe("string");
    expect(value).toBeUndefined();
  });

  test("start slightly in the past (within clock-skew grace) is allowed", () => {
    const { error } = validateContestInput({ ...validBody(), startAt: new Date(NOW.getTime() - 60 * 1000).toISOString() }, NOW);
    expect(error).toBeUndefined();
  });

  test("handles an empty/undefined body without throwing", () => {
    expect(validateContestInput(undefined, NOW).error).toBeDefined();
    expect(validateContestInput({}, NOW).error).toBeDefined();
  });
});

// ---------- Lifecycle transitions + review notes (admin approval task) ----------
const {
  canTransition,
  validateReviewNote,
  CONTEST_STATUSES,
  TRANSITIONS,
  ADMIN_VISIBLE_STATUSES,
  REVIEW_NOTE_MIN,
  REVIEW_NOTE_MAX,
} = require("../../src/utils/contestLifecycle");

describe("canTransition (central lifecycle rules)", () => {
  test("the only allowed teacher-owner moves are DRAFT/REJECTED -> PENDING_APPROVAL", () => {
    expect(canTransition("DRAFT", "PENDING_APPROVAL", "teacher")).toBe(true);
    expect(canTransition("REJECTED", "PENDING_APPROVAL", "teacher")).toBe(true);
  });

  test("only an admin can approve or reject, and only from PENDING_APPROVAL", () => {
    expect(canTransition("PENDING_APPROVAL", "PUBLISHED", "admin")).toBe(true);
    expect(canTransition("PENDING_APPROVAL", "REJECTED", "admin")).toBe(true);
    expect(canTransition("PENDING_APPROVAL", "PUBLISHED", "teacher")).toBe(false);
    expect(canTransition("PENDING_APPROVAL", "REJECTED", "teacher")).toBe(false);
    expect(canTransition("PENDING_APPROVAL", "PUBLISHED", "student")).toBe(false);
    expect(canTransition("PENDING_APPROVAL", "REJECTED", "student")).toBe(false);
  });

  test.each([
    ["DRAFT", "PUBLISHED"],
    ["REJECTED", "PUBLISHED"],
    ["PUBLISHED", "PENDING_APPROVAL"],
    ["PUBLISHED", "DRAFT"],
    ["PUBLISHED", "REJECTED"],
    ["PENDING_APPROVAL", "DRAFT"],
    ["REJECTED", "DRAFT"],
    ["DRAFT", "REJECTED"],
    ["DRAFT", "DRAFT"],
    ["PENDING_APPROVAL", "PENDING_APPROVAL"],
  ])("%s -> %s is invalid for every role", (from, to) => {
    for (const role of ["student", "teacher", "admin"]) {
      expect(canTransition(from, to, role)).toBe(false);
    }
  });

  test("exhaustive: exactly 4 (from,to) pairs are valid across all statuses", () => {
    const valid = [];
    for (const from of CONTEST_STATUSES) {
      for (const to of CONTEST_STATUSES) {
        if (["student", "teacher", "admin"].some((r) => canTransition(from, to, r))) valid.push(`${from}>${to}`);
      }
    }
    expect(valid.sort()).toEqual(
      ["DRAFT>PENDING_APPROVAL", "PENDING_APPROVAL>PUBLISHED", "PENDING_APPROVAL>REJECTED", "REJECTED>PENDING_APPROVAL"].sort(),
    );
    expect(TRANSITIONS).toHaveLength(4);
  });

  test("students can never make any transition; unknown statuses/roles are refused", () => {
    for (const from of CONTEST_STATUSES) for (const to of CONTEST_STATUSES) expect(canTransition(from, to, "student")).toBe(false);
    expect(canTransition("DRAFT", "PENDING_APPROVAL", undefined)).toBe(false);
    expect(canTransition("BOGUS", "PUBLISHED", "admin")).toBe(false);
  });

  test("PUBLISHED is terminal and DRAFTs are not visible to admins", () => {
    expect(TRANSITIONS.some((t) => t.from === "PUBLISHED")).toBe(false);
    expect(ADMIN_VISIBLE_STATUSES).toEqual(["PENDING_APPROVAL", "PUBLISHED", "REJECTED"]);
  });
});

describe("validateReviewNote", () => {
  test("rejection requires a meaningful reason", () => {
    expect(validateReviewNote(undefined, { required: true }).error).toBeDefined();
    expect(validateReviewNote("", { required: true }).error).toBeDefined();
    expect(validateReviewNote("   \n ", { required: true }).error).toBeDefined();
    expect(validateReviewNote("x".repeat(REVIEW_NOTE_MIN - 1), { required: true }).error).toBeDefined();
    expect(validateReviewNote("  Too easy  ", { required: true }).value).toBe("Too easy");
  });

  test("approval accepts an empty or optional note", () => {
    expect(validateReviewNote(undefined, { required: false }).value).toBe("");
    expect(validateReviewNote(null, { required: false }).value).toBe("");
    expect(validateReviewNote(" Looks good ", { required: false }).value).toBe("Looks good");
  });

  test("over-long and non-string notes are rejected", () => {
    expect(validateReviewNote("x".repeat(REVIEW_NOTE_MAX + 1), { required: false }).error).toBeDefined();
    expect(validateReviewNote("x".repeat(REVIEW_NOTE_MAX), { required: false }).value).toHaveLength(REVIEW_NOTE_MAX);
    expect(validateReviewNote({ $ne: 1 }, { required: true }).error).toBeDefined();
    expect(validateReviewNote(12345, { required: false }).error).toBeDefined();
  });
});
