require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Science Batch 2. Adds the current NCERT Class 7 Science
// ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter 5, "Changes
// Around Us: Physical and Chemical" — verified via multiple
// independent sources: physical vs chemical changes, reversible vs
// irreversible changes, evidence of a chemical change (new substance
// formed, colour change, gas, heat), rusting, curdling.
//
// Reuses CHEMISTRY_MATCH (same mapping-equality shape used for Metals
// & Non-metals) and CHEMISTRY_REACTION_LAB (same shape used for Acids,
// Bases, and Neutral substances) — no new mechanic.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Changes Around Us: Physical and Chemical" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Materials Around Us",
      title: "Changes Around Us: Physical and Chemical",
      order_index: 3,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---------- Concept 1: physical vs chemical ----------
  let conceptType = await Concept.findOne({ chapter_id: chapter._id, title: "Physical Change vs Chemical Change" });
  if (!conceptType) {
    conceptType = await Concept.create({
      chapter_id: chapter._id,
      title: "Physical Change vs Chemical Change",
      explanation_text:
        "A physical change alters a substance's size, shape, or state without creating anything new — melting ice is still water. A chemical change forms a brand-new substance with different properties — rusting iron becomes iron oxide, which isn't iron anymore. Look for the tell: is it still the same stuff, just shaped differently?",
    });
    console.log("Created concept:", conceptType._id);
  } else {
    console.log("Using existing concept:", conceptType._id);
  }

  const chemistryMatchChallenges = [
    {
      title: "Sort the Change: Physical or Chemical",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Sort each change into Physical or Chemical.",
        slots: [
          { id: "s1", label: "Ice melting into water" },
          { id: "s2", label: "An iron nail rusting in the rain" },
          { id: "s3", label: "Folding a sheet of paper" },
          { id: "s4", label: "Burning a candle's wick" },
        ],
        components: [
          { id: "c1", label: "Physical Change" },
          { id: "c2", label: "Chemical Change" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "If it's still the exact same substance, just a different shape or state, it's physical.",
      },
    },
    {
      title: "Sort by Evidence: Physical or Chemical",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Sort each change into Physical or Chemical, based on the evidence described.",
        slots: [
          { id: "s1", label: "A mixture bubbles and the container feels warm" },
          { id: "s2", label: "A solid is cut into smaller pieces, but it's still the same substance" },
          { id: "s3", label: "Milk turns sour and curdles" },
          { id: "s4", label: "Water is boiled into steam" },
        ],
        components: [
          { id: "c1", label: "Physical Change" },
          { id: "c2", label: "Chemical Change" },
        ],
        correct_mapping: { s1: "c2", s2: "c1", s3: "c2", s4: "c1" },
        hint: "Bubbling gas and a new smell or taste are both signs a new substance has formed.",
      },
    },
  ];

  for (const challenge of chemistryMatchChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: conceptType._id,
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

  // ---------- Concept 2: reversible vs irreversible ----------
  let conceptReversible = await Concept.findOne({ chapter_id: chapter._id, title: "Reversible and Irreversible Changes" });
  if (!conceptReversible) {
    conceptReversible = await Concept.create({
      chapter_id: chapter._id,
      title: "Reversible and Irreversible Changes",
      explanation_text:
        "A reversible change can be undone by simple means — melted wax can be cooled back into a solid block. An irreversible change can't be undone — once wood has burned to ash, there's no getting the wood back. Most physical changes are reversible; most chemical changes are irreversible.",
    });
    console.log("Created concept:", conceptReversible._id);
  } else {
    console.log("Using existing concept:", conceptReversible._id);
  }

  const reactionChallenges = [
    {
      title: "Sort the Change: Reversible or Irreversible",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Sort each change into Reversible or Irreversible.",
        slots: [
          { id: "s1", label: "Freezing water into ice" },
          { id: "s2", label: "Baking a cake from batter" },
          { id: "s3", label: "Stretching a rubber band" },
          { id: "s4", label: "Burning a piece of wood into ash" },
        ],
        components: [
          { id: "c1", label: "Reversible" },
          { id: "c2", label: "Irreversible" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Ask yourself: could you get the original substance back with a simple physical step?",
      },
    },
    {
      title: "Sort by Real-World Example: Reversible or Irreversible",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Sort each change into Reversible or Irreversible.",
        slots: [
          { id: "s1", label: "Dissolving salt in water, then evaporating the water to get the salt back" },
          { id: "s2", label: "A green mango slowly ripening and turning yellow" },
          { id: "s3", label: "Melting wax and letting it cool back into a solid block" },
          { id: "s4", label: "Cutting a fruit into pieces" },
        ],
        components: [
          { id: "c1", label: "Reversible" },
          { id: "c2", label: "Irreversible" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Cutting a fruit into pieces is a physical change, but you can't put the pieces back into one whole fruit — think about what \"reversible\" really requires.",
      },
    },
  ];

  for (const challenge of reactionChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_REACTION_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
        concept_id: conceptReversible._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
