require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 9 previously had Biology, Math,
// Physics, Social Science — no Chemistry (Chemistry otherwise exists
// at Grades 4, 8, 10, 11, 12). Reuses CHEMISTRY_REACTION_LAB's
// mapping mechanic with the Grade 9 "Atoms and Molecules" topic:
// matching element/ion pairs to the correct chemical formula once
// valency is taken into account — a natural fit for the existing
// slot/component mapping shape, distinct from the Equation Balancer
// content Grade 8 already covers.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Chemistry is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject
  // (reusing the Subject seeded by seedGrade9.js, matched via
  // {grade, name} — biology|science regex there means "Science" was
  // already created before this file runs), with its chapters tagged
  // strand: "Chemistry" for mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Chemistry content into this shape.
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
      order_index: 1,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Writing Chemical Formulas Using Valency" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Writing Chemical Formulas Using Valency",
      explanation_text:
        "Valency is the combining power of an element or ion — the number of bonds it can form. To write a correct chemical formula, the total positive valency must balance the total negative valency, which usually means criss-crossing the valency numbers as subscripts. For example, calcium (valency 2) with chloride (valency 1) gives CaCl2, not CaCl.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const formulaChallenges = [
    {
      title: "Match the Ion Pair to Its Formula",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Three ion pairs need their valencies balanced. Match each pair to the correct formula.",
        slots: [
          { id: "s1", label: "Calcium (valency 2) + Chloride (valency 1)" },
          { id: "s2", label: "Sodium (valency 1) + Oxide (valency 2)" },
          { id: "s3", label: "Aluminium (valency 3) + Oxide (valency 2)" },
        ],
        components: [
          { id: "c1", label: "CaCl2" },
          { id: "c2", label: "Na2O" },
          { id: "c3", label: "Al2O3" },
          { id: "c4", label: "CaCl" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Criss-cross the valency numbers: each ion's valency becomes the other ion's subscript, then simplify if possible.",
      },
    },
    {
      title: "Formulas with Polyatomic Ions",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Polyatomic ions (groups of atoms with one overall valency) follow the same criss-cross rule. Match each pair to its formula.",
        slots: [
          { id: "s1", label: "Calcium (valency 2) + Hydroxide, OH⁻ (valency 1)" },
          { id: "s2", label: "Ammonium, NH4⁺ (valency 1) + Sulphate, SO4²⁻ (valency 2)" },
          { id: "s3", label: "Sodium (valency 1) + Carbonate, CO3²⁻ (valency 2)" },
        ],
        components: [
          { id: "c1", label: "Ca(OH)2" },
          { id: "c2", label: "(NH4)2SO4" },
          { id: "c3", label: "Na2CO3" },
          { id: "c4", label: "CaOH2" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "When a polyatomic ion needs more than one unit, wrap it in brackets before adding the subscript — 'OH2' isn't the same as '(OH)2'.",
      },
    },
    {
      title: "Same Valency, Different Simplification",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "When both valencies are equal, the criss-crossed subscripts simplify away. Match each pair to its correctly simplified formula.",
        slots: [
          { id: "s1", label: "Magnesium (valency 2) + Oxide (valency 2)" },
          { id: "s2", label: "Iron(III) (valency 3) + Nitrate, NO3⁻ (valency 1)" },
          { id: "s3", label: "Carbon (valency 4) + Oxide (valency 2)" },
        ],
        components: [
          { id: "c1", label: "MgO — the 2s cancel out completely" },
          { id: "c2", label: "Fe(NO3)3 — no simplification possible, valencies differ" },
          { id: "c3", label: "CO2 — the 4 and 2 simplify to 1 and 2" },
          { id: "c4", label: "Mg2O2 — left unsimplified" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Always check whether the criss-crossed subscripts share a common factor before writing the final formula.",
      },
    },
  ];

  for (const challenge of formulaChallenges) {
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
