require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 6 (Grade 4-5 curriculum depth audit). "Sorting Animals by
// Features" (Grade 4 Science, seedBiologyGrade4.js) offers 4
// classification options every round — Mammal, Bird, Fish, Insect —
// but its 3 existing rounds only ever test Mammal, Fish, and Insect
// as the correct answer. "Bird" is present as a distractor option in
// every round yet is never once the right answer, so a student could
// finish the concept without ever needing to identify one. This adds
// 1 more BIO_SPECIMEN_ANALYSIS round to the SAME existing concept,
// closing that specific coverage gap and including a misconception
// check (a flying, feathered look-alike that is NOT actually a bird).
// Same specimen-analysis payload shape as the original 3 rounds — no
// new mechanic. Errors out if the subject/chapter/concept don't
// already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: /science/i });
  if (!subject) {
    console.error("Grade 4 Science subject not found — run seedBiologyGrade4.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter =
    (await Chapter.findOne({ subject_id: subject._id, title: "Growing up with Nature" })) ||
    (await Chapter.findOne({ subject_id: subject._id, title: "Animal Groups" }));
  if (!chapter) {
    console.error('Chapter "Growing up with Nature" not found — run seedBiologyGrade4.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Sorting Animals by Features" });
  if (!concept) {
    console.error('Concept "Sorting Animals by Features" not found — run seedBiologyGrade4.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newLevels = [
    {
      title: "Specimen: The Garden Songbird",
      difficulty: "hard",
      order_index: 4,
      payload: {
        specimenName: "Specimen: The Garden Songbird",
        context: "A small creature is perched on a branch, singing loudly. A classmate says it must be a bat because it can fly.",
        features: [
          { id: "i1", label: "Covered in feathers", detail: "Its whole body is covered in soft feathers, not fur or skin." },
          { id: "i2", label: "Has a hard beak", detail: "It has a hard, pointed beak instead of teeth." },
          { id: "i3", label: "Lays eggs in a nest", detail: "It built a nest in the tree and lays eggs there." },
          { id: "i4", label: "Can fly", detail: "It was seen flying from branch to branch." },
        ],
        classificationOptions: [
          { id: "mammal", label: "Mammal" },
          { id: "bird", label: "Bird" },
          { id: "fish", label: "Fish" },
          { id: "insect", label: "Insect" },
        ],
        correct_hotspot_id: "bird",
        explanation:
          "Feathers, a beak, and laying eggs in a nest are the defining features of birds. Flying alone doesn't decide the group — bats fly too, but bats have fur and feed their babies milk, which makes them mammals, not birds.",
      },
    },
  ];

  for (const level of newLevels) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: level.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
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
