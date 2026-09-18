require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 6 (Grade 4-5 curriculum depth audit). "What Air Is Made Of"
// (Grade 5 Science/EVS, seedChemistryGrade5.js) builds oxygen and
// carbon dioxide across its 3 existing rounds, and uses nitrogen ("N")
// only as a distractor atom in rounds 1 and 3 — nitrogen is never the
// target. This leaves a real, common misconception unaddressed: many
// students think air is "mostly oxygen," when air is actually about
// 78% nitrogen and only about 21% oxygen. This adds 1 more
// CHEMISTRY_MOLECULE_BUILDER round to the SAME existing concept,
// building nitrogen gas and explicitly correcting that misconception
// in the hint. Same atom-pool payload shape as the original 3
// rounds — no new mechanic. Errors out if the subject/chapter/concept
// don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: /evs|science/i });
  if (!subject) {
    console.error("Grade 5 EVS/Science subject not found — run seedChemistryGrade5.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Air We Breathe" });
  if (!chapter) {
    console.error('Chapter "The Air We Breathe" not found — run seedChemistryGrade5.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "What Air Is Made Of" });
  if (!concept) {
    console.error('Concept "What Air Is Made Of" not found — run seedChemistryGrade5.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Build: The Gas That Fills Most of the Air",
      difficulty: "hard",
      order_index: 4,
      payload: {
        target_formula: "N2",
        target_name: "Nitrogen",
        atom_pool: [
          { id: "d1", element: "N", symbol: "N" },
          { id: "d2", element: "N", symbol: "N" },
          { id: "d3", element: "O", symbol: "O" },
          { id: "d4", element: "O", symbol: "O" },
          { id: "d5", element: "C", symbol: "C" },
        ],
        correct_piece_ids: ["d1", "d2"],
        hint: "It's easy to think air is mostly oxygen, but air is actually about 78% nitrogen and only about 21% oxygen. Nitrogen is just 2 nitrogen building blocks joined together.",
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
