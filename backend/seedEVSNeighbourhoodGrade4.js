require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, "Our Wondrous World",
// Unit 1 "Our Community"). New chapter: "Exploring Our
// Neighbourhood". Lives inside the integrated Grade 4 "Social
// Science" subject (strand: Geography — place/location focus,
// distinct from the "Living Together" chapter's Civics strand).
//
// Reuses GEOGRAPHY_FEATURE_MATCH's generic slots/components mapping
// mechanic (same shape as the Water Around Us chapter) to match a
// neighbourhood place to what it's actually for. No new mechanic
// needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 4 });
    console.log("Created new Grade 4 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Exploring Our Neighbourhood" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Community",
      title: "Exploring Our Neighbourhood",
      order_index: 2,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Places and People in Our Neighbourhood" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Places and People in Our Neighbourhood",
      explanation_text:
        "A neighbourhood has different places that each serve a purpose: a school is where children learn, a hospital is where the sick are treated, a market is where people buy food and daily goods, and a post office is where letters and parcels are sent and collected. Knowing which place does what helps you find the right kind of help or service when you need it.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const featureChallenges = [
    {
      title: "Match: Neighbourhood Places",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each neighbourhood place to what it's mainly used for.",
        slots: [
          { id: "s1", label: "School" },
          { id: "s2", label: "Hospital" },
          { id: "s3", label: "Market" },
        ],
        components: [
          { id: "c1", label: "Where children go to learn and study" },
          { id: "c2", label: "Where sick or injured people are treated by doctors" },
          { id: "c3", label: "Where people buy vegetables, groceries and daily goods" },
          { id: "c4", label: "Where letters and parcels are sent and collected" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about who works in each place and why people actually visit it.",
      },
    },
    {
      title: "Match: Neighbourhood Helpers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each neighbourhood helper to the place where they mainly work.",
        slots: [
          { id: "s1", label: "A postal worker" },
          { id: "s2", label: "A vegetable seller" },
          { id: "s3", label: "A police officer" },
        ],
        components: [
          { id: "c1", label: "Works at the post office, sorting and delivering mail" },
          { id: "c2", label: "Works at the market, selling fresh produce" },
          { id: "c3", label: "Works at the police station, keeping the neighbourhood safe" },
          { id: "c4", label: "Works at the hospital, caring for patients" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Match the job to the exact place, not just to 'helping people' in general.",
      },
    },
    {
      title: "Match: Finding Your Way",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each situation to the neighbourhood place you should go to.",
        slots: [
          { id: "s1", label: "You need to send a birthday card to your cousin" },
          { id: "s2", label: "Your family is out of rice and vegetables" },
          { id: "s3", label: "You want to report a lost puppy wandering the street" },
        ],
        components: [
          { id: "c1", label: "Post office" },
          { id: "c2", label: "Market" },
          { id: "c3", label: "Police station" },
          { id: "c4", label: "School" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Work out what the person actually needs done, then pick the place built for that purpose.",
      },
    },
  ];

  for (const challenge of featureChallenges) {
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
