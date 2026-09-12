require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Third mechanic in the Geometry family (after Shape Match and
// Geometry Builder). Reuses the "Geometry" chapter, new concept for
// angle types/measurement since it's a different learning objective.
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

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Measuring Angles" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Measuring Angles",
      explanation_text:
        "Angles are classified by size: acute (less than 90°), right (exactly 90°), obtuse (between 90° and 180°), and straight (exactly 180°). Two angles are complementary if they add up to 90°, and supplementary if they add up to 180°.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- ANGLE SPEED CHALLENGE (GameType: MATH_ANGLE_SPEED_CHALLENGE) ----------
  // payload shape: same quick-fire MCQ round pattern as Fraction
  // Speed Challenge / Equation Speed Calculation — `questions` is a
  // batch scored together by the shared checkMultiQuestionAttempt,
  // no new backend logic needed beyond registering the game_type in
  // MULTI_QUESTION_GAME_TYPES.
  const angleSpeedChallengeRounds = [
    {
      title: "Speed Round: Name That Angle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 8,
        hint: "Acute < 90° < Right = 90° < Obtuse < 180° = Straight.",
        questions: [
          {
            id: "q1",
            prompt: "A 45° angle is:",
            options: [
              { id: "a", label: "Acute" },
              { id: "b", label: "Obtuse" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "A 90° angle is:",
            options: [
              { id: "a", label: "Acute" },
              { id: "b", label: "Right" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "A 120° angle is:",
            options: [
              { id: "a", label: "Obtuse" },
              { id: "b", label: "Acute" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "A 180° angle is:",
            options: [
              { id: "a", label: "Right" },
              { id: "b", label: "Straight" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q5",
            prompt: "A 15° angle is:",
            options: [
              { id: "a", label: "Acute" },
              { id: "b", label: "Obtuse" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "A 100° angle is:",
            options: [
              { id: "a", label: "Acute" },
              { id: "b", label: "Obtuse" },
            ],
            correct_option_id: "b",
          },
        ],
      },
    },
    {
      title: "Speed Round: Complementary or Supplementary?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 6,
        hint: "Complementary pairs add to 90°, supplementary pairs add to 180°.",
        questions: [
          {
            id: "q1",
            prompt: "What is the complement of 30°?",
            options: [
              { id: "a", label: "60°" },
              { id: "b", label: "150°" },
              { id: "c", label: "70°" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "What is the supplement of 110°?",
            options: [
              { id: "a", label: "80°" },
              { id: "b", label: "70°" },
              { id: "c", label: "250°" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "What is the complement of 55°?",
            options: [
              { id: "a", label: "45°" },
              { id: "b", label: "125°" },
              { id: "c", label: "35°" },
            ],
            correct_option_id: "c",
          },
          {
            id: "q4",
            prompt: "What is the supplement of 65°?",
            options: [
              { id: "a", label: "115°" },
              { id: "b", label: "25°" },
              { id: "c", label: "135°" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "Two angles are 90° and 90°. They are:",
            options: [
              { id: "a", label: "Complementary" },
              { id: "b", label: "Supplementary" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "Two angles are 45° and 45°. They are:",
            options: [
              { id: "a", label: "Complementary" },
              { id: "b", label: "Supplementary" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];

  for (const round of angleSpeedChallengeRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_ANGLE_SPEED_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_ANGLE_SPEED_CHALLENGE",
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

  console.log("Angle Speed Challenge seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
