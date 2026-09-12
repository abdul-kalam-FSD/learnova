require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Vertical-slice seed: just enough to prove the universal
// Subject -> Chapter -> Concept pipeline works for a second subject.
// Deliberately small (Section 24/25) — not a full Grade 6 syllabus.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 6 });
    console.log("Created new Grade 6 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Fractions" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "Fractions",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Adding Fractions" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Adding Fractions",
      explanation_text:
        "To add two fractions with different denominators, first find a common denominator, convert each fraction, then add the numerators while keeping the denominator the same.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- FRACTION BUILDER challenges (GameType: MATH_FRACTION_BUILDER) ----------
  // payload shape: student is given `pieces` and must pick the subset
  // that sums to `target`. Kept small — 3 challenges, easy -> hard.
  const fractionChallenges = [
    {
      title: "Build 3/4",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target: { numerator: 3, denominator: 4 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 2 },
          { id: "p2", numerator: 1, denominator: 4 },
          { id: "p3", numerator: 1, denominator: 8 },
          { id: "p4", numerator: 1, denominator: 8 },
        ],
        correct_piece_ids: ["p1", "p2"],
        hint: "1/2 is the same as 2/4 — what do you need to add to reach 3/4?",
      },
    },
    {
      title: "Build 5/6",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target: { numerator: 5, denominator: 6 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 2 },
          { id: "p2", numerator: 1, denominator: 3 },
          { id: "p3", numerator: 1, denominator: 6 },
          { id: "p4", numerator: 1, denominator: 4 },
        ],
        correct_piece_ids: ["p1", "p2"],
        hint: "Try converting 1/2 and 1/3 to sixths before adding.",
      },
    },
    {
      title: "Build a Whole (1)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target: { numerator: 1, denominator: 1 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 2 },
          { id: "p2", numerator: 1, denominator: 3 },
          { id: "p3", numerator: 1, denominator: 6 },
          { id: "p4", numerator: 1, denominator: 4 },
        ],
        correct_piece_ids: ["p1", "p2", "p3"],
        hint: "Three pieces together make a full 1. Common denominator: 6.",
      },
    },
  ];

  for (const challenge of fractionChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_BUILDER",
        concept_id: concept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---------- FRACTION MATCH challenges (GameType: MATH_FRACTION_MATCH) ----------
  // payload shape: student matches each fraction card (slot) to its
  // simplest-form/decimal equivalent (component), tray has distractor
  // components so it isn't a trivial 1-to-1 process of elimination.
  const fractionMatchChallenges = [
    {
      title: "Match: Simplest Form",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each fraction card to its simplest form.",
        slots: [
          { id: "s1", label: "2/4" },
          { id: "s2", label: "3/9" },
          { id: "s3", label: "6/8" },
        ],
        components: [
          { id: "c1", label: "1/2" },
          { id: "c2", label: "1/3" },
          { id: "c3", label: "3/4" },
          { id: "c4", label: "2/3" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Divide numerator and denominator by their greatest common factor.",
      },
    },
    {
      title: "Match: Fraction to Decimal",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each fraction card to its decimal equivalent.",
        slots: [
          { id: "s1", label: "1/4" },
          { id: "s2", label: "3/5" },
          { id: "s3", label: "5/8" },
        ],
        components: [
          { id: "c1", label: "0.25" },
          { id: "c2", label: "0.6" },
          { id: "c3", label: "0.625" },
          { id: "c4", label: "0.5" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Divide the numerator by the denominator to get the decimal.",
      },
    },
    {
      title: "Match: Sum to Simplest Form",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Add each pair, then match it to its simplest-form result.",
        slots: [
          { id: "s1", label: "1/4 + 1/4" },
          { id: "s2", label: "1/6 + 1/3" },
          { id: "s3", label: "1/2 + 1/8" },
        ],
        components: [
          { id: "c1", label: "1/2" },
          { id: "c2", label: "5/8" },
          { id: "c3", label: "1/2" },
          { id: "c4", label: "3/4" },
        ],
        correct_mapping: { s1: "c1", s2: "c3", s3: "c2" },
        hint: "Convert to a common denominator before adding, then simplify the result.",
      },
    },
  ];

  for (const challenge of fractionMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_MATCH",
        concept_id: concept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---------- FRACTION SPEED CHALLENGE (GameType: MATH_FRACTION_SPEED_CHALLENGE) ----------
  // payload shape: `questions` is a round of quick MCQ-style prompts,
  // each with its own `correct_option_id`, played against a shared
  // `time_limit_seconds` per question. Unlike Builder/Match (one
  // check per session), this is a batch of quick-fire questions
  // scored together (see checkMultiQuestionAttempt) — 2 rounds here,
  // one comparison-focused and one simplification-focused.
  const speedChallengeRounds = [
    {
      title: "Speed Round: Which is Bigger?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 8,
        hint: "Convert to a common denominator to compare quickly.",
        questions: [
          {
            id: "q1",
            prompt: "Which is bigger?",
            options: [
              { id: "a", label: "1/2" },
              { id: "b", label: "1/3" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "Which is bigger?",
            options: [
              { id: "a", label: "2/5" },
              { id: "b", label: "3/5" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "Which is bigger?",
            options: [
              { id: "a", label: "3/4" },
              { id: "b", label: "5/8" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "Which is bigger?",
            options: [
              { id: "a", label: "1/6" },
              { id: "b", label: "1/4" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q5",
            prompt: "Which is bigger?",
            options: [
              { id: "a", label: "5/6" },
              { id: "b", label: "7/9" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "Which is bigger?",
            options: [
              { id: "a", label: "2/3" },
              { id: "b", label: "3/5" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
    {
      title: "Speed Round: Simplify Fast",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 6,
        hint: "Look for the largest number that divides both top and bottom.",
        questions: [
          {
            id: "q1",
            prompt: "Simplify: 4/8",
            options: [
              { id: "a", label: "1/2" },
              { id: "b", label: "2/3" },
              { id: "c", label: "1/4" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "Simplify: 6/9",
            options: [
              { id: "a", label: "1/3" },
              { id: "b", label: "2/3" },
              { id: "c", label: "3/6" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "Simplify: 5/10",
            options: [
              { id: "a", label: "1/5" },
              { id: "b", label: "2/5" },
              { id: "c", label: "1/2" },
            ],
            correct_option_id: "c",
          },
          {
            id: "q4",
            prompt: "Simplify: 3/12",
            options: [
              { id: "a", label: "1/4" },
              { id: "b", label: "1/3" },
              { id: "c", label: "3/4" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "Simplify: 8/12",
            options: [
              { id: "a", label: "3/4" },
              { id: "b", label: "2/3" },
              { id: "c", label: "4/6" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "Simplify: 9/12",
            options: [
              { id: "a", label: "1/3" },
              { id: "b", label: "2/4" },
              { id: "c", label: "3/4" },
            ],
            correct_option_id: "c",
          },
        ],
      },
    },
  ];

  for (const round of speedChallengeRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_SPEED_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_SPEED_CHALLENGE",
        concept_id: concept._id,
        title: round.title,
        difficulty: round.difficulty,
        order_index: round.order_index,
        payload: round.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---------- FRACTION BOSS CHALLENGE (GameType: MATH_FRACTION_BOSS_CHALLENGE) ----------
  // Same batch-of-questions payload shape as Speed Challenge (reuses
  // checkMultiQuestionAttempt/MULTI_QUESTION_GAME_TYPES as-is — see
  // gameControllers.js), but the interaction is resource-based instead
  // of time-based: no `time_limit_seconds`, instead `max_lives` (a
  // wrong answer costs a life; the boss's health bar drops one step
  // per correct answer, drawn client-side from correctCount/totalCount
  // as questions are answered). Escalating difficulty within the one
  // round, mixed add/subtract/compare/simplify — this is the "boss"
  // for the Fractions topic, so it draws on every skill so far rather
  // than drilling one operation like the earlier rounds do.
  const bossChallenge = {
    title: "Boss Battle: The Denominator Dragon",
    difficulty: "hard",
    order_index: 1,
    payload: {
      max_lives: 3,
      hint: "Slow down and double check your denominator before you tap.",
      questions: [
        {
          id: "q1",
          prompt: "1/4 + 1/4 = ?",
          options: [
            { id: "a", label: "1/2" },
            { id: "b", label: "2/8" },
            { id: "c", label: "1/4" },
          ],
          correct_option_id: "a",
        },
        {
          id: "q2",
          prompt: "Which is bigger: 3/5 or 5/8?",
          options: [
            { id: "a", label: "3/5" },
            { id: "b", label: "5/8" },
          ],
          correct_option_id: "b",
        },
        {
          id: "q3",
          prompt: "Simplify: 6/10",
          options: [
            { id: "a", label: "3/5" },
            { id: "b", label: "2/5" },
            { id: "c", label: "1/2" },
          ],
          correct_option_id: "a",
        },
        {
          id: "q4",
          prompt: "3/4 - 1/4 = ?",
          options: [
            { id: "a", label: "1/4" },
            { id: "b", label: "1/2" },
            { id: "c", label: "2/4" },
          ],
          correct_option_id: "b",
        },
        {
          id: "q5",
          prompt: "1/3 + 1/6 = ?",
          options: [
            { id: "a", label: "1/2" },
            { id: "b", label: "2/9" },
            { id: "c", label: "2/6" },
          ],
          correct_option_id: "a",
        },
        {
          id: "q6",
          prompt: "Which is bigger: 7/12 or 2/3?",
          options: [
            { id: "a", label: "7/12" },
            { id: "b", label: "2/3" },
          ],
          correct_option_id: "b",
        },
        {
          id: "q7",
          prompt: "Simplify: 9/12",
          options: [
            { id: "a", label: "2/3" },
            { id: "b", label: "3/4" },
            { id: "c", label: "4/6" },
          ],
          correct_option_id: "b",
        },
      ],
    },
  };

  {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_BOSS_CHALLENGE",
      title: bossChallenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_BOSS_CHALLENGE",
        concept_id: concept._id,
        title: bossChallenge.title,
        difficulty: bossChallenge.difficulty,
        order_index: bossChallenge.order_index,
        payload: bossChallenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---------- FRACTION STRATEGY CHALLENGE (GameType: MATH_FRACTION_STRATEGY_CHALLENGE) ----------
  // payload shape: a `pieces` pool (bigger than any single solution
  // needs, so there are decoys), a `target` fraction, and a tight
  // `max_moves` budget. Unlike Fraction Builder (any correct subset,
  // no move limit — checked against one stored correct_piece_ids
  // list), the server here has no stored answer at all: it adds up
  // whatever pieces the student picked (see checkAttempt's
  // MATH_FRACTION_STRATEGY_CHALLENGE branch) and only accepts it if
  // both the sum is exactly right AND the student stayed within
  // max_moves — so pieces get chosen deliberately instead of by
  // trial and error.
  const strategyLevels = [
    {
      title: "Strategy: Cross in Two Moves",
      difficulty: "easy",
      order_index: 1,
      payload: {
        max_moves: 2,
        target: { numerator: 3, denominator: 4 },
        hint: "Only one pair of pieces here adds up to 3/4 in just two moves.",
        pieces: [
          { id: "p1", numerator: 1, denominator: 4 },
          { id: "p2", numerator: 1, denominator: 2 },
          { id: "p3", numerator: 1, denominator: 8 },
          { id: "p4", numerator: 1, denominator: 8 },
          { id: "p5", numerator: 1, denominator: 4 },
        ],
      },
    },
    {
      title: "Strategy: Cross in Two Moves — Sixths",
      difficulty: "medium",
      order_index: 2,
      payload: {
        max_moves: 2,
        target: { numerator: 5, denominator: 6 },
        hint: "Think in halves and thirds before you touch the sixths.",
        pieces: [
          { id: "p1", numerator: 1, denominator: 2 },
          { id: "p2", numerator: 1, denominator: 3 },
          { id: "p3", numerator: 1, denominator: 6 },
          { id: "p4", numerator: 1, denominator: 6 },
          { id: "p5", numerator: 1, denominator: 3 },
        ],
      },
    },
    {
      title: "Strategy: Three-Move Crossing",
      difficulty: "hard",
      order_index: 3,
      payload: {
        max_moves: 3,
        target: { numerator: 11, denominator: 12 },
        hint: "Halves and thirds get you most of the way — a twelfth finishes it.",
        pieces: [
          { id: "p1", numerator: 1, denominator: 2 },
          { id: "p2", numerator: 1, denominator: 3 },
          { id: "p3", numerator: 1, denominator: 12 },
          { id: "p4", numerator: 1, denominator: 4 },
          { id: "p5", numerator: 1, denominator: 6 },
          { id: "p6", numerator: 1, denominator: 12 },
        ],
      },
    },
  ];

  for (const level of strategyLevels) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_STRATEGY_CHALLENGE",
      title: level.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_STRATEGY_CHALLENGE",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
