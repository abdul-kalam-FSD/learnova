require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 9 "Coconut Farm"
// (2026-27 session). Confirmed via a current CBSE school's 2026-27
// academic calendar as part of the same April "large numbers + all
// four operations" teaching block as Chapters 1, 4, and 6. This
// chapter's own angle is estimation and multi-step operations in a
// coconut-farming context (coconuts per tree, sacks, selling in
// bulk) — building on Chapter 6's single-step dairy-farm problems
// with two-step, slightly harder scenarios.
//
// Reuses MATH_EQUATION_WORD_PROBLEM_MATCH. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Coconut Farm" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "Coconut Farm",
      order_index: 9,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Two-Step Problems with Large Numbers",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Two-Step Problems with Large Numbers",
      explanation_text:
        "Some real problems need more than one operation to solve. On a coconut farm, you might first multiply the number of trees by the coconuts per tree to get a total, then divide that total by how many coconuts fit in a sack to find the number of sacks needed. Working out which operation to do first — and in what order — is just as important as calculating correctly.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const farmChallenges = [
    {
      title: "Match: Total Coconuts Harvested",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each farm situation to its correct total.",
        slots: [
          { id: "s1", label: "45 trees, each giving 60 coconuts. Total coconuts?" },
          { id: "s2", label: "120 trees, each giving 25 coconuts. Total coconuts?" },
          { id: "s3", label: "78 trees, each giving 40 coconuts. Total coconuts?" },
        ],
        components: [
          { id: "c1", label: "2,700 coconuts" },
          { id: "c2", label: "3,000 coconuts" },
          { id: "c3", label: "3,120 coconuts" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Multiply the number of trees by the coconuts each tree gives.",
      },
    },
    {
      title: "Match: How Many Sacks Are Needed?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each harvest total to how many equal-sized sacks it fills exactly.",
        slots: [
          { id: "s1", label: "1,800 coconuts, sacks hold 50 each" },
          { id: "s2", label: "2,400 coconuts, sacks hold 80 each" },
          { id: "s3", label: "3,150 coconuts, sacks hold 70 each" },
        ],
        components: [
          { id: "c1", label: "36 sacks" },
          { id: "c2", label: "30 sacks" },
          { id: "c3", label: "45 sacks" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Divide the total number of coconuts by how many fit in one sack.",
      },
    },
    {
      title: "Match: Two-Step Farm Problems",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each two-step problem to its correct final answer.",
        slots: [
          { id: "s1", label: "60 trees give 50 coconuts each; sacks hold 100 coconuts. How many sacks are filled?" },
          { id: "s2", label: "90 trees give 40 coconuts each; 200 coconuts are damaged and unusable. How many good coconuts remain?" },
          { id: "s3", label: "36 trees give 75 coconuts each; sold in bundles of 90. How many full bundles?" },
        ],
        components: [
          { id: "c1", label: "30 sacks" },
          { id: "c2", label: "3,400 coconuts" },
          { id: "c3", label: "30 bundles" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Do the multiplication first to find the total, then apply the second step (dividing or subtracting) to that total.",
      },
    },
  ];

  for (const challenge of farmChallenges) {
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
