require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Chemistry's second gameplay mechanic (Section 30: don't make every
// topic reuse the same mechanic). Equation Balancer is coefficient
// math on a fixed set of species; Molecule Builder is a different
// interaction — tap individual atom tiles from a mixed pool to
// assemble the target molecule. Reuses the exact same unordered
// subset-match rule as MATH_FRACTION_BUILDER (see checkAttempt in
// gameControllers.js), since "pick the right multiset of tile IDs"
// is identical logic even though the on-screen fantasy is different.
//
// Gap 5 fix: this was originally seeded at Grade 8 as a standalone
// "Chemistry" Subject, which was wrong on two counts — NCERT doesn't
// introduce Atoms and Molecules until Class 9, and it predated the
// Gap 1 restructure (Chemistry below Grade 11 lives inside the
// integrated "Science" subject, chapters tagged strand: "Chemistry").
// Moved to Grade 9, reusing the "Atoms and Molecules" chapter
// seedChemistryGrade9.js already created there — Molecule Builder
// becomes this chapter's 2nd concept alongside "Writing Chemical
// Formulas Using Valency".
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 9 });
    console.log("Created new Grade 9 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Atoms and Molecules" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Structure of Matter",
      title: "Atoms and Molecules",
      order_index: 2,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Molecular Formulas" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Molecular Formulas",
      explanation_text:
        "A molecule is a fixed group of atoms bonded together. Its molecular formula shows exactly how many atoms of each element it contains — for example, water (H2O) is always two hydrogen atoms bonded to one oxygen atom, never a different ratio.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `atom_pool` is a mixed set of individual atom
  // tiles (more tiles than needed, including decoy elements), each
  // with a unique id. `correct_piece_ids` names the exact tile ids
  // that make up the target molecule — see checkAttempt's shared
  // MATH_FRACTION_BUILDER / CHEMISTRY_MOLECULE_BUILDER branch.
  const moleculeChallenges = [
    {
      title: "Build: Water (H₂O)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "H2O",
        target_name: "Water",
        atom_pool: [
          { id: "a1", element: "H", symbol: "H" },
          { id: "a2", element: "H", symbol: "H" },
          { id: "a3", element: "O", symbol: "O" },
          { id: "a4", element: "H", symbol: "H" },
          { id: "a5", element: "N", symbol: "N" },
        ],
        correct_piece_ids: ["a1", "a2", "a3"],
        hint: "Water needs exactly two hydrogen atoms and one oxygen atom.",
      },
    },
    {
      title: "Build: Carbon Dioxide (CO₂)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "CO2",
        target_name: "Carbon Dioxide",
        atom_pool: [
          { id: "b1", element: "C", symbol: "C" },
          { id: "b2", element: "O", symbol: "O" },
          { id: "b3", element: "O", symbol: "O" },
          { id: "b4", element: "O", symbol: "O" },
          { id: "b5", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["b1", "b2", "b3"],
        hint: "One carbon atom bonds with two oxygen atoms — leave the spare oxygen out.",
      },
    },
    {
      title: "Build: Methane (CH₄)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "CH4",
        target_name: "Methane",
        atom_pool: [
          { id: "c1", element: "C", symbol: "C" },
          { id: "c2", element: "H", symbol: "H" },
          { id: "c3", element: "H", symbol: "H" },
          { id: "c4", element: "H", symbol: "H" },
          { id: "c5", element: "H", symbol: "H" },
          { id: "c6", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["c1", "c2", "c3", "c4", "c5"],
        hint: "Methane's one carbon atom bonds to four hydrogen atoms — ignore the oxygen.",
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
