require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 8 Biology hole in the integrated Science subject —
// Grade 8 previously had Chemistry (Metals and Non-Metals, via
// seedChemistryMatchGrade8.js) and, as of this pass, Physics
// (Electricity: Magnetic and Heating Effects, via
// seedPhysicsGrade8.js), but no Biology. Grounded in the current
// "Curiosity" textbook (NCF-SE 2023, 2026-27 session), confirmed
// 13-chapter list, Ch.2 "The Invisible Living World: Beyond Our Naked
// Eye" — a real Grade 8 chapter covering microorganisms (bacteria,
// fungi, protozoa, viruses) and which ones are useful versus harmful.
//
// Gap 1 fix: Biology is not a separate top-level Subject below Grade
// 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Biology" for mastery/analytics.
//
// Reuses BIO_VIRTUAL_LAB (same hotspot-diagram single-choice check as
// the Grade 5/6/7/9/10/11 versions), applied to a microscope-view
// diagram instead of a cell, classification, or digestive-system
// diagram.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 8, name: /science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 8 });
    console.log("Created new Grade 8 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Invisible Living World" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Biology",
      title: "The Invisible Living World",
      order_index: 1,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Useful and Harmful Microorganisms" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Useful and Harmful Microorganisms",
      explanation_text:
        "Microorganisms are living things too small to see without a microscope — bacteria, fungi, protozoa, and viruses. Some are useful, like the bacteria that turn milk into curd or the yeast that makes bread rise, while others cause disease, like the bacteria and viruses behind common infections.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const labChallenges = [
    {
      title: "Identify the Curd-Making Microorganism",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "microorganism_diagram",
        prompt: "Click the microorganism that turns milk into curd.",
        hotspots: [
          { id: "h1", label: "Lactobacillus (bacteria)", x: 30, y: 30 },
          { id: "h2", label: "Yeast (fungus)", x: 55, y: 30 },
          { id: "h3", label: "Amoeba (protozoa)", x: 80, y: 30 },
        ],
        correct_hotspot_id: "h1",
        hint: "This is a type of bacteria — it's added to warm milk to help it set.",
      },
    },
    {
      title: "Identify the Bread-Making Microorganism",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "microorganism_diagram",
        prompt: "Click the microorganism that produces the gas which makes bread dough rise.",
        hotspots: [
          { id: "h1", label: "Lactobacillus (bacteria)", x: 25, y: 35 },
          { id: "h2", label: "Yeast (fungus)", x: 50, y: 35 },
          { id: "h3", label: "Virus", x: 75, y: 35 },
          { id: "h4", label: "Amoeba (protozoa)", x: 50, y: 65 },
        ],
        correct_hotspot_id: "h2",
        hint: "This microorganism is a fungus that releases carbon dioxide as it feeds on sugar in the dough.",
      },
    },
    {
      title: "Identify the Disease-Causing Microorganism",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "microorganism_diagram",
        prompt: "Click the microorganism responsible for the common cold — one that cannot reproduce on its own outside a living cell.",
        hotspots: [
          { id: "h1", label: "Lactobacillus (bacteria)", x: 20, y: 40 },
          { id: "h2", label: "Yeast (fungus)", x: 45, y: 40 },
          { id: "h3", label: "Virus", x: 70, y: 40 },
          { id: "h4", label: "Amoeba (protozoa)", x: 90, y: 40 },
        ],
        correct_hotspot_id: "h3",
        hint: "Unlike bacteria and fungi, this kind of microorganism can only multiply inside a host's living cells.",
      },
    },
  ];

  for (const challenge of labChallenges) {
    const exists = await GameContent.findOne({
      game_type: "BIO_VIRTUAL_LAB",
      title: challenge.title,
    });
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
