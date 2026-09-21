require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 6 "The Dairy
// Farm" (2026-27 session). Confirmed via a current CBSE school's
// 2026-27 academic calendar as grouped with the large-number
// operations block (April: Ch.1, Ch.4, Ch.6, Ch.9 taught together as
// one "large numbers + all four operations" unit). This chapter's own
// angle is multiplication/division word problems set in a dairy-farm
// context (milk collected per cow, cans filled, cost per litre),
// distinct from Chapter 4's general travel-distance operations.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Dairy Farm" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "The Dairy Farm",
      order_index: 6,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Multiplication and Division Word Problems",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Multiplication and Division Word Problems",
      explanation_text:
        "A dairy farm collects milk from many cows every day, fills it into cans of a fixed size, and sells it at a price per litre — every one of those steps is really a multiplication or division problem. If you know the amount produced per cow, multiply by the number of cows for the total. If you know the total and the can size, divide to find how many cans are needed.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const dairyChallenges = [
    {
      title: "Match: Total Milk Collected",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each farm situation to its correct total.",
        slots: [
          { id: "s1", label: "24 cows each give 8 litres of milk. Total litres?" },
          { id: "s2", label: "15 cows each give 12 litres of milk. Total litres?" },
          { id: "s3", label: "36 cows each give 9 litres of milk. Total litres?" },
        ],
        components: [
          { id: "c1", label: "192 litres" },
          { id: "c2", label: "180 litres" },
          { id: "c3", label: "324 litres" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Multiply the amount per cow by the number of cows.",
      },
    },
    {
      title: "Match: How Many Cans Are Needed?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each total amount of milk to how many equal-sized cans it fills exactly.",
        slots: [
          { id: "s1", label: "144 litres of milk, cans hold 8 litres each" },
          { id: "s2", label: "225 litres of milk, cans hold 15 litres each" },
          { id: "s3", label: "96 litres of milk, cans hold 6 litres each" },
        ],
        components: [
          { id: "c1", label: "18 cans" },
          { id: "c2", label: "15 cans" },
          { id: "c3", label: "16 cans" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Divide the total litres by how much each can holds.",
      },
    },
    {
      title: "Match: Cost of Milk Sold",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each sale to its correct total cost or price-per-litre.",
        slots: [
          { id: "s1", label: "48 litres sold at ₹42 per litre. Total cost?" },
          { id: "s2", label: "A farmer earns ₹1,890 for selling 63 litres. Price per litre?" },
          { id: "s3", label: "126 litres sold at ₹35 per litre. Total cost?" },
        ],
        components: [
          { id: "c1", label: "₹2,016" },
          { id: "c2", label: "₹30 per litre" },
          { id: "c3", label: "₹4,410" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Total cost = quantity × price per unit. To find price per unit instead, divide the total cost by the quantity.",
      },
    },
  ];

  for (const challenge of dairyChallenges) {
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
