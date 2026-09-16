require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 12 Mathematics currently has
// exactly one chapter, "Determinants" (order_index 1) — see
// seedMathGrade12.js / seedMathEquationBuilderGrade12.js. This adds a
// genuine second NCERT Class 12 Maths chapter, "Linear Programming".
//
// Reuses MATH_INEQUALITY_MATCH exactly as-is (same slot/component
// correct_mapping check already used for Grade 11 "Linear Inequalities"
// — see seedMathInequalitiesGrade11.js). LPP begins with translating a
// word problem into linear constraints, so matching a constraint
// description to its correct inequality/feasible-region meaning is the
// same "assign each slot to its correct counterpart" shape, just applied
// one level up (multi-variable constraints and corner-point evaluation
// instead of single-variable solution intervals). No new backend code.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Linear Programming" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Linear Programming",
      title: "Linear Programming",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Formulating Constraints as Linear Inequalities ----
  let formulateConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Formulating Constraints as Linear Inequalities" });
  if (!formulateConcept) {
    formulateConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Formulating Constraints as Linear Inequalities",
      explanation_text:
        "The first step in any Linear Programming Problem (LPP) is translating the real-world limits described in words — available time, raw material, budget — into linear inequalities in the decision variables. Getting the inequality sign and the exact quantities right is essential before any solving can begin.",
    });
    console.log("Created concept:", formulateConcept._id);
  } else {
    console.log("Using existing concept:", formulateConcept._id);
  }

  const formulateChallenges = [
    {
      title: "Match: Word Problem to Constraint",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Let x = number of tables and y = number of chairs made. Match each described limit to its correct inequality.",
        slots: [
          { id: "s1", label: "A carpenter can make at most 50 items (tables and chairs combined)" },
          { id: "s2", label: "The number of chairs made cannot be negative" },
          { id: "s3", label: "At least 10 tables must be made to meet an existing order" },
        ],
        components: [
          { id: "c1", label: "x + y \u2264 50" },
          { id: "c2", label: "y \u2265 0" },
          { id: "c3", label: "x \u2265 10" },
          { id: "c4", label: "x + y \u2265 50" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "'At most' means \u2264, 'at least' means \u2265, and quantities that can't go below zero need a non-negativity constraint.",
      },
    },
    {
      title: "Match: Resource Constraints",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "A factory makes x units of Product A and y units of Product B. Match each resource limit to its correct constraint.",
        slots: [
          { id: "s1", label: "Each unit of A needs 2 hours and each unit of B needs 3 hours; only 60 machine-hours are available" },
          { id: "s2", label: "Each unit of A needs 4 kg and each unit of B needs 2 kg of raw material; only 80 kg is available" },
          { id: "s3", label: "The factory must produce at least twice as many units of A as units of B" },
        ],
        components: [
          { id: "c1", label: "2x + 3y \u2264 60" },
          { id: "c2", label: "4x + 2y \u2264 80" },
          { id: "c3", label: "x \u2265 2y" },
          { id: "c4", label: "2x + 3y \u2265 60" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Multiply each unit's resource use by the number of units made, and keep the total within (\u2264) the resource available.",
      },
    },
    {
      title: "Match: Objective Function to Goal",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Let x = number of units of Product A and y = number of units of Product B. Match each business goal to its correct objective function and optimization direction.",
        slots: [
          { id: "s1", label: "Product A gives a profit of \u20b940/unit and Product B gives \u20b930/unit; maximize total profit" },
          { id: "s2", label: "Product A costs \u20b950/unit and Product B costs \u20b970/unit to produce; minimize total cost" },
          { id: "s3", label: "Why the optimal solution of an LPP always occurs at a corner point of the feasible region" },
        ],
        components: [
          { id: "c1", label: "Maximize Z = 40x + 30y" },
          { id: "c2", label: "Minimize Z = 50x + 70y" },
          { id: "c3", label: "Because Z is linear, its extreme values over a convex polygon region can only occur at its vertices, never strictly inside" },
          { id: "c4", label: "Because the middle of the region always gives the best value for a linear objective function" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The objective function is built the same way as a constraint's left-hand side — coefficient times variable, summed — just paired with 'maximize' or 'minimize' instead of an inequality.",
      },
    },
  ];

  for (const challenge of formulateChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_INEQUALITY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_INEQUALITY_MATCH",
        concept_id: formulateConcept._id,
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

  // ---- Concept 2: Identifying the Feasible Region ----
  let feasibleConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Identifying the Feasible Region" });
  if (!feasibleConcept) {
    feasibleConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Identifying the Feasible Region",
      explanation_text:
        "Each linear constraint divides the plane into two half-planes; the feasible region is the overlap of ALL the half-planes that satisfy every constraint at once (including x \u2265 0 and y \u2265 0). To decide which side of a boundary line is included, test a convenient point like the origin (0, 0) in the original inequality.",
    });
    console.log("Created concept:", feasibleConcept._id);
  } else {
    console.log("Using existing concept:", feasibleConcept._id);
  }

  const feasibleChallenges = [
    {
      title: "Match: Which Side of the Line?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each inequality to the correct description of its shaded region, using the origin test.",
        slots: [
          { id: "s1", label: "x + y \u2264 10" },
          { id: "s2", label: "x + y \u2265 10" },
          { id: "s3", label: "x \u2264 5" },
        ],
        components: [
          { id: "c1", label: "The side containing the origin (0,0), since 0 + 0 \u2264 10 is true" },
          { id: "c2", label: "The side NOT containing the origin, since 0 + 0 \u2265 10 is false" },
          { id: "c3", label: "Everything to the left of the vertical line x = 5, including the origin" },
          { id: "c4", label: "Everything above the horizontal line y = 5" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Plug (0, 0) into the inequality. If it makes the inequality true, the origin's side is the shaded region; if false, shade the other side.",
      },
    },
    {
      title: "Match: Bounded or Unbounded",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each feasible region description to whether it is bounded or unbounded.",
        slots: [
          { id: "s1", label: "x \u2265 0, y \u2265 0, x + y \u2264 20" },
          { id: "s2", label: "x \u2265 0, y \u2265 0, x + y \u2265 20" },
          { id: "s3", label: "A region enclosed on all sides by a finite polygon" },
        ],
        components: [
          { id: "c1", label: "Bounded — the region is a closed triangle" },
          { id: "c2", label: "Unbounded — the region extends infinitely away from the origin" },
          { id: "c3", label: "Always bounded, by definition" },
          { id: "c4", label: "Always unbounded, by definition" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "'\u2264 a fixed total' with non-negativity constraints closes off the region into a bounded shape; '\u2265 a fixed total' leaves it open to infinity.",
      },
    },
    {
      title: "Match: Finding Corner Points",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "For the constraints x \u2265 0, y \u2265 0, x + y \u2264 8, and 2x + y \u2264 10, match each pair of boundary lines to the corner point where they intersect.",
        slots: [
          { id: "s1", label: "x = 0 and y = 0" },
          { id: "s2", label: "x + y = 8 and x = 0" },
          { id: "s3", label: "x + y = 8 and 2x + y = 10" },
        ],
        components: [
          { id: "c1", label: "(0, 0)" },
          { id: "c2", label: "(0, 8)" },
          { id: "c3", label: "(2, 6)" },
          { id: "c4", label: "(5, 0)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Solve each pair of boundary EQUATIONS simultaneously — that intersection point is a candidate corner of the feasible region.",
      },
    },
  ];

  for (const challenge of feasibleChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_INEQUALITY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_INEQUALITY_MATCH",
        concept_id: feasibleConcept._id,
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

  // ---- Concept 3: Evaluating the Objective Function at Corner Points ----
  let evaluateConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Evaluating the Objective Function at Corner Points" });
  if (!evaluateConcept) {
    evaluateConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Evaluating the Objective Function at Corner Points",
      explanation_text:
        "Once the feasible region's corner points are found, the Corner Point Method says the optimal value of a linear objective function Z = ax + by must occur at one of those corners. Evaluate Z at every corner point, then pick the largest value (for maximization) or the smallest (for minimization).",
    });
    console.log("Created concept:", evaluateConcept._id);
  } else {
    console.log("Using existing concept:", evaluateConcept._id);
  }

  const evaluateChallenges = [
    {
      title: "Match: Z-Value at Each Corner",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "For Z = 3x + 2y, match each corner point to its correct Z-value.",
        slots: [
          { id: "s1", label: "(0, 0)" },
          { id: "s2", label: "(4, 0)" },
          { id: "s3", label: "(2, 3)" },
        ],
        components: [
          { id: "c1", label: "Z = 0" },
          { id: "c2", label: "Z = 12" },
          { id: "c3", label: "Z = 12" },
          { id: "c4", label: "Z = 18" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Substitute each point's x and y directly into Z = 3x + 2y and compute.",
      },
    },
    {
      title: "Match: Which Corner is Optimal?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "A feasible region has corners (0,0), (0,6), (4,4) and (6,0), with Z = 5x + 4y. Match each corner's Z-value to whether it is the maximum, a middle value, or the minimum.",
        slots: [
          { id: "s1", label: "(0, 0): Z = 0" },
          { id: "s2", label: "(4, 4): Z = 36" },
          { id: "s3", label: "(6, 0): Z = 30" },
        ],
        components: [
          { id: "c1", label: "Minimum value of Z" },
          { id: "c2", label: "Maximum value of Z" },
          { id: "c3", label: "A middle value, neither maximum nor minimum" },
          { id: "c4", label: "Not a valid corner point" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Compute Z at (0,6) too (Z = 24) — comparing all four values, 36 is the largest and 0 is the smallest.",
      },
    },
    {
      title: "Match: Minimization Problem",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "A diet problem must minimize cost Z = 6x + 3y over a feasible region with corners (0,10), (2,4) and (10,0). Match each corner to its Z-value and whether it is the minimum.",
        slots: [
          { id: "s1", label: "(0, 10): Z = 30" },
          { id: "s2", label: "(2, 4): Z = 24" },
          { id: "s3", label: "(10, 0): Z = 60" },
        ],
        components: [
          { id: "c1", label: "Not the minimum — a lower value exists elsewhere" },
          { id: "c2", label: "The minimum value of Z — this is the optimal solution" },
          { id: "c3", label: "The maximum value of Z among these three corners" },
          { id: "c4", label: "An infeasible point, since Z cannot be computed here" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "For a minimization problem, the corner with the SMALLEST Z-value is the optimal solution — here that's (2, 4) with Z = 24.",
      },
    },
  ];

  for (const challenge of evaluateChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_INEQUALITY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_INEQUALITY_MATCH",
        concept_id: evaluateConcept._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
