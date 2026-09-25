require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fourth mechanic in the Geometry family (after Shape Match, Geometry
// Builder, and Angle Speed Challenge). Reuses the "Geometry" chapter
// and the same concept Geometry Builder uses (perimeter from side
// lengths) — Strategy Challenge is the same learning objective as
// Builder, just scored differently (computed sum + move budget
// instead of one fixed correct piece set), matching how Fraction
// Strategy Challenge relates to Fraction Builder.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Perimeter and Area" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Perimeter and Area",
      order_index: 6,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Perimeter" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Perimeter",
      explanation_text:
        "Perimeter is the total distance around a shape's boundary — add up the lengths of every side. The same perimeter can be built from many different combinations of side lengths, which is why planning which pieces to use matters as much as knowing how to add.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- GEOMETRY STRATEGY CHALLENGE (GameType: MATH_GEOMETRY_STRATEGY_CHALLENGE) ----------
  // payload shape: no single stored "correct" answer — checkAttempt
  // (gameControllers.js) adds up the real lengths of whatever pieces
  // the student picked and compares against target_perimeter, and
  // separately rejects picking more than max_moves pieces. Every
  // round below is checked to have at least two distinct piece
  // combos, within the move budget, that hit the target — otherwise
  // it wouldn't be a "strategy" round, just a Geometry Builder with
  // extra steps.
  const geometryStrategyRounds = [
    {
      title: "Strategy Round: Garden Fence",
      difficulty: "easy",
      order_index: 1,
      payload: {
        shape_label: "Garden Fence",
        target_perimeter: 24,
        unit: "cm",
        max_moves: 3,
        // Valid 3-piece combos hitting 24: [5,8,11], [7,8,9], [6,9,9]... wait 9 appears once
        // Combos that work with this exact piece set: 5+8+11=24, 7+8+9=24, 6+7+11=24
        pieces: [
          { id: "p1", length: 3 },
          { id: "p2", length: 5 },
          { id: "p3", length: 6 },
          { id: "p4", length: 7 },
          { id: "p5", length: 8 },
          { id: "p6", length: 9 },
          { id: "p7", length: 11 },
        ],
        hint: "Try adding three pieces at a time — several different trios reach 24 cm.",
      },
    },
    {
      title: "Strategy Round: Picture Frame",
      difficulty: "medium",
      order_index: 2,
      payload: {
        shape_label: "Picture Frame",
        target_perimeter: 36,
        unit: "cm",
        max_moves: 3,
        // Valid 3-piece combos hitting 36: 10+12+14=36, 9+13+14=36, 9+12+15=36
        pieces: [
          { id: "p1", length: 4 },
          { id: "p2", length: 9 },
          { id: "p3", length: 10 },
          { id: "p4", length: 12 },
          { id: "p5", length: 13 },
          { id: "p6", length: 14 },
          { id: "p7", length: 15 },
        ],
        hint: "Only 3 picks allowed — the smaller 4 cm piece is a trap if it forces a 4th pick.",
      },
    },
    {
      title: "Strategy Round: Race Track Loop",
      difficulty: "hard",
      order_index: 3,
      payload: {
        shape_label: "Race Track Loop",
        target_perimeter: 50,
        unit: "m",
        max_moves: 4,
        // Valid 4-piece combos hitting 50: 8+12+13+17=50, 6+14+13+17=50, 8+9+16+17=50
        pieces: [
          { id: "p1", length: 6 },
          { id: "p2", length: 8 },
          { id: "p3", length: 9 },
          { id: "p4", length: 12 },
          { id: "p5", length: 13 },
          { id: "p6", length: 14 },
          { id: "p7", length: 16 },
          { id: "p8", length: 17 },
        ],
        hint: "4 moves max — sketch two or three trial combos before locking anything in.",
      },
    },
  ];

  for (const round of geometryStrategyRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_GEOMETRY_STRATEGY_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_GEOMETRY_STRATEGY_CHALLENGE",
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

  console.log("Geometry Strategy Challenge seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
