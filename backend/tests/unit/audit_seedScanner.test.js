const fs = require("fs");
const os = require("os");
const path = require("path");

const { findSeedFiles, filenameGrade, parseFile, scanAllSeeds } = require("../../scripts/audit/lib/seedScanner");

// All fixture seed files below are inert plain-text .js files: they
// declare `require("mongoose")` etc. as strings the scanner reads as
// TEXT, but this test suite never `require()`s or executes them —
// only the static scanner touches them, proving the audit truly
// works without a DB connection.

function writeFixture(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content, "utf8");
}

describe("audit/seedScanner — filenameGrade", () => {
  test("extracts grade from a Grade-suffixed filename", () => {
    expect(filenameGrade("/x/seedBioDiagnosisGrade11.js")).toBe(11);
    expect(filenameGrade("/x/seedMathGrade4.js")).toBe(4);
  });

  test("returns null when no grade is in the filename", () => {
    expect(filenameGrade("/x/seedStreams.js")).toBeNull();
  });
});

describe("audit/seedScanner — parseFile (single-check / evidence-card schema)", () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-fixture-"));
    writeFixture(
      dir,
      "seedFixtureCurriculumGrade11.js",
      `
      require("dotenv").config();
      const mongoose = require("mongoose");
      const Subject = require("./src/models/Subject");
      const Chapter = require("./src/models/Chapter");
      const Concept = require("./src/models/Concept");

      async function seed() {
        let subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
        if (!subject) {
          subject = await Subject.create({ name: "Biology", grade: 11 });
        }
        const ch1 = await Chapter.create({
          subject_id: subject._id,
          unit_name: "Human Physiology",
          title: "Circulatory System",
          order_index: 6,
        });
        const c1 = await Concept.create({
          chapter_id: ch1._id,
          title: "Lymph and Circulatory Disorders",
          explanation_text: "Some explanation.",
        });
      }
      seed();
      `,
    );
    writeFixture(
      dir,
      "seedFixtureGameGrade11.js",
      `
      require("dotenv").config();
      const mongoose = require("mongoose");
      const Concept = require("./src/models/Concept");
      const GameContent = require("./src/models/GameContent");

      async function seed() {
        const concept = await Concept.findOne({ title: "Lymph and Circulatory Disorders" });

        const levels = [
          {
            title: "The Silent Pressure",
            difficulty: "easy",
            order_index: 1,
            payload: {
              scenario: "...",
              evidence: [
                { id: "ev1", label: "A" },
                { id: "ev2", label: "B" },
                { id: "ev3", label: "C" },
              ],
              correct_piece_ids: ["ev1", "ev3"],
              explanation: "...",
            },
          },
        ];

        for (const level of levels) {
          const created = await GameContent.create({
            game_type: "BIO_DIAGNOSIS",
            concept_id: concept._id,
            title: level.title,
            difficulty: level.difficulty,
            order_index: level.order_index,
            payload: level.payload,
          });
        }
      }
      seed();
      `,
    );
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test("findSeedFiles finds only seed*.js files", () => {
    const files = findSeedFiles(dir);
    expect(files).toHaveLength(2);
  });

  test("parseFile extracts the Subject/Chapter/Concept chain with correct grade", () => {
    const parsed = parseFile(path.join(dir, "seedFixtureCurriculumGrade11.js"));
    expect(parsed.conceptDefs).toHaveLength(1);
    expect(parsed.conceptDefs[0]).toMatchObject({
      title: "Lymph and Circulatory Disorders",
      grade: 11,
      subjectName: "Biology",
      chapterTitle: "Circulatory System",
    });
  });

  test("parseFile extracts game_type from a GameContent.create() inside a for-loop", () => {
    const parsed = parseFile(path.join(dir, "seedFixtureGameGrade11.js"));
    expect(parsed.gameContents).toHaveLength(1);
    expect(parsed.gameContents[0].gameType).toBe("BIO_DIAGNOSIS");
    expect(parsed.gameContents[0].conceptTitleRef).toBe(
      "Lymph and Circulatory Disorders",
    );
  });

  test("parseFile finds no structural issues in a well-formed challenge (correct_piece_ids all resolve)", () => {
    const parsed = parseFile(path.join(dir, "seedFixtureGameGrade11.js"));
    const errors = parsed.issues.filter((i) => i.level === "error");
    expect(errors).toHaveLength(0);
  });

  test("scanAllSeeds cross-file-resolves the game content's grade via the concept title pool", () => {
    const scan = scanAllSeeds(dir);
    const gc = scan.resolvedGameContents.find((g) => g.gameType === "BIO_DIAGNOSIS");
    expect(gc).toBeDefined();
    expect(gc.resolvedGrade).toBe(11);
    expect(gc.resolvedSubjectName).toBe("Biology");
    expect(gc.resolution).toBe("RESOLVED_VIA_CONCEPT_TITLE");
  });
});

