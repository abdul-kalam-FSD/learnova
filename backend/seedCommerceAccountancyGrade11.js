require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Commerce stream build-out (Grade 11 Accountancy), part of
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

  let subject = await Subject.findOne({ grade: 11, name: "Accountancy" });
  if (!subject) {
    subject = await Subject.create({ name: "Accountancy", grade: 11 });
    console.log("Created new Grade 11 Accountancy subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Fundamentals of Accounting" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Fundamentals of Accounting",
      title: "Fundamentals of Accounting",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let matchConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Accounting Terms and Their Definitions" });
  if (!matchConcept) {
    matchConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Accounting Terms and Their Definitions",
      explanation_text: "Accounting has precise terms for things that sound similar in everyday language. Getting 'asset', 'liability' and 'capital' right — and knowing which account type a transaction belongs to — is the foundation everything else in accounting builds on.",
    });
    console.log("Created concept:", matchConcept._id);
  } else {
    console.log("Using existing concept:", matchConcept._id);
  }

  const matchChallenges = [
    {
      title: "Basic Accounting Terms",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each basic accounting term to its correct definition.",
        slots: [
          { id: "s1", label: "An Asset" },
          { id: "s2", label: "A Liability" },
          { id: "s3", label: "Capital" },
        ],
        components: [
          { id: "c1", label: "Something a business owns that has future economic value, e.g. cash or machinery" },
          { id: "c2", label: "An amount the business owes to outsiders, e.g. a bank loan" },
          { id: "c3", label: "The amount invested by the owner in the business" },
          { id: "c4", label: "Money the business has already spent and can never recover" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Think about direction: does the business own it, owe it, or was it put in by the owner?",
      },
    },
    {
      title: "Types of Accounts (Golden Rules)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each type of account to what it actually deals with.",
        slots: [
          { id: "s1", label: "A Real Account" },
          { id: "s2", label: "A Personal Account" },
          { id: "s3", label: "A Nominal Account" },
        ],
        components: [
          { id: "c1", label: "Deals with assets and properties, e.g. cash, machinery, building" },
          { id: "c2", label: "Deals with persons and organisations the business transacts with, e.g. a debtor" },
          { id: "c3", label: "Deals with incomes, expenses, gains and losses, e.g. rent paid" },
          { id: "c4", label: "Deals only with transactions made in foreign currency" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Real accounts are things, personal accounts are people/organisations, nominal accounts are incomes and expenses.",
      },
    },
    {
      title: "The Accounting Equation",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each accounting fact to what it actually means for the accounting equation.",
        slots: [
          { id: "s1", label: "Assets = Liabilities + Capital" },
          { id: "s2", label: "A purchase of goods on credit" },
          { id: "s3", label: "Payment of an expense in cash" },
        ],
        components: [
          { id: "c1", label: "The fundamental identity that must always stay balanced in double-entry accounting" },
          { id: "c2", label: "Increases both an asset (stock) and a liability (creditor) by the same amount" },
          { id: "c3", label: "Decreases one asset (cash) while recording an expense, keeping the equation balanced" },
          { id: "c4", label: "Only applies to businesses that have never taken a loan" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Every transaction has to keep both sides of the equation equal — check what increases and what decreases together.",
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

  let processConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Recording and Closing a Transaction" });
  if (!processConcept) {
    processConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Recording and Closing a Transaction",
      explanation_text: "Accounting follows a fixed sequence, not a single step. A transaction has to be recorded, posted, and checked before the books can even be summarized, let alone closed for the period.",
    });
    console.log("Created concept:", processConcept._id);
  } else {
    console.log("Using existing concept:", processConcept._id);
  }

  const processChallenges = [
    {
      title: "Process: Recording a Transaction",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a business transaction is actually recorded.",
        scrambled_steps: [
          { id: "st4", label: "The ledger account balances are used to prepare the trial balance" },
          { id: "st3", label: "The journal entry is posted to the relevant ledger accounts" },
          { id: "st2", label: "The transaction is recorded in the journal as a journal entry" },
          { id: "st1", label: "A business transaction takes place (e.g. a sale)" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "The flow always goes: transaction happens, then journal, then ledger, then trial balance.",
      },
    },
    {
      title: "Process: Preparing a Trial Balance",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a trial balance is actually prepared.",
        scrambled_steps: [
          { id: "st4", label: "Confirm that the debit total equals the credit total" },
          { id: "st3", label: "Total both columns separately" },
          { id: "st2", label: "List all debit balances in one column and credit balances in another" },
          { id: "st1", label: "Balance every ledger account at the end of the period" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need each account's balance before you can list it, and the final check always comes last.",
      },
    },
    {
      title: "Process: The Full Accounting Cycle",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order the full accounting cycle actually happens.",
        scrambled_steps: [
          { id: "st5", label: "Prepare the final financial statements" },
          { id: "st4", label: "Prepare the trial balance from ledger balances" },
          { id: "st3", label: "Post journal entries to the ledger" },
          { id: "st2", label: "Record the transaction in the journal" },
          { id: "st1", label: "Identify and analyze a business transaction" },
        ],
        correct_order: ["st1","st2","st3","st4","st5"],
        hint: "Each step depends on the previous one being finished — you can't post to the ledger before journalizing, or prepare statements before the trial balance.",
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
