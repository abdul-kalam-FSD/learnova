require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 10 currently has no Social Science content at
// all (per the audit's curriculum matrix). Seeded directly into a
// new integrated "Social Science" subject with a strand tag — Grade
// 10's real NCERT Social Science course is genuinely four separate
// books (History, Geography, Political Science/Civics, Economics)
// taught under one combined subject, which maps cleanly onto this
// project's existing strand-tagging convention.
//
// Source basis (Gap 5): grounded in NCERT Class 10 Economics
// ("Understanding Economic Development"), Chapter 5 "Consumer
// Rights" — reworded into original scenarios, not textbook passages.
//
// Reuses SOCIAL_SCIENCE_CIVIC_DECISION (same single-choice check as
// the Grade 4/5/9 versions).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 10, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 10 });
    console.log("Created new Grade 10 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Protecting Consumer Rights" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Understanding Economic Development",
      title: "Protecting Consumer Rights",
      order_index: 1,
      strand: "Economics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Recognizing a Consumer Rights Violation" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Recognizing a Consumer Rights Violation",
      explanation_text:
        "As a consumer, you have the right to accurate information, safe products, and a fair remedy when something goes wrong — a seller can't legally refuse a refund for a defective product, hide a product's real risks, or overcharge above the price printed on the packaging. Knowing which of these rights applies to a situation is the first step to standing up for yourself.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const civicChallenges = [
    {
      title: "The Overpriced Snack",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "A shopkeeper charges you more than the Maximum Retail Price (MRP) printed on a packet of chips, saying 'that's just how it is here.' What's your strongest response?",
        options: [
          { id: "o1", label: "Pay the extra amount since arguing isn't worth it" },
          { id: "o2", label: "Point out that charging above the printed MRP is not allowed, and ask to pay only the MRP" },
          { id: "o3", label: "Buy a different snack instead without saying anything" },
          { id: "o4", label: "Assume prices are always negotiable everywhere" },
        ],
        correct_hotspot_id: "o2",
        hint: "The MRP printed on a package is a legal ceiling price — a seller cannot charge more than that.",
      },
    },
    {
      title: "The Defective Mixer",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "You bought a mixer-grinder last week and it stopped working the first time you used it. The shop refuses a refund, saying 'all sales are final.' What's your strongest response?",
        options: [
          { id: "p1", label: "Accept it and buy a new one from somewhere else" },
          { id: "p2", label: "Ask for a repair, replacement, or refund under the warranty and consumer protection rules, since a defective product isn't covered by 'all sales are final'" },
          { id: "p3", label: "Try to fix the mixer yourself and say nothing to the shop" },
          { id: "p4", label: "Leave a negative review online instead of contacting the shop" },
        ],
        correct_hotspot_id: "p2",
        hint: "'All sales are final' doesn't override your right to a working product or a fair remedy for a defective one.",
      },
    },
    {
      title: "The Misleading Advertisement",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "An advertisement claims a food product 'cures common colds,' but there's no real evidence for this claim, and you bought it based on that promise. What's your strongest response?",
        options: [
          { id: "q1", label: "Keep using the product anyway since it was affordable" },
          { id: "q2", label: "Recognize this as a misleading claim and report it — false advertising violates your right to accurate information" },
          { id: "q3", label: "Assume all advertisements exaggerate, so nothing can be done" },
          { id: "q4", label: "Only complain if the product actually made you sick" },
        ],
        correct_hotspot_id: "q2",
        hint: "Your right to accurate information means a company can be held accountable for a health claim it can't actually back up — the harm isn't the only thing that matters here.",
      },
    },
  ];

  for (const challenge of civicChallenges) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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
