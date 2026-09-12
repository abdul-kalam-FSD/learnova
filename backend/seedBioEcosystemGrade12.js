require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade-coverage gap-fill: Biology's Grades 11 and 12 previously only
// had Case Investigation (Section 5 says Biology should have more
// than one mechanic; Grades 9 and 10 already got Virtual Lab and
// Ecosystem Balance respectively via seedBioVirtualLab.js /
// seedBioEcosystemBalance.js — this extends Ecosystem Balance to
// Grade 12). Links to the existing "Decomposition and Energy Flow"
// concept created by seedGrade12_batch4.js — run that first.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Decomposition and Energy Flow" });
  if (!concept) {
    console.error(
      "Concept 'Decomposition and Energy Flow' not found — run seedGrade12_batch4.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // payload shape: `trigger` is the initial change; `scrambled_effects`
  // are the downstream consequences shown out of order;
  // `correct_order` (stripped before the client sees it) is the
  // actual cause-effect sequence. Same shape as Grade 10's Ecosystem
  // Balance and the order-sensitive MATH_EQUATION_BUILDER check.
  const ecosystemChallenges = [
    {
      title: "A Decomposer Die-Off",
      difficulty: "hard",
      order_index: 1,
      payload: {
        trigger: "A pesticide runoff kills most of the decomposer organisms in a forest floor's soil.",
        scrambled_effects: [
          { id: "r3", label: "Nutrients stop being released back into the soil" },
          { id: "r1", label: "Dead organic matter (leaf litter, carcasses) stops breaking down" },
          { id: "r4", label: "Plant growth slows due to nutrient shortage" },
          { id: "r2", label: "Dead matter accumulates on the forest floor" },
        ],
        correct_order: ["r1", "r2", "r3", "r4"],
        hint: "Decomposition has to stop before matter can pile up, before nutrient release stops, before plants feel the shortage.",
      },
    },
    {
      title: "Energy Loss Across Trophic Levels",
      difficulty: "medium",
      order_index: 2,
      payload: {
        trigger: "A grassland's producer (grass) biomass is measured, then traced up the food chain.",
        scrambled_effects: [
          { id: "t3", label: "Secondary consumers (foxes) receive only a small fraction of that energy" },
          { id: "t1", label: "Producers (grass) capture and store solar energy as biomass" },
          { id: "t4", label: "Most energy at each level is lost as heat, so higher levels support far fewer organisms" },
          { id: "t2", label: "Primary consumers (rabbits) eat the grass and gain only part of its stored energy" },
        ],
        correct_order: ["t1", "t2", "t3", "t4"],
        hint: "Energy flows one level at a time, from producer upward, losing a large share at each transfer.",
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
