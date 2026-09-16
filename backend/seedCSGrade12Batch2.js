require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 12
// Computer Science previously had only one chapter ("Functions in
// Python", seedCSGrade12.js). Adds a second, genuinely distinct
// NCERT Class 12 chapter — "File Handling in Python" — with three
// concepts. Reuses CS_DEBUGGING_LAB and CS_CODE_ORDER_BUILDER as-is,
// same mechanics and payload shape as the base file.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "File Handling in Python" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "File Handling",
      title: "File Handling in Python",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: opening, reading and closing files ----
  let openConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Opening, Reading and Closing Text Files" });
  if (!openConcept) {
    openConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Opening, Reading and Closing Text Files",
      explanation_text:
        "open() needs a filename and a mode — \"r\" for reading, \"w\" for writing (which erases existing content), and \"a\" for appending (which adds on without erasing). read() returns the entire file as one string, while readline() returns just one line at a time. Every file opened with open() should be closed with close() when done, or accessed with a `with` block, which closes it automatically.",
    });
    console.log("Created concept:", openConcept._id);
  } else {
    console.log("Using existing concept:", openConcept._id);
  }

  const openChallenges = [
    {
      title: "Bug: Reading a File's Contents",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This program should print the full contents of notes.txt — but it crashes with a FileNotFoundError-style mode issue instead.",
        code_lines: [
          { id: "l1", code_text: "f = open(\"notes.txt\", \"w\")" },
          { id: "l2", code_text: "content = f.read()" },
          { id: "l3", code_text: "print(content)" },
          { id: "l4", code_text: "f.close()" },
        ],
        correct_hotspot_id: "l1",
        hint: "\"w\" mode opens a file for WRITING (and erases its contents if it already exists) — reading from a file needs \"r\" mode instead.",
      },
    },
    {
      title: "Bug: Accidentally Erasing a File",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should add a new line to the END of log.txt without losing what was already there — but running it wipes out everything that was in the file before.",
        code_lines: [
          { id: "m1", code_text: "f = open(\"log.txt\", \"w\")" },
          { id: "m2", code_text: "f.write(\"New entry\\n\")" },
          { id: "m3", code_text: "f.close()" },
        ],
        correct_hotspot_id: "m1",
        hint: "\"w\" mode always erases the file's existing content before writing. Adding new content without erasing what's already there needs \"a\" (append) mode instead.",
      },
    },
    {
      title: "Bug: Forgetting to Close the File",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program writes data to data.txt, but when another part of the program immediately tries to read it back, the newly written text is missing.",
        code_lines: [
          { id: "n1", code_text: "f = open(\"data.txt\", \"w\")" },
          { id: "n2", code_text: "f.write(\"Important record\")" },
          { id: "n3", code_text: "g = open(\"data.txt\", \"r\")" },
          { id: "n4", code_text: "print(g.read())" },
        ],
        correct_hotspot_id: "n2",
        hint: "Written data can stay buffered in memory until the file is closed (or the buffer is flushed) — without an f.close() after writing, another program reading the file right away may not see it yet.",
      },
    },
  ];

  for (const challenge of openChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: openConcept._id,
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

  // ---- Concept 2: writing and appending to files ----
  let writeConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Writing and Appending to Text Files" });
  if (!writeConcept) {
    writeConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Writing and Appending to Text Files",
      explanation_text:
        "write() sends a string to a file exactly as given — it doesn't add a newline automatically, so \\n has to be included wherever a new line is wanted. Writing to a file only requires opening it in the correct mode first, and closing it afterward so the data is actually saved to disk before the program relies on it being there.",
    });
    console.log("Created concept:", writeConcept._id);
  } else {
    console.log("Using existing concept:", writeConcept._id);
  }

  const writeChallenges = [
    {
      title: "Build: Write a Single Line to a New File",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines so the program creates greeting.txt and writes \"Hello, World!\" into it.",
        scrambled_lines: [
          { id: "o3", label: "f.close()" },
          { id: "o1", label: "f = open(\"greeting.txt\", \"w\")" },
          { id: "o2", label: "f.write(\"Hello, World!\")" },
        ],
        correct_order: ["o1", "o2", "o3"],
        hint: "The file must be opened before anything can be written to it, and closing it should always come last.",
      },
    },
    {
      title: "Build: Append Three Lines to a Log File",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines so the program appends three separate log lines to activity.log, each ending with a newline, without erasing what was already there.",
        scrambled_lines: [
          { id: "p5", label: "f.close()" },
          { id: "p1", label: "f = open(\"activity.log\", \"a\")" },
          { id: "p2", label: "f.write(\"User logged in\\n\")" },
          { id: "p3", label: "f.write(\"File uploaded\\n\")" },
          { id: "p4", label: "f.write(\"User logged out\\n\")" },
        ],
        correct_order: ["p1", "p2", "p3", "p4", "p5"],
        hint: "\"a\" mode opens the file for appending, so opening it comes first; each write() adds one more line; closing always comes last.",
      },
    },
    {
      title: "Build: Copy One File's Contents into Another",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines so the program reads all of source.txt and writes that same content into destination.txt.",
        scrambled_lines: [
          { id: "q6", label: "out_file.close()" },
          { id: "q1", label: "in_file = open(\"source.txt\", \"r\")" },
          { id: "q5", label: "out_file.write(data)" },
          { id: "q2", label: "data = in_file.read()" },
          { id: "q3", label: "in_file.close()" },
          { id: "q4", label: "out_file = open(\"destination.txt\", \"w\")" },
        ],
        correct_order: ["q1", "q2", "q3", "q4", "q5", "q6"],
        hint: "The source file must be opened and fully read before its content exists in `data`, and the destination file only needs to be opened right before that content is written to it.",
      },
    },
  ];

  for (const challenge of writeChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_CODE_ORDER_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_CODE_ORDER_BUILDER",
        concept_id: writeConcept._id,
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

  // ---- Concept 3: reading files line by line ----
  let lineConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading Files Line by Line and Counting Data" });
  if (!lineConcept) {
    lineConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading Files Line by Line and Counting Data",
      explanation_text:
        "Looping over a file object directly (for line in f:) reads it one line at a time, which is memory-efficient for large files. Each line returned this way still includes its trailing newline character, so code that counts words or compares whole lines often needs to strip() that newline first, or the comparison silently fails even when the visible text looks identical.",
    });
    console.log("Created concept:", lineConcept._id);
  } else {
    console.log("Using existing concept:", lineConcept._id);
  }

  const lineChallenges = [
    {
      title: "Bug: Counting Lines in a File",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "This program should count how many lines are in roster.txt — but it always prints 0, no matter how many lines the file has.",
        code_lines: [
          { id: "r1", code_text: "f = open(\"roster.txt\", \"r\")" },
          { id: "r2", code_text: "count = 0" },
          { id: "r3", code_text: "for line in f:" },
          { id: "r4", code_text: "    count = 0" },
          { id: "r5", code_text: "print(count)" },
        ],
        correct_hotspot_id: "r4",
        hint: "Resetting count to 0 inside the loop undoes any counting from every previous line. It should be increasing count (count = count + 1), not resetting it.",
      },
    },
    {
      title: "Bug: Matching a Name Against File Lines",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This program should print 'Found' when \"Asha\" appears as a line in names.txt — but it never finds a match even though \"Asha\" is clearly in the file.",
        code_lines: [
          { id: "s1", code_text: "f = open(\"names.txt\", \"r\")" },
          { id: "s2", code_text: "found = False" },
          { id: "s3", code_text: "for line in f:" },
          { id: "s4", code_text: "    if line == \"Asha\":" },
          { id: "s5", code_text: "        found = True" },
          { id: "s6", code_text: "print(\"Found\" if found else \"Not Found\")" },
        ],
        correct_hotspot_id: "s4",
        hint: "Each line read from a file still has a trailing '\\n' newline character attached, so line is actually \"Asha\\n\", not \"Asha\". Comparing line.strip() against \"Asha\" would fix this.",
      },
    },
    {
      title: "Bug: Counting Words Across a Whole File",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This program should count the total number of words across every line in essay.txt — but it only ever counts the words in the LAST line.",
        code_lines: [
          { id: "t1", code_text: "f = open(\"essay.txt\", \"r\")" },
          { id: "t2", code_text: "total_words = 0" },
          { id: "t3", code_text: "for line in f:" },
          { id: "t4", code_text: "    total_words = len(line.split())" },
          { id: "t5", code_text: "print(total_words)" },
        ],
        correct_hotspot_id: "t4",
        hint: "Assigning with '=' replaces the previous total every time, throwing away every earlier line's word count. Accumulating across lines needs total_words = total_words + len(line.split()) instead.",
      },
    },
  ];

  for (const challenge of lineChallenges) {
    const exists = await GameContent.findOne({ game_type: "CS_DEBUGGING_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
        concept_id: lineConcept._id,
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
