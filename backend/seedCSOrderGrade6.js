require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 6 second mechanic: reuses the existing "Making Decisions with
// IF" chapter from seedCSGrade6.js, adds a new Concept +
// CS_CODE_ORDER_BUILDER content — building the correct CHECK/IF
// sequence from scratch instead of spotting a wrong IF action.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 6, name: /computer science/i });
  if (!subject) {
    throw new Error("Grade 6 Computer Science subject not found — run seedCSGrade6.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Making Decisions with IF" });
  if (!chapter) {
    throw new Error("Chapter 'Making Decisions with IF' not found — run seedCSGrade6.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Ordering a CHECK and Its IF Steps" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Ordering a CHECK and Its IF Steps",
      explanation_text:
        "A decision needs something to check before it can decide anything. Building a correct set of instructions means putting the CHECK first, then the IF steps that depend on it — not the other way around.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const orderChallenges = [
    {
      title: "Order: Getting Dressed for the Weather",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines so the program checks the weather before deciding what to wear.",
        scrambled_lines: [
          { id: "a2", label: "IF it is cold, THEN wear a jacket" },
          { id: "a1", label: "CHECK the weather outside" },
          { id: "a3", label: "IF it is sunny, THEN wear a sun hat" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "You can't decide what to wear until you've checked the weather first.",
      },
    },
    {
      title: "Order: Deciding What to Pack",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines so the program checks the trip type before deciding what to pack.",
        scrambled_lines: [
          { id: "b3", label: "IF the trip is to the mountains, THEN pack a warm jacket" },
          { id: "b1", label: "CHECK where the trip is going" },
          { id: "b2", label: "IF the trip is to the beach, THEN pack a swimsuit" },
        ],
        correct_order: ["b1", "b2", "b3"],
        hint: "The destination has to be checked first — both packing decisions depend on knowing it.",
      },
    },
    {
      title: "Order: Choosing a Snack",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines so the program checks how hungry you are before choosing a snack.",
        scrambled_lines: [
          { id: "c2", label: "IF you are very hungry, THEN eat a full meal" },
          { id: "c4", label: "IF you are not hungry at all, THEN eat nothing" },
          { id: "c1", label: "CHECK how hungry you are" },
          { id: "c3", label: "IF you are a little hungry, THEN eat a small snack" },
        ],
        correct_order: ["c1", "c2", "c3", "c4"],
        hint: "Checking hunger level comes first — every IF line after it depends on that result.",
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
