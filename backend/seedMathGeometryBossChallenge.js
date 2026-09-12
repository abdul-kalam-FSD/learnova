require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fifth and final mechanic in the Geometry family — the capstone.
// Same payload/scoring shape as Angle Speed Challenge (a timed MCQ
// batch, checked by the shared checkMultiQuestionAttempt — no new
// backend logic beyond registering the game_type in
// MULTI_QUESTION_GAME_TYPES), but each round deliberately mixes
// shapes, angles and perimeter questions together instead of testing
// one skill, since a Boss Challenge is meant to be the "prove you've
// mastered the whole topic" round, not another single-skill drill.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Geometry" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Shapes and Space",
      title: "Geometry",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // Boss rounds mix skills but each GameContent doc still needs one
  // concept_id for grade access + mastery tracking. Round 1 anchors
  // to Measuring Angles, round 2 to Perimeter — matching whichever
  // skill that round leans on most heavily.
  let anglesConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Measuring Angles" });
  if (!anglesConcept) {
    anglesConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Measuring Angles",
      explanation_text:
        "Angles are classified by size: acute (less than 90°), right (exactly 90°), obtuse (between 90° and 180°), and straight (exactly 180°). Two angles are complementary if they add up to 90°, and supplementary if they add up to 180°.",
    });
    console.log("Created concept:", anglesConcept._id);
  } else {
    console.log("Using existing concept:", anglesConcept._id);
  }

  let perimeterConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Perimeter" });
  if (!perimeterConcept) {
    perimeterConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Perimeter",
      explanation_text:
        "Perimeter is the total distance around a shape's boundary — add up the lengths of every side. The same perimeter can be built from many different combinations of side lengths, which is why planning which pieces to use matters as much as knowing how to add.",
    });
    console.log("Created concept:", perimeterConcept._id);
  } else {
    console.log("Using existing concept:", perimeterConcept._id);
  }

  const geometryBossRounds = [
    {
      title: "Boss Round 1: The Shape Golem Awakens",
      difficulty: "boss",
      order_index: 1,
      conceptId: anglesConcept._id,
      payload: {
        time_limit_seconds: 8,
        hint: "Angles by size, shapes by sides, perimeter by adding every edge — the Golem tests all three.",
        questions: [
          {
            id: "q1",
            prompt: "A triangle with all three sides equal is called:",
            options: [
              { id: "a", label: "Scalene" },
              { id: "b", label: "Equilateral" },
              { id: "c", label: "Right-angled" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "A 100° angle is:",
            options: [
              { id: "a", label: "Acute" },
              { id: "b", label: "Obtuse" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "A rectangle has sides 6 cm and 4 cm. Its perimeter is:",
            options: [
              { id: "a", label: "10 cm" },
              { id: "b", label: "20 cm" },
              { id: "c", label: "24 cm" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q4",
            prompt: "The supplement of a 70° angle is:",
            options: [
              { id: "a", label: "20°" },
              { id: "b", label: "110°" },
              { id: "c", label: "130°" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q5",
            prompt: "A shape with 5 equal sides is called a:",
            options: [
              { id: "a", label: "Hexagon" },
              { id: "b", label: "Pentagon" },
              { id: "c", label: "Octagon" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "A square has a perimeter of 32 cm. Each side is:",
            options: [
              { id: "a", label: "6 cm" },
              { id: "b", label: "8 cm" },
              { id: "c", label: "16 cm" },
            ],
            correct_option_id: "b",
          },
        ],
      },
    },
    {
      title: "Boss Round 2: Final Stand",
      difficulty: "boss",
      order_index: 2,
      conceptId: perimeterConcept._id,
      payload: {
        time_limit_seconds: 7,
        hint: "Read every prompt fully — the Golem mixes an angle question right after a perimeter one on purpose.",
        questions: [
          {
            id: "q1",
            prompt: "Two angles are 90° and 90°. They are:",
            options: [
              { id: "a", label: "Complementary" },
              { id: "b", label: "Supplementary" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "A triangle with sides 5 cm, 7 cm and 9 cm has perimeter:",
            options: [
              { id: "a", label: "19 cm" },
              { id: "b", label: "21 cm" },
              { id: "c", label: "24 cm" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "A shape with all sides and angles equal is called:",
            options: [
              { id: "a", label: "Irregular" },
              { id: "b", label: "Regular" },
              { id: "c", label: "Convex" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q4",
            prompt: "A 45° angle is:",
            options: [
              { id: "a", label: "Acute" },
              { id: "b", label: "Obtuse" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "A regular hexagon has one side of 9 cm. Its perimeter is:",
            options: [
              { id: "a", label: "45 cm" },
              { id: "b", label: "54 cm" },
              { id: "c", label: "63 cm" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "The complement of a 62° angle is:",
            options: [
              { id: "a", label: "28°" },
              { id: "b", label: "38°" },
              { id: "c", label: "118°" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];

  for (const round of geometryBossRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_GEOMETRY_BOSS_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_GEOMETRY_BOSS_CHALLENGE",
        concept_id: round.conceptId,
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

  console.log("Geometry Boss Challenge seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
