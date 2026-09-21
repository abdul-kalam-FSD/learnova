require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 6 (Grade 4-5 curriculum depth audit). "What Everyday Things
// Are Made Of" (Grade 4 Science, seedChemistryGrade4.js) is scoped
// broadly around everyday matter, but its 3 existing rounds only ever
// build TWO distinct substances: water (rounds 1 and 3) and salt
// (round 2). This adds 1 more CHEMISTRY_MOLECULE_BUILDER round to the
// SAME existing concept, building carbon dioxide — the gas in the
// breath a student breathes out, a genuinely new everyday substance
// rather than repeating water or salt. Same atom-pool payload shape
// as the original 3 rounds — no new mechanic. Errors out if the
// subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: /science/i });
  if (!subject) {
    console.error("Grade 4 Science subject not found — run seedChemistryGrade4.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter =
    (await Chapter.findOne({ subject_id: subject._id, title: "How Things are Made" })) ||
    (await Chapter.findOne({ subject_id: subject._id, title: "Tiny Building Blocks" }));
  if (!chapter) {
    console.error('Chapter "How Things are Made" not found — run seedChemistryGrade4.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "What Everyday Things Are Made Of" });
  if (!concept) {
    console.error('Concept "What Everyday Things Are Made Of" not found — run seedChemistryGrade4.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Build: The Air You Breathe Out",
      difficulty: "hard",
      order_index: 4,
      payload: {
        target_formula: "CO2",
        target_name: "Carbon Dioxide",
        atom_pool: [
          { id: "d1", element: "C", symbol: "C" },
          { id: "d2", element: "O", symbol: "O" },
          { id: "d3", element: "O", symbol: "O" },
          { id: "d4", element: "H", symbol: "H" },
          { id: "d5", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["d1", "d2", "d3"],
        hint: "Carbon dioxide is 1 carbon building block joined to 2 oxygen building blocks — it's a different substance from water, so don't use the hydrogens here.",
      },
    },
  ];

  for (const challenge of newChallenges) {
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
