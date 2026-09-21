require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, "Our Wondrous World",
// Unit 3 "Health and Well-being"). New chapter: "Food for Health".
// Lives inside the integrated Grade 4 "Science" subject
// (strand: Biology).
//
// Reuses BIO_SPECIMEN_ANALYSIS: the inspect -> observe -> classify
// loop works for sorting a food item into its food group just as
// well as sorting an animal into its class. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 4 });
    console.log("Created new Grade 4 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Food for Health" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Health and Well-being",
      title: "Food for Health",
      order_index: 4,
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
        "The food we eat can be grouped by what it mainly gives the body. Cereals like rice, wheat and millets give us energy. Pulses, eggs, milk and meat give us protein for growing and repairing our bodies. Fruits and vegetables give us vitamins and minerals that keep us healthy and fight illness. Fats and oils give concentrated energy but are needed only in small amounts. A balanced diet eats a mix from every group, not just one — no single food gives the body everything it needs.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const levels = [
    {
      title: "Specimen: A Bowl of Rice",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen: A Bowl of Rice",
        context: "A bowl of cooked rice is served at lunch. Look at what it mainly gives the body.",
        features: [
          { id: "f1", label: "Made from a grain (cereal)", detail: "Rice is the seed of a cereal plant." },
          { id: "f2", label: "Gives a quick feeling of energy", detail: "Eating it makes you feel less hungry and more energetic." },
          { id: "f3", label: "Doesn't have the protein of dal or eggs", detail: "It's mostly starch, not protein." },
        ],
        classificationOptions: [
          { id: "energy", label: "Energy-giving food (cereals)" },
          { id: "protein", label: "Body-building food (pulses/protein)" },
          { id: "vitamins", label: "Protective food (fruits/vegetables)" },
        ],
        correct_hotspot_id: "energy",
        explanation:
          "Cereals like rice, wheat and millets are mainly energy-giving foods — they're the largest part of most Indian meals for exactly this reason.",
      },
    },
    {
      title: "Specimen: A Bowl of Dal",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen: A Bowl of Dal",
        context: "A bowl of cooked lentils (dal) is served alongside the rice.",
        features: [
          { id: "g1", label: "Made from a pulse (lentil)", detail: "Dal is cooked split lentils, a type of pulse." },
          { id: "g2", label: "Helps muscles and the body grow", detail: "It's especially recommended for growing children." },
          { id: "g3", label: "Not eaten only for quick energy", detail: "It's not mainly about giving a quick energy boost." },
        ],
        classificationOptions: [
          { id: "energy", label: "Energy-giving food (cereals)" },
          { id: "protein", label: "Body-building food (pulses/protein)" },
          { id: "vitamins", label: "Protective food (fruits/vegetables)" },
        ],
        correct_hotspot_id: "protein",
        explanation:
          "Pulses like dal are rich in protein, which is why they're called body-building foods — they help build and repair muscles and tissue.",
      },
    },
    {
      title: "Specimen: A Plate of Spinach",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen: A Plate of Spinach",
        context: "A green leafy vegetable, spinach, is cooked as a side dish.",
        features: [
          { id: "h1", label: "A leafy green vegetable", detail: "It's the leaves of the spinach plant." },
          { id: "h2", label: "Helps fight illness and keeps skin/eyes healthy", detail: "Doctors often recommend it to stay healthy, not just to feel full." },
          { id: "h3", label: "Not a cereal or a pulse", detail: "It isn't a grain and isn't a lentil either." },
        ],
        classificationOptions: [
          { id: "energy", label: "Energy-giving food (cereals)" },
          { id: "protein", label: "Body-building food (pulses/protein)" },
          { id: "vitamins", label: "Protective food (fruits/vegetables)" },
        ],
        correct_hotspot_id: "vitamins",
        explanation:
          "Vegetables like spinach are protective foods — rich in vitamins and minerals that help the body fight illness and stay healthy.",
      },
    },
  ];

  for (const level of levels) {
    const exists = await GameContent.findOne({ game_type: "BIO_SPECIMEN_ANALYSIS", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
