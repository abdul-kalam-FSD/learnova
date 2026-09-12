require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 5 note: seedChemistryGrade8.js was originally a second grade
// for CHEMISTRY_EQUATION_BALANCER, and exposed the getGameContentList
// grade-filtering bug that this file's comment used to describe.
// seedChemistryGrade8.js has since been moved to Grade 10 (NCERT
// doesn't cover equation balancing until Class 10) and now merges
// into this same chapter as a 2nd concept — so there's no longer a
// cross-grade pairing here, just two concepts under one chapter.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Chemistry is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject
  // (reusing the Subject seeded by seedGrade10.js, matched via
  // {grade, name}), with its chapters tagged strand: "Chemistry" for
  // mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Chemistry content into this shape.
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 10 });
    console.log("Created new Grade 10 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Chemical Reactions & Stoichiometry" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Chemical Reactions",
      title: "Chemical Reactions & Stoichiometry",
      order_index: 1,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Balancing Combustion & Decomposition Reactions" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Balancing Combustion & Decomposition Reactions",
      explanation_text:
        "Combustion and decomposition reactions often involve more species and larger coefficients than simple synthesis reactions. The same conservation-of-mass rule applies — every element must balance — but tracking multiple products at once takes more care.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const balancingChallenges = [
    {
      title: "Balance: CH₄ + O₂ → CO₂ + H₂O",
      difficulty: "medium",
      order_index: 1,
      payload: {
        equation_display: "CH4 + O2 -> CO2 + H2O",
        max_coefficient: 4,
        species: [
          { id: "c1", formula: "CH4", side: "reactant", atoms: { C: 1, H: 4 } },
          { id: "c2", formula: "O2", side: "reactant", atoms: { O: 2 } },
          { id: "c3", formula: "CO2", side: "product", atoms: { C: 1, O: 2 } },
          { id: "c4", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
        hint: "Balance carbon and hydrogen first — oxygen usually needs the largest coefficient since it comes from two different products.",
      },
    },
    {
      title: "Balance: C₃H₈ + O₂ → CO₂ + H₂O",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_display: "C3H8 + O2 -> CO2 + H2O",
        max_coefficient: 6,
        species: [
          { id: "p1", formula: "C3H8", side: "reactant", atoms: { C: 3, H: 8 } },
          { id: "p2", formula: "O2", side: "reactant", atoms: { O: 2 } },
          { id: "p3", formula: "CO2", side: "product", atoms: { C: 1, O: 2 } },
          { id: "p4", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
        hint: "Three carbons need three CO2, and eight hydrogens need four H2O — count the total oxygen those require last.",
      },
    },
    {
      title: "Balance: KClO₃ → KCl + O₂",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_display: "KClO3 -> KCl + O2",
        max_coefficient: 4,
        species: [
          { id: "k1", formula: "KClO3", side: "reactant", atoms: { K: 1, Cl: 1, O: 3 } },
          { id: "k2", formula: "KCl", side: "product", atoms: { K: 1, Cl: 1 } },
          { id: "k3", formula: "O2", side: "product", atoms: { O: 2 } },
        ],
        hint: "This is a decomposition — one reactant breaking into two products. Balance oxygen last since it's the only element split across the O2 pairs.",
      },
    },
  ];

  for (const challenge of balancingChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_EQUATION_BALANCER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_EQUATION_BALANCER",
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
