require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 12 Computer Science
// currently has "Functions in Python" (order_index 1) and "File
// Handling in Python" (order_index 2, see seedCSGrade12Batch2.js).
// This adds a genuine third NCERT Class 12 CS chapter, "Exception
// Handling in Python" (try/except basics, else/finally, and raising
// or catching specific and custom exceptions) — never covered at this
// grade before.
//
// Reuses CS_DEBUGGING_LAB and CS_CODE_ORDER_BUILDER exactly as-is,
// same payload shape and scoring (correct_hotspot_id / correct_order)
// already used for Grade 11 "Flow of Control" (seedCSGrade11Batch2.js)
// and "Lists and Strings in Python" (seedCSListsAndStringsGrade11.js).
// No new backend code.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Exception Handling in Python" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Exception Handling",
      title: "Exception Handling in Python",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: try/except Basics and Catching the Right Exception ----
  let tryExceptConcept = await Concept.findOne({ chapter_id: chapter._id, title: "try/except Basics and Catching the Right Exception" });
  if (!tryExceptConcept) {
    tryExceptConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "try/except Basics and Catching the Right Exception",
      explanation_text:
        "Code that might fail goes in a try block; an except block only runs if an exception is raised inside try, and only catches exceptions that MATCH the type it names. Naming the wrong exception type (or forgetting to convert input before using it) means the actual error still crashes the program, since no except clause matches it.",
    });
    console.log("Created concept:", tryExceptConcept._id);
  } else {
    console.log("Using existing concept:", tryExceptConcept._id);
  }

  const tryExceptChallenges = [
    {
      title: "Bug: Catching the Wrong Exception Type",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This program should catch the division-by-zero error and print a friendly message — but the program crashes instead.",
        code_lines: [
          { id: "l1", code_text: "try:" },
          { id: "l2", code_text: "    result = 10 / 0" },
          { id: "l3", code_text: "except ValueError:" },
          { id: "l4", code_text: "    print(\"Cannot divide by zero\")" },
        ],
        correct_hotspot_id: "l3",
        hint: "10 / 0 raises a ZeroDivisionError, not a ValueError — the except clause has to name the exception type that is actually raised.",
      },
    },
    {
      title: "Bug: Forgetting to Convert Input",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should read a number and print its square, catching invalid input — but entering a number still crashes it with a TypeError.",
        code_lines: [
          { id: "m1", code_text: "try:" },
          { id: "m2", code_text: "    num = input(\"Enter a number: \")" },
          { id: "m3", code_text: "    print(num ** 2)" },
          { id: "m4", code_text: "except ValueError:" },
          { id: "m5", code_text: "    print(\"Invalid input\")" },
        ],
        correct_hotspot_id: "m2",
        hint: "input() always returns a string. Without converting it with int() or float(), squaring it raises a TypeError — which this except clause doesn't catch.",
      },
    },
    {
      title: "Bug: List Index vs Dictionary Key Errors",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program should catch the error from accessing an out-of-range list position — but it crashes instead.",
        code_lines: [
          { id: "n1", code_text: "items = [10, 20, 30]" },
          { id: "n2", code_text: "try:" },
          { id: "n3", code_text: "    print(items[5])" },
          { id: "n4", code_text: "except KeyError:" },
          { id: "n5", code_text: "    print(\"Index not found\")" },
        ],
        correct_hotspot_id: "n4",
        hint: "Accessing an out-of-range LIST position raises an IndexError, not a KeyError — KeyError is specifically for missing dictionary keys.",
      },
    },
  ];

  for (const challenge of tryExceptChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: tryExceptConcept._id,
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

  // ---- Concept 2: The else and finally Clauses ----
  let elseFinallyConcept = await Concept.findOne({ chapter_id: chapter._id, title: "The else and finally Clauses" });
  if (!elseFinallyConcept) {
    elseFinallyConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "The else and finally Clauses",
      explanation_text:
        "A full exception-handling block follows a fixed order: try, then one or more except clauses, then an optional else (which runs only if NO exception was raised), then an optional finally (which always runs last, whether or not an exception occurred — useful for cleanup that must happen either way).",
    });
    console.log("Created concept:", elseFinallyConcept._id);
  } else {
    console.log("Using existing concept:", elseFinallyConcept._id);
  }

  const elseFinallyChallenges = [
    {
      title: "Build: try/except/else",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines so the program divides two numbers and prints 'Success' only if no exception occurred, using try/except/else.",
        scrambled_lines: [
          { id: "o6", label: "    print(\"Success\")" },
          { id: "o1", label: "try:" },
          { id: "o2", label: "    result = 10 / 2" },
          { id: "o3", label: "except ZeroDivisionError:" },
          { id: "o5", label: "else:" },
          { id: "o4", label: "    print(\"Cannot divide by zero\")" },
        ],
        correct_order: ["o1", "o2", "o3", "o4", "o5", "o6"],
        hint: "try comes first, its matching except comes right after, and else — which only runs if no exception was raised — always comes after every except.",
      },
    },
    {
      title: "Build: try/except/finally",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines so the program always prints a cleanup message using finally, whether or not an error occurred.",
        scrambled_lines: [
          { id: "p6", label: "    print(\"Cleanup complete\")" },
          { id: "p1", label: "try:" },
          { id: "p2", label: "    result = 100 / 0" },
          { id: "p3", label: "except ZeroDivisionError:" },
          { id: "p5", label: "finally:" },
          { id: "p4", label: "    print(\"Error occurred\")" },
        ],
        correct_order: ["p1", "p2", "p3", "p4", "p5", "p6"],
        hint: "finally always runs last, after the try block and any matching except block, whether or not an exception was raised.",
      },
    },
    {
      title: "Build: The Full try/except/else/finally Block",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines to combine try, except, else and finally into one complete block that converts \"42\" to a number.",
        scrambled_lines: [
          { id: "q8", label: "    print(\"Done processing\")" },
          { id: "q1", label: "try:" },
          { id: "q2", label: "    value = int(\"42\")" },
          { id: "q3", label: "except ValueError:" },
          { id: "q5", label: "else:" },
          { id: "q4", label: "    print(\"Not a valid number\")" },
          { id: "q6", label: "    print(\"Conversion succeeded:\", value)" },
          { id: "q7", label: "finally:" },
        ],
        correct_order: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"],
        hint: "The order is always the same: try, except, else, finally — else only runs if nothing went wrong, and finally always runs last no matter what.",
      },
    },
  ];

  for (const challenge of elseFinallyChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_CODE_ORDER_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_CODE_ORDER_BUILDER",
        concept_id: elseFinallyConcept._id,
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

  // ---- Concept 3: Raising and Catching Specific and Custom Exceptions ----
  let raiseConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Raising and Catching Specific and Custom Exceptions" });
  if (!raiseConcept) {
    raiseConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Raising and Catching Specific and Custom Exceptions",
      explanation_text:
        "raise lets a program trigger an exception deliberately, usually with a message describing what went wrong: raise ValueError(\"message\"). A single except clause can catch more than one exception type at once by listing them as a tuple. A custom exception class (defined with class MyError(Exception): pass) can only be caught by an except clause naming that class or one of its actual parent classes — not by unrelated built-in exception types.",
    });
    console.log("Created concept:", raiseConcept._id);
  } else {
    console.log("Using existing concept:", raiseConcept._id);
  }

  const raiseChallenges = [
    {
      title: "Bug: Raising an Exception with No Message",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This program should raise a ValueError explaining that age cannot be negative — but it raises the error with no message at all.",
        code_lines: [
          { id: "r1", code_text: "age = -5" },
          { id: "r2", code_text: "if age < 0:" },
          { id: "r3", code_text: "    raise ValueError" },
        ],
        correct_hotspot_id: "r3",
        hint: "raise ValueError on its own raises the exception with no message. Pass a string in parentheses to give it a useful one: raise ValueError(\"Age cannot be negative\").",
      },
    },
    {
      title: "Bug: Catching Only One of Two Possible Exceptions",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should catch BOTH a ValueError and a TypeError from the same line — but a TypeError still crashes the program.",
        code_lines: [
          { id: "s1", code_text: "try:" },
          { id: "s2", code_text: "    total = int(\"abc\") + None" },
          { id: "s3", code_text: "except ValueError:" },
          { id: "s4", code_text: "    print(\"Invalid input\")" },
        ],
        correct_hotspot_id: "s3",
        hint: "To catch more than one exception type in a single except clause, list them together as a tuple: except (ValueError, TypeError):.",
      },
    },
    {
      title: "Bug: A Custom Exception Isn't Caught",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This custom InsufficientFundsError should be caught when a withdrawal exceeds the balance — but it isn't caught at all, and the program crashes.",
        code_lines: [
          { id: "t1", code_text: "class InsufficientFundsError(Exception):" },
          { id: "t2", code_text: "    pass" },
          { id: "t3", code_text: "def withdraw(balance, amount):" },
          { id: "t4", code_text: "    if amount > balance:" },
          { id: "t5", code_text: "        raise InsufficientFundsError(\"Not enough funds\")" },
          { id: "t6", code_text: "    return balance - amount" },
          { id: "t7", code_text: "try:" },
          { id: "t8", code_text: "    withdraw(100, 500)" },
          { id: "t9", code_text: "except ValueError:" },
          { id: "t10", code_text: "    print(\"Withdrawal failed\")" },
        ],
        correct_hotspot_id: "t9",
        hint: "A custom exception class needs its own matching except clause (or a class it actually inherits from). InsufficientFundsError doesn't inherit from ValueError, so except ValueError never catches it — it should say except InsufficientFundsError:.",
      },
    },
  ];

  for (const challenge of raiseChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: raiseConcept._id,
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
