require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Decision M-1 (verification requested
// by the plan before touching the "Fractions & Decimals" chapter).
//
// EVIDENCE: searched specifically for the current Maths Mela Chapter 2
// "Fractions" content (2026-27 session). Multiple independent, current
// sources (Vedantu's chapter-specific NCERT Solutions pages for both
// the 2025-26 and 2026-27 editions, and a "Chapter 2 Fractions"
// important-questions page) show this chapter's actual scope is
// equivalent fractions (using a physical fraction kit), comparing and
// ordering fractions, proper/improper/mixed fractions, and fractions
// on a number line — decimals are never mentioned anywhere in that
// chapter's content. None of Maths Mela's other 14 chapter titles
// mention decimals either. Cross-checking against a current CBSE
// school's own 2026-27 academic calendar independently confirms NCERT
// Chapter 2 is titled and taught as "FRACTION" alone, with "Decimals"
// only appearing as a *composite/side-book* (non-NCERT supplementary
// material) topic, not the NCERT chapter itself.
//
// CONCLUSION: decimals do not belong in Grade 5's current NCERT scope.
// Per the plan's instruction ("if not justified, preserve useful
// decimal content as enrichment rather than deleting it; do not
// create duplicate chapters unnecessarily"): the existing "Fractions &
// Decimals" chapter and its GameContent are NOT modified or deleted —
// its decimal-equivalence GameContent items ("Match: Tenths to
// Decimals", "Match: Fraction to Decimal Mixed") remain valid,
// working Learnova enrichment content that goes beyond the current
// Grade 5 NCERT scope, not a mislabelled NCERT match. No duplicate
// chapter is created.
//
// This file's only actual change is additive: one new sibling concept
// under the SAME existing chapter (found via findOne, not renamed),
// covering the specific NCERT Chapter 2 skill that wasn't yet
// represented — comparing and ordering fractions (as opposed to the
// existing concept's focus on equivalence/decimal conversion).
// Reuses MATH_FRACTION_MATCH, the same mechanic the chapter already
// uses. No new mechanic needed.
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

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Fractions & Decimals" });
  if (!chapter) {
    console.error(
      "ERROR: expected chapter 'Fractions & Decimals' to already exist (created by seedMathGrade5_Fractions.js). Run that seed first."
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Comparing and Ordering Fractions" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Comparing and Ordering Fractions",
      explanation_text:
        "To compare two fractions with the same denominator, just compare the numerators — the bigger numerator is the bigger fraction. To compare fractions with different denominators, first convert them to equivalent fractions with the same denominator (using a fraction kit or a common multiple), then compare numerators. This also lets you arrange a whole group of fractions in order from smallest to largest.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const comparisonChallenges = [
    {
      title: "Match: Which Fraction Is Bigger? (Same Denominator)",
      difficulty: "easy",
      order_index: 4,
      payload: {
        scenario: "Match each pair of fractions to the one that is bigger.",
        slots: [
          { id: "s1", label: "3/8 or 5/8" },
          { id: "s2", label: "7/10 or 4/10" },
          { id: "s3", label: "2/6 or 5/6" },
        ],
        components: [
          { id: "c1", label: "5/8" },
          { id: "c2", label: "7/10" },
          { id: "c3", label: "5/6" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "When the denominators are the same, the fraction with the bigger numerator is bigger.",
      },
    },
    {
      title: "Match: Which Fraction Is Bigger? (Different Denominators)",
      difficulty: "medium",
      order_index: 5,
      payload: {
        scenario: "Match each pair of fractions to the one that is bigger.",
        slots: [
          { id: "s1", label: "1/2 or 1/3" },
          { id: "s2", label: "2/3 or 3/4" },
          { id: "s3", label: "3/5 or 1/2" },
        ],
        components: [
          { id: "c1", label: "1/2" },
          { id: "c2", label: "3/4" },
          { id: "c3", label: "3/5" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert both fractions to the same denominator first (a common multiple of the two denominators), then compare the numerators.",
      },
    },
    {
      title: "Match: Ordering a Group of Fractions",
      difficulty: "hard",
      order_index: 6,
      payload: {
        scenario: "Match each fraction to its position when the group 1/4, 5/8, 1/2, 3/8 is arranged from smallest to largest.",
        slots: [
          { id: "s1", label: "Smallest" },
          { id: "s2", label: "Second smallest" },
          { id: "s3", label: "Largest" },
        ],
        components: [
          { id: "c1", label: "1/4" },
          { id: "c2", label: "3/8" },
          { id: "c3", label: "5/8" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert every fraction to eighths first (1/4 = 2/8, 1/2 = 4/8), then it's just comparing whole numbers: 2, 3, 4, 5.",
      },
    },
  ];

  for (const challenge of comparisonChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_FRACTION_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_MATCH",
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
