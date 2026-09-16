require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// 4th subject vertical slice. Equation Balancer is deliberately unlike
// every other game_type so far: there is no single stored
// "correct_*" answer key in the payload, because more than one
// coefficient set can validly balance the same equation. Correctness
// is computed server-side from real atom counts (see checkAttempt in
// gameControllers.js) — closer to how a teacher actually checks this.
//
// Gap 5 fix: originally seeded at Grade 8 (and the file was named
// seedChemistryGrade8.js accordingly). NCERT doesn't introduce
// balancing chemical equations until Class 10 (Ch.1, Chemical
// Reactions and Equations) — Grade 8's own chemistry chapters are
// materials/metals-and-nonmetals topics, not equations. Moved to
// Grade 10, reusing the "Chemical Reactions & Stoichiometry" chapter
// seedChemistryGrade10.js already created there — this becomes that
// chapter's 2nd concept alongside "Balancing Combustion &
// Decomposition Reactions". File renamed to match (Gap 8 audit fix).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Chemistry is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Chemistry" for mastery/analytics.
  // See migrations/mergeGrades5to10ScienceAndSocialScience.js for the
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

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Balancing Chemical Equations" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Balancing Chemical Equations",
      explanation_text:
        "The law of conservation of mass means the number of atoms of each element must be equal on both sides of a chemical equation. Balancing means finding coefficients — whole numbers placed before each formula — that make this true, without changing the formulas themselves.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `species` lists every reactant/product with its
  // element composition (`atoms`); the student assigns a coefficient
  // (1..max_coefficient) to each. No stored answer — see
  // checkAttempt's CHEMISTRY_EQUATION_BALANCER branch.
  const balancingChallenges = [
    {
      title: "Balance: H₂ + O₂ → H₂O",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_display: "H2 + O2 -> H2O",
        max_coefficient: 4,
        species: [
          { id: "h1", formula: "H2", side: "reactant", atoms: { H: 2 } },
          { id: "h2", formula: "O2", side: "reactant", atoms: { O: 2 } },
          { id: "h3", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
        hint: "Count oxygen atoms on each side first — water only has one O per molecule.",
      },
    },
    {
      title: "Balance: N₂ + H₂ → NH₃",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_display: "N2 + H2 -> NH3",
        max_coefficient: 4,
        species: [
          { id: "n1", formula: "N2", side: "reactant", atoms: { N: 2 } },
          { id: "n2", formula: "H2", side: "reactant", atoms: { H: 2 } },
          { id: "n3", formula: "NH3", side: "product", atoms: { N: 1, H: 3 } },
        ],
        hint: "Two nitrogen atoms need to end up in two separate NH3 molecules.",
      },
    },
    {
      title: "Balance: Fe + O₂ → Fe₂O₃",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_display: "Fe + O2 -> Fe2O3",
        max_coefficient: 6,
        species: [
          { id: "f1", formula: "Fe", side: "reactant", atoms: { Fe: 1 } },
          { id: "f2", formula: "O2", side: "reactant", atoms: { O: 2 } },
          { id: "f3", formula: "Fe2O3", side: "product", atoms: { Fe: 2, O: 3 } },
        ],
        hint: "Try balancing oxygen last — it often forces a larger coefficient than iron does.",
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
