require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 12 Mathematics currently has
// "Determinants" (order_index 1) and "Linear Programming" (order_index
// 2, see seedMathLinearProgrammingGrade12.js). This adds a genuine
// third NCERT Class 12 Maths chapter, "Introduction to Three
// Dimensional Geometry" — direction cosines/ratios, the distance
// formula in space, and the angle between two lines.
//
// Reuses MATH_ANGLE_SPEED_CHALLENGE exactly as-is (same
// MULTI_QUESTION_GAME_TYPES + checkMultiQuestionAttempt MCQ-style
// question batch already used for Grade 6 "Measuring Angles" — see
// seedMathAngleSpeedChallenge.js). Judging direction ratios,
// distances, and angles between lines is the same quick-fire
// "classify/compute and pick the right option" shape as classifying
// angle types, just applied to 3D coordinate geometry. No new backend
// code.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 12 });
    console.log("Created new Grade 12 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Introduction to Three Dimensional Geometry" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Three Dimensional Geometry",
      title: "Introduction to Three Dimensional Geometry",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Direction Cosines and Direction Ratios of a Line ----
  let dcConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Direction Cosines and Direction Ratios of a Line" });
  if (!dcConcept) {
    dcConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Direction Cosines and Direction Ratios of a Line",
      explanation_text:
        "The direction cosines (l, m, n) of a line are the cosines of the angles it makes with the x, y and z axes, and always satisfy l\u00b2 + m\u00b2 + n\u00b2 = 1. Direction ratios (a, b, c) are any numbers proportional to the direction cosines \u2014 they don't need to satisfy that equation themselves. For the line joining (x\u2081,y\u2081,z\u2081) and (x\u2082,y\u2082,z\u2082), a simple set of direction ratios is (x\u2082\u2212x\u2081, y\u2082\u2212y\u2081, z\u2082\u2212z\u2081).",
    });
    console.log("Created concept:", dcConcept._id);
  } else {
    console.log("Using existing concept:", dcConcept._id);
  }

  const dcRounds = [
    {
      title: "Speed Round: Direction Cosines Basics",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 10,
        hint: "Direction cosines always satisfy l\u00b2 + m\u00b2 + n\u00b2 = 1; direction ratios don't have to.",
        questions: [
          { id: "q1", prompt: "Direction cosines of the x-axis are:", options: [{ id: "a", label: "(1, 0, 0)" }, { id: "b", label: "(0, 1, 0)" }], correct_option_id: "a" },
          { id: "q2", prompt: "For any line, l\u00b2 + m\u00b2 + n\u00b2 equals:", options: [{ id: "a", label: "0" }, { id: "b", label: "1" }], correct_option_id: "b" },
          { id: "q3", prompt: "Direction cosines of the z-axis are:", options: [{ id: "a", label: "(0, 0, 1)" }, { id: "b", label: "(1, 1, 0)" }], correct_option_id: "a" },
          { id: "q4", prompt: "True or False: direction ratios (a, b, c) must also satisfy a\u00b2 + b\u00b2 + c\u00b2 = 1.", options: [{ id: "a", label: "True" }, { id: "b", label: "False" }], correct_option_id: "b" },
          { id: "q5", prompt: "The direction ratios of the line joining (0,0,0) to (3,4,0) are:", options: [{ id: "a", label: "(3, 4, 0)" }, { id: "b", label: "(4, 3, 0)" }], correct_option_id: "a" },
          { id: "q6", prompt: "Which of these is NOT a valid set of direction cosines, since l\u00b2 + m\u00b2 + n\u00b2 \u2260 1?", options: [{ id: "a", label: "(1, 0, 0)" }, { id: "b", label: "(1, 1, 0)" }], correct_option_id: "b" },
        ],
      },
    },
    {
      title: "Speed Round: Finding Direction Ratios of a Line",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 12,
        hint: "Subtract corresponding coordinates: (x\u2082\u2212x\u2081, y\u2082\u2212y\u2081, z\u2082\u2212z\u2081) gives a valid set of direction ratios.",
        questions: [
          { id: "q1", prompt: "The direction ratios of the line joining (1,2,3) and (4,6,3) are:", options: [{ id: "a", label: "(3, 4, 0)" }, { id: "b", label: "(5, 8, 6)" }], correct_option_id: "a" },
          { id: "q2", prompt: "The direction ratios of the line joining (2,0,0) and (2,5,0) are:", options: [{ id: "a", label: "(0, 5, 0)" }, { id: "b", label: "(2, 5, 0)" }], correct_option_id: "a" },
          { id: "q3", prompt: "If direction ratios of a line are (1,1,1), which of these could be its direction cosines?", options: [{ id: "a", label: "(1/\u221a3, 1/\u221a3, 1/\u221a3)" }, { id: "b", label: "(1, 1, 1)" }], correct_option_id: "a" },
          { id: "q4", prompt: "The direction ratios of the line joining (0,0,0) and (0,0,5) are:", options: [{ id: "a", label: "(0, 0, 5)" }, { id: "b", label: "(5, 0, 0)" }], correct_option_id: "a" },
          { id: "q5", prompt: "Direction ratio sets (2,4,6) and (1,2,3) represent:", options: [{ id: "a", label: "The same direction (proportional)" }, { id: "b", label: "Different, unrelated directions" }], correct_option_id: "a" },
          { id: "q6", prompt: "The direction ratios of the line joining (1,1,1) and (2,2,2) are:", options: [{ id: "a", label: "(1, 1, 1)" }, { id: "b", label: "(1, 2, 3)" }], correct_option_id: "a" },
        ],
      },
    },
  ];

  for (const round of dcRounds) {
    const exists = await GameContent.findOne({ game_type: "MATH_ANGLE_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_ANGLE_SPEED_CHALLENGE",
        concept_id: dcConcept._id,
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

  // ---- Concept 2: Distance Between Two Points in Space ----
  let distanceConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Distance Between Two Points in Space" });
  if (!distanceConcept) {
    distanceConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Distance Between Two Points in Space",
      explanation_text:
        "The distance between two points (x\u2081,y\u2081,z\u2081) and (x\u2082,y\u2082,z\u2082) in space is a direct extension of the 2D distance formula, with a third term added under the square root: d = \u221a[(x\u2082\u2212x\u2081)\u00b2 + (y\u2082\u2212y\u2081)\u00b2 + (z\u2082\u2212z\u2081)\u00b2].",
    });
    console.log("Created concept:", distanceConcept._id);
  } else {
    console.log("Using existing concept:", distanceConcept._id);
  }

  const distanceRounds = [
    {
      title: "Speed Round: Distance Formula in 3D",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "Square each coordinate difference, add them, then take the square root.",
        questions: [
          { id: "q1", prompt: "Distance between (0,0,0) and (3,4,0):", options: [{ id: "a", label: "5" }, { id: "b", label: "7" }], correct_option_id: "a" },
          { id: "q2", prompt: "Distance between (0,0,0) and (1,2,2):", options: [{ id: "a", label: "3" }, { id: "b", label: "5" }], correct_option_id: "a" },
          { id: "q3", prompt: "Distance between (0,0,0) and (2,3,6):", options: [{ id: "a", label: "7" }, { id: "b", label: "9" }], correct_option_id: "a" },
          { id: "q4", prompt: "Distance between (1,1,1) and (4,5,1):", options: [{ id: "a", label: "5" }, { id: "b", label: "6" }], correct_option_id: "a" },
          { id: "q5", prompt: "Distance between (2,3,1) and (2,3,7):", options: [{ id: "a", label: "6" }, { id: "b", label: "4" }], correct_option_id: "a" },
          { id: "q6", prompt: "Distance between (0,0,0) and (6,8,0):", options: [{ id: "a", label: "10" }, { id: "b", label: "12" }], correct_option_id: "a" },
        ],
      },
    },
    {
      title: "Speed Round: Applying the Distance Formula",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 15,
        hint: "Find the direction ratios first (the coordinate differences), then apply the distance formula to those.",
        questions: [
          { id: "q1", prompt: "The distance between (1,2,3) and (4,6,3) is:", options: [{ id: "a", label: "5" }, { id: "b", label: "7" }], correct_option_id: "a" },
          { id: "q2", prompt: "The distance between (-1,2,1) and (3,2,4) is:", options: [{ id: "a", label: "5" }, { id: "b", label: "6" }], correct_option_id: "a" },
          { id: "q3", prompt: "The distance between (2,-1,3) and (2,-1,-4) is:", options: [{ id: "a", label: "7" }, { id: "b", label: "5" }], correct_option_id: "a" },
          { id: "q4", prompt: "A point that stays the same fixed distance from the origin in every direction lies on a:", options: [{ id: "a", label: "Sphere centered at the origin" }, { id: "b", label: "Straight line through the origin" }], correct_option_id: "a" },
          { id: "q5", prompt: "The distance between (3,4,12) and (0,0,0) is:", options: [{ id: "a", label: "13" }, { id: "b", label: "11" }], correct_option_id: "a" },
          { id: "q6", prompt: "The distance between (1,4,8) and (0,0,0) is:", options: [{ id: "a", label: "9" }, { id: "b", label: "7" }], correct_option_id: "a" },
        ],
      },
    },
  ];

  for (const round of distanceRounds) {
    const exists = await GameContent.findOne({ game_type: "MATH_ANGLE_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_ANGLE_SPEED_CHALLENGE",
        concept_id: distanceConcept._id,
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

  // ---- Concept 3: Angle Between Two Lines Using Direction Ratios ----
  let angleConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Angle Between Two Lines Using Direction Ratios" });
  if (!angleConcept) {
    angleConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Angle Between Two Lines Using Direction Ratios",
      explanation_text:
        "For two lines with direction ratios (a\u2081,b\u2081,c\u2081) and (a\u2082,b\u2082,c\u2082), the angle \u03b8 between them satisfies cos\u03b8 = (a\u2081a\u2082 + b\u2081b\u2082 + c\u2081c\u2082) / (\u221a(a\u2081\u00b2+b\u2081\u00b2+c\u2081\u00b2) \u00b7 \u221a(a\u2082\u00b2+b\u2082\u00b2+c\u2082\u00b2)). The lines are perpendicular exactly when a\u2081a\u2082 + b\u2081b\u2082 + c\u2081c\u2082 = 0, and parallel when their direction ratios are proportional to each other.",
    });
    console.log("Created concept:", angleConcept._id);
  } else {
    console.log("Using existing concept:", angleConcept._id);
  }

  const angleRounds = [
    {
      title: "Speed Round: Perpendicular or Parallel?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "Perpendicular: a\u2081a\u2082 + b\u2081b\u2082 + c\u2081c\u2082 = 0. Parallel: the direction ratios are proportional.",
        questions: [
          { id: "q1", prompt: "Lines with direction ratios (1,0,0) and (0,1,0) are:", options: [{ id: "a", label: "Perpendicular" }, { id: "b", label: "Parallel" }], correct_option_id: "a" },
          { id: "q2", prompt: "Lines with direction ratios (2,4,6) and (1,2,3) are:", options: [{ id: "a", label: "Parallel" }, { id: "b", label: "Perpendicular" }], correct_option_id: "a" },
          { id: "q3", prompt: "Lines with direction ratios (1,1,1) and (1,-1,0) are:", options: [{ id: "a", label: "Perpendicular" }, { id: "b", label: "Parallel" }], correct_option_id: "a" },
          { id: "q4", prompt: "Lines with direction ratios (1,2,3) and (2,4,6) are:", options: [{ id: "a", label: "Parallel" }, { id: "b", label: "Perpendicular" }], correct_option_id: "a" },
          { id: "q5", prompt: "Lines with direction ratios (3,0,0) and (0,0,5) are:", options: [{ id: "a", label: "Perpendicular" }, { id: "b", label: "Parallel" }], correct_option_id: "a" },
          { id: "q6", prompt: "Lines with direction ratios (1,2,2) and (2,4,4) are:", options: [{ id: "a", label: "Parallel" }, { id: "b", label: "Perpendicular" }], correct_option_id: "a" },
        ],
      },
    },
    {
      title: "Speed Round: Computing the Angle Between Two Lines",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 15,
        hint: "Compute the dot product a\u2081a\u2082+b\u2081b\u2082+c\u2081c\u2082 and each line's magnitude, then use cos\u03b8 = dot product \u00f7 (product of magnitudes).",
        questions: [
          { id: "q1", prompt: "For direction ratios (1,0,0) and (1,1,0), cos\u03b8 equals:", options: [{ id: "a", label: "1/\u221a2" }, { id: "b", label: "0" }], correct_option_id: "a" },
          { id: "q2", prompt: "For direction ratios (1,1,0) and (1,0,0), the angle \u03b8 is:", options: [{ id: "a", label: "45\u00b0" }, { id: "b", label: "90\u00b0" }], correct_option_id: "a" },
          { id: "q3", prompt: "For direction ratios (1,0,0) and (0,1,0), the angle \u03b8 is:", options: [{ id: "a", label: "90\u00b0" }, { id: "b", label: "0\u00b0" }], correct_option_id: "a" },
          { id: "q4", prompt: "For direction ratios (1,1,1) and (1,1,1), the angle \u03b8 is:", options: [{ id: "a", label: "0\u00b0" }, { id: "b", label: "90\u00b0" }], correct_option_id: "a" },
          { id: "q5", prompt: "For direction ratios (1,-1,0) and (1,1,0), cos\u03b8 equals:", options: [{ id: "a", label: "0" }, { id: "b", label: "1" }], correct_option_id: "a" },
          { id: "q6", prompt: "If cos\u03b8 = 0 between two lines, the lines are:", options: [{ id: "a", label: "Perpendicular" }, { id: "b", label: "Parallel" }], correct_option_id: "a" },
        ],
      },
    },
  ];

  for (const round of angleRounds) {
    const exists = await GameContent.findOne({ game_type: "MATH_ANGLE_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_ANGLE_SPEED_CHALLENGE",
        concept_id: angleConcept._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
