require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Geography second mechanic for Grade 4: reuses the existing
// "Water Around Us" chapter from seedGeographyGrade4.js (currently
// GEOGRAPHY_ROUTE_BUILDER only, which ranks/sequences items in
// order), adds a new Concept + GEOGRAPHY_FEATURE_MATCH content —
// matching a geographic feature or process to its correct
// description instead. Reuses the generic mapping-family check in
// gameControllers.js (same mapping === correct_mapping rule as
// HISTORY_CAUSE_EFFECT_MATCH), no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 4 Social Science subject not found — run seedGeographyGrade4.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Water Around Us" });
  if (!chapter) {
    throw new Error("Chapter 'Water Around Us' not found — run seedGeographyGrade4.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Types of Water to Their Features" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Types of Water to Their Features",
      explanation_text: "Knowing how to rank or sequence water-related facts isn't the same as knowing what makes each type of water body different. Oceans, rivers, lakes, rain and groundwater each have their own defining features.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const featureChallenges = [
    {
      title: "Types of Water Bodies",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each type of water body to what actually makes it different from the others.",
        slots: [
          { id: "s1", label: "An ocean" },
          { id: "s2", label: "A river" },
          { id: "s3", label: "A lake" },
        ],
        components: [
          { id: "c1", label: "The largest, saltiest body of water on Earth, covering most of the planet's surface" },
          { id: "c2", label: "Flowing fresh water that moves from higher ground down toward the sea" },
          { id: "c3", label: "Still fresh water collected in a large low area of land, without a strong current" },
          { id: "c4", label: "Water that is always frozen solid and never melts" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Think about whether the water is salty or fresh, and whether it moves or stays still.",
      },
    },
    {
      title: "Fresh Water vs Salt Water",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each source of water to what actually happens with it.",
        slots: [
          { id: "s1", label: "Sea water" },
          { id: "s2", label: "Rainwater" },
          { id: "s3", label: "Well water" },
        ],
        components: [
          { id: "c1", label: "Tastes salty and cannot be used for drinking without special treatment" },
          { id: "c2", label: "Falls from clouds and collects on the ground or seeps into it" },
          { id: "c3", label: "Fresh water drawn up from underground, stored beneath the soil and rock" },
          { id: "c4", label: "Water found only inside plants and never touches the ground" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Only one of these sources is undrinkable without treatment — the rest are all forms of fresh water, just found in different places.",
      },
    },
    {
      title: "Why We Need to Save Water",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each fact about Earth's water supply to what it actually means for us.",
        slots: [
          { id: "s1", label: "Only a small fraction of Earth's water is fresh water" },
          { id: "s2", label: "Most fresh water is locked away as ice or deep underground" },
          { id: "s3", label: "Water we can easily use comes mainly from rivers, lakes and shallow groundwater" },
        ],
        components: [
          { id: "c1", label: "Means salt water from oceans cannot be used directly for drinking or farming" },
          { id: "c2", label: "Makes only a very small part of Earth's fresh water actually easy to reach and use" },
          { id: "c3", label: "Is the water source we must be most careful not to waste or pollute" },
          { id: "c4", label: "Means Earth will never run out of water no matter how much we use" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each fact narrows down how much usable fresh water is actually available to us.",
      },
    },
  ];

  for (const challenge of featureChallenges) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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
