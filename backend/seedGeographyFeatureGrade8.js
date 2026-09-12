require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Geography second mechanic for Grade 8: reuses the existing
// "Maps and Navigation" chapter from seedGeographyGrade8.js (currently
// GEOGRAPHY_ROUTE_BUILDER only, which ranks/sequences items in
// order), adds a new Concept + GEOGRAPHY_FEATURE_MATCH content —
// matching a geographic feature or process to its correct
// description instead. Reuses the generic mapping-family check in
// gameControllers.js (same mapping === correct_mapping rule as
// HISTORY_CAUSE_EFFECT_MATCH), no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 8 Social Science subject not found — run seedGeographyGrade8.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Maps and Navigation" });
  if (!chapter) {
    throw new Error("Chapter 'Maps and Navigation' not found — run seedGeographyGrade8.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Map Elements to Their Purpose" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Map Elements to Their Purpose",
      explanation_text: "Ranking or ordering map-reading steps is one skill — matching each part of a map to what it's actually for is another. The legend, scale, compass rose, and grid lines each serve a different purpose.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const featureChallenges = [
    {
      title: "Parts of a Map",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each part of a map to what it's actually used for.",
        slots: [
          { id: "s1", label: "The legend (key)" },
          { id: "s2", label: "The scale" },
          { id: "s3", label: "The compass rose" },
        ],
        components: [
          { id: "c1", label: "Explains what each symbol or color used on the map actually means" },
          { id: "c2", label: "Shows how a distance measured on the map relates to real distance on the ground" },
          { id: "c3", label: "Shows which direction is north, south, east and west on the map" },
          { id: "c4", label: "Is a decorative border with no real use for reading the map" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each map element answers a different question: what does this mean, how far is it, and which way am I facing?",
      },
    },
    {
      title: "Latitude and Longitude",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each map concept to what it actually measures.",
        slots: [
          { id: "s1", label: "Lines of latitude" },
          { id: "s2", label: "Lines of longitude" },
          { id: "s3", label: "The Prime Meridian" },
        ],
        components: [
          { id: "c1", label: "Run east-west around the globe and measure distance north or south of the equator" },
          { id: "c2", label: "Run pole-to-pole and measure distance east or west of a reference line" },
          { id: "c3", label: "Is the line of longitude, passing through Greenwich, from which all other longitudes are measured" },
          { id: "c4", label: "Are the same as roads shown on a road map" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Latitude measures north-south position; longitude measures east-west position — one of these lines is the zero-point reference for longitude.",
      },
    },
    {
      title: "Reading a Topographic Map",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each contour line pattern to what it actually shows about the land.",
        slots: [
          { id: "s1", label: "Contour lines drawn close together" },
          { id: "s2", label: "Contour lines drawn far apart" },
          { id: "s3", label: "A closed contour loop with the highest number in the center" },
        ],
        components: [
          { id: "c1", label: "Show a steep slope, where elevation changes quickly over a short distance" },
          { id: "c2", label: "Show a gentle slope, where elevation changes slowly over distance" },
          { id: "c3", label: "Marks the top of a hill or mountain peak" },
          { id: "c4", label: "Always represents a body of water on the map" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "How close together contour lines are tells you how steep the land is; a closed loop with rising numbers marks a peak.",
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
