require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 11
// Computer Science previously had only one chapter ("Getting Started
// with Python", seedCSGrade11.js — variables, input, sequential
// programs). Adds the natural next NCERT Class 11 CS chapter — "Flow
// of Control" (conditionals and loops) — with three concepts. Reuses
// CS_DEBUGGING_LAB and CS_CODE_ORDER_BUILDER as-is, same mechanics
// and payload shape as the base file, applied to real Python.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Flow of Control" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Flow of Control",
      title: "Flow of Control",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: conditional statements ----
  let condConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Conditional Statements: if / elif / else" });
  if (!condConcept) {
    condConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Conditional Statements: if / elif / else",
      explanation_text:
        "Python's if/elif/else lets a program take different paths depending on a condition. A single = is assignment, not comparison — using it inside a condition is a syntax error in Python, so the comparison operator == must be used. Conditions are checked top to bottom, and only the first branch whose condition is True runs; every later elif and the else are skipped once a match is found.",
    });
    console.log("Created concept:", condConcept._id);
  } else {
    console.log("Using existing concept:", condConcept._id);
  }

  const condChallenges = [
    {
      title: "Bug: Checking If a Number Is Positive",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This program should print 'Positive' when num is greater than 0 — but it throws a syntax error instead.",
        code_lines: [
          { id: "l1", code_text: "num = int(input(\"Enter a number: \"))" },
          { id: "l2", code_text: "if num = 0:" },
          { id: "l3", code_text: "    print(\"Positive\")" },
        ],
        correct_hotspot_id: "l2",
        hint: "A single = is assignment, not comparison. Checking equality (or here, checking a condition at all) needs a proper comparison operator like > or ==.",
      },
    },
    {
      title: "Bug: Grading with elif",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should print 'A' for marks 90 and above, and 'B' for marks from 75 to 89 — but a mark of 95 prints 'B'.",
        code_lines: [
          { id: "m1", code_text: "marks = 95" },
          { id: "m2", code_text: "if marks >= 75:" },
          { id: "m3", code_text: "    print(\"B\")" },
          { id: "m4", code_text: "elif marks >= 90:" },
          { id: "m5", code_text: "    print(\"A\")" },
        ],
        correct_hotspot_id: "m2",
        hint: "Conditions are checked top to bottom, and the first True branch wins. The broader condition (marks >= 75) needs to come AFTER the more specific one (marks >= 90), not before it.",
      },
    },
    {
      title: "Bug: Nested Condition for Eligibility",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program should print 'Eligible' only if age is 18 or above AND has_id is True — but it prints 'Eligible' for a 15-year-old with an ID.",
        code_lines: [
          { id: "n1", code_text: "age = 15" },
          { id: "n2", code_text: "has_id = True" },
          { id: "n3", code_text: "if age >= 18 or has_id:" },
          { id: "n4", code_text: "    print(\"Eligible\")" },
          { id: "n5", code_text: "else:" },
          { id: "n6", code_text: "    print(\"Not Eligible\")" },
        ],
        correct_hotspot_id: "n3",
        hint: "'or' only needs ONE condition to be true; the requirement here is BOTH conditions together, which needs 'and' instead.",
      },
    },
  ];

  for (const challenge of condChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: condConcept._id,
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

  // ---- Concept 2: building programs with loops ----
  let loopConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Building Programs with for and while Loops" });
  if (!loopConcept) {
    loopConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building Programs with for and while Loops",
      explanation_text:
        "A for loop repeats a fixed number of times, usually over a range() or a sequence — good when you know how many repetitions you need. A while loop repeats as long as a condition stays True — good when the number of repetitions depends on something that changes during the loop. Any variable a loop's condition depends on must be initialized before the loop starts, and updated inside it, or the loop either never runs or never ends.",
    });
    console.log("Created concept:", loopConcept._id);
  } else {
    console.log("Using existing concept:", loopConcept._id);
  }

  const loopChallenges = [
    {
      title: "Build: Print Numbers 1 to 5",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines so the program prints the numbers 1 through 5, one per line, using a for loop.",
        scrambled_lines: [
          { id: "o2", label: "    print(i)" },
          { id: "o1", label: "for i in range(1, 6):" },
        ],
        correct_order: ["o1", "o2"],
        hint: "range(1, 6) produces 1 through 5. The loop header has to come before the line it repeats.",
      },
    },
    {
      title: "Build: Sum Numbers Until the User Enters 0",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines so the program keeps adding numbers the user enters until they enter 0, then prints the total.",
        scrambled_lines: [
          { id: "p5", label: "print(total)" },
          { id: "p1", label: "total = 0" },
          { id: "p3", label: "while num != 0:" },
          { id: "p4", label: "    total = total + num" },
          { id: "p2a", label: "num = int(input(\"Enter a number (0 to stop): \"))" },
          { id: "p2b", label: "    num = int(input(\"Enter a number (0 to stop): \"))" },
        ],
        correct_order: ["p1", "p2a", "p3", "p4", "p2b", "p5"],
        hint: "total must start at 0 before anything is added to it, num must be read once before the while condition can even be checked, and num must be read AGAIN inside the loop or it will never change and the loop will run forever.",
      },
    },
    {
      title: "Build: Count Even Numbers in a Range",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines so the program counts how many even numbers are between 1 and 20 (inclusive) and prints that count.",
        scrambled_lines: [
          { id: "q5", label: "print(count)" },
          { id: "q1", label: "count = 0" },
          { id: "q2", label: "for i in range(1, 21):" },
          { id: "q4", label: "        count = count + 1" },
          { id: "q3", label: "    if i % 2 == 0:" },
        ],
        correct_order: ["q1", "q2", "q3", "q4", "q5"],
        hint: "count has to start at 0 before the loop, the loop has to run before any number can be checked, and the check has to happen before count can be increased.",
      },
    },
  ];

  for (const challenge of loopChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_CODE_ORDER_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_CODE_ORDER_BUILDER",
        concept_id: loopConcept._id,
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

  // ---- Concept 3: break, continue, and nested loops ----
  let controlConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Loop Control: break, continue, and Nested Loops" });
  if (!controlConcept) {
    controlConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Loop Control: break, continue, and Nested Loops",
      explanation_text:
        "break exits a loop immediately, skipping any remaining iterations entirely. continue skips only the rest of the CURRENT iteration and moves on to the next one — the loop keeps running. A nested loop (a loop inside another loop) runs its inner loop completely for every single iteration of the outer loop, which is why a break or continue inside the inner loop only affects the inner loop, not the outer one.",
    });
    console.log("Created concept:", controlConcept._id);
  } else {
    console.log("Using existing concept:", controlConcept._id);
  }

  const controlChallenges = [
    {
      title: "Bug: Stop at the First Negative Number",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "This program should stop looping as soon as it finds a negative number in the list — but it keeps printing every number in the list regardless.",
        code_lines: [
          { id: "r1", code_text: "numbers = [4, 7, -2, 9, 3]" },
          { id: "r2", code_text: "for n in numbers:" },
          { id: "r3", code_text: "    if n < 0:" },
          { id: "r4", code_text: "        continue" },
          { id: "r5", code_text: "    print(n)" },
        ],
        correct_hotspot_id: "r4",
        hint: "'continue' only skips the current number and moves to the next one — it doesn't stop the loop. Stopping the loop entirely needs 'break' instead.",
      },
    },
    {
      title: "Bug: Skip Multiples of 3, Keep Looping",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should skip printing multiples of 3 but still print every other number from 1 to 10 — instead it stops entirely after printing 1 and 2.",
        code_lines: [
          { id: "s1", code_text: "for i in range(1, 11):" },
          { id: "s2", code_text: "    if i % 3 == 0:" },
          { id: "s3", code_text: "        break" },
          { id: "s4", code_text: "    print(i)" },
        ],
        correct_hotspot_id: "s3",
        hint: "'break' exits the loop completely the first time it runs. Skipping just one number and continuing the loop needs 'continue' instead.",
      },
    },
    {
      title: "Bug: Nested Loop Multiplication Table",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program should print a multiplication table for numbers 1 to 3, each with its own row of 3 products — but it only ever prints one row before stopping completely.",
        code_lines: [
          { id: "t1", code_text: "for i in range(1, 4):" },
          { id: "t2", code_text: "    for j in range(1, 4):" },
          { id: "t3", code_text: "        print(i * j, end=\" \")" },
          { id: "t4", code_text: "        break" },
          { id: "t5", code_text: "    print()" },
        ],
        correct_hotspot_id: "t4",
        hint: "This 'break' exits the INNER loop after just one product every time, so each row only ever shows one number. Removing it lets the inner loop finish all 3 products before moving to the next row.",
      },
    },
  ];

  for (const challenge of controlChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: controlConcept._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
