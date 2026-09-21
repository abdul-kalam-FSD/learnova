require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 8
// "Weigh it, Pour it" — weight and capacity/volume). Reuses
// MATH_EQUATION_WORD_PROBLEM_MATCH's generic scenario-to-answer
// mapping, same pattern as Measuring Length. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /mathematics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 4 });
    console.log("Created new Grade 4 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Weigh it, Pour it" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Weigh it, Pour it",
      order_index: 8,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Measuring Weight and Capacity" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Measuring Weight and Capacity",
      explanation_text:
        "Weight tells you how heavy something is, measured in grams (g) and kilograms (kg) — 1000 grams make 1 kilogram. Capacity tells you how much liquid something can hold, measured in millilitres (ml) and litres (l) — 1000 millilitres make 1 litre. Choosing the right unit and converting between the small and large unit are both part of measuring correctly.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: Weight or Capacity Item to the Right Unit",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each item to the unit best suited for measuring it.",
        slots: [
          { id: "s1", label: "The weight of a school bag" },
          { id: "s2", label: "The weight of a single grape" },
          { id: "s3", label: "The capacity of a water bottle" },
        ],
        components: [
          { id: "c1", label: "Kilograms (kg)" },
          { id: "c2", label: "Grams (g)" },
          { id: "c3", label: "Litres (l)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Pick the unit that avoids a huge number or a tiny fraction for that item.",
      },
    },
    {
      title: "Match: Converting Weight and Capacity",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each amount to its equal value in a different unit.",
        slots: [
          { id: "s1", label: "2000 grams" },
          { id: "s2", label: "1500 millilitres" },
          { id: "s3", label: "3 kilograms" },
        ],
        components: [
          { id: "c1", label: "2 kilograms" },
          { id: "c2", label: "1 litre 500 millilitres" },
          { id: "c3", label: "3000 grams" },
          { id: "c4", label: "30 kilograms" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Remember: 1000 grams make 1 kilogram, and 1000 millilitres make 1 litre.",
      },
    },
    {
      title: "Match: Real-Life Weight and Capacity Problems",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each situation to the correct total or remaining amount.",
        slots: [
          { id: "s1", label: "A bag of rice weighs 5kg; 1kg 250g is used for cooking. How much remains?" },
          { id: "s2", label: "Three bottles hold 250ml, 500ml and 750ml. Total capacity?" },
          { id: "s3", label: "A sack weighs 10kg; another sack weighs 4kg 500g more. What does the second sack weigh?" },
        ],
        components: [
          { id: "c1", label: "3kg 750g remaining" },
          { id: "c2", label: "1500ml in total" },
          { id: "c3", label: "14kg 500g" },
          { id: "c4", label: "4kg 250g remaining" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert to the same unit before adding or subtracting, then convert back if needed.",
      },
    },
  ];

  for (const challenge of matchChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH", title: challenge.title });
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
