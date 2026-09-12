require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 second mechanic: reuses the existing "Following Steps in
// Order" chapter from seedCSGrade4.js (does not recreate it), adds a
// new Concept + CS_CODE_ORDER_BUILDER content. Debugging Lab is
// fault-finding in a given list; this is building a correct list from
// scratch by ordering scrambled everyday steps.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: /computer science/i });
  if (!subject) {
    throw new Error("Grade 4 Computer Science subject not found — run seedCSGrade4.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Following Steps in Order" });
  if (!chapter) {
    throw new Error("Chapter 'Following Steps in Order' not found — run seedCSGrade4.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Putting Steps in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Putting Steps in the Right Order",
      explanation_text:
        "Instructions only work if every step happens in the right order. Before you can spot a step that's wrong, it helps to practice building a correct list of steps yourself — deciding what has to happen first, second, and last.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const orderChallenges = [
    {
      title: "Order: Brushing Your Teeth",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order you would actually brush your teeth.",
        scrambled_lines: [
          { id: "a3", label: "Rinse your mouth with water" },
          { id: "a1", label: "Put toothpaste on the toothbrush" },
          { id: "a2", label: "Brush your teeth for two minutes" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "You need toothpaste on the brush before you can start brushing.",
      },
    },
    {
      title: "Order: Planting a Seed",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order you would plant a seed in a pot.",
        scrambled_lines: [
          { id: "b2", label: "Place the seed in the soil" },
          { id: "b4", label: "Water the soil gently" },
          { id: "b1", label: "Fill the pot with soil" },
          { id: "b3", label: "Cover the seed with a little more soil" },
        ],
        correct_order: ["b1", "b2", "b3", "b4"],
        hint: "The pot needs soil in it before a seed can go in, and the seed needs to be covered before you water it.",
      },
    },
    {
      title: "Order: Making a Paper Airplane",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order you would fold a simple paper airplane.",
        scrambled_lines: [
          { id: "c3", label: "Fold the paper in half again to make the wings" },
          { id: "c1", label: "Fold the paper in half lengthwise, then unfold it" },
          { id: "c4", label: "Throw the finished airplane" },
          { id: "c2", label: "Fold the top corners down to the center crease" },
        ],
        correct_order: ["c1", "c2", "c3", "c4"],
        hint: "The center crease has to exist before you can fold the corners to it, and the plane has to be fully folded before you can throw it.",
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
