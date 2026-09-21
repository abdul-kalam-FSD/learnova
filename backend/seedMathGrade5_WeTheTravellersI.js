require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 1 "We the
// Travellers – I" (2026-27 session, verified against NCERT solutions
// and a current CBSE school's 2026-27 academic calendar, not
// assumed). This chapter's real content is: reading and writing
// large numbers (up to 5-6 digits) in figures and words, comparing
// and ordering large numbers, and forming the largest/smallest
// possible number from a set of digits — distinct from the existing
// "Large Numbers and Place Value" chapter, which teaches *identifying
// a digit's place-value name*, not number formation/comparison. Kept
// as a separate chapter rather than merged into the existing one so
// neither NCERT chapter gets silently absorbed into the other.
//
// No existing mechanic is a dedicated "compare/form numbers"
// mechanic, but this is a mapping task at heart (a number-forming or
// comparison scenario maps to its one correct result), so it reuses
// MATH_EQUATION_WORD_PROBLEM_MATCH exactly as Grade 4's equivalent
// large-number-context chapters did. No new mechanic created.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "We the Travellers – I" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "We the Travellers – I",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Reading, Writing, and Comparing Large Numbers",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading, Writing, and Comparing Large Numbers",
      explanation_text:
        "Large numbers can be written in figures (like 47,281) or in words (forty-seven thousand two hundred eighty-one). To compare two numbers, first check which one has more digits — that one is bigger. If they have the same number of digits, compare digit by digit from the left. Using a set of digit cards, you can also build the largest possible number by placing the biggest digits first, or the smallest possible number by placing the smallest digits first (avoiding a leading zero).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same mapping-equality scenario/slots/components as
  // the Grade 4 large-number-context chapters. `slots` are travel
  // scenarios, `components` are the correct number/word-form answers.
  const travelChallenges = [
    {
      title: "Match: Number Names for a Journey",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each distance travelled to how it is written in words.",
        slots: [
          { id: "s1", label: "A train travels 13,520 km in a year" },
          { id: "s2", label: "A ship travels 45,867 km in a year" },
          { id: "s3", label: "A plane travels 20,000 km in a month" },
        ],
        components: [
          { id: "c1", label: "Thirteen thousand five hundred twenty" },
          { id: "c2", label: "Forty-five thousand eight hundred sixty-seven" },
          { id: "c3", label: "Twenty thousand" },
          { id: "c4", label: "Four thousand five hundred sixty-seven" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Read the number group by group, starting from the left: thousands first, then hundreds, tens, and ones.",
      },
    },
    {
      title: "Match: Which Distance Is Greater?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each pair of travel distances to which one is farther.",
        slots: [
          { id: "s1", label: "62,934 km or 62,349 km — which is farther?" },
          { id: "s2", label: "8,999 km or 9,001 km — which is farther?" },
          { id: "s3", label: "47,281 km or 47,218 km — which is farther?" },
        ],
        components: [
          { id: "c1", label: "62,934 km" },
          { id: "c2", label: "9,001 km" },
          { id: "c3", label: "47,281 km" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "When two numbers have the same number of digits, compare from the leftmost digit — the first place where they differ decides which is bigger.",
      },
    },
    {
      title: "Match: Largest and Smallest Number from Digit Cards",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each set of digit cards to the number it can form.",
        slots: [
          { id: "s1", label: "Digits 7, 2, 9, 4 — the LARGEST possible 4-digit number" },
          { id: "s2", label: "Digits 7, 2, 9, 4 — the SMALLEST possible 4-digit number" },
          { id: "s3", label: "Digits 5, 0, 8, 1 — the SMALLEST possible 4-digit number (no leading zero)" },
        ],
        components: [
          { id: "c1", label: "9,742" },
          { id: "c2", label: "2,479" },
          { id: "c3", label: "1,058" },
          { id: "c4", label: "0,158" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "For the largest number, arrange digits from biggest to smallest. For the smallest, arrange from smallest to biggest — but a number can never genuinely start with 0, so swap in the next-smallest digit for the first place if needed.",
      },
    },
  ];

  for (const challenge of travelChallenges) {
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
