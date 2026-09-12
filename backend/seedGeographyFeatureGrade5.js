require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Geography second mechanic for Grade 5: reuses the existing
// "How a River Reaches the Sea" chapter from seedGeographyGrade5.js (currently
// GEOGRAPHY_ROUTE_BUILDER only, which ranks/sequences items in
// order), adds a new Concept + GEOGRAPHY_FEATURE_MATCH content —
// matching a geographic feature or process to its correct
// description instead. Reuses the generic mapping-family check in
// gameControllers.js (same mapping === correct_mapping rule as
// HISTORY_CAUSE_EFFECT_MATCH), no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    throw new Error("Grade 5 EVS subject not found — run seedGeographyGrade5.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "How a River Reaches the Sea" });
  if (!chapter) {
    throw new Error("Chapter 'How a River Reaches the Sea' not found — run seedGeographyGrade5.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Parts of a River's Journey" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Parts of a River's Journey",
      explanation_text: "Sequencing a river's journey from source to sea is one skill — matching each part of that journey to what actually makes it distinct is another. The source, tributaries, and mouth each play a different role.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const featureChallenges = [
    {
      title: "Parts of a River's Journey",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each part of a river to what it actually is.",
        slots: [
          { id: "s1", label: "The source" },
          { id: "s2", label: "A tributary" },
          { id: "s3", label: "The mouth" },
        ],
        components: [
          { id: "c1", label: "The starting point of a river, often high up in hills or mountains" },
          { id: "c2", label: "A smaller stream that joins and adds its water to the main river" },
          { id: "c3", label: "The place where a river finally empties into the sea or a lake" },
          { id: "c4", label: "A dry riverbed that never carries any water at all" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Think about where each of these sits along a river's path — start, middle, or end.",
      },
    },
    {
      title: "What Happens Along the Way",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each stage of a river's course to why it behaves that way.",
        slots: [
          { id: "s1", label: "Near its source, a river usually flows fast over rocky ground" },
          { id: "s2", label: "In the middle of its course, the river slows down and winds" },
          { id: "s3", label: "Near the sea, the river often splits into many small channels" },
        ],
        components: [
          { id: "c1", label: "Because the land is steep, giving the water more speed" },
          { id: "c2", label: "Because the land flattens out, letting the river curve more gently" },
          { id: "c3", label: "Forming a fan-shaped delta where it drops the mud and sand it carried" },
          { id: "c4", label: "Because the river suddenly turns into ocean water" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "A river's speed and shape change with the steepness of the land it flows over.",
      },
    },
    {
      title: "Why Rivers Matter to People",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each fact about rivers to the effect it actually has on people.",
        slots: [
          { id: "s1", label: "Rivers carry fresh water down from mountains to the plains" },
          { id: "s2", label: "Farmers build canals to take river water to their fields" },
          { id: "s3", label: "Rivers carry silt (fine mud) that settles on the land they flow over" },
        ],
        components: [
          { id: "c1", label: "Gives towns and cities far from the mountains a steady source of drinking water" },
          { id: "c2", label: "Lets crops grow even in areas that don't get much rain themselves" },
          { id: "c3", label: "Makes the land near riverbanks especially fertile for farming" },
          { id: "c4", label: "Causes the mountains to grow taller every year" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each fact about a river leads to one specific benefit for the people living near it.",
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
