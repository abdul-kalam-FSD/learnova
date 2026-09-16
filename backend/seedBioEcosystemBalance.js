require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Second Biology mechanic (Section 5: Biology should have more than
// Case Investigation). Links to the existing Grade 10 "Food Chains
// and Food Webs" concept created by seedGrade10_batch2.js — run that
// first.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science/Biology subject not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Our Environment" });
  if (!chapter) {
    console.error("Chapter 'Our Environment' not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Food Chains and Food Webs" });
  if (!concept) {
    console.error(
      "Concept 'Food Chains and Food Webs' not found — run seedGrade10_batch2.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // payload shape: `trigger` is the initial change to the ecosystem;
  // `scrambled_effects` are the downstream consequences shown out of
  // order; `correct_order` is the actual cause-effect sequence.
  // Reuses the same order-sensitive check as MATH_EQUATION_BUILDER.
  const ecosystemChallenges = [
    {
      title: "Wolves Are Removed",
      difficulty: "easy",
      order_index: 1,
      payload: {
        trigger: "Wolves are hunted out of a forest ecosystem.",
        scrambled_effects: [
          { id: "d1", label: "Vegetation is overgrazed" },
          { id: "d2", label: "Deer population grows unchecked" },
          { id: "d3", label: "Soil erosion increases" },
        ],
        correct_order: ["d2", "d1", "d3"],
        hint: "Start with the direct effect of losing the predator, then trace what that does to the next level down.",
      },
    },
    {
      title: "A Pond Turns Green",
      difficulty: "medium",
      order_index: 2,
      payload: {
        trigger: "Fertilizer runoff adds excess nutrients to a pond.",
        scrambled_effects: [
          { id: "e1", label: "Fish die from lack of oxygen" },
          { id: "e2", label: "Algae bloom rapidly on the surface" },
          { id: "e3", label: "Decomposing algae use up dissolved oxygen" },
        ],
        correct_order: ["e2", "e3", "e1"],
        hint: "The nutrients feed the algae first — what happens after the algae die?",
      },
    },
    {
      title: "A Keystone Species Disappears",
      difficulty: "hard",
      order_index: 3,
      payload: {
        trigger: "Sea otters disappear from a kelp forest coastline.",
        scrambled_effects: [
          { id: "f1", label: "Kelp forests are stripped bare" },
          { id: "f2", label: "Sea urchin population explodes" },
          { id: "f3", label: "Species that shelter in kelp lose their habitat" },
        ],
        correct_order: ["f2", "f1", "f3"],
        hint: "Otters usually keep the urchins in check — what eats the kelp once that check is gone?",
      },
    },
  ];

  for (const challenge of ecosystemChallenges) {
    const exists = await GameContent.findOne({
      game_type: "BIO_ECOSYSTEM_BALANCE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_ECOSYSTEM_BALANCE",
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

  console.log("Done. concept_id:", concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
