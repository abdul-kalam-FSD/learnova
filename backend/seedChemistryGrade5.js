require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 5 EVS fill (Chemistry strand). Reuses CHEMISTRY_MOLECULE_BUILDER
// exactly as the Grade 4 "Tiny Building Blocks" chapter does
// (unordered-subset check), stepping up from water/salt to the gases
// in air (O2, CO2) — a new topic, not a repeat of Grade 4's molecules.
//
// Source basis (Gap 5, book name corrected): like Grade 4's Chemistry
// content, this isn't tied to one specific EVS chapter — NCERT
// doesn't teach formal chemistry (elements, formulas) until Class 9,
// so this is a simplified, age-appropriate "building blocks" framing
// rather than an exact chapter citation, consistent with how Grade
// 4's Chemistry and Physics content was already flagged and accepted
// in the Gap 5 citation trail (🟡 "plausible for the age band, not
// sourced from a real chapter"). Note: the Grade 5 EVS textbook is
// now "Our Wondrous World" (NCF-SE 2023, current 2026-27 session),
// not "Looking Around" — this file never cited a specific chapter
// from either edition, so no correction was needed beyond not naming
// the retired book.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Air We Breathe" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Everyday Materials",
      title: "The Air We Breathe",
      order_index: 1,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "What Air Is Made Of" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "What Air Is Made Of",
      explanation_text:
        "The air around us is a mix of tiny building blocks too. The oxygen we need to breathe in is made of two oxygen building blocks joined together, and the carbon dioxide we breathe out is made of one carbon building block joined to two oxygen building blocks.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const moleculeChallenges = [
    {
      title: "Build: A Breath of Oxygen",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "O2",
        target_name: "Oxygen",
        atom_pool: [
          { id: "a1", element: "O", symbol: "O" },
          { id: "a2", element: "O", symbol: "O" },
          { id: "a3", element: "H", symbol: "H" },
          { id: "a4", element: "N", symbol: "N" },
        ],
        correct_piece_ids: ["a1", "a2"],
        hint: "The oxygen we breathe in is just 2 oxygen building blocks joined together — nothing else.",
      },
    },
    {
      title: "Build: The Breath You Let Out",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "CO2",
        target_name: "Carbon Dioxide",
        atom_pool: [
          { id: "b1", element: "C", symbol: "C" },
          { id: "b2", element: "O", symbol: "O" },
          { id: "b3", element: "O", symbol: "O" },
          { id: "b4", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["b1", "b2", "b3"],
        hint: "Carbon dioxide needs 1 carbon building block joined to 2 oxygen building blocks.",
      },
    },
    {
      title: "Sort the Air — Oxygen or Carbon Dioxide?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "O2 (x1, from a mixed pool)",
        target_name: "Oxygen (pick only what you need)",
        atom_pool: [
          { id: "c1", element: "O", symbol: "O" },
          { id: "c2", element: "C", symbol: "C" },
          { id: "c3", element: "O", symbol: "O" },
          { id: "c4", element: "O", symbol: "O" },
          { id: "c5", element: "N", symbol: "N" },
          { id: "c6", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["c1", "c3"],
        hint: "There are enough oxygen building blocks here for both oxygen and carbon dioxide — pick just 2 of them for oxygen.",
      },
    },
  ];

  for (const challenge of moleculeChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_MOLECULE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MOLECULE_BUILDER",
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
