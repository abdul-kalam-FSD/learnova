require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 5 "Our Vibrant
// Country" (2026-27 session, Unit 3: Incredible India).
//
// Reuses GEOGRAPHY_FEATURE_MATCH — the same mapping mechanic already
// used for river features — pointed at India's regional diversity
// (states/regions matched to a defining cultural or geographic
// feature). No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    subject = await Subject.create({ name: "EVS", grade: 5 });
    console.log("Created new Grade 5 EVS subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Our Vibrant Country" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Incredible India",
      title: "Our Vibrant Country",
      order_index: 5,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "India's Regional Diversity" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "India's Regional Diversity",
      explanation_text:
        "India is made up of many states and regions, each with its own languages, festivals, food, and landscape — from the snow-covered Himalayas in the north to the backwaters of Kerala in the south. This variety is part of what makes the country vibrant: very different traditions and geographies exist side by side within one nation.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const countryChallenges = [
    {
      title: "Match: Region to Its Landscape",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each region of India to its landscape.",
        slots: [
          { id: "s1", label: "The Himalayan region (north)" },
          { id: "s2", label: "The Thar region (northwest)" },
          { id: "s3", label: "The Kerala backwaters (south)" },
        ],
        components: [
          { id: "c1", label: "Snow-covered mountains" },
          { id: "c2", label: "Sandy desert" },
          { id: "c3", label: "Networks of calm lagoons and canals" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about each region's climate — cold and high, hot and dry, or warm and watery.",
      },
    },
    {
      title: "Match: Festival to the Season/Reason It's Celebrated",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each festival to what it is mainly associated with.",
        slots: [
          { id: "s1", label: "Pongal / Makar Sankranti" },
          { id: "s2", label: "Diwali" },
          { id: "s3", label: "Onam" },
        ],
        components: [
          { id: "c1", label: "A harvest festival marking the new farming season" },
          { id: "c2", label: "A festival of lights celebrating the victory of good over evil" },
          { id: "c3", label: "A harvest festival celebrated mainly in Kerala with a grand feast" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Several of India's festivals are tied to the farming calendar and harvest time, even though they're celebrated differently in different states.",
      },
    },
    {
      title: "Match: State to a Distinctive Feature",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each state to something it is especially known for.",
        slots: [
          { id: "s1", label: "Rajasthan" },
          { id: "s2", label: "West Bengal" },
          { id: "s3", label: "Punjab" },
        ],
        components: [
          { id: "c1", label: "Desert forts and vibrant folk traditions" },
          { id: "c2", label: "The Sundarbans mangrove forest and the Bengali New Year" },
          { id: "c3", label: "Wheat farming and the Bhangra folk dance" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each state's geography usually shapes what it becomes known for — a desert state develops different traditions from a river-delta state.",
      },
    },
  ];

  for (const challenge of countryChallenges) {
    const exists = await GameContent.findOne({ game_type: "GEOGRAPHY_FEATURE_MATCH", title: challenge.title });
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
