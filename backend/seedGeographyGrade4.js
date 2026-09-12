require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses GEOGRAPHY_ROUTE_BUILDER exactly as
// the Grade 8 Ganges/Grand Trunk Road versions do (order-sensitive
// check), applied to the water cycle journey — a staple of every
// Grade 4 EVS syllabus — instead of real-world river geography.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 3 fix: Geography is not a separate top-level Subject at
  // Grade 4 — it lives inside "Social Science" (reusing the existing
  // subject seeded by seedSocialScienceGrade4.js, not creating a
  // duplicate), with its chapters tagged strand: "Geography" for
  // mastery/analytics. See
  // migrations/mergeGrade4ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Geography content into this shape.
  let subject = await Subject.findOne({ grade: 4, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 4 });
    console.log("Created new Grade 4 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Water Around Us" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Environment",
      title: "Water Around Us",
      order_index: 1,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "The Journey of the Water Cycle" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "The Journey of the Water Cycle",
      explanation_text:
        "Water travels on a never-ending journey: the sun heats water in rivers and oceans, turning it into vapour that rises and cools into clouds, which then fall back down as rain, filling rivers again — and the journey repeats.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const routeChallenges = [
    {
      title: "Trace the Water Cycle — Simple Loop",
      difficulty: "easy",
      order_index: 1,
      payload: {
        journey_label: "Follow one drop of water on its journey through the water cycle.",
        scrambled_stops: [
          { id: "g1", label: "Water in a river, heated by the sun" },
          { id: "g2", label: "Rain falls back to the ground" },
          { id: "g3", label: "Water vapour rises into the sky" },
          { id: "g4", label: "Vapour cools and forms a cloud" },
        ],
        correct_order: ["g1", "g3", "g4", "g2"],
        hint: "It has to be heated and rise before it can form a cloud, and it has to be a cloud before it can rain.",
      },
    },
    {
      title: "Trace the Water Cycle — With the Ocean",
      difficulty: "medium",
      order_index: 2,
      payload: {
        journey_label: "This time the journey starts at the ocean and ends back in a river.",
        scrambled_stops: [
          { id: "h1", label: "Ocean water is warmed by sunlight" },
          { id: "h2", label: "Rain fills up rivers and lakes on land" },
          { id: "h3", label: "Vapour rises and cools into clouds" },
          { id: "h4", label: "Water evaporates into vapour" },
        ],
        correct_order: ["h1", "h4", "h3", "h2"],
        hint: "Warming comes first, then evaporation, then cloud formation, then rain.",
      },
    },
    {
      title: "Where Does Our Drinking Water Come From?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        journey_label: "Trace how rain becomes the water that comes out of your tap.",
        scrambled_stops: [
          { id: "k1", label: "Rain falls and collects in a reservoir" },
          { id: "k2", label: "Water is cleaned at a treatment plant" },
          { id: "k3", label: "Clean water travels through underground pipes" },
          { id: "k4", label: "Water comes out of the tap at home" },
        ],
        correct_order: ["k1", "k2", "k3", "k4"],
        hint: "Water always needs to be cleaned before it's sent through pipes to homes.",
      },
    },
  ];

  for (const challenge of routeChallenges) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
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
