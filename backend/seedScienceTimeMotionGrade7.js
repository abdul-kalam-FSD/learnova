require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Science Batch 2. Adds the current NCERT Class 7 Science
// ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter 8, "Measurement
// of Time and Motion" — verified via multiple independent sources:
// early time-measuring tools (sundials, water clocks, pendulums),
// uniform vs non-uniform motion, and Speed = Distance / Time,
// including unit conversion (m/s <-> km/h) and average speed. Kept
// Grade-7-appropriate: whole-number results only, no vectors/graphs.
//
// Gap 1 (carried over from Batch 1): Physics lives inside the
// integrated "Science" subject below Grade 11, tagged strand:
// "Physics" for mastery/analytics.
//
// Reuses PHYSICS_MATCH (same mapping-equality shape used for Heat
// Transfer in Batch 1) for classifying motion, and MATH_NUMBER_MACHINE
// (same numeric-dial shape used across the Simple Equations mechanic
// family) for the Speed = Distance / Time calculation — no new
// mechanic. There is no dedicated "SPEED_CALCULATION" physics game
// type registered; MATH_NUMBER_MACHINE's generic
// "compute a number, dial it in" interaction fits this arithmetic
// exactly and is already a proven cross-topic reuse in this codebase.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Measurement of Time and Motion" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Motion",
      title: "Measurement of Time and Motion",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---------- Concept 1: uniform vs non-uniform motion ----------
  let conceptMotion = await Concept.findOne({ chapter_id: chapter._id, title: "Uniform and Non-uniform Motion" });
  if (!conceptMotion) {
    conceptMotion = await Concept.create({
      chapter_id: chapter._id,
      title: "Uniform and Non-uniform Motion",
      explanation_text:
        "An object in uniform motion covers equal distances in equal time intervals — like a car on cruise control. An object in non-uniform motion covers unequal distances in equal time intervals, speeding up and slowing down — like a car in city traffic. Most everyday motion is actually non-uniform.",
    });
    console.log("Created concept:", conceptMotion._id);
  } else {
    console.log("Using existing concept:", conceptMotion._id);
  }

  const physicsMatchChallenges = [
    {
      title: "Sort the Motion: Uniform or Non-uniform",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Sort each situation into Uniform Motion or Non-uniform Motion.",
        slots: [
          { id: "s1", label: "A car on cruise control covers exactly 20 km every 20 minutes" },
          { id: "s2", label: "A car in heavy traffic keeps speeding up and slowing down" },
          { id: "s3", label: "A toy train on a track covers the same distance every second" },
          { id: "s4", label: "A cyclist rides uphill, then downhill, changing speed the whole way" },
        ],
        components: [
          { id: "c1", label: "Uniform Motion" },
          { id: "c2", label: "Non-uniform Motion" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Equal distances in equal times means uniform — any speeding up or slowing down means non-uniform.",
      },
    },
    {
      title: "Sort by Data: Uniform or Non-uniform",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Sort each situation into Uniform Motion or Non-uniform Motion.",
        slots: [
          { id: "s1", label: "A car covers 60 km in hour 1, 70 km in hour 2, and 50 km in hour 3" },
          { id: "s2", label: "A conveyor belt moves exactly 2 metres every second, all day long" },
          { id: "s3", label: "A runner sprints the first 100 m, then jogs the next 100 m" },
          { id: "s4", label: "A clock's second hand moves the same tiny distance every second" },
        ],
        components: [
          { id: "c1", label: "Uniform Motion" },
          { id: "c2", label: "Non-uniform Motion" },
        ],
        correct_mapping: { s1: "c2", s2: "c1", s3: "c2", s4: "c1" },
        hint: "If the distance covered in each equal time interval is the same number every time, it's uniform.",
      },
    },
  ];

  for (const challenge of physicsMatchChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_MATCH",
        concept_id: conceptMotion._id,
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

  // ---------- Concept 2: calculating speed ----------
  let conceptSpeed = await Concept.findOne({ chapter_id: chapter._id, title: "Calculating Speed: Distance ÷ Time" });
  if (!conceptSpeed) {
    conceptSpeed = await Concept.create({
      chapter_id: chapter._id,
      title: "Calculating Speed: Distance ÷ Time",
      explanation_text:
        "Speed tells you how fast something moves: Speed = Distance ÷ Time. If a car covers 180 km in 3 hours, its speed is 180 ÷ 3 = 60 km/h. The same formula works whether you're measuring metres per second or kilometres per hour, as long as your distance and time units match.",
    });
    console.log("Created concept:", conceptSpeed._id);
  } else {
    console.log("Using existing concept:", conceptSpeed._id);
  }

  // payload shape: same as every other MATH_NUMBER_MACHINE seed
  // (equation_label is display-only text; correct_answer is stripped
  // from the client payload by sanitizePayloadForClient).
  const speedMachineLevels = [
    {
      title: "Machine: Speed of a Cyclist",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "Distance = 100 m, Time = 20 s. Find Speed (m/s).",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 5,
        hint: "Speed = Distance ÷ Time.",
      },
    },
    {
      title: "Machine: Speed of a Car",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "Distance = 180 km, Time = 3 h. Find Speed (km/h).",
        dial_min: 0,
        dial_max: 100,
        correct_answer: 60,
        hint: "180 ÷ 3 = ?",
      },
    },
  ];

  for (const level of speedMachineLevels) {
    const exists = await GameContent.findOne({ game_type: "MATH_NUMBER_MACHINE", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
        concept_id: conceptSpeed._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
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
