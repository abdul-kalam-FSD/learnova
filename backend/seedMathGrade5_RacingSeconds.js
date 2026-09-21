require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 12 "Racing
// Seconds" (2026-27 session). Confirmed via a current CBSE school's
// 2026-27 academic calendar (paired with a "Time" topic). Direct
// Grade 5 continuation of Grade 4's "Time and Calendar" chapter,
// which used MATH_EQUATION_WORD_PROBLEM_MATCH — reused here for
// race-timing and elapsed-time problems (seconds/minutes/hours,
// stopwatch reading, finish-time calculations). No new mechanic
// needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Racing Seconds" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Measurement",
      title: "Racing Seconds",
      order_index: 12,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Calculating with Time" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Calculating with Time",
      explanation_text:
        "60 seconds make 1 minute, and 60 minutes make 1 hour. A stopwatch used in a race shows time in minutes and seconds, and finding how much faster one runner finished than another means subtracting their times — carrying over just like with any other units, borrowing 60 seconds from a minute when needed instead of 10 from a ten.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const timeChallenges = [
    {
      title: "Match: Converting Race Times",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each time to its equal value in a different unit.",
        slots: [
          { id: "s1", label: "150 seconds" },
          { id: "s2", label: "3 minutes 45 seconds" },
          { id: "s3", label: "2 hours" },
        ],
        components: [
          { id: "c1", label: "2 minutes 30 seconds" },
          { id: "c2", label: "225 seconds" },
          { id: "c3", label: "120 minutes" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "60 seconds make a minute, and 60 minutes make an hour — convert one step at a time.",
      },
    },
    {
      title: "Match: Who Finished First?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each pair of finish times to how much faster the winner was.",
        slots: [
          { id: "s1", label: "Runner A: 2 min 45 sec, Runner B: 3 min 10 sec" },
          { id: "s2", label: "Runner C: 1 min 58 sec, Runner D: 2 min 20 sec" },
          { id: "s3", label: "Runner E: 4 min 5 sec, Runner F: 4 min 40 sec" },
        ],
        components: [
          { id: "c1", label: "25 seconds faster" },
          { id: "c2", label: "22 seconds faster" },
          { id: "c3", label: "35 seconds faster" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Subtract the faster (smaller) time from the slower one, borrowing 60 seconds from a minute if the seconds column is too small.",
      },
    },
    {
      title: "Match: What Time Does the Race Finish?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each race start time and duration to its correct finish time.",
        slots: [
          { id: "s1", label: "Starts at 10:15 am, lasts 50 minutes" },
          { id: "s2", label: "Starts at 2:40 pm, lasts 35 minutes" },
          { id: "s3", label: "Starts at 11:50 am, lasts 25 minutes" },
        ],
        components: [
          { id: "c1", label: "11:05 am" },
          { id: "c2", label: "3:15 pm" },
          { id: "c3", label: "12:15 pm" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Add the minutes to the start time; if the minutes go past 60, carry 1 hour over.",
      },
    },
  ];

  for (const challenge of timeChallenges) {
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
