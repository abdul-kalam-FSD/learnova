require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Batch 1 (Part B, Science expansion). Adds the current NCERT
// Class 7 Science ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter
// 4, "The World of Metals and Non-metals" — verified via multiple
// independent chapter-list sources during the Grade 7 audit, alongside
// "The Ever-Evolving World of Science" (Ch.1), "Exploring Substances:
// Acidic, Basic and Neutral" (Ch.2, see seedScienceGrade7.js), and
// "Electricity: Circuits and their Components" (Ch.3, see
// seedPhysicsCircuitBasicsGrade7.js).
//
// NOTE for the team: Learnova already has a "Materials: Metals and
// Non-Metals" chapter filed under GRADE 8 (seedChemistryMatchGrade8.js),
// citing a looser, non-exact match to Grade 8's own current curriculum.
// The current Grade 7 "Curiosity" textbook has an exact-title chapter
// on this same topic. This may be the same kind of grade-placement
// drift already found and fixed for Physics (Circuits, Grade 6 -> 7)
// and History (Mughal Empire, Grade 7 -> 8) in earlier audit passes.
// This file does NOT touch, move, or duplicate the Grade 8 content —
// that is out of scope for this batch — it only adds new, distinctly
// titled Grade 7 content. Recommend the team review whether the Grade
// 8 chapter should eventually be re-examined against Grade 8's current
// curriculum, separately from this batch.
//
// Reuses CHEMISTRY_MATCH's mapping-equality check (already registered;
// same "assign each material/property card to Metal or Non-Metal"
// shape used by the Grade 8 version above) — no new mechanic.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The World of Metals and Non-metals" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Materials Around Us",
      title: "The World of Metals and Non-metals",
      order_index: 2,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Identifying Metals and Non-metals" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Identifying Metals and Non-metals",
      explanation_text:
        "Metals are usually lustrous (shiny), malleable (can be hammered into sheets), ductile (can be drawn into wires), and good conductors of heat and electricity — like iron, copper, and aluminium. Non-metals usually lack these properties: they're often dull, brittle if solid, and poor conductors — like sulphur and carbon. Look at what a material actually does, not just what it's called.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- CHEMISTRY MATCH challenges (GameType: CHEMISTRY_MATCH) ----------
  // Distinct titles from the existing Grade 8 CHEMISTRY_MATCH content
  // (seedChemistryMatchGrade8.js) to avoid any (game_type, title)
  // collision.
  const chemistryMatchChallenges = [
    {
      title: "Sort the Materials: Metal or Non-metal",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Sort each everyday material into Metal or Non-metal.",
        slots: [
          { id: "s1", label: "Iron nail" },
          { id: "s2", label: "Sulphur powder" },
          { id: "s3", label: "Aluminium foil" },
          { id: "s4", label: "Charcoal (carbon)" },
        ],
        components: [
          { id: "c1", label: "Metal" },
          { id: "c2", label: "Non-metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Metals are usually shiny and can be bent or hammered into shape without crumbling.",
      },
    },
    {
      title: "Sort by Property: Metal or Non-metal",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Sort each described property into the category it usually belongs to.",
        slots: [
          { id: "s1", label: "Can be drawn into a thin wire" },
          { id: "s2", label: "Snaps or crumbles when hammered" },
          { id: "s3", label: "Conducts electricity well" },
          { id: "s4", label: "Looks dull, not shiny" },
        ],
        components: [
          { id: "c1", label: "Metal" },
          { id: "c2", label: "Non-metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "\"Ductile\" (drawn into wire) and \"malleable\" (hammered into sheets) both describe metals.",
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
