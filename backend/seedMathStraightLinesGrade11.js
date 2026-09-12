require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session). Chapter 9, next after Sequences and Series:
// Straight Lines.
//
// New game_type this pass: MATH_LINE_EQUATION_MATCH. Reuses the
// existing mapping-equality scoring group (same backend logic as
// Fraction/Shape/Ratio/Function/Trig/Inequality Match) — matching a
// line's description (two points, or a point plus a slope) to its
// correct equation is the same "assign each slot to its correct
// counterpart" shape as those. Chosen over Speed Challenge for
// variety and because writing an equation from a description is
// naturally a matching/assignment task, not a pure numeric answer.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Straight Lines" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Coordinate Geometry",
      title: "Straight Lines",
      order_index: 9,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Equation of a Line" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Equation of a Line",
      explanation_text:
        "The slope of a line through two points (x1, y1) and (x2, y2) is m = (y2 − y1) / (x2 − x1). Given a point and a slope, the point-slope form y − y1 = m(x − x1) gives the line's equation, which simplifies to slope-intercept form y = mx + c. Given two points, first find the slope, then use either point in the point-slope form. Horizontal lines have slope 0 (y = constant); vertical lines have undefined slope (x = constant).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape matches Inequality Match: `slots` are the line
  // description cards, `components` are the tappable equation cards,
  // `correct_mapping` is stripped before the client sees it.
  const lineEquationMatchChallenges = [
    {
      title: "Match: Point and Slope to Equation",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each line's description to its correct equation.",
        slots: [
          { id: "s1", label: "Passes through (0, 3) with slope 2" },
          { id: "s2", label: "Passes through (1, 2) with slope -1" },
          { id: "s3", label: "Passes through (2, 5) with slope 0" },
        ],
        components: [
          { id: "c1", label: "y = 2x + 3" },
          { id: "c2", label: "y = -x + 3" },
          { id: "c3", label: "y = 5" },
          { id: "c4", label: "y = 2x - 3" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Use point-slope form y − y1 = m(x − x1), then simplify. A slope of 0 always gives a horizontal line y = (the y-coordinate).",
      },
    },
    {
      title: "Match: Two Points to Equation",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each pair of points to the equation of the line through them.",
        slots: [
          { id: "s1", label: "Passes through (0, 0) and (2, 4)" },
          { id: "s2", label: "Passes through (1, 1) and (3, 5)" },
          { id: "s3", label: "Passes through (0, 5) and (5, 0)" },
        ],
        components: [
          { id: "c1", label: "y = 2x" },
          { id: "c2", label: "y = 2x - 1" },
          { id: "c3", label: "y = -x + 5" },
          { id: "c4", label: "y = x + 5" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "First find the slope m = (y2 − y1)/(x2 − x1), then plug either point into point-slope form.",
      },
    },
    {
      title: "Match: Descriptions to General Form",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each description to the line's equation in general form (Ax + By + C = 0).",
        slots: [
          { id: "s1", label: "x-intercept 4, y-intercept 2" },
          { id: "s2", label: "Passes through (3, 4) with slope 1/2" },
          { id: "s3", label: "Vertical line through (3, -2)" },
        ],
        components: [
          { id: "c1", label: "x + 2y - 4 = 0" },
          { id: "c2", label: "x - 2y + 5 = 0" },
          { id: "c3", label: "x - 3 = 0" },
          { id: "c4", label: "x + 2y + 4 = 0" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Intercept form is x/a + y/b = 1. A vertical line has no slope and its equation is always x = (the x-coordinate).",
      },
    },
  ];

  for (const challenge of lineEquationMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_LINE_EQUATION_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_LINE_EQUATION_MATCH",
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

  console.log("Line Equation Match seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
