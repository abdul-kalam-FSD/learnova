require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 10 currently has no Computer Science content.
// Steps beyond Grade 8's real-pseudocode version (seedCSGrade8.js,
// which covers IF/loops/variables): introduces functions with
// parameters and return values — the natural next pseudocode
// construct once variables and control flow are established.
//
// Reuses CS_DEBUGGING_LAB (same single-choice "find the one wrong
// line" check as every earlier grade's version).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 10, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 10 });
    console.log("Created new Grade 10 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Functions and Parameters" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algorithms",
      title: "Functions and Parameters",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Debugging Functions with Parameters" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Debugging Functions with Parameters",
      explanation_text:
        "A function takes in parameters, uses them to compute something, and RETURNs a result to whoever called it. A common bug is using the wrong parameter inside the function's body, or RETURNing a value before the computation that produces the correct answer has actually happened.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Function to Calculate Area",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This function should return the area of a rectangle given its length and width — but it doesn't always.",
        code_lines: [
          { id: "l1", code_text: "FUNCTION calculateArea(length, width):" },
          { id: "l2", code_text: "  SET area = length + width" },
          { id: "l3", code_text: "  RETURN area" },
        ],
        correct_hotspot_id: "l2",
        hint: "Area of a rectangle is a multiplication of two sides, not a sum of them.",
      },
    },
    {
      title: "Bug: Function to Find the Average",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This function should return the average of two numbers, a and b — but it doesn't always.",
        code_lines: [
          { id: "m1", code_text: "FUNCTION calculateAverage(a, b):" },
          { id: "m2", code_text: "  SET total = a + b" },
          { id: "m3", code_text: "  RETURN total" },
        ],
        correct_hotspot_id: "m3",
        hint: "An average divides the total by how many numbers were added — this returns just the total.",
      },
    },
    {
      title: "Bug: Function to Check if a Number is Even",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This function should return TRUE if a number is even, and FALSE otherwise — but it doesn't always give the right answer.",
        code_lines: [
          { id: "n1", code_text: "FUNCTION isEven(number):" },
          { id: "n2", code_text: "  SET remainder = number MOD 2" },
          { id: "n3", code_text: "  RETURN TRUE" },
          { id: "n4", code_text: "  IF remainder is not 0, THEN RETURN FALSE" },
        ],
        correct_hotspot_id: "n3",
        hint: "This RETURNs TRUE before the IF check even runs — can any code after a RETURN still change the answer?",
      },
    },
  ];

  for (const challenge of debugChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CS_DEBUGGING_LAB",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
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
