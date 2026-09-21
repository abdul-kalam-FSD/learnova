require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 3 "The Mystery
// of Food" (2026-27 session, Unit 2: Health and Well-being).
//
// Reuses BIO_VIRTUAL_LAB — the same hotspot-diagram single-choice
// mechanic already used for seed germination — pointed at a "which
// food group does this meal mostly belong to" diagram task. A
// genuine fit: identifying a food group from a labelled plate is the
// same interaction shape as identifying a labelled stage in a
// diagram. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Mystery of Food" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Health and Well-being",
      title: "The Mystery of Food",
      order_index: 3,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Food Groups and a Balanced Diet" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Food Groups and a Balanced Diet",
      explanation_text:
        "Food gives our bodies energy, helps us grow, and keeps us healthy — but different foods do different jobs. Grains and sugars mainly give energy, pulses/eggs/meat mainly build and repair the body, and fruits/vegetables mainly protect us from illness by providing vitamins and minerals. A balanced diet includes a good mix from all these groups, not just the ones that taste best.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const foodChallenges = [
    {
      title: "Identify the Energy-Giving Food Group",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "balanced_plate_diagram",
        prompt: "Click the part of the plate that mainly gives the body energy to move and work.",
        hotspots: [
          { id: "h1", label: "Rice and Bread (grains)", x: 25, y: 30 },
          { id: "h2", label: "Dal and Eggs (pulses/protein)", x: 55, y: 40 },
          { id: "h3", label: "Spinach and Carrots (vegetables)", x: 40, y: 65 },
          { id: "h4", label: "Orange and Guava (fruits)", x: 70, y: 60 },
        ],
        correct_hotspot_id: "h1",
        hint: "Grains like rice, wheat, and bread are the body's main fuel source.",
      },
    },
    {
      title: "Identify the Body-Building Food Group",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "balanced_plate_diagram",
        prompt: "Click the part of the plate that mainly helps build and repair the body's muscles and tissues.",
        hotspots: [
          { id: "h1", label: "Potatoes and Rice", x: 20, y: 35 },
          { id: "h2", label: "Eggs, Dal, and Fish", x: 60, y: 45 },
          { id: "h3", label: "Sugar and Ghee", x: 45, y: 20 },
          { id: "h4", label: "Bananas and Papaya", x: 75, y: 55 },
        ],
        correct_hotspot_id: "h2",
        hint: "Protein-rich foods like eggs, dal (lentils), and fish are the body's building blocks.",
      },
    },
    {
      title: "Identify the Protective Food Group",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "balanced_plate_diagram",
        prompt: "Click the part of the plate that mainly protects the body from illness through vitamins and minerals.",
        hotspots: [
          { id: "h1", label: "Fried snacks and sweets", x: 30, y: 25 },
          { id: "h2", label: "Roti and Rice", x: 20, y: 50 },
          { id: "h3", label: "Mixed vegetables and seasonal fruit", x: 65, y: 60 },
          { id: "h4", label: "Milk and Ghee", x: 50, y: 40 },
        ],
        correct_hotspot_id: "h3",
        hint: "Vegetables and fruits are rich in the vitamins and minerals that protect the body from disease.",
      },
    },
  ];

  for (const challenge of foodChallenges) {
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
