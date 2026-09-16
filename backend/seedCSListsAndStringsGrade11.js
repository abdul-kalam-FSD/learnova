require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 11 Computer Science
// currently has "Getting Started with Python" (order_index 1) and
// "Flow of Control" (order_index 2, see seedCSGrade11Batch2.js). This
// adds a genuine third NCERT Class 11 CS chapter, "Lists and Strings
// in Python" (indexing/slicing, common list operations, and
// mutability) — never covered at this grade before.
//
// Reuses CS_DEBUGGING_LAB and CS_CODE_ORDER_BUILDER exactly as-is,
// same payload shape and scoring (correct_hotspot_id / correct_order)
// as seedCSGrade11Batch2.js. No new backend code.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Lists and Strings in Python" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Lists and Strings",
      title: "Lists and Strings in Python",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Indexing and Slicing Lists and Strings ----
  let indexConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Indexing and Slicing Lists and Strings" });
  if (!indexConcept) {
    indexConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Indexing and Slicing Lists and Strings",
      explanation_text:
        "Both lists and strings are sequences, so they support the same indexing and slicing rules: indices start at 0, negative indices count from the end, and a slice like seq[start:stop] includes start but stops before stop. Adding a step, seq[start:stop:step], controls the direction and spacing — a step of -1 walks backwards through the whole sequence.",
    });
    console.log("Created concept:", indexConcept._id);
  } else {
    console.log("Using existing concept:", indexConcept._id);
  }

  const indexChallenges = [
    {
      title: "Bug: First Character of a String",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This program should print the LAST character of the string 'Python' (a 6-letter word) — but it throws an IndexError instead.",
        code_lines: [
          { id: "l1", code_text: "s = \"Python\"" },
          { id: "l2", code_text: "print(s[6])" },
        ],
        correct_hotspot_id: "l2",
        hint: "String indices start at 0, so the last valid index for a 6-character string is 5, not 6.",
      },
    },
    {
      title: "Bug: Slicing the End of a List",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should print the last three items of the list [10, 20, 30, 40, 50] using slicing — but it prints an empty list.",
        code_lines: [
          { id: "m1", code_text: "nums = [10, 20, 30, 40, 50]" },
          { id: "m2", code_text: "last_three = nums[5:8]" },
          { id: "m3", code_text: "print(last_three)" },
        ],
        correct_hotspot_id: "m2",
        hint: "The list only has valid indices 0 to 4 — this slice starts at index 5, which is already past the end of the list. Try nums[-3:] or nums[2:5] instead.",
      },
    },
    {
      title: "Bug: Reversing a String with Slicing",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program should reverse the string 'hello' using slicing — but it prints the string completely unchanged.",
        code_lines: [
          { id: "n1", code_text: "word = \"hello\"" },
          { id: "n2", code_text: "reversed_word = word[::1]" },
          { id: "n3", code_text: "print(reversed_word)" },
        ],
        correct_hotspot_id: "n2",
        hint: "A step of 1 just walks forward through the string normally, one character at a time. Reversing the string needs a step of -1.",
      },
    },
  ];

  for (const challenge of indexChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: indexConcept._id,
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

  // ---- Concept 2: Building Programs with List and String Operations ----
  let buildConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Building Programs with List and String Operations" });
  if (!buildConcept) {
    buildConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building Programs with List and String Operations",
      explanation_text:
        "Common list operations like append(), and common string checks like 'x in s', usually appear inside a loop that processes a sequence one element at a time. A collector variable (an empty list, or a counter starting at 0) has to be created BEFORE the loop begins, since the loop only ever updates it, never creates it.",
    });
    console.log("Created concept:", buildConcept._id);
  } else {
    console.log("Using existing concept:", buildConcept._id);
  }

  const buildChallenges = [
    {
      title: "Build: List of Squares",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines to build a list containing the squares of the numbers 1 through 5, using a loop and append().",
        scrambled_lines: [
          { id: "o4", label: "print(squares)" },
          { id: "o1", label: "squares = []" },
          { id: "o3", label: "    squares.append(i * i)" },
          { id: "o2", label: "for i in range(1, 6):" },
        ],
        correct_order: ["o1", "o2", "o3", "o4"],
        hint: "The list must be created empty before anything can be appended to it, and the loop header always comes before the line it repeats.",
      },
    },
    {
      title: "Build: Count the Vowels in a String",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines to count how many vowels appear in the string 'hello world' and print the count.",
        scrambled_lines: [
          { id: "p7", label: "print(count)" },
          { id: "p1", label: "text = \"hello world\"" },
          { id: "p2", label: "vowels = \"aeiou\"" },
          { id: "p3", label: "count = 0" },
          { id: "p5", label: "    if ch in vowels:" },
          { id: "p4", label: "for ch in text:" },
          { id: "p6", label: "        count = count + 1" },
        ],
        correct_order: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
        hint: "count must start at 0 before any counting happens, and the loop must run before each character can be checked against vowels.",
      },
    },
    {
      title: "Build: Filter Even Numbers into a New List",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines to build a new list containing only the even numbers from [3, 8, 5, 12, 7, 10], then print it.",
        scrambled_lines: [
          { id: "q6", label: "print(evens)" },
          { id: "q1", label: "numbers = [3, 8, 5, 12, 7, 10]" },
          { id: "q2", label: "evens = []" },
          { id: "q4", label: "    if n % 2 == 0:" },
          { id: "q3", label: "for n in numbers:" },
          { id: "q5", label: "        evens.append(n)" },
        ],
        correct_order: ["q1", "q2", "q3", "q4", "q5", "q6"],
        hint: "evens has to exist (empty) before anything can be appended to it, the loop has to run before any number can be checked, and the check has to pass before that number is appended.",
      },
    },
  ];

  for (const challenge of buildChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_CODE_ORDER_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_CODE_ORDER_BUILDER",
        concept_id: buildConcept._id,
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

  // ---- Concept 3: Mutability: Lists vs Strings ----
  let mutabilityConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Mutability: Lists vs Strings" });
  if (!mutabilityConcept) {
    mutabilityConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Mutability: Lists vs Strings",
      explanation_text:
        "Lists are mutable — their elements can be changed in place with methods like append() or an index assignment. Strings are immutable — none of their methods (like .upper()) change the original string; each one returns a brand-new string that must be captured, usually by reassigning it back to the variable. Assigning one list variable to another (list_b = list_a) doesn't copy it either — both names point to the exact same list in memory.",
    });
    console.log("Created concept:", mutabilityConcept._id);
  } else {
    console.log("Using existing concept:", mutabilityConcept._id);
  }

  const mutabilityChallenges = [
    {
      title: "Bug: Trying to Change a Character in a String",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This program should change the first letter of 'cat' to 'b' to make 'bat' — but it throws a TypeError instead.",
        code_lines: [
          { id: "r1", code_text: "word = \"cat\"" },
          { id: "r2", code_text: "word[0] = \"b\"" },
          { id: "r3", code_text: "print(word)" },
        ],
        correct_hotspot_id: "r2",
        hint: "Strings are immutable in Python — you can't assign to a string index directly. Build and assign a new string instead, e.g. word = \"b\" + word[1:].",
      },
    },
    {
      title: "Bug: Copying a List",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should let list_b start as an INDEPENDENT copy of list_a, so appending to list_b shouldn't change list_a — but printing list_a afterward shows the extra element too.",
        code_lines: [
          { id: "s1", code_text: "list_a = [1, 2, 3]" },
          { id: "s2", code_text: "list_b = list_a" },
          { id: "s3", code_text: "list_b.append(4)" },
          { id: "s4", code_text: "print(list_a)" },
        ],
        correct_hotspot_id: "s2",
        hint: "list_b = list_a doesn't make a copy — both names point to the same list in memory. Use list_a.copy() or list_a[:] to make an independent copy.",
      },
    },
    {
      title: "Bug: Uppercasing a String In Place",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program should print 'PYTHON', the uppercase version of 'python' — but it prints 'python' unchanged.",
        code_lines: [
          { id: "t1", code_text: "text = \"python\"" },
          { id: "t2", code_text: "text.upper()" },
          { id: "t3", code_text: "print(text)" },
        ],
        correct_hotspot_id: "t2",
        hint: "Strings are immutable — .upper() returns a brand-new string, it doesn't change text in place. You need to capture the result: text = text.upper().",
      },
    },
  ];

  for (const challenge of mutabilityChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: mutabilityConcept._id,
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
