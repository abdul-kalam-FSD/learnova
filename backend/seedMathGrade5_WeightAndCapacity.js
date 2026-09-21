require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 8 "Weight and
// Capacity" (2026-27 session). Confirmed via a current CBSE school's
// 2026-27 academic calendar (weighing/recording activities, gram-to-
// kilogram conversion). Direct Grade 5 continuation of Grade 4's
// "Weigh it, Pour it" chapter, which used
// MATH_EQUATION_WORD_PROBLEM_MATCH — same mechanic reused here, with
// harder numbers and two-step problems appropriate for Grade 5.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Weight and Capacity" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Measurement",
      title: "Weight and Capacity",
      order_index: 8,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Measuring Weight and Capacity with Larger Numbers",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Measuring Weight and Capacity with Larger Numbers",
      explanation_text:
        "Weight is measured in grams (g) and kilograms (kg) — 1000 g make 1 kg. Capacity is measured in millilitres (ml) and litres (l) — 1000 ml make 1 l. At Grade 5 level, problems combine several items or several steps, like adding up the weight of a whole shopping basket, or working out how many small containers you can fill from one large one — so converting confidently between the small and large unit really matters.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const weightChallenges = [
    {
      title: "Match: Total Weight of a Shopping Basket",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each basket of items to its total weight.",
        slots: [
          { id: "s1", label: "Rice 2kg + Sugar 1kg 500g + Flour 750g" },
          { id: "s2", label: "Potatoes 3kg + Onions 1kg 400g" },
          { id: "s3", label: "Apples 900g + Bananas 600g" },
        ],
        components: [
          { id: "c1", label: "4kg 250g" },
          { id: "c2", label: "4kg 400g" },
          { id: "c3", label: "1kg 500g" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert everything to grams first, add it all up, then convert the total back into kilograms and grams.",
      },
    },
    {
      title: "Match: How Many Bottles Can Be Filled?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each large container to how many equal-sized bottles it can fill.",
        slots: [
          { id: "s1", label: "9 litres of juice, bottles hold 750ml each" },
          { id: "s2", label: "5 litres of oil, bottles hold 500ml each" },
          { id: "s3", label: "6 litres 400ml of water, bottles hold 800ml each" },
        ],
        components: [
          { id: "c1", label: "12 bottles" },
          { id: "c2", label: "10 bottles" },
          { id: "c3", label: "8 bottles" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert the large amount to millilitres, then divide by how much each bottle holds.",
      },
    },
    {
      title: "Match: Real-Life Weight and Capacity Problems",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each situation to its correct answer.",
        slots: [
          { id: "s1", label: "A crate weighs 12kg 500g empty. 8 mangoes each weighing 250g are added. Total weight?" },
          { id: "s2", label: "A tank holds 40 litres. Water is drawn out in 5 equal turns of 6 litres each. How much is left?" },
          { id: "s3", label: "3 sacks of flour weigh 15kg total, all sacks equal. How much does each sack weigh?" },
        ],
        components: [
          { id: "c1", label: "14kg 500g" },
          { id: "c2", label: "10 litres left" },
          { id: "c3", label: "5kg each" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Work out each part step by step — first the amount being added or removed, then combine it with the starting amount.",
      },
    },
  ];

  for (const challenge of weightChallenges) {
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
