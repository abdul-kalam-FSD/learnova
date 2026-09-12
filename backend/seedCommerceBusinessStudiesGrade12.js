require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Commerce stream build-out (Grade 12 Business Studies), part of
// the platform's first Commerce content. Creates the Subject and
// Chapter from scratch (Commerce didn't exist in this platform before),
// then seeds both Commerce mechanics: COMMERCE_CONCEPT_MATCH (mapping-
// family, reuses HISTORY_CAUSE_EFFECT_MATCH's generic mapping ===
// correct_mapping check) and COMMERCE_PROCESS_BUILDER (order-family,
// reuses CS_CODE_ORDER_BUILDER's generic orderedPieceIds === correct_
// order check) — no new backend scoring logic needed for either.
// Run seedStreams.js AFTER this file (and its five siblings) so the
// Commerce stream can actually find these subjects.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: "Business Studies" });
  if (!subject) {
    subject = await Subject.create({ name: "Business Studies", grade: 12 });
    console.log("Created new Grade 12 Business Studies subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Principles and Functions of Management" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Principles of Management",
      title: "Principles and Functions of Management",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let matchConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Management Functions, Principles and Levels" });
  if (!matchConcept) {
    matchConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Management Functions, Principles and Levels",
      explanation_text: "Management theory groups similar-sounding ideas into distinct categories — the functions managers perform, the principles that guide how they perform them, and the levels at which different managers operate.",
    });
    console.log("Created concept:", matchConcept._id);
  } else {
    console.log("Using existing concept:", matchConcept._id);
  }

  const matchChallenges = [
    {
      title: "Functions of Management",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each management function to its correct description.",
        slots: [
          { id: "s1", label: "Planning" },
          { id: "s2", label: "Organizing" },
          { id: "s3", label: "Controlling" },
        ],
        components: [
          { id: "c1", label: "Deciding in advance what to do and how to do it" },
          { id: "c2", label: "Arranging resources and people to carry out the plan" },
          { id: "c3", label: "Checking whether actual results match the planned goals" },
          { id: "c4", label: "Deciding how much profit to distribute to shareholders each year" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "These functions follow a natural order: decide, arrange, then check.",
      },
    },
    {
      title: "Principles of Management (Fayol)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each of Fayol's principles to its correct description.",
        slots: [
          { id: "s1", label: "Division of Work" },
          { id: "s2", label: "Unity of Command" },
          { id: "s3", label: "Esprit de Corps" },
        ],
        components: [
          { id: "c1", label: "Splitting work into smaller tasks so each person can specialize" },
          { id: "c2", label: "Each employee should receive orders from only one superior" },
          { id: "c3", label: "Encouraging team spirit and harmony among employees" },
          { id: "c4", label: "Requires every employee to report directly to the CEO" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "One principle is about splitting tasks, one is about who gives orders, and one is about team morale.",
      },
    },
    {
      title: "Levels of Management",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each level of management to its correct role.",
        slots: [
          { id: "s1", label: "Top Management" },
          { id: "s2", label: "Middle Management" },
          { id: "s3", label: "Lower/Operational Management" },
        ],
        components: [
          { id: "c1", label: "Sets overall goals and policies for the whole organization" },
          { id: "c2", label: "Implements policies set by top management and coordinates departments" },
          { id: "c3", label: "Directly supervises workers and day-to-day operations" },
          { id: "c4", label: "Exists only in companies with more than 10,000 employees" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Think of it as a chain: goals flow down from the top, through coordination in the middle, to direct supervision at the bottom.",
      },
    },
  ];

  for (const challenge of matchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: matchConcept._id,
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

  let processConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Management Function Processes" });
  if (!processConcept) {
    processConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Management Function Processes",
      explanation_text: "Each management function has its own internal sequence — planning has to move from objective to evaluation before implementation, and controlling only works if standards are set before performance is measured.",
    });
    console.log("Created concept:", processConcept._id);
  } else {
    console.log("Using existing concept:", processConcept._id);
  }

  const processChallenges = [
    {
      title: "Process: The Planning Function",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order the planning function actually happens.",
        scrambled_steps: [
          { id: "st4", label: "Implement the chosen plan and monitor its progress" },
          { id: "st3", label: "Evaluate the alternatives and select the best one" },
          { id: "st2", label: "Develop possible courses of action to reach that objective" },
          { id: "st1", label: "Identify the objective the organization wants to achieve" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need an objective before you can generate options for reaching it, and you evaluate options before choosing one.",
      },
    },
    {
      title: "Process: The Staffing Function",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order the staffing function actually happens.",
        scrambled_steps: [
          { id: "st4", label: "Train and orient new employees for their roles" },
          { id: "st3", label: "Select and hire the most suitable candidates" },
          { id: "st2", label: "Recruit candidates for the required positions" },
          { id: "st1", label: "Estimate the number and type of employees needed" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need to know how many people you need before recruiting, and training only makes sense once someone is hired.",
      },
    },
    {
      title: "Process: The Controlling Function",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order the controlling function actually happens.",
        scrambled_steps: [
          { id: "st4", label: "Take corrective action if there is a significant deviation" },
          { id: "st3", label: "Compare actual performance against the set standards" },
          { id: "st2", label: "Measure the actual performance achieved" },
          { id: "st1", label: "Set performance standards for the activity being measured" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Standards have to exist before performance can be measured against them, and corrective action only follows a comparison.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: processConcept._id,
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
