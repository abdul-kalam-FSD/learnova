require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass, Grade 11-12 gap: Grade 11 previously had
// Biology only. This is the first non-Biology Grade 11 subject.
// Reuses CHEMISTRY_EQUATION_BALANCER as-is (no backend/frontend
// changes needed — see gameControllers.js's atom-count checkAttempt
// branch, which is already fully generic) with genuinely
// grade-11-level content: redox/combustion equations with larger,
// less obvious coefficients than the Grade 8 set.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /chemistry/i });
  if (!subject) {
    subject = await Subject.create({ name: "Chemistry", grade: 11 });
    console.log("Created new Grade 11 Chemistry subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Redox Reactions" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Chemical Reactions",
      title: "Redox Reactions",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Balancing Redox and Combustion Equations" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Balancing Redox and Combustion Equations",
      explanation_text:
        "Redox and combustion reactions often need larger, less obvious coefficients than simple synthesis reactions because more than one element changes count on both sides at once. The same conservation-of-mass rule applies: every element's atom count must match on both sides, so balancing means working through each element in turn rather than guessing.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const balancingChallenges = [
    {
      title: "Balance: C₃H₈ + O₂ → CO₂ + H₂O",
      difficulty: "medium",
      order_index: 1,
      payload: {
        equation_display: "C3H8 + O2 -> CO2 + H2O",
        max_coefficient: 6,
        species: [
          { id: "p1", formula: "C3H8", side: "reactant", atoms: { C: 3, H: 8 } },
          { id: "p2", formula: "O2", side: "reactant", atoms: { O: 2 } },
          { id: "p3", formula: "CO2", side: "product", atoms: { C: 1, O: 2 } },
          { id: "p4", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
        hint: "Balance carbon and hydrogen first — oxygen is easiest to fix last since it appears in both products.",
      },
    },
    {
      title: "Balance: KMnO₄ + HCl → KCl + MnCl₂ + H₂O + Cl₂",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_display: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2",
        max_coefficient: 16,
        species: [
          { id: "r1", formula: "KMnO4", side: "reactant", atoms: { K: 1, Mn: 1, O: 4 } },
          { id: "r2", formula: "HCl", side: "reactant", atoms: { H: 1, Cl: 1 } },
          { id: "r3", formula: "KCl", side: "product", atoms: { K: 1, Cl: 1 } },
          { id: "r4", formula: "MnCl2", side: "product", atoms: { Mn: 1, Cl: 2 } },
          { id: "r5", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
          { id: "r6", formula: "Cl2", side: "product", atoms: { Cl: 2 } },
        ],
        hint: "This is a real redox reaction — HCl gets used up two ways: some becomes chloride salts, some becomes Cl2 gas. Track potassium and manganese first since each only appears once per side.",
      },
    },
    {
      title: "Balance: Cu + HNO₃ → Cu(NO₃)₂ + NO + H₂O",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_display: "Cu + HNO3 -> Cu(NO3)2 + NO + H2O",
        max_coefficient: 8,
        species: [
          { id: "n1", formula: "Cu", side: "reactant", atoms: { Cu: 1 } },
          { id: "n2", formula: "HNO3", side: "reactant", atoms: { H: 1, N: 1, O: 3 } },
          { id: "n3", formula: "Cu(NO3)2", side: "product", atoms: { Cu: 1, N: 2, O: 6 } },
          { id: "n4", formula: "NO", side: "product", atoms: { N: 1, O: 1 } },
          { id: "n5", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
        hint: "Nitrogen ends up in two different places (the nitrate salt and the NO gas) — count each product's nitrogen separately before adding them.",
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
