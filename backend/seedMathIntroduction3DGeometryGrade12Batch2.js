require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). All 3 concepts in "Introduction to
// Three Dimensional Geometry" (Grade 12 Mathematics,
// seedMathIntroduction3DGeometryGrade12.js) only have 2 GameContent
// rounds each, with no "hard" round for any of them. This adds one
// more MATH_ANGLE_SPEED_CHALLENGE round to EACH of the 3 existing
// concepts. Same MCQ question-batch payload shape as the original
// rounds, same MULTI_QUESTION_GAME_TYPES / checkMultiQuestionAttempt
// scoring — no new mechanic, no new chapter/concepts. Errors out if
// the subject/chapter/concepts don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 12 Mathematics subject not found — run seedMathIntroduction3DGeometryGrade12.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Introduction to Three Dimensional Geometry" });
  if (!chapter) {
    console.error('Chapter "Introduction to Three Dimensional Geometry" not found — run seedMathIntroduction3DGeometryGrade12.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  async function addRound(conceptTitle, round) {
    const concept = await Concept.findOne({ chapter_id: chapter._id, title: conceptTitle });
    if (!concept) {
      console.error(`Concept "${conceptTitle}" not found — run seedMathIntroduction3DGeometryGrade12.js first.`);
      process.exit(1);
    }
    const exists = await GameContent.findOne({ game_type: "MATH_ANGLE_SPEED_CHALLENGE", title: round.title });
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

  // ---- Concept 1: Direction Cosines and Direction Ratios of a Line ----
  await addRound("Direction Cosines and Direction Ratios of a Line", {
    title: "Speed Round: Verifying and Normalizing Direction Cosines",
    difficulty: "hard",
    order_index: 3,
    payload: {
      time_limit_seconds: 15,
      hint: "To turn direction ratios into direction cosines, divide each by the magnitude \u221a(a\u00b2+b\u00b2+c\u00b2).",
      questions: [
        { id: "q1", prompt: "For direction ratios (3,4,0), the magnitude \u221a(a\u00b2+b\u00b2+c\u00b2) is:", options: [{ id: "a", label: "5" }, { id: "b", label: "7" }], correct_option_id: "a" },
        { id: "q2", prompt: "For direction ratios (6,8,0), the direction cosines are:", options: [{ id: "a", label: "(3/5, 4/5, 0)" }, { id: "b", label: "(6, 8, 0)" }], correct_option_id: "a" },
        { id: "q3", prompt: "For direction ratios (0,3,4), the magnitude is:", options: [{ id: "a", label: "5" }, { id: "b", label: "9" }], correct_option_id: "a" },
        { id: "q4", prompt: "For direction ratios (1,2,2), the magnitude is:", options: [{ id: "a", label: "3" }, { id: "b", label: "5" }], correct_option_id: "a" },
        { id: "q5", prompt: "For direction ratios (1,2,2) with magnitude 3, the direction cosines are:", options: [{ id: "a", label: "(1/3, 2/3, 2/3)" }, { id: "b", label: "(1, 2, 2)" }], correct_option_id: "a" },
        { id: "q6", prompt: "Which set below could actually be direction cosines, since l\u00b2+m\u00b2+n\u00b2 = 1?", options: [{ id: "a", label: "(3/5, 4/5, 0)" }, { id: "b", label: "(3, 4, 0)" }], correct_option_id: "a" },
      ],
    },
  });

  await addRound("Direction Cosines and Direction Ratios of a Line", {
    title: "Speed Round: Direction Cosines of the Line Joining Two Points",
    difficulty: "hard",
    order_index: 4,
    payload: {
      time_limit_seconds: 15,
      hint: "First find the direction ratios (coordinate differences), then find the magnitude, and divide each ratio by it to get the direction cosines.",
      questions: [
        { id: "q1", prompt: "For the line joining (0,0,0) and (3,4,12), the direction ratios are:", options: [{ id: "a", label: "(3, 4, 12)" }, { id: "b", label: "(4, 3, 12)" }], correct_option_id: "a" },
        { id: "q2", prompt: "For the line joining (0,0,0) and (3,4,12), the magnitude of the direction ratios is:", options: [{ id: "a", label: "13" }, { id: "b", label: "12" }], correct_option_id: "a" },
        { id: "q3", prompt: "For the line joining (0,0,0) and (3,4,12) with magnitude 13, the direction cosines are:", options: [{ id: "a", label: "(3/13, 4/13, 12/13)" }, { id: "b", label: "(3, 4, 12)" }], correct_option_id: "a" },
        { id: "q4", prompt: "For the line joining (1,1,1) and (1,1,4), the direction ratios are:", options: [{ id: "a", label: "(0, 0, 3)" }, { id: "b", label: "(0, 0, 1)" }], correct_option_id: "a" },
        { id: "q5", prompt: "For direction ratios (0,0,3), the direction cosines are:", options: [{ id: "a", label: "(0, 0, 1)" }, { id: "b", label: "(0, 0, 3)" }], correct_option_id: "a" },
        { id: "q6", prompt: "A line's direction cosines are (0,1,0). This line is parallel to which axis?", options: [{ id: "a", label: "The y-axis" }, { id: "b", label: "The x-axis" }], correct_option_id: "a" },
      ],
    },
  });

  await addRound("Direction Cosines and Direction Ratios of a Line", {
    title: "Speed Round: Recognizing Axis-Parallel Lines",
    difficulty: "hard",
    order_index: 5,
    payload: {
      time_limit_seconds: 12,
      hint: "A line parallel to the x-axis has direction ratios like (1,0,0); parallel to the y-axis, (0,1,0); parallel to the z-axis, (0,0,1).",
      questions: [
        { id: "q1", prompt: "A line has direction ratios (5,0,0). It is parallel to the:", options: [{ id: "a", label: "x-axis" }, { id: "b", label: "y-axis" }], correct_option_id: "a" },
        { id: "q2", prompt: "A line has direction ratios (0,0,7). It is parallel to the:", options: [{ id: "a", label: "z-axis" }, { id: "b", label: "x-axis" }], correct_option_id: "a" },
        { id: "q3", prompt: "A line has direction ratios (0,-4,0). It is parallel to the:", options: [{ id: "a", label: "y-axis" }, { id: "b", label: "z-axis" }], correct_option_id: "a" },
        { id: "q4", prompt: "The line joining (2,3,5) and (2,3,9) is parallel to the:", options: [{ id: "a", label: "z-axis" }, { id: "b", label: "y-axis" }], correct_option_id: "a" },
        { id: "q5", prompt: "The line joining (1,4,7) and (6,4,7) is parallel to the:", options: [{ id: "a", label: "x-axis" }, { id: "b", label: "z-axis" }], correct_option_id: "a" },
        { id: "q6", prompt: "The line joining (3,1,2) and (3,9,2) is parallel to the:", options: [{ id: "a", label: "y-axis" }, { id: "b", label: "x-axis" }], correct_option_id: "a" },
      ],
    },
  });

  // ---- Concept 2: Distance Between Two Points in Space ----
  await addRound("Distance Between Two Points in Space", {
    title: "Speed Round: Using Distance to Identify Shapes",
    difficulty: "hard",
    order_index: 3,
    payload: {
      time_limit_seconds: 18,
      hint: "Compute each side length with the distance formula, then compare them \u2014 equal side lengths (or one side equalling the sum of the other two) can reveal what shape the points form.",
      questions: [
        { id: "q1", prompt: "Points A(0,0,0), B(3,4,0), C(0,4,3) \u2014 is triangle ABC isosceles (two equal sides)?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q2", prompt: "Points A(0,0,0), B(1,1,1), C(2,2,2) \u2014 are these three points collinear (lie on the same line)?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q3", prompt: "Points A(1,0,0), B(0,1,0), C(0,0,1) \u2014 is triangle ABC equilateral (all sides equal)?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q4", prompt: "Point P(2,3,6) is how far from the origin?", options: [{ id: "a", label: "7" }, { id: "b", label: "9" }], correct_option_id: "a" },
        { id: "q5", prompt: "Points A(0,0,0) and B(4,4,7) \u2014 the distance AB is:", options: [{ id: "a", label: "9" }, { id: "b", label: "7" }], correct_option_id: "a" },
        { id: "q6", prompt: "A sphere is centered at the origin with radius 5. Which point lies exactly ON the sphere: (3,4,0) or (3,3,3)?", options: [{ id: "a", label: "(3, 4, 0)" }, { id: "b", label: "(3, 3, 3)" }], correct_option_id: "a" },
      ],
    },
  });

  await addRound("Distance Between Two Points in Space", {
    title: "Speed Round: Finding a Missing Coordinate",
    difficulty: "hard",
    order_index: 4,
    payload: {
      time_limit_seconds: 15,
      hint: "Set up the distance formula with the unknown coordinate as a variable, then solve for it.",
      questions: [
        { id: "q1", prompt: "The distance between (0,0,0) and (x,0,0) is 7 (x > 0). Find x.", options: [{ id: "a", label: "7" }, { id: "b", label: "49" }], correct_option_id: "a" },
        { id: "q2", prompt: "The distance between (0,0,0) and (0,y,0) is 9 (y > 0). Find y.", options: [{ id: "a", label: "9" }, { id: "b", label: "81" }], correct_option_id: "a" },
        { id: "q3", prompt: "The distance between (1,2,2) and (1,2,z) is 5, where z > 2. Find z.", options: [{ id: "a", label: "7" }, { id: "b", label: "5" }], correct_option_id: "a" },
        { id: "q4", prompt: "The distance between (0,0,0) and (3,4,z) is 13, where z > 0. Find z.", options: [{ id: "a", label: "12" }, { id: "b", label: "10" }], correct_option_id: "a" },
        { id: "q5", prompt: "The distance between (2,0,0) and (x,0,0) is 6, where x > 2. Find x.", options: [{ id: "a", label: "8" }, { id: "b", label: "6" }], correct_option_id: "a" },
        { id: "q6", prompt: "The distance between (0,0,0) and (0,5,z) is 13, where z > 0. Find z.", options: [{ id: "a", label: "12" }, { id: "b", label: "5" }], correct_option_id: "a" },
      ],
    },
  });

  await addRound("Distance Between Two Points in Space", {
    title: "Speed Round: Finding the Midpoint of a Segment",
    difficulty: "hard",
    order_index: 5,
    payload: {
      time_limit_seconds: 15,
      hint: "The midpoint of the segment joining (x\u2081,y\u2081,z\u2081) and (x\u2082,y\u2082,z\u2082) is ((x\u2081+x\u2082)/2, (y\u2081+y\u2082)/2, (z\u2081+z\u2082)/2).",
      questions: [
        { id: "q1", prompt: "Find the midpoint of the segment joining (0,0,0) and (4,6,8).", options: [{ id: "a", label: "(2, 3, 4)" }, { id: "b", label: "(4, 6, 8)" }], correct_option_id: "a" },
        { id: "q2", prompt: "Find the midpoint of the segment joining (2,2,2) and (8,8,8).", options: [{ id: "a", label: "(5, 5, 5)" }, { id: "b", label: "(6, 6, 6)" }], correct_option_id: "a" },
        { id: "q3", prompt: "Find the midpoint of the segment joining (1,3,5) and (7,9,11).", options: [{ id: "a", label: "(4, 6, 8)" }, { id: "b", label: "(3, 6, 8)" }], correct_option_id: "a" },
        { id: "q4", prompt: "Find the midpoint of the segment joining (-2,4,0) and (6,-4,0).", options: [{ id: "a", label: "(2, 0, 0)" }, { id: "b", label: "(4, 0, 0)" }], correct_option_id: "a" },
        { id: "q5", prompt: "The midpoint of a segment is (3,3,3), and one endpoint is (0,0,0). Find the other endpoint.", options: [{ id: "a", label: "(6, 6, 6)" }, { id: "b", label: "(3, 3, 3)" }], correct_option_id: "a" },
        { id: "q6", prompt: "The midpoint of a segment is (5,0,5), and one endpoint is (2,0,2). Find the other endpoint.", options: [{ id: "a", label: "(8, 0, 8)" }, { id: "b", label: "(7, 0, 7)" }], correct_option_id: "a" },
      ],
    },
  });

  // ---- Concept 3: Angle Between Two Lines Using Direction Ratios ----
  await addRound("Angle Between Two Lines Using Direction Ratios", {
    title: "Speed Round: Angle Between a Line and the Coordinate Axes",
    difficulty: "hard",
    order_index: 3,
    payload: {
      time_limit_seconds: 15,
      hint: "The angle a line makes with an axis uses that axis's own direction ratios \u2014 e.g. (1,0,0) for the x-axis \u2014 in the same cos\u03b8 formula.",
      questions: [
        { id: "q1", prompt: "A line has direction ratios (1,1,0). Find cos\u03b8 between this line and the x-axis (1,0,0).", options: [{ id: "a", label: "1/\u221a2" }, { id: "b", label: "1" }], correct_option_id: "a" },
        { id: "q2", prompt: "A line has direction ratios (1,1,0). Find the angle \u03b8 it makes with the x-axis.", options: [{ id: "a", label: "45\u00b0" }, { id: "b", label: "90\u00b0" }], correct_option_id: "a" },
        { id: "q3", prompt: "A line has direction ratios (0,1,1). Find the angle it makes with the x-axis (1,0,0).", options: [{ id: "a", label: "90\u00b0" }, { id: "b", label: "0\u00b0" }], correct_option_id: "a" },
        { id: "q4", prompt: "A line has direction ratios (1,1,1). Find cos\u03b8 between this line and the z-axis (0,0,1).", options: [{ id: "a", label: "1/\u221a3" }, { id: "b", label: "1/\u221a2" }], correct_option_id: "a" },
        { id: "q5", prompt: "A line lies exactly along the y-axis. Find the angle it makes with the x-axis.", options: [{ id: "a", label: "90\u00b0" }, { id: "b", label: "0\u00b0" }], correct_option_id: "a" },
        { id: "q6", prompt: "A line has direction ratios (1,0,1). Find the angle it makes with the x-axis (1,0,0).", options: [{ id: "a", label: "45\u00b0" }, { id: "b", label: "60\u00b0" }], correct_option_id: "a" },
      ],
    },
  });

  await addRound("Angle Between Two Lines Using Direction Ratios", {
    title: "Speed Round: Angle Between Two Lines Given Two Points Each",
    difficulty: "hard",
    order_index: 4,
    payload: {
      time_limit_seconds: 15,
      hint: "First find the direction ratios of each line from its two points (coordinate differences), then apply the perpendicular/parallel test.",
      questions: [
        { id: "q1", prompt: "Line 1 joins (0,0,0) and (1,0,0). Line 2 joins (0,0,0) and (0,1,0). Are they perpendicular?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q2", prompt: "Line 1 joins (0,0,0) and (2,2,0). Line 2 joins (0,0,0) and (1,1,0). Are they parallel?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q3", prompt: "Line 1 joins (1,1,1) and (2,1,1). Line 2 joins (1,1,1) and (1,2,1). Are they perpendicular?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q4", prompt: "Line 1 joins (0,0,0) and (3,0,0). Line 2 joins (0,0,0) and (0,0,5). Are they perpendicular?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q5", prompt: "Line 1 joins (0,0,0) and (2,4,6). Line 2 joins (0,0,0) and (1,2,3). Are they parallel?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q6", prompt: "Line 1 joins (1,0,0) and (2,1,1). Line 2 joins (0,0,0) and (1,1,1). Do they have the same direction ratios?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
      ],
    },
  });

  await addRound("Angle Between Two Lines Using Direction Ratios", {
    title: "Speed Round: More Perpendicular and Parallel Checks",
    difficulty: "hard",
    order_index: 5,
    payload: {
      time_limit_seconds: 15,
      hint: "Perpendicular: a\u2081a\u2082+b\u2081b\u2082+c\u2081c\u2082 = 0. Parallel: the direction ratios are proportional.",
      questions: [
        { id: "q1", prompt: "Lines with direction ratios (4,0,3) and (3,0,-4). Find a\u2081a\u2082+b\u2081b\u2082+c\u2081c\u2082.", options: [{ id: "a", label: "0" }, { id: "b", label: "12" }], correct_option_id: "a" },
        { id: "q2", prompt: "Lines with direction ratios (4,0,3) and (3,0,-4) \u2014 are they perpendicular?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q3", prompt: "Lines with direction ratios (5,10,15) and (1,2,3) \u2014 are they parallel?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
        { id: "q4", prompt: "Lines with direction ratios (2,1,2) and (1,2,2). Find a\u2081a\u2082+b\u2081b\u2082+c\u2081c\u2082.", options: [{ id: "a", label: "8" }, { id: "b", label: "0" }], correct_option_id: "a" },
        { id: "q5", prompt: "Lines with direction ratios (2,1,2) and (1,2,2) \u2014 are they perpendicular?", options: [{ id: "a", label: "No" }, { id: "b", label: "Yes" }], correct_option_id: "a" },
        { id: "q6", prompt: "Lines with direction ratios (0,4,0) and (0,0,6) \u2014 are they perpendicular?", options: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correct_option_id: "a" },
      ],
    },
  });

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
