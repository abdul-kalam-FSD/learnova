require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 5 "Far and Near"
// (2026-27 session). Confirmed via a current CBSE school's 2026-27
// academic calendar as covering measuring and converting length
// (metres/centimetres) using real classroom-measurement activities —
// the direct Grade 5 continuation of Grade 4's "Measuring Length"
// chapter, which used MATH_EQUATION_WORD_PROBLEM_MATCH. Same mechanic
// reused here for consistency; no new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Far and Near" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Measurement",
      title: "Far and Near",
      order_index: 5,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Measuring and Converting Length" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Measuring and Converting Length",
      explanation_text:
        "Length tells you how far apart two things are, or how long an object is. Small lengths are measured in centimetres (cm) and millimetres (mm); longer distances are measured in metres (m) and kilometres (km). 100 centimetres make 1 metre, and 1000 metres make 1 kilometre. Choosing the right unit — and being able to convert between a small and large unit — makes measurements easy to compare and add up.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const lengthChallenges = [
    {
      title: "Match: Object to Its Best Unit of Length",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each object to the unit best suited for measuring it.",
        slots: [
          { id: "s1", label: "The length of a classroom" },
          { id: "s2", label: "The length of a pencil" },
          { id: "s3", label: "The distance from your town to the next city" },
        ],
        components: [
          { id: "c1", label: "Metres (m)" },
          { id: "c2", label: "Centimetres (cm)" },
          { id: "c3", label: "Kilometres (km)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Pick the unit that gives a sensible-sized number — not something tiny or huge.",
      },
    },
    {
      title: "Match: Converting Between Length Units",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each measurement to its equal value in a different unit.",
        slots: [
          { id: "s1", label: "350 centimetres" },
          { id: "s2", label: "2 kilometres" },
          { id: "s3", label: "4 metres 50 centimetres" },
        ],
        components: [
          { id: "c1", label: "3 metres 50 centimetres" },
          { id: "c2", label: "2000 metres" },
          { id: "c3", label: "450 centimetres" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "100 cm make 1 m, and 1000 m make 1 km — convert to the smaller unit by multiplying, or to the larger unit by dividing.",
      },
    },
    {
      title: "Match: Real-Life Distance Problems",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each situation to the correct total or remaining distance.",
        slots: [
          { id: "s1", label: "A road is 5km 400m long; 2km 750m has been repaired. How much is left?" },
          { id: "s2", label: "Three fences measure 12m, 8m 50cm, and 15m 25cm. What is their total length?" },
          { id: "s3", label: "A hiker walks 3km 600m, then another 4km 800m. Total distance walked?" },
        ],
        components: [
          { id: "c1", label: "2km 650m remaining" },
          { id: "c2", label: "35m 75cm in total" },
          { id: "c3", label: "8km 400m" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert everything to the same unit (usually the smaller one) before adding or subtracting, then convert back if needed.",
      },
    },
  ];

  for (const challenge of lengthChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
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
