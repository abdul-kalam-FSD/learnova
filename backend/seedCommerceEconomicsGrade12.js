require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Commerce stream build-out (Grade 12 Economics), part of
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

  let subject = await Subject.findOne({ grade: 12, name: "Economics" });
  if (!subject) {
    subject = await Subject.create({ name: "Economics", grade: 12 });
    console.log("Created new Grade 12 Economics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Macroeconomics: National Income and Money" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Introductory Macroeconomics",
      title: "Macroeconomics: National Income and Money",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let matchConcept = await Concept.findOne({ chapter_id: chapter._id, title: "National Income, Money and Policy Concepts" });
  if (!matchConcept) {
    matchConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "National Income, Money and Policy Concepts",
      explanation_text: "Macroeconomics works with national-level aggregates and policy tools that sound alike but measure or do different things — GDP versus GNP, and fiscal versus monetary policy.",
    });
    console.log("Created concept:", matchConcept._id);
  } else {
    console.log("Using existing concept:", matchConcept._id);
  }

  const matchChallenges = [
    {
      title: "National Income Concepts",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each national income concept to its correct definition.",
        slots: [
          { id: "s1", label: "GDP" },
          { id: "s2", label: "GNP" },
          { id: "s3", label: "Per Capita Income" },
        ],
        components: [
          { id: "c1", label: "The total value of goods and services produced within a country's borders in a year" },
          { id: "c2", label: "GDP plus net income earned by a country's residents from abroad" },
          { id: "c3", label: "National income divided by the total population" },
          { id: "c4", label: "The total amount of money printed by a country's central bank" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "GDP is about where production happens; GNP adjusts for who owns it; per capita income divides the total by people.",
      },
    },
    {
      title: "Functions of Money",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each function of money to its correct description.",
        slots: [
          { id: "s1", label: "Medium of Exchange" },
          { id: "s2", label: "Store of Value" },
          { id: "s3", label: "Unit of Account" },
        ],
        components: [
          { id: "c1", label: "Money is used to buy and sell goods without needing barter" },
          { id: "c2", label: "Money can be saved now and used to buy goods later" },
          { id: "c3", label: "Money provides a common measure to express the value of different goods" },
          { id: "c4", label: "Money's only real function is to be collected as a hobby" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "One function is about trading, one is about saving for later, and one is about measuring value in common terms.",
      },
    },
    {
      title: "Fiscal vs Monetary Policy",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each policy concept to its correct description.",
        slots: [
          { id: "s1", label: "Fiscal Policy" },
          { id: "s2", label: "Monetary Policy" },
          { id: "s3", label: "A Cut in the Repo Rate" },
        ],
        components: [
          { id: "c1", label: "Uses government spending and taxation to influence the economy" },
          { id: "c2", label: "Uses the money supply and interest rates to influence the economy" },
          { id: "c3", label: "An example of monetary policy meant to encourage borrowing and spending" },
          { id: "c4", label: "Fiscal policy is entirely controlled by the central bank, not the government" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Fiscal policy is the government's tool (spending/taxes); monetary policy is the central bank's tool (money supply/rates).",
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

  let processConcept = await Concept.findOne({ chapter_id: chapter._id, title: "How the Macroeconomy Responds" });
  if (!processConcept) {
    processConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "How the Macroeconomy Responds",
      explanation_text: "National income is calculated through a defined sequence of additions, and both fiscal and monetary policy set off a chain of effects that unfold in a specific order through the economy.",
    });
    console.log("Created concept:", processConcept._id);
  } else {
    console.log("Using existing concept:", processConcept._id);
  }

  const processChallenges = [
    {
      title: "Process: Calculating GDP by the Expenditure Method",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order GDP is actually built up by the expenditure method.",
        scrambled_steps: [
          { id: "st4", label: "Add net exports (exports minus imports) to get GDP" },
          { id: "st3", label: "Add total government spending on goods and services" },
          { id: "st2", label: "Add total investment spending by businesses" },
          { id: "st1", label: "Add up total consumption spending by households" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Each component simply gets added on top of the running total — the order of addition itself follows the standard C+I+G+NX breakdown.",
      },
    },
    {
      title: "Process: How an Increase in Money Supply Affects the Economy",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order an increase in money supply actually plays out.",
        scrambled_steps: [
          { id: "st4", label: "Higher demand can push up the general price level, raising inflation risk" },
          { id: "st3", label: "Increased spending raises demand for goods and services" },
          { id: "st2", label: "More money is available for people to spend and banks to lend" },
          { id: "st1", label: "The central bank increases the money supply in the economy" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "The policy action comes first, and inflation risk is the eventual consequence, not an immediate one.",
      },
    },
    {
      title: "Process: The Multiplier Effect of Government Spending",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order the multiplier effect actually unfolds.",
        scrambled_steps: [
          { id: "st4", label: "The total increase in national income becomes larger than the initial spending" },
          { id: "st3", label: "This further spending becomes income for other people in the economy" },
          { id: "st2", label: "Workers and suppliers who receive this money spend a portion of it further" },
          { id: "st1", label: "The government spends additional money on public infrastructure" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "The initial spending has to happen before it can be re-spent, and the total effect only becomes visible after several rounds of re-spending.",
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
