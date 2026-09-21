require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 14 "Maps and
// Locations" (2026-27 session), covering grid references and
// directions on a simple map.
//
// MECHANIC DECISION (per instruction, documented before implementing,
// prototyped against both named mechanics):
// - GEOGRAPHY_ROUTE_BUILDER (order-sensitive: arrange route stops in
//   the order visited) could represent "follow these directions" but
//   it is registered under Geography in gameTypeRegistry.js and is
//   used elsewhere for EVS river-journey content. Using it for a Math
//   chapter would put a Math concept's GameContent behind a
//   Geography-labelled game_type, which risks confusing the
//   subject-grouped game catalog/recommendation logic for no real
//   payload benefit (a grid-reference task isn't actually an ordered
//   route).
// - MATH_GEOMETRY_BUILDER's subset-sum "pieces summing to a target"
//   shape has no natural way to represent "which grid cell is this"
//   or "which direction gets you there" — would need a payload hack.
// - MATH_SHAPE_MATCH's generic slots/components/correct_mapping shape
//   IS a natural fit: matching a location clue to its grid reference,
//   or a starting/ending pair to the direction between them, is
//   exactly a mapping task, and keeps this Math chapter's content
//   under a Math-subject-owned game_type.
// Reusing MATH_SHAPE_MATCH. No new mechanic created.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 5 });
    console.log("Created new Grade 5 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Maps and Locations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Geometry Basics",
      title: "Maps and Locations",
      order_index: 14,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Reading Grid References and Directions on a Map",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading Grid References and Directions on a Map",
      explanation_text:
        "A simple map can be divided into a grid of rows and columns, so any location can be described by which column and row it sits in — like B3 or D5. Directions on a map (North, South, East, West, and the four in-between directions) tell you which way to move from one location to reach another, the same way compass directions work outdoors.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const mapChallenges = [
    {
      title: "Match: Landmark to Its Grid Reference",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "On the village map, columns are A-E and rows are 1-5. Match each landmark to its grid reference.",
        slots: [
          { id: "s1", label: "The school, in column C, row 2" },
          { id: "s2", label: "The temple, in column A, row 4" },
          { id: "s3", label: "The market, in column E, row 1" },
        ],
        components: [
          { id: "c1", label: "C2" },
          { id: "c2", label: "A4" },
          { id: "c3", label: "E1" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The letter tells you the column, the number tells you the row — always in that order.",
      },
    },
    {
      title: "Match: Direction from One Place to Another",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each pair of locations to the direction you'd travel to get from the first to the second.",
        slots: [
          { id: "s1", label: "From the school (top of the map) to the pond (bottom of the map)" },
          { id: "s2", label: "From the market (right side) to the temple (left side)" },
          { id: "s3", label: "From the pond (bottom-left) to the market (top-right)" },
        ],
        components: [
          { id: "c1", label: "South" },
          { id: "c2", label: "West" },
          { id: "c3", label: "North-East" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "On a map, up is usually North, down is South, right is East, and left is West.",
      },
    },
    {
      title: "Match: Following Turn-by-Turn Directions to a Grid Cell",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Starting at C3, match each set of directions to the grid cell it ends at.",
        slots: [
          { id: "s1", label: "Start at C3: move 2 columns East, then 1 row South" },
          { id: "s2", label: "Start at C3: move 1 column West, then 2 rows North" },
          { id: "s3", label: "Start at C3: move 2 rows South, then 1 column East" },
        ],
        components: [
          { id: "c1", label: "E4" },
          { id: "c2", label: "B1" },
          { id: "c3", label: "D5" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "East/West moves change the letter (column); North/South moves change the number (row) — North decreases the row number, South increases it.",
      },
    },
  ];

  for (const challenge of mapChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_SHAPE_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_SHAPE_MATCH",
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
