require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the content hole left by the Gap 5 curriculum-citation fix:
// "Simple Equations" was regraded from Grade 6 to Grade 7 (it's
// NCERT Class 7 Math Ch.4, not Class 6), which left Grade 6
// Mathematics with only Fractions + Geometry. Ratio and Proportion is
// a genuine NCERT Class 6 Math chapter — doesn't overlap Fractions,
// Geometry, or Integers (Integers is correctly homed at Grade 7 per
// the same Gap 5 audit).
//
// Reuses the mapping-equality scoring group (same backend logic as
// Fraction Match/Shape Match/Place Value Match) via a new
// MATH_RATIO_MATCH game_type — a genuine fit, not a forced reuse:
// matching a ratio to its simplified/equivalent form is the same
// "assign each slot to its correct counterpart" shape as those.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Ratio and Proportion" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "Ratio and Proportion",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Equivalent Ratios" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Equivalent Ratios",
      explanation_text:
        "A ratio compares two quantities. Two ratios are equivalent if they represent the same comparison — just like equivalent fractions, you get an equivalent ratio by multiplying or dividing both terms by the same number. The simplest form of a ratio has no common factor left between its terms.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- RATIO MATCH challenges (GameType: MATH_RATIO_MATCH) ----------
  // payload shape: student matches each ratio card (slot) to its
  // simplest-form/equivalent-ratio counterpart (component), tray has
  // distractor components so it isn't trivial process of elimination.
  const ratioMatchChallenges = [
    {
      title: "Match: Simplest Form",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each ratio card to its simplest form.",
        slots: [
          { id: "s1", label: "4 : 8" },
          { id: "s2", label: "6 : 9" },
          { id: "s3", label: "10 : 15" },
        ],
        components: [
          { id: "c1", label: "1 : 2" },
          { id: "c2", label: "2 : 3" },
          { id: "c3", label: "3 : 4" },
          { id: "c4", label: "1 : 3" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c2" },
        hint: "Divide both terms of the ratio by their greatest common factor.",
      },
    },
    {
      title: "Match: Equivalent Ratios",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each ratio card to an equivalent ratio.",
        slots: [
          { id: "s1", label: "2 : 5" },
          { id: "s2", label: "3 : 7" },
          { id: "s3", label: "5 : 6" },
        ],
        components: [
          { id: "c1", label: "4 : 10" },
          { id: "c2", label: "9 : 21" },
          { id: "c3", label: "10 : 12" },
          { id: "c4", label: "6 : 11" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Multiply both terms of the ratio by the same number to find an equivalent one.",
      },
    },
    {
      title: "Match: Sharing in a Ratio",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "Each card gives a total shared in a ratio. Match it to the correct simplified split.",
        slots: [
          { id: "s1", label: "₹40 shared 1 : 3" },
          { id: "s2", label: "₹60 shared 2 : 1" },
          { id: "s3", label: "₹100 shared 3 : 2" },
        ],
        components: [
          { id: "c1", label: "₹10 and ₹30" },
          { id: "c2", label: "₹40 and ₹20" },
          { id: "c3", label: "₹60 and ₹40" },
          { id: "c4", label: "₹20 and ₹20" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Add the ratio's terms to find how many equal parts the total splits into.",
      },
    },
  ];

  for (const challenge of ratioMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_RATIO_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_RATIO_MATCH",
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
