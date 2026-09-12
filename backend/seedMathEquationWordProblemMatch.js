require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fourth mechanic for the "Simple Equations" topic. The first three
// (Equation Builder, Number Machine, Equation Speed Calculation) are
// all about handling an equation once it's already written down — this
// one is the step before that: turning a real-world sentence into an
// equation in the first place. Reuses the mapping-equality check
// (same family as Fraction Match/Circuit Builder/etc — see
// checkAttempt in gameControllers.js) rather than a new check type,
// since the objective ("assign each story to its equation") is the
// same shape as those, just a different fantasy.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 7 });
    console.log("Created new Grade 6 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Simple Equations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Simple Equations",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Translating Word Problems" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Translating Word Problems",
      explanation_text:
        "Before you can solve an equation, you have to write it. Look for the unknown quantity, and turn the sentence's action into an operation.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: Story to Equation",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each story to the equation that represents it.",
        slots: [
          { id: "s1", label: "Meena had some marbles. After getting 5 more, she had 12." },
          { id: "s2", label: "A rope was cut into 4 equal pieces, each 3 meters long." },
          { id: "s3", label: "Raj spent 6 rupees and had 9 left from his savings." },
        ],
        components: [
          { id: "c1", label: "x + 5 = 12" },
          { id: "c2", label: "4x = 3" },
          { id: "c3", label: "x - 6 = 9" },
          { id: "c4", label: "x + 6 = 9" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Find the unknown quantity first, then match the sentence's action to + / − / ×.",
      },
    },
    {
      title: "Match: Story to Equation — Two Steps",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each story to the equation that represents it.",
        slots: [
          { id: "s1", label: "Kavya bought 3 notebooks at the same price and paid 15 rupees total." },
          { id: "s2", label: "A tank had some water. After 8 liters were added, it held 20 liters." },
          { id: "s3", label: "A number, when reduced by 7, gives 11." },
        ],
        components: [
          { id: "c1", label: "3x = 15" },
          { id: "c2", label: "x + 8 = 20" },
          { id: "c3", label: "x - 7 = 11" },
          { id: "c4", label: "x + 7 = 11" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "\"Reduced by\" means subtraction — the unknown comes first.",
      },
    },
  ];

  for (const challenge of matchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
      title: challenge.title,
    });
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
