require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 5 second mechanic: reuses the existing "Repeating Steps with
// a Loop" chapter from seedCSGrade5.js, adds a new Concept +
// CS_CODE_ORDER_BUILDER content — building a correct REPEAT loop from
// scrambled lines, instead of spotting a wrong one.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: /computer science/i });
  if (!subject) {
    throw new Error("Grade 5 Computer Science subject not found — run seedCSGrade5.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Repeating Steps with a Loop" });
  if (!chapter) {
    throw new Error("Chapter 'Repeating Steps with a Loop' not found — run seedCSGrade5.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Loop in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Loop in the Right Order",
      explanation_text:
        "A REPEAT loop needs its steps arranged in the right order too — the REPEAT line comes first, and every step meant to happen each time goes inside it, in the order they should happen.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const orderChallenges = [
    {
      title: "Order: Watering Five Plants",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines to correctly water five plants using a loop.",
        scrambled_lines: [
          { id: "a2", label: "  STEP: Walk to the next plant" },
          { id: "a1", label: "REPEAT 5 times:" },
          { id: "a3", label: "  STEP: Pour water into the pot" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "The REPEAT line has to come first, and you have to reach the plant before you can water it.",
      },
    },
    {
      title: "Order: Folding Ten Paper Boats",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines to correctly fold ten paper boats using a loop.",
        scrambled_lines: [
          { id: "b3", label: "  STEP: Fold the paper into a boat shape" },
          { id: "b1", label: "REPEAT 10 times:" },
          { id: "b4", label: "  STEP: Place the finished boat on the table" },
          { id: "b2", label: "  STEP: Take a new sheet of paper" },
        ],
        correct_order: ["b1", "b2", "b3", "b4"],
        hint: "You need a new sheet before you can fold it, and it has to be folded before it's finished.",
      },
    },
    {
      title: "Order: Practising Times Tables",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines to correctly practice the 4 times table ten times using a loop.",
        scrambled_lines: [
          { id: "c3", label: "  STEP: Check your answer against the times table" },
          { id: "c1", label: "REPEAT 10 times:" },
          { id: "c2", label: "  STEP: Say the next multiple of 4 out loud" },
        ],
        correct_order: ["c1", "c2", "c3"],
        hint: "You have to say the multiple out loud before you can check whether it was right.",
      },
    },
  ];

  for (const challenge of orderChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CS_CODE_ORDER_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_CODE_ORDER_BUILDER",
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
