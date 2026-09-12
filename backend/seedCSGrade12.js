require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 12 Computer Science had no content at all — this fills that
// gap with NCERT Class 12 CS's "Functions in Python" chapter, the
// natural next step after Grade 11's "Getting Started with Python"
// (variables/input/sequential programs). Reuses the same two
// mechanics seedCSGrade11.js introduced (CS_DEBUGGING_LAB,
// CS_CODE_ORDER_BUILDER) rather than inventing a new one, since the
// underlying skill — spot the fault vs. build the correct sequence —
// transfers directly from "sequential program" to "function
// definition and call", it's just a bigger unit of code now.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 12 });
    console.log("Created new Grade 12 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Functions in Python" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Programming",
      title: "Functions in Python",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Defining Functions, Parameters and Return Values",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Defining Functions, Parameters and Return Values",
      explanation_text:
        "A function is defined once with def and can be called many times. Parameters are the placeholders listed in the def line; arguments are the actual values passed in when the function is called. A function that computes a value should use return to send it back to the caller — print() only displays the value inside the function and gives the caller nothing to use afterward, which is one of the most common beginner mix-ups.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Function Returns Nothing",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label:
          "square(5) should let the caller use the result, but result = square(5) always ends up as None.",
        code_lines: [
          { id: "l1", code_text: "def square(n):" },
          { id: "l2", code_text: "    print(n * n)" },
          { id: "l3", code_text: "result = square(5)" },
        ],
        correct_hotspot_id: "l2",
        hint: "print() only displays the value — it doesn't send it back to the caller. The function needs return n * n instead.",
      },
    },
    {
      title: "Bug: Wrong Parameter Used",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label:
          "add(a, b) should return the sum of both arguments, but it always returns double the first one.",
        code_lines: [
          { id: "m1", code_text: "def add(a, b):" },
          { id: "m2", code_text: "    return a + a" },
          { id: "m3", code_text: "print(add(3, 10))" },
        ],
        correct_hotspot_id: "m2",
        hint: "The function has a parameter b, but the return line never uses it — it adds a to itself instead of a to b.",
      },
    },
    {
      title: "Bug: Missing Default Argument Fallback",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label:
          "greet() should print a generic greeting when called with no name, but calling greet() with no arguments crashes the program.",
        code_lines: [
          { id: "n1", code_text: "def greet(name):" },
          { id: "n2", code_text: "    print(\"Hello, \" + name)" },
          { id: "n3", code_text: "greet()" },
        ],
        correct_hotspot_id: "n1",
        hint: "name has no default value, so calling greet() with nothing to fill it crashes. Giving it a default, like def greet(name=\"there\"), would let greet() work with zero arguments.",
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

  const orderChallenges = [
    {
      title: "Build: Function That Returns a Sum",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label:
          "Arrange these lines to define add_numbers(a, b), call it, and print the result.",
        scrambled_lines: [
          { id: "o3", label: "print(add_numbers(4, 9))" },
          { id: "o1", label: "def add_numbers(a, b):" },
          { id: "o2", label: "    return a + b" },
        ],
        correct_order: ["o1", "o2", "o3"],
        hint: "The function must be fully defined (def line, then its return line) before it can be called.",
      },
    },
    {
      title: "Build: Function with a Local Variable",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label:
          "Arrange these lines to define a function that doubles a number using a local variable, then prints the call result.",
        scrambled_lines: [
          { id: "p4", label: "print(double(6))" },
          { id: "p1", label: "def double(n):" },
          { id: "p3", label: "    return result" },
          { id: "p2", label: "    result = n * 2" },
        ],
        correct_order: ["p1", "p2", "p3", "p4"],
        hint: "result must be calculated (n * 2) before it can be returned, and the function must be defined before it's called.",
      },
    },
    {
      title: "Build: Function Calling Another Function",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label:
          "Arrange these lines so is_even(n) is defined first, then used inside describe_number(n), which is called last.",
        scrambled_lines: [
          { id: "q4", label: "print(describe_number(7))" },
          { id: "q1", label: "def is_even(n):" },
          { id: "q3", label: "def describe_number(n):" },
          { id: "q2", label: "    return n % 2 == 0" },
          { id: "q5", label: "    return is_even(n)" },
        ],
        correct_order: ["q1", "q2", "q3", "q5", "q4"],
        hint: "is_even must be fully defined before describe_number can call it, and describe_number must be fully defined before it's called at the bottom.",
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
