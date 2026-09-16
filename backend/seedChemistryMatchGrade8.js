require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the content hole left by the Gap 5 curriculum-citation fix:
// the old seedChemistryEquationBalancerGrade10.js ("Chemical Equations") was regraded
// to Grade 10, since NCERT doesn't introduce balancing equations
// until Class 10. That file's own comment already named Grade 8's
// actual chemistry content: "Materials: Metals and Non-Metals" — a
// real NCERT Class 8 Science chapter (Ch.4) — so this fills that
// exact gap rather than inventing a new topic.
//
// CITATION CORRECTED (Gap 5, new-curriculum pass): the Ch.4 citation
// above is stale — it was against the old, replaced NCERT Class 8
// Science book. Under the current "Curiosity" textbook (NCF-SE 2023,
// 2026-27 session), the closest confirmed chapter is Ch.8, "Nature of
// Matter — Elements, Compounds and Mixtures" (title paraphrased, not
// an exact match to "Metals and Non-Metals," but the same general
// materials-classification territory). The content itself (metal vs.
// non-metal properties: lustrous/malleable/ductile/conductive vs.
// dull/brittle/poor-conductor, plus the graphite/iodine/mercury
// exceptions) is standard, edition-independent chemistry and needed
// no rewrite — only this corrected citation.
//
// Gap 1 fix: Chemistry is not a separate top-level Subject below
// Grade 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Chemistry" for mastery/analytics.
//
// New mechanic CHEMISTRY_MATCH reuses the shared mapping-equality
// scoring group (same backend logic as Fraction Match/Shape Match/
// Ratio Match) — matching a material/property statement to "Metal"
// or "Non-Metal" is the same "assign each slot to its correct
// counterpart" shape, a genuine fit rather than a forced reuse. This
// becomes Chemistry's 4th mechanic alongside Equation Balancer,
// Molecule Builder, and Reaction Lab.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Materials: Metals and Non-Metals" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Chemistry",
      title: "Materials: Metals and Non-Metals",
      order_index: 1,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Properties of Metals and Non-Metals" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Properties of Metals and Non-Metals",
      explanation_text:
        "Metals are generally lustrous, malleable, ductile, and good conductors of heat and electricity — think copper, iron, aluminium. Non-metals lack these properties: they're usually dull, brittle if solid, and poor conductors — think sulphur, carbon, oxygen. A few elements (like carbon in graphite form) don't fit the pattern perfectly, which is exactly why noticing the exceptions matters as much as the rule.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- CHEMISTRY MATCH challenges (GameType: CHEMISTRY_MATCH) ----------
  // payload shape: student matches each property/material card (slot)
  // to Metal or Non-Metal (component) — the tray always has both
  // category labels, with the third round adding two decoy labels to
  // stop simple elimination.
  const chemistryMatchChallenges = [
    {
      title: "Match: Metal or Non-Metal",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each material to whether it's a metal or a non-metal.",
        slots: [
          { id: "s1", label: "Iron" },
          { id: "s2", label: "Sulphur" },
          { id: "s3", label: "Copper" },
        ],
        components: [
          { id: "c1", label: "Metal" },
          { id: "c2", label: "Non-Metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1" },
        hint: "Metals are usually shiny and can be hammered into shape without breaking.",
      },
    },
    {
      title: "Match: Property to Category",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each property to the category it usually describes.",
        slots: [
          { id: "s1", label: "Can be drawn into wires (ductile)" },
          { id: "s2", label: "Brittle — breaks when hammered" },
          { id: "s3", label: "Good conductor of electricity" },
          { id: "s4", label: "Dull, not shiny" },
        ],
        components: [
          { id: "c1", label: "Metal" },
          { id: "c2", label: "Non-Metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Malleable and ductile both describe how metals bend and stretch without snapping.",
      },
    },
    {
      title: "Match: Exceptions to the Rule",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "Most elements follow the metal/non-metal pattern, but a few don't. Match each element to its actual category.",
        slots: [
          { id: "s1", label: "Graphite (carbon) — conducts electricity" },
          { id: "s2", label: "Iodine — has a lustrous, shiny surface" },
          { id: "s3", label: "Mercury — a metal that is liquid at room temperature" },
        ],
        components: [
          { id: "c1", label: "Metal" },
          { id: "c2", label: "Non-Metal" },
          { id: "c3", label: "Unreactive gas" },
          { id: "c4", label: "Synthetic compound" },
        ],
        correct_mapping: { s1: "c2", s2: "c2", s3: "c1" },
        hint: "Graphite and iodine are both non-metals that break the usual visual/conductivity pattern.",
      },
    },
  ];

  for (const challenge of chemistryMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
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
