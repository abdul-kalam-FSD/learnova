require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 9 "Rhythms of
// Nature" (2026-27 session, Unit 5: Our Amazing Planet).
//
// Reuses BIO_VIRTUAL_LAB — the same hotspot-diagram single-choice
// mechanic already used for seed germination — pointed at a seasonal-
// cycle diagram (identifying which season/natural rhythm a set of
// clues describes). No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Rhythms of Nature" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Amazing Planet",
      title: "Rhythms of Nature",
      order_index: 9,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Seasons and Natural Cycles" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Seasons and Natural Cycles",
      explanation_text:
        "Nature moves in repeating rhythms — the changing seasons, day turning to night, and animals like birds migrating at the same time every year. Plants and animals have adapted to these rhythms: some trees shed their leaves before winter, some animals migrate to warmer places, and many flowers bloom only in a particular season.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const rhythmChallenges = [
    {
      title: "Identify the Season from Its Clues",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "seasonal_cycle_diagram",
        prompt: "Click the season being described: trees are shedding their leaves, and days are getting shorter and cooler.",
        hotspots: [
          { id: "h1", label: "Summer", x: 20, y: 30 },
          { id: "h2", label: "Autumn", x: 50, y: 50 },
          { id: "h3", label: "Winter", x: 75, y: 65 },
          { id: "h4", label: "Spring", x: 35, y: 20 },
        ],
        correct_hotspot_id: "h2",
        hint: "Leaves falling and shortening days happen as a place transitions toward the coldest season, not during it.",
      },
    },
    {
      title: "Identify the Migration Behaviour",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "seasonal_cycle_diagram",
        prompt: "Click the point in the yearly cycle when many migratory birds travel to warmer regions.",
        hotspots: [
          { id: "h1", label: "As winter approaches in their home region", x: 65, y: 60 },
          { id: "h2", label: "In the middle of summer", x: 25, y: 25 },
          { id: "h3", label: "Right after spring flowers bloom", x: 40, y: 35 },
          { id: "h4", label: "Only during the hottest part of the year", x: 55, y: 45 },
        ],
        correct_hotspot_id: "h1",
        hint: "Birds migrate mainly to escape cold conditions and food scarcity as winter sets in.",
      },
    },
    {
      title: "Identify the Adaptation to a Seasonal Rhythm",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "seasonal_cycle_diagram",
        prompt: "Click the adaptation that helps a deciduous tree survive winter, when water is harder to draw from frozen ground.",
        hotspots: [
          { id: "h1", label: "Growing taller during winter", x: 30, y: 20 },
          { id: "h2", label: "Shedding its leaves to reduce water loss", x: 55, y: 55 },
          { id: "h3", label: "Blooming extra flowers in winter", x: 70, y: 40 },
          { id: "h4", label: "Growing new roots only in winter", x: 45, y: 65 },
        ],
        correct_hotspot_id: "h2",
        hint: "Leaves lose water through their surface — dropping them before water becomes scarce helps the tree conserve it.",
      },
    },
  ];

  for (const challenge of rhythmChallenges) {
    const exists = await GameContent.findOne({ game_type: "BIO_VIRTUAL_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_VIRTUAL_LAB",
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
