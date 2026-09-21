require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, "Our Wondrous World",
// Unit 2 "Life Around Us"). New chapter: "Nature Trail" — observing
// plants/trees around us. Lives inside the integrated Grade 4
// "Science" subject (strand: Biology), same pattern as the other
// Grade 4 Science chapters — see seedBiologyGrade4.js.
//
// Reuses BIO_SPECIMEN_ANALYSIS: the same inspect -> observe ->
// classify loop used for animal sorting works just as well for
// plant/tree observation (leaf shape, whether it flowers, tree vs
// shrub vs climber). No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Nature Trail" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Life Around Us",
      title: "Nature Trail",
      order_index: 2,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Observing Plants and Trees Around Us" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Observing Plants and Trees Around Us",
      explanation_text:
        "A nature trail is a walk where you look closely at the plants around you instead of walking past them. Plants can be grouped by their size and stem — a herb has a soft green stem, a shrub has a woody stem that branches close to the ground, a tree has a thick woody trunk, and a climber needs support to grow upward. Leaves also differ in shape, edge and vein pattern, and looking at these details helps you tell one plant from another.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const levels = [
    {
      title: "Specimen: The Garden Herb",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Garden Herb",
        context: "A small green plant is growing in a pot near the school garden.",
        features: [
          { id: "f1", label: "Soft, green, bendable stem", detail: "The stem bends easily and is green all the way up." },
          { id: "f2", label: "Grows no taller than your knee", detail: "It stays short and low to the ground." },
          { id: "f3", label: "No woody bark anywhere", detail: "There is no hard brown bark on any part of it." },
        ],
        classificationOptions: [
          { id: "herb", label: "Herb" },
          { id: "shrub", label: "Shrub" },
          { id: "tree", label: "Tree" },
          { id: "climber", label: "Climber" },
        ],
        correct_hotspot_id: "herb",
        explanation:
          "A soft, bendable green stem with no woody bark and a short height are the defining features of a herb, like mint or coriander.",
      },
    },
    {
      title: "Specimen: The Fence-Side Bush",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen: The Fence-Side Bush",
        context: "A bushy plant grows along the school fence, about as tall as a person.",
        features: [
          { id: "g1", label: "Woody stem that branches near the ground", detail: "Several woody branches start low, close to the soil." },
          { id: "g2", label: "No single thick trunk", detail: "There isn't one main trunk — just many branches." },
          { id: "g3", label: "Medium height, bushy shape", detail: "It's taller than a herb but shorter and bushier than a tree." },
        ],
        classificationOptions: [
          { id: "herb", label: "Herb" },
          { id: "shrub", label: "Shrub" },
          { id: "tree", label: "Tree" },
          { id: "climber", label: "Climber" },
        ],
        correct_hotspot_id: "shrub",
        explanation:
          "Many woody branches starting close to the ground, with no single main trunk, is what makes a plant a shrub rather than a tree.",
      },
    },
    {
      title: "Specimen: The Wall Vine",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen: The Wall Vine",
        context: "A plant is growing up the school compound wall, winding around a metal pipe.",
        features: [
          { id: "h1", label: "Cannot stand up on its own", detail: "Without something to hold onto, it would flop over." },
          { id: "h2", label: "Long, winding stem", detail: "Its stem coils around the pipe as it grows upward." },
          { id: "h3", label: "Thin stem, not woody like a tree trunk", detail: "The stem is thin and flexible, not thick and hard." },
        ],
        classificationOptions: [
          { id: "herb", label: "Herb" },
          { id: "shrub", label: "Shrub" },
          { id: "tree", label: "Tree" },
          { id: "climber", label: "Climber" },
        ],
        correct_hotspot_id: "climber",
        explanation:
          "A plant that cannot stay upright on its own and winds around a support to climb is a climber, like money plant or a bean vine.",
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
