require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Geography second mechanic for Grade 6: reuses the existing
// "Oceans and Continents" chapter from seedGeographyGrade6.js (currently
// GEOGRAPHY_ROUTE_BUILDER only, which ranks/sequences items in
// order), adds a new Concept + GEOGRAPHY_FEATURE_MATCH content —
// matching a geographic feature or process to its correct
// description instead. Reuses the generic mapping-family check in
// gameControllers.js (same mapping === correct_mapping rule as
// HISTORY_CAUSE_EFFECT_MATCH), no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 6, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 6 Social Science subject not found — run seedGeographyGrade6.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Oceans and Continents" });
  if (!chapter) {
    throw new Error("Chapter 'Oceans and Continents' not found — run seedGeographyGrade6.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Oceans and Continents to Their Facts" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Oceans and Continents to Their Facts",
      explanation_text: "Ranking oceans by size is one skill — matching each ocean or continent to the fact that actually describes it is another. Size, location and climate all set them apart.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const featureChallenges = [
    {
      title: "Oceans and Their Facts",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each ocean to the fact that actually describes it.",
        slots: [
          { id: "s1", label: "The Pacific Ocean" },
          { id: "s2", label: "The Atlantic Ocean" },
          { id: "s3", label: "The Arctic Ocean" },
        ],
        components: [
          { id: "c4", label: "An ocean located entirely within the continent of Australia" },
          { id: "c3", label: "The smallest and shallowest ocean, mostly covered in ice near the North Pole" },
          { id: "c2", label: "The second-largest ocean, separating the Americas from Europe and Africa" },
          { id: "c1", label: "The largest and deepest ocean on Earth, bordering Asia and the Americas" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Think about size and location — one is the biggest by far, one connects the Americas to Europe/Africa, and one is small and icy.",
      },
    },
    {
      title: "Continents and Their Features",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each continent to the fact that actually describes it.",
        slots: [
          { id: "s1", label: "Asia" },
          { id: "s2", label: "Africa" },
          { id: "s3", label: "Antarctica" },
        ],
        components: [
          { id: "c4", label: "A continent located entirely underwater beneath the Pacific Ocean" },
          { id: "c3", label: "The coldest continent, almost entirely covered by a thick sheet of ice, with no permanent population" },
          { id: "c2", label: "The continent crossed by the equator, home to the Sahara, the world's largest hot desert" },
          { id: "c1", label: "The largest continent by both area and population, home to Mount Everest" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "One continent is the largest and most populated, one has the world's biggest hot desert, and one is permanently frozen.",
      },
    },
    {
      title: "How Continents and Oceans Connect",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each geographic connection to what it actually means for travel or trade.",
        slots: [
          { id: "s1", label: "The Indian Ocean lies between Africa, Asia and Australia" },
          { id: "s2", label: "The Isthmus of Panama connects North and South America" },
          { id: "s3", label: "The Suez Canal connects the Mediterranean Sea to the Red Sea" },
        ],
        components: [
          { id: "c4", label: "Means all three oceans are actually the exact same body of water" },
          { id: "c3", label: "Lets ships travel between Europe and Asia without going all the way around Africa" },
          { id: "c2", label: "Is a narrow strip of land that ships must sail around unless a canal is built through it" },
          { id: "c1", label: "Makes it a major route for trade ships travelling between these three continents" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each geographic connection either enables trade routes or creates a barrier that a canal can solve.",
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
