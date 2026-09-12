require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session). Chapter 3, next after Sets and Relations and
// Functions: Trigonometric Functions.
//
// New game_type this pass: MATH_TRIG_MATCH. Reuses the existing
// mapping-equality scoring group (same backend logic as Fraction/
// Shape/Place Value/Ratio/Function Match) — matching an angle to its
// correct trig value or radian equivalent is the same "assign each
// slot to its correct counterpart" shape as those.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 11 });
    console.log("Created new Grade 11 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Trigonometric Functions" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Trigonometric Functions",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Radian Measure and Standard Angle Values" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Radian Measure and Standard Angle Values",
      explanation_text:
        "Angles can be measured in degrees or radians, related by 180° = π radians. Trigonometric functions extend beyond acute angles to any angle, but the standard-angle values (0°, 30°, 45°, 60°, 90°, and their radian equivalents) recur constantly and are worth knowing by heart rather than recomputing each time.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape matches Trig Match: `slots` are the angle cards,
  // `components` are the tappable value cards, `correct_mapping` is
  // stripped before the client sees it.
  const trigMatchChallenges = [
    {
      title: "Match: Degrees to Radians",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each angle in degrees to its correct radian measure.",
        slots: [
          { id: "s1", label: "30°" },
          { id: "s2", label: "90°" },
          { id: "s3", label: "180°" },
        ],
        components: [
          { id: "c1", label: "π/6" },
          { id: "c2", label: "π/2" },
          { id: "c3", label: "π" },
          { id: "c4", label: "π/3" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "180° = π radians, so to convert degrees to radians, multiply by π/180.",
      },
    },
    {
      title: "Match: sin at Standard Angles",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each standard angle to its correct sine value.",
        slots: [
          { id: "s1", label: "sin 0°" },
          { id: "s2", label: "sin 30°" },
          { id: "s3", label: "sin 90°" },
        ],
        components: [
          { id: "c1", label: "0" },
          { id: "c2", label: "1/2" },
          { id: "c3", label: "1" },
          { id: "c4", label: "√3/2" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "sin rises from 0 at 0° to 1 at 90° — the standard values in between are 1/2, √2/2, and √3/2 in that order at 30°, 45°, 60°.",
      },
    },
    {
      title: "Match: Sign of cos by Quadrant",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each angle to the correct sign of its cosine value.",
        slots: [
          { id: "s1", label: "cos 120°" },
          { id: "s2", label: "cos 300°" },
          { id: "s3", label: "cos 200°" },
        ],
        components: [
          { id: "c1", label: "Negative — 120° is in the 2nd quadrant, where cosine is negative" },
          { id: "c2", label: "Positive — 300° is in the 4th quadrant, where cosine is positive" },
          { id: "c3", label: "Negative — 200° is in the 3rd quadrant, where cosine is negative" },
          { id: "c4", label: "Positive — always positive regardless of quadrant" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "cosine is positive in the 1st and 4th quadrants (0°-90° and 270°-360°), and negative in the 2nd and 3rd (90°-270°).",
      },
    },
  ];

  for (const challenge of trigMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_TRIG_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_TRIG_MATCH",
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
