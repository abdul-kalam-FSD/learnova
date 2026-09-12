require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 11-12 gap fill: Computer Science previously had no content
// above Grade 10 (seedCSGrade10.js, pseudocode functions). CBSE
// Class 11 Computer Science switches to real Python, so this isn't
// just "the next pseudocode chapter" — it's a language jump, covered
// here as NCERT Class 11 CS "Getting Started with Python" (variables,
// input/type-casting, sequential program structure).
//
// Seeds both game_types under this concept:
//  - CS_DEBUGGING_LAB (existing mechanic, same single-choice
//    "find the one wrong line" check as Grades 6/8/10's versions,
//    now applied to real Python instead of pseudocode).
//  - CS_CODE_ORDER_BUILDER (new mechanic, registered this pass —
//    reuses the existing ordered-sequence check, same family as
//    MATH_EQUATION_BUILDER/GEOGRAPHY_ROUTE_BUILDER/HISTORY_TIMELINE_
//    BUILDER). Pairs naturally with Debugging Lab: that mechanic is
//    fault-finding in a given snippet, this one is building correct
//    sequential logic from scratch by ordering statements.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 11 });
    console.log("Created new Grade 11 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Getting Started with Python" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Programming Basics",
      title: "Getting Started with Python",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Variables, Input and Sequential Programs" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Variables, Input and Sequential Programs",
      explanation_text:
        "A Python program runs top to bottom, one line at a time. input() always returns a string, so numeric input needs int() or float() around it before it can be used in arithmetic — skipping that cast is one of the most common beginner bugs. Building a working program means putting each step (read input, cast it, compute, print the result) in the order the computer actually needs them.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Adding Two Numbers",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This program should add two numbers the user types in — but for inputs like 2 and 3 it prints 23, not 5.",
        code_lines: [
          { id: "l1", code_text: "a = input(\"Enter first number: \")" },
          { id: "l2", code_text: "b = input(\"Enter second number: \")" },
          { id: "l3", code_text: "print(a + b)" },
        ],
        correct_hotspot_id: "l1",
        hint: "input() always returns text, not a number. Without int() around it, + joins the two strings together instead of adding values.",
      },
    },
    {
      title: "Bug: Average of Three Numbers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should print the average of three numbers — but it prints the total instead.",
        code_lines: [
          { id: "m1", code_text: "x = int(input(\"Number 1: \"))" },
          { id: "m2", code_text: "y = int(input(\"Number 2: \"))" },
          { id: "m3", code_text: "z = int(input(\"Number 3: \"))" },
          { id: "m4", code_text: "average = x + y + z" },
          { id: "m5", code_text: "print(average)" },
        ],
        correct_hotspot_id: "m4",
        hint: "An average divides the total by how many numbers there are — this line only adds them up.",
      },
    },
    {
      title: "Bug: Swapping Two Values",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program should swap the values in a and b — but after it runs, both variables end up holding the same value.",
        code_lines: [
          { id: "n1", code_text: "a = 5" },
          { id: "n2", code_text: "b = 8" },
          { id: "n3", code_text: "a = b" },
          { id: "n4", code_text: "b = a" },
          { id: "n5", code_text: "print(a, b)" },
        ],
        correct_hotspot_id: "n3",
        hint: "Once a is overwritten with b's value, a's original value is gone — there's nothing left to give b. A swap needs a third, temporary variable to hold one value while the other is overwritten.",
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

  // payload shape matches Code Order Builder: `scrambled_lines` are
  // the tappable line cards, `correct_order` is the sequence of ids
  // they need to be placed in, stripped before the client sees it.
  const orderChallenges = [
    {
      title: "Build: Add Two Numbers",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines so the program correctly reads two numbers and prints their sum.",
        scrambled_lines: [
          { id: "o3", label: "print(a + b)" },
          { id: "o1", label: "a = int(input(\"Enter first number: \"))" },
          { id: "o2", label: "b = int(input(\"Enter second number: \"))" },
        ],
        correct_order: ["o1", "o2", "o3"],
        hint: "Both values need to be read and cast to int before they can be added and printed.",
      },
    },
    {
      title: "Build: Average of Three Numbers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines so the program reads three numbers and prints their average.",
        scrambled_lines: [
          { id: "p4", label: "average = (x + y + z) / 3" },
          { id: "p1", label: "x = int(input(\"Number 1: \"))" },
          { id: "p5", label: "print(average)" },
          { id: "p2", label: "y = int(input(\"Number 2: \"))" },
          { id: "p3", label: "z = int(input(\"Number 3: \"))" },
        ],
        correct_order: ["p1", "p2", "p3", "p4", "p5"],
        hint: "All three numbers must be read in before average can be calculated, and average must exist before it can be printed.",
      },
    },
    {
      title: "Build: Swap Two Values Safely",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines so the program correctly swaps the values of a and b using a temporary variable.",
        scrambled_lines: [
          { id: "q3", label: "a = b" },
          { id: "q1", label: "temp = a" },
          { id: "q4", label: "b = temp" },
          { id: "q2", label: "print(a, b)" },
        ],
        correct_order: ["q1", "q3", "q4", "q2"],
        hint: "Save a's original value in temp first — once a is overwritten you'd have no other way to recover it for b.",
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
