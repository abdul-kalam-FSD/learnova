require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 4 "We the
// Travellers – II" (2026-27 session). Confirmed via a current CBSE
// school's 2026-27 academic calendar as covering the four operations
// (addition, subtraction, multiplication, division) on large numbers,
// continuing directly from Chapter 1's number reading/comparison
// work into actually calculating with those numbers — a distinct
// skill, so kept as its own chapter rather than folded into Chapter 1
// or the existing "Large Numbers and Place Value" chapter.
//
// Reuses MATH_EQUATION_WORD_PROBLEM_MATCH (same mapping-equality
// mechanic already used across every Grade 4 word-problem chapter).
// No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "We the Travellers – II" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "We the Travellers – II",
      order_index: 4,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Adding, Subtracting, Multiplying, and Dividing Large Numbers",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Adding, Subtracting, Multiplying, and Dividing Large Numbers",
      explanation_text:
        "Once you can read and compare large numbers, the next step is calculating with them — adding two long journeys' distances together, finding how much farther one trip is than another, multiplying a daily distance by the number of days travelled, or dividing a total distance evenly across several days. The same carrying, borrowing, and long-multiplication/division steps you use for smaller numbers still apply — there are just more digits to keep track of.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const operationChallenges = [
    {
      title: "Match: Total Distance Travelled",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each pair of journeys to their combined distance.",
        slots: [
          { id: "s1", label: "12,450 km + 8,320 km" },
          { id: "s2", label: "25,600 km + 14,275 km" },
          { id: "s3", label: "9,999 km + 1 km" },
        ],
        components: [
          { id: "c1", label: "20,770 km" },
          { id: "c2", label: "39,875 km" },
          { id: "c3", label: "10,000 km" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Line up the numbers by place value before adding, carrying over whenever a column adds to 10 or more.",
      },
    },
    {
      title: "Match: How Much Farther?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each comparison to how much farther the longer journey is.",
        slots: [
          { id: "s1", label: "A 32,000 km trip compared to an 18,500 km trip" },
          { id: "s2", label: "A 50,000 km trip compared to a 47,650 km trip" },
          { id: "s3", label: "A 15,000 km trip compared to a 9,999 km trip" },
        ],
        components: [
          { id: "c1", label: "13,500 km farther" },
          { id: "c2", label: "2,350 km farther" },
          { id: "c3", label: "5,001 km farther" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Subtract the smaller distance from the larger one, borrowing from the next column whenever a digit is too small to subtract from.",
      },
    },
    {
      title: "Match: Multiplying and Dividing Travel Distances",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each travel situation to its correct answer.",
        slots: [
          { id: "s1", label: "A bus travels 245 km every day for 12 days. Total distance?" },
          { id: "s2", label: "A train covers 36,000 km spread evenly over 9 equal trips. Distance per trip?" },
          { id: "s3", label: "A cyclist rides 18 km every day for 30 days. Total distance?" },
        ],
        components: [
          { id: "c1", label: "2,940 km" },
          { id: "c2", label: "4,000 km" },
          { id: "c3", label: "540 km" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "For 'every day for N days', multiply. For 'spread evenly over N trips', divide the total by N.",
      },
    },
  ];

  for (const challenge of operationChallenges) {
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
