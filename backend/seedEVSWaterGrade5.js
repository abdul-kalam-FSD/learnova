require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 1 "Water: The
// Essence of Life" (2026-27 session, Unit 1: Life Around Us).
// Confirmed via multiple current, independent sources (see BATCH 2 —
// GRADE 5 PHASE 1 AUDIT, section B).
//
// Reuses CHEMISTRY_MOLECULE_BUILDER — the same subset-sum atom-pool
// mechanic already used for "The Air We Breathe" — since water's
// molecular makeup (H2O) is a genuine, natural fit for that mechanic,
// not a stretch. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Water: The Essence of Life" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Life Around Us",
      title: "Water: The Essence of Life",
      order_index: 1,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "What Water Is Made Of" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "What Water Is Made Of",
      explanation_text:
        "Water is made of two tiny hydrogen building blocks joined to one oxygen building block — that's why its chemical name is H2O. Water is essential to every living thing, and it exists around us in three forms: solid ice, liquid water, and water vapour (a gas), changing between them as it heats up or cools down.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const waterChallenges = [
    {
      title: "Build: A Molecule of Water",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "H2O",
        target_name: "Water",
        atom_pool: [
          { id: "a1", element: "H", symbol: "H" },
          { id: "a2", element: "H", symbol: "H" },
          { id: "a3", element: "O", symbol: "O" },
          { id: "a4", element: "C", symbol: "C" },
        ],
        correct_piece_ids: ["a1", "a2", "a3"],
        hint: "Water needs exactly 2 hydrogen building blocks joined to 1 oxygen building block — nothing else.",
      },
    },
    {
      title: "Build: Water Vapour Is Still Water",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "H2O",
        target_name: "Water Vapour (still H2O, just as a gas)",
        atom_pool: [
          { id: "b1", element: "O", symbol: "O" },
          { id: "b2", element: "H", symbol: "H" },
          { id: "b3", element: "H", symbol: "H" },
          { id: "b4", element: "O", symbol: "O" },
          { id: "b5", element: "N", symbol: "N" },
        ],
        correct_piece_ids: ["b1", "b2", "b3"],
        hint: "Whether it's ice, liquid water, or vapour, water is always made of the same 2 hydrogen + 1 oxygen combination.",
      },
    },
    {
      title: "Build: Two Water Molecules from a Bigger Pool",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "H2O",
        target_name: "Water (build just ONE molecule from this larger mixed pool)",
        atom_pool: [
          { id: "c1", element: "H", symbol: "H" },
          { id: "c2", element: "H", symbol: "H" },
          { id: "c3", element: "H", symbol: "H" },
          { id: "c4", element: "H", symbol: "H" },
          { id: "c5", element: "O", symbol: "O" },
          { id: "c6", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["c1", "c2", "c5"],
        hint: "Even with extra hydrogen and oxygen blocks available, one water molecule only ever needs exactly 2 hydrogen and 1 oxygen.",
      },
    },
  ];

  for (const challenge of waterChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MOLECULE_BUILDER", title: challenge.title });
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
