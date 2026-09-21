require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 3 "Angles as
// Turns" (2026-27 session). Confirmed via a current CBSE school's
// 2026-27 academic calendar as covering full/quarter/half turns and
// the acute/right/obtuse angle types, introduced through physical
// rotation (turning to face a new direction) rather than a protractor.
//
// MECHANIC DECISION (per instruction, documented before implementing):
// MATH_GEOMETRY_BUILDER was checked first, since it is Grade 5's
// existing geometry mechanic. Its payload/scoring is a subset-sum
// pick (`pieces` + `correct_piece_ids`, unordered) built for
// constructing a shape's perimeter from side-length pieces — it has
// no notion of rotation, direction, or degree, and forcing a
// "quarter turn clockwise" concept into a "pick pieces that sum to a
// target" shape would be an unnatural payload hack. MATH_SHAPE_MATCH
// was checked next: it is a *generic* mapping mechanic (any
// slot/description -> any component/label, already reused for Grade
// 4 symmetry rather than literal shape-naming), and matching a turn
// scenario (e.g. "a clock's minute hand from 12 to 3") to its correct
// turn-type label is exactly a mapping task — a natural fit with no
// hack required. Reusing MATH_SHAPE_MATCH; no new mechanic created.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Angles as Turns" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Geometry Basics",
      title: "Angles as Turns",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Turns and Types of Angles" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Turns and Types of Angles",
      explanation_text:
        "A turn is a rotation around a point, and it can be clockwise (the way clock hands move) or anticlockwise. A full turn brings you all the way back to where you started; a half turn is exactly halfway around; a quarter turn is a right angle — one-fourth of a full turn. An angle smaller than a quarter turn is acute, an angle bigger than a quarter turn but smaller than a half turn is obtuse, and an angle exactly equal to a quarter turn is a right angle.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const turnChallenges = [
    {
      title: "Match: Clock Hands to the Turn They Make",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each clock hand movement to the turn it makes.",
        slots: [
          { id: "s1", label: "Minute hand moves from 12 to 3" },
          { id: "s2", label: "Minute hand moves from 12 to 6" },
          { id: "s3", label: "Minute hand moves from 12 all the way back to 12" },
        ],
        components: [
          { id: "c1", label: "Quarter turn" },
          { id: "c2", label: "Half turn" },
          { id: "c3", label: "Full turn" },
          { id: "c4", label: "Three-quarter turn" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A clock face is a full circle split into 12 hours — 12 to 3 is a quarter of the way round, 12 to 6 is halfway.",
      },
    },
    {
      title: "Match: Facing Direction to the Turn and Angle Type",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each described turn to the correct angle type.",
        slots: [
          { id: "s1", label: "Turning just a little bit to look slightly to your right" },
          { id: "s2", label: "Turning exactly a quarter turn to face a wall on your right" },
          { id: "s3", label: "Turning more than a quarter turn but less than halfway around" },
        ],
        components: [
          { id: "c1", label: "Acute angle" },
          { id: "c2", label: "Right angle" },
          { id: "c3", label: "Obtuse angle" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Compare each turn to a quarter turn (a right angle): smaller is acute, bigger (but under a half turn) is obtuse.",
      },
    },
    {
      title: "Match: Clockwise or Anticlockwise Turns to Reach the Target",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each starting/ending position to the shortest turn that gets there.",
        slots: [
          { id: "s1", label: "Facing North, needs to face East (shortest way)" },
          { id: "s2", label: "Facing North, needs to face West (shortest way)" },
          { id: "s3", label: "Facing East, needs to face West (either way is the same size)" },
        ],
        components: [
          { id: "c1", label: "Quarter turn clockwise" },
          { id: "c2", label: "Quarter turn anticlockwise" },
          { id: "c3", label: "Half turn (clockwise or anticlockwise — both the same size)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Picture a compass: North to East is a quarter turn clockwise; North to West is a quarter turn the other way.",
      },
    },
  ];

  for (const challenge of turnChallenges) {
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
