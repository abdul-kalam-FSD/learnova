require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Chemistry's 3rd gameplay mechanic (Section 30 — Grade 8 already has
// two: Equation Balancer + Molecule Builder; Grade 10 chemistry had
// only Equation Balancer so far). Reaction Lab is a classification
// task: the student picks reactants (already shown per beaker) and
// assigns the correct predicted outcome to each — reuses the exact
// same mapping-equality check as PHYSICS_CIRCUIT_BUILDER (see
// checkAttempt in gameControllers.js), since "every slot must match
// its correct counterpart" is identical logic to circuit wiring.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Chemistry is not a separate top-level Subject below Grade 11 — it
  // lives inside the integrated "Science" subject (reusing the
  // Subject seeded by seedGrade10.js, matched via {grade, name}),
  // with its chapters tagged strand: "Chemistry" for mastery/analytics.
  // See migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Chemistry content into this shape (matches the pattern in
  // seedChemistryGrade10.js — this file previously targeted a
  // standalone "Chemistry" subject, which would have created an
  // orphaned duplicate of that already-fixed structure).
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 10 });
    console.log("Created new Grade 10 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Types of Chemical Reactions" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Chemical Reactions",
      title: "Types of Chemical Reactions",
      order_index: 2,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Classifying Reactions" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Classifying Reactions",
      explanation_text:
        "Chemical reactions can be classified by what happens to the reactants: combination (two substances join into one), decomposition (one substance breaks into several), displacement (one element replaces another in a compound), and combustion (a substance reacts with oxygen, releasing energy).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `slots` are beakers holding a stated reactant mix;
  // `components` are predicted-outcome cards (more than slots,
  // including plausible-but-wrong decoys). `correct_mapping` names
  // the right outcome card id for each beaker slot id — see
  // checkAttempt's shared PHYSICS_CIRCUIT_BUILDER /
  // CHEMISTRY_REACTION_LAB branch.
  const reactionChallenges = [
    {
      title: "Predict the Reaction Type",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Three beakers are set up. Assign the correct outcome to each.",
        slots: [
          { id: "s1", label: "Zn + dilute HCl" },
          { id: "s2", label: "CaCO₃, heated strongly" },
          { id: "s3", label: "Mg ribbon, burned in air" },
        ],
        components: [
          { id: "c1", label: "Displacement — ZnCl₂ + H₂ gas released" },
          { id: "c2", label: "Decomposition — CaO + CO₂ released" },
          { id: "c3", label: "Combustion — MgO forms, bright white light" },
          { id: "c4", label: "Combination — two elements simply join, no gas released" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Look for what's being released or replaced — a gas, or an element swapping places.",
      },
    },
    {
      title: "Acid-Base and Precipitation",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scenario: "Match each mixture in the lab to what actually happens.",
        slots: [
          { id: "s1", label: "NaOH + HCl" },
          { id: "s2", label: "AgNO₃ + NaCl" },
          { id: "s3", label: "Fe + CuSO₄ solution" },
        ],
        components: [
          { id: "c1", label: "Neutralization — NaCl + H₂O forms" },
          { id: "c2", label: "Precipitation — solid AgCl forms" },
          { id: "c3", label: "Displacement — Fe replaces Cu, FeSO₄ forms" },
          { id: "c4", label: "No reaction occurs" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "One is an acid meeting a base, one forms an insoluble solid, one is a metal replacing a less reactive metal.",
      },
    },
  ];

  for (const challenge of reactionChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_REACTION_LAB",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
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
