// GET /api/games/content with MOCKED persistence: drives the REAL games
// router + REAL getGameContentList. Proves the response stays backward
// compatible, now carries curriculum context (Option B), keeps grade
// filtering, and does not alter the sanitized payload. It does NOT prove
// real MongoDB nested-populate behaviour (that needs the integration suite).
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../src/models/User");
jest.mock("../../src/models/GameContent");
jest.mock("../../src/utils/gradeAccess");

const User = require("../../src/models/User");
const GameContent = require("../../src/models/GameContent");
const gradeAccess = require("../../src/utils/gradeAccess");

process.env.JWT_SECRET = "test-secret";
const gameRoutes = require("../../src/routes/gameroutes");
const { notFound, globalErrorHandler } = require("../../src/middleware/errorHandler");

const app = express();
app.use(express.json());
app.use("/api/games", gameRoutes);
app.use(notFound);
app.use(globalErrorHandler);

const auth = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` });

// Chainable query that records populate/select/sort arguments.
const makeQuery = (result, calls) => {
  const p = Promise.resolve(result);
  const chain = {
    select: (...a) => { calls.select = a; return chain; },
    sort: (...a) => { calls.sort = a; return chain; },
    populate: (...a) => { calls.populate = a; return chain; },
    then: (a, b) => p.then(a, b),
  };
  return chain;
};

const RAW_PAYLOAD = {
  scenario: "Sort each change into Physical or Chemical.",
  slots: [{ id: "s1", label: "Ice melting" }],
  components: [{ id: "c1", label: "Physical Change" }, { id: "c2", label: "Chemical Change" }],
  correct_mapping: { s1: "c1" },
  hint: "Ask whether a new substance forms.",
};
const EXPECTED_PAYLOAD = {
  scenario: RAW_PAYLOAD.scenario,
  slots: RAW_PAYLOAD.slots,
  components: RAW_PAYLOAD.components,
};

const item = (over = {}) => ({
  _id: "g1",
  title: "Match: Changes",
  difficulty: "easy",
  order_index: 1,
  concept_id: {
    _id: "k1",
    title: "Physical Change vs Chemical Change",
    explanation_text: "Explains the two kinds of change.",
    chapter_id: {
      _id: "ch1",
      title: "Changes Around Us",
      strand: "Chemistry",
      subject_id: { _id: "sub1", name: "Science", grade: 7 },
    },
  },
  payload: RAW_PAYLOAD,
  ...over,
});

let calls;
const setup = (rows, grade = 7) => {
  calls = { find: null };
  User.findById.mockImplementation(() => makeQuery({ _id: "u1", grade }, {}));
  gradeAccess.getGradeConceptIds.mockResolvedValue(["k1", "k2"]);
  GameContent.find.mockImplementation((filter) => {
    calls.find = filter;
    return makeQuery(rows, calls);
  });
};

const get = () => request(app).get("/api/games/content?gameType=CHEMISTRY_MATCH").set(auth("u1"));

beforeEach(() => jest.clearAllMocks());

describe("GET /api/games/content — curriculum context (Option B)", () => {
  test("1. existing response fields remain present", async () => {
    setup([item()]);
    const res = await get();
    expect(res.status).toBe(200);
    const [lvl] = res.body.content;
    expect(lvl).toEqual(expect.objectContaining({ id: "g1", _id: "g1", title: "Match: Changes", difficulty: "easy", order_index: 1 }));
    expect(lvl.concept_id).toEqual(expect.objectContaining({ _id: "k1", title: "Physical Change vs Chemical Change", explanation_text: "Explains the two kinds of change." }));
    expect(res.body.xpInfo).toEqual({ perCorrect: expect.any(Number), perfectBonus: expect.any(Number) });
  });

  test("2. exposes concept title, chapter title, subject name and subject grade", async () => {
    setup([item()]);
    const [lvl] = (await get()).body.content;
    expect(lvl.concept_id.title).toBe("Physical Change vs Chemical Change");
    expect(lvl.concept_id.chapter).toEqual({
      title: "Changes Around Us",
      strand: "Chemistry",
      subject: { name: "Science", grade: 7 },
    });
  });

  test("3. a missing strand does not fail the response (null)", async () => {
    const row = item();
    delete row.concept_id.chapter_id.strand;
    setup([row]);
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.content[0].concept_id.chapter.strand).toBeNull();
  });

  test("3b. internal chapter/subject ids are not exposed", async () => {
    setup([item()]);
    const body = JSON.stringify((await get()).body);
    expect(body).not.toMatch(/"ch1"|"sub1"|chapter_id|subject_id/);
  });

  test("4. grade filtering is unchanged (user.grade -> grade concept ids -> concept_id $in)", async () => {
    setup([item()], 7);
    await get();
    expect(gradeAccess.getGradeConceptIds).toHaveBeenCalledWith(7);
    expect(calls.find).toEqual({ game_type: "CHEMISTRY_MATCH", concept_id: { $in: ["k1", "k2"] } });
    expect(calls.sort).toEqual([{ order_index: 1 }]);
    expect(calls.select).toEqual(["title difficulty payload order_index concept_id"]);
  });

  test("4b. one nested populate chain (no per-item queries) selecting only needed fields", async () => {
    setup([item(), item({ _id: "g2" })]);
    await get();
    expect(calls.populate).toEqual([{
      path: "concept_id",
      select: "title explanation_text chapter_id",
      populate: {
        path: "chapter_id",
        select: "title strand subject_id",
        populate: { path: "subject_id", select: "name grade" },
      },
    }]);
    expect(GameContent.find).toHaveBeenCalledTimes(1);
  });

  test("5. payload is the same sanitized payload as before (answer key/hint stripped, rest intact)", async () => {
    setup([item()]);
    const [lvl] = (await get()).body.content;
    expect(lvl.payload).toEqual(EXPECTED_PAYLOAD);
    expect(lvl.payload.correct_mapping).toBeUndefined();
    expect(lvl.payload.hint).toBeUndefined();
  });

  test("orphan concept (null) still returns the level with concept_id null", async () => {
    setup([item({ concept_id: null })]);
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.content[0].concept_id).toBeNull();
  });

  test("gameType is still required (400) and auth still required (401)", async () => {
    setup([]);
    expect((await request(app).get("/api/games/content").set(auth("u1"))).status).toBe(400);
    expect((await request(app).get("/api/games/content?gameType=X")).status).toBe(401);
  });
});
