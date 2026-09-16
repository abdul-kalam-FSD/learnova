require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 9 Biology expansion (Section 6 of the approved expansion
// strategy): adds a dedicated BIO_ECOSYSTEM_BALANCE game for "The
// Biosphere and Its Components" (Natural Resources chapter). Links
// to the existing concept created by seedGrade9_batch2.js — run that
// first.
//
// NOTE ON "Biogeochemical Cycles": the approved expansion brief also
// listed "Biogeochemical Cycles" under this chapter as needing added
// coverage, but seedBioEcosystemGrade9.js already created 3
// BIO_ECOSYSTEM_BALANCE documents for that exact concept (nutrient-
// cycle disruption chains: deforestation/water cycle, fertilizer/
// nitrogen cycle, fossil fuels/carbon cycle). Per the Database Safety
// rule (never blindly insert duplicate/redundant coverage), this file
// deliberately does NOT add a second, unrelated set of games for
// "Biogeochemical Cycles" — see the expansion report's reconciliation
// note. Re-run seedBioEcosystemGrade9.js if you specifically want to
// verify or extend that concept's existing content instead.
//
// This file's actual new content — "The Biosphere and Its
// Components" — uses the same cause-effect ordering shape and
// scoring path (unordered-... actually ordered sequence check on
// attempt.orderedPieceIds vs payload.correct_order — see
// gameControllers.js checkAttempt) as every other Ecosystem Balance
// grade, built around how a change to one biosphere component
// (abiotic or biotic) ripples through the others — distinct in
// content from the nutrient-cycle framing already covering
// "Biogeochemical Cycles". Additive only. Safe to re-run
// (GameContent.findOne guard before every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 9 Science/Biology subject not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Natural Resources" });
  if (!chapter) {
    console.error("Chapter 'Natural Resources' not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "The Biosphere and Its Components" });
  if (!concept) {
    console.error(
      "Concept 'The Biosphere and Its Components' not found — run seedGrade9_batch2.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const challenges = [
    {
      title: "A Drought Hits a Grassland",
      difficulty: "easy",
      order_index: 1,
      payload: {
        trigger: "Rainfall in a grassland region drops sharply for an entire season.",
        scrambled_effects: [
          { id: "d1", label: "Soil moisture (an abiotic component) falls" },
          { id: "d2", label: "Grasses (biotic component) grow poorly and some die back" },
          { id: "d3", label: "Grazing animals (biotic component) have less food available" },
          { id: "d4", label: "Rainfall (an abiotic component) decreases" },
        ],
        correct_order: ["d4", "d1", "d2", "d3"],
        explanation:
          "An abiotic component (rainfall) changes first, which changes another abiotic component (soil moisture), which then affects a biotic component (the grasses), and that change ripples on to the next biotic component that depends on it (the grazing animals) — showing how abiotic and biotic components of the biosphere are interlinked, not independent.",
        hint: "Start with the component the drought directly changes, then trace how that change passes from a non-living factor to the living things that depend on it.",
      },
    },
    {
      title: "A New Species Arrives",
      difficulty: "medium",
      order_index: 2,
      payload: {
        trigger: "A fast-growing plant species not native to a lake is accidentally introduced into the water.",
        scrambled_effects: [
          { id: "d1", label: "The new plant spreads rapidly across the lake's surface" },
          { id: "d2", label: "Sunlight (an abiotic component) reaching the water below drops sharply" },
          { id: "d3", label: "The non-native plant is introduced into the lake" },
          { id: "d4", label: "Native underwater plants (biotic component), starved of light, begin to die off" },
        ],
        correct_order: ["d3", "d1", "d2", "d4"],
        explanation:
          "A single biotic change (introducing one new species) can alter an abiotic component (how much sunlight penetrates the water), which then affects other biotic components (the native plants) — the biosphere's living and non-living parts constantly influence each other in both directions, not just non-living-to-living.",
        hint: "This time, trace a living thing's arrival changing a non-living factor, before that non-living change hits other living things.",
      },
    },
    {
      title: "A City Expands Near a Wetland",
      difficulty: "hard",
      order_index: 3,
      payload: {
        trigger: "A city's outskirts expand with new construction directly bordering a wetland.",
        scrambled_effects: [
          { id: "d1", label: "Construction runoff changes the soil and water chemistry (abiotic components) of the wetland edge" },
          { id: "d2", label: "New buildings and roads are constructed at the wetland's edge" },
          { id: "d3", label: "Wetland plants (biotic component) sensitive to the changed chemistry die back at the edge" },
          { id: "d4", label: "Animals (biotic component) that depended on those edge plants for food or shelter move elsewhere or decline" },
        ],
        correct_order: ["d2", "d1", "d3", "d4"],
        explanation:
          "This is a longer chain than the previous two: a human/biotic action (construction) changes multiple abiotic components at once (soil and water chemistry), which affects one biotic component (edge plants), whose decline then affects a second, dependent biotic component (the animals) — showing that biosphere components rarely change in isolation; effects often cascade through more than one link.",
        hint: "There are two separate 'living things affected' steps here, not one — figure out which living component is affected directly by the chemistry change, and which is only affected because of what happens to that first one.",
      },
    },
  ];

  for (const level of challenges) {
    const exists = await GameContent.findOne({ game_type: "BIO_ECOSYSTEM_BALANCE", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_ECOSYSTEM_BALANCE",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
