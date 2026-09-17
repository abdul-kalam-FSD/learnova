require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Translating Word Problems" (Grade 7
// Mathematics, seedMathEquationWordProblemMatch.js) only has 2
// GameContent items. This adds 2 more MATH_EQUATION_WORD_PROBLEM_MATCH
// challenges to the SAME existing concept: combined-operation stories
// ("twice a number, decreased by...") and everyday real-world
// scenarios (a bus, a split bill). Same mapping-equality payload shape
// as the original 2 challenges — no new mechanic. Errors out if the
// subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 7 Mathematics subject not found — run seedMathEquationWordProblemMatch.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Simple Equations" });
  if (!chapter) {
    console.error('Chapter "Simple Equations" not found — run seedMathEquationWordProblemMatch.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Translating Word Problems" });
  if (!concept) {
    console.error('Concept "Translating Word Problems" not found — run seedMathEquationWordProblemMatch.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Match: Story to Equation — Combined Operations",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each story to the equation that represents it.",
        slots: [
          { id: "s1", label: "Twice a number, decreased by 4, gives 10." },
          { id: "s2", label: "A number tripled and increased by 5 gives 26." },
          { id: "s3", label: "Half of a number, increased by 3, gives 9." },
        ],
        components: [
          { id: "c1", label: "2x - 4 = 10" },
          { id: "c2", label: "3x + 5 = 26" },
          { id: "c3", label: "x/2 + 3 = 9" },
          { id: "c4", label: "2x + 4 = 10" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "\"Decreased by\" and \"increased by\" describe the operation on the OUTSIDE of the multiplication or division — write that part first, then apply the outside operation.",
      },
    },
    {
      title: "Match: Story to Equation — Real-World Scenarios",
      difficulty: "hard",
      order_index: 4,
      payload: {
        scenario: "Match each story to the equation that represents it.",
        slots: [
          { id: "s1", label: "A bus had some passengers. At a stop, 12 got off, leaving 18 passengers." },
          { id: "s2", label: "Five friends split a pizza bill (₹x) equally and each paid 8 rupees." },
          { id: "s3", label: "A number increased by 9 gives 15." },
        ],
        components: [
          { id: "c1", label: "x - 12 = 18" },
          { id: "c2", label: "x/5 = 8" },
          { id: "c3", label: "x + 9 = 15" },
          { id: "c4", label: "x - 9 = 15" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Figure out what the unknown x actually represents in each story before choosing the operation.",
      },
    },
  ];

  for (const challenge of newChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
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
