require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses CHEMISTRY_MOLECULE_BUILDER, kept to
// the two building-block facts every Grade 4 EVS syllabus already
// touches (water is made of hydrogen + oxygen; salt is made of
// sodium + chlorine) — framed as "tiny building blocks", not formal
// chemistry, with generous hints and small atom pools.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Chemistry is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Chemistry" for mastery/analytics.
  // See migrations/mergeGrade4ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Chemistry content into this shape.
  let subject = await Subject.findOne({ grade: 4, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 4 });
    console.log("Created new Grade 4 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Tiny Building Blocks" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Everyday Materials",
      title: "Tiny Building Blocks",
      order_index: 1,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "What Everyday Things Are Made Of" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "What Everyday Things Are Made Of",
      explanation_text:
        "Everything around us — even water and salt — is built from tiny building blocks so small we can't see them. Water is always made from the same two building blocks joined together, and so is salt. Scientists give each building block a short symbol so it's quick to write down.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const moleculeChallenges = [
    {
      title: "Build: A Drop of Water",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "H2O",
        target_name: "Water",
        atom_pool: [
          { id: "a1", element: "H", symbol: "H" },
          { id: "a2", element: "H", symbol: "H" },
          { id: "a3", element: "O", symbol: "O" },
          { id: "a4", element: "N", symbol: "N" },
        ],
        correct_piece_ids: ["a1", "a2", "a3"],
        hint: "Water is always 2 hydrogen building blocks joined to 1 oxygen building block.",
      },
    },
    {
      title: "Build: A Grain of Salt",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "NaCl",
        target_name: "Table Salt",
        atom_pool: [
          { id: "b1", element: "Na", symbol: "Na" },
          { id: "b2", element: "Cl", symbol: "Cl" },
          { id: "b3", element: "H", symbol: "H" },
          { id: "b4", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["b1", "b2"],
        hint: "Table salt needs just one sodium building block joined to one chlorine building block.",
      },
    },
    {
      title: "Build: Two Drops of Water",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "H2O (x1, from a mixed pool)",
        target_name: "Water (pick only what you need)",
        atom_pool: [
          { id: "c1", element: "H", symbol: "H" },
          { id: "c2", element: "O", symbol: "O" },
          { id: "c3", element: "H", symbol: "H" },
          { id: "c4", element: "Na", symbol: "Na" },
          { id: "c5", element: "Cl", symbol: "Cl" },
          { id: "c6", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["c1", "c2", "c3"],
        hint: "There are extra building blocks here that don't belong to water — pick only 2 hydrogens and 1 oxygen.",
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