describe("audit/seedScanner — structural defect detection", () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-fixture-defect-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  test("flags a correct_piece_ids reference to an id that doesn't exist in the challenge", () => {
    writeFixture(
      dir,
      "seedFixtureBroken.js",
      `
      const GameContent = require("./src/models/GameContent");
      async function seed() {
        const levels = [
          {
            title: "Broken Challenge",
            payload: {
              evidence: [{ id: "ev1" }, { id: "ev2" }],
              correct_piece_ids: ["ev1", "ev99"],
            },
          },
        ];
        for (const level of levels) {
          await GameContent.create({ game_type: "BIO_DIAGNOSIS", concept_id: c._id, title: level.title, payload: level.payload });
        }
      }
      `,
    );
    const parsed = parseFile(path.join(dir, "seedFixtureBroken.js"));
    const errors = parsed.issues.filter((i) => i.level === "error");
    expect(errors.some((e) => /ev99/.test(e.message))).toBe(true);
  });

  test("flags duplicate id values within a single challenge", () => {
    writeFixture(
      dir,
      "seedFixtureDupIds.js",
      `
      const GameContent = require("./src/models/GameContent");
      async function seed() {
        const levels = [
          {
            title: "Dup Challenge",
            payload: {
              evidence: [{ id: "ev1" }, { id: "ev1" }],
              correct_piece_ids: ["ev1"],
            },
          },
        ];
        for (const level of levels) {
          await GameContent.create({ game_type: "BIO_DIAGNOSIS", concept_id: c._id, title: level.title, payload: level.payload });
        }
      }
      `,
    );
    const parsed = parseFile(path.join(dir, "seedFixtureDupIds.js"));
    const errors = parsed.issues.filter((i) => i.level === "error");
    expect(errors.some((e) => /duplicate id/.test(e.message))).toBe(true);
  });

  test("flags duplicate challenge titles within the same array", () => {
    writeFixture(
      dir,
      "seedFixtureDupTitles.js",
      `
      const GameContent = require("./src/models/GameContent");
      async function seed() {
        const levels = [
          { title: "Same Title", payload: { evidence: [{ id: "a" }], correct_piece_ids: ["a"] } },
          { title: "Same Title", payload: { evidence: [{ id: "b" }], correct_piece_ids: ["b"] } },
        ];
        for (const level of levels) {
          await GameContent.create({ game_type: "BIO_DIAGNOSIS", concept_id: c._id, title: level.title, payload: level.payload });
        }
      }
      `,
    );
    const parsed = parseFile(path.join(dir, "seedFixtureDupTitles.js"));
    const errors = parsed.issues.filter((i) => i.level === "error");
    expect(errors.some((e) => /duplicate challenge title/.test(e.message))).toBe(true);
  });

  test("does NOT flag multi-question payloads for reused per-question option ids (false-positive protection)", () => {
    writeFixture(
      dir,
      "seedFixtureMultiQuestion.js",
      `
      const GameContent = require("./src/models/GameContent");
      async function seed() {
        const rounds = [
          {
            title: "Speed Round 1",
            payload: {
              time_limit_seconds: 60,
              questions: [
                { id: "q1", options: [{ id: "a", text: "X" }, { id: "b", text: "Y" }], correct_option_id: "a" },
                { id: "q2", options: [{ id: "a", text: "X" }, { id: "b", text: "Y" }], correct_option_id: "b" },
              ],
            },
          },
        ];
        for (const round of rounds) {
          await GameContent.create({ game_type: "MATH_AP_SPEED_CHALLENGE", concept_id: c._id, title: round.title, payload: round.payload });
        }
      }
      `,
    );
    const parsed = parseFile(path.join(dir, "seedFixtureMultiQuestion.js"));
    const errors = parsed.issues.filter((i) => i.level === "error");
    expect(errors).toHaveLength(0);
  });

  test("does NOT flag a correct_mapping (Genetics-Simulator-style) field as a broken ID reference", () => {
    writeFixture(
      dir,
      "seedFixtureMapping.js",
      `
      const GameContent = require("./src/models/GameContent");
      async function seed() {
        const levels = [
          {
            title: "Cross Punnett Square",
            payload: {
              alleles: { parent1: "Tt", parent2: "Tt" },
              correct_mapping: { cell_0_0: "TT", cell_0_1: "Tt", cell_1_0: "Tt", cell_1_1: "tt" },
            },
          },
        ];
        for (const level of levels) {
          await GameContent.create({ game_type: "BIO_GENETICS_SIMULATOR", concept_id: c._id, title: level.title, payload: level.payload });
        }
      }
      `,
    );
    const parsed = parseFile(path.join(dir, "seedFixtureMapping.js"));
    const errors = parsed.issues.filter((i) => i.level === "error");
    expect(errors).toHaveLength(0);
    const infos = parsed.issues.filter((i) => i.level === "info");
    expect(infos.some((i) => /correct_mapping/.test(i.message))).toBe(true);
  });

  test("cross-file backfill: a chapter only Chapter.findOne()'d in one file resolves via another file's Chapter.create", () => {
    writeFixture(
      dir,
      "seedFixtureChapterCreator.js",
      `
      const Subject = require("./src/models/Subject");
      const Chapter = require("./src/models/Chapter");
      async function seed() {
        let subject = await Subject.findOne({ grade: 4, name: /tamil/i });
        if (!subject) subject = await Subject.create({ name: "Tamil", grade: 4 });
        const ch = await Chapter.create({ subject_id: subject._id, title: "Proverbs Chapter", order_index: 1 });
      }
      `,
    );
    writeFixture(
      dir,
      "seedFixtureConceptExtender.js",
      `
      const Chapter = require("./src/models/Chapter");
      const Concept = require("./src/models/Concept");
      async function seed() {
        const chapter = await Chapter.findOne({ title: "Proverbs Chapter" });
        const concept = await Concept.create({ chapter_id: chapter._id, title: "Sentence Order", explanation_text: "..." });
      }
      `,
    );
    const scan = scanAllSeeds(dir);
    const concept = Object.values(scan.conceptPool)
      .flat()
      .find((c) => c.title === "Sentence Order");
    expect(concept).toBeDefined();
    expect(concept.grade).toBe(4);
    expect(concept.subjectName).toBe("Tamil");
  });
});
