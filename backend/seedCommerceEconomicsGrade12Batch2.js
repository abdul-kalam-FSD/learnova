require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 12
// Economics previously had only one chapter ("Macroeconomics: National
// Income and Money", seedCommerceEconomicsGrade12.js). Adds a second,
// genuinely distinct NCERT Class 12 macroeconomics chapter —
// "Government Budget and the Economy" — with three concepts. Reuses
// COMMERCE_CONCEPT_MATCH and COMMERCE_PROCESS_BUILDER as-is, same
// mechanics the existing Commerce chapters already use.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Government Budget and the Economy" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Government Budget and the Economy",
      title: "Government Budget and the Economy",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: budget receipts and expenditure ----
  let receiptsConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Budget Receipts and Expenditure" });
  if (!receiptsConcept) {
    receiptsConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Budget Receipts and Expenditure",
      explanation_text:
        "Government receipts split into revenue receipts (like taxes, which don't create a liability or reduce assets) and capital receipts (like borrowing, which either create a liability or reduce an asset). Similarly, revenue expenditure (like salaries) doesn't create assets or reduce liabilities, while capital expenditure (like building a road) creates an asset or reduces a liability.",
    });
    console.log("Created concept:", receiptsConcept._id);
  } else {
    console.log("Using existing concept:", receiptsConcept._id);
  }

  const receiptsChallenges = [
    {
      title: "Revenue or Capital? (Receipts)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each government receipt to its correct classification.",
        slots: [
          { id: "s1", label: "Income tax collected from citizens" },
          { id: "s2", label: "Money borrowed from the public through government bonds" },
          { id: "s3", label: "Dividends received from a public sector company" },
        ],
        components: [
          { id: "c1", label: "Revenue Receipt — doesn't create any liability or reduce any asset" },
          { id: "c2", label: "Capital Receipt — creates a liability that must eventually be repaid" },
          { id: "c3", label: "Revenue Receipt — regular income with no matching liability created" },
          { id: "c4", label: "Neither classification applies to government receipts" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask whether receiving the money creates a future obligation to repay — if yes, it's capital; if no, it's revenue.",
      },
    },
    {
      title: "Revenue or Capital? (Expenditure)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each government expenditure to its correct classification.",
        slots: [
          { id: "s1", label: "Salaries paid to government employees" },
          { id: "s2", label: "Spending on constructing a new highway" },
          { id: "s3", label: "Interest paid on past government borrowing" },
        ],
        components: [
          { id: "c1", label: "Revenue Expenditure — recurring cost that creates no asset" },
          { id: "c2", label: "Capital Expenditure — creates a long-term physical asset for the government" },
          { id: "c3", label: "Revenue Expenditure — a recurring obligation, not an asset-building expense" },
          { id: "c4", label: "Neither classification applies to government expenditure" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask whether the spending creates a lasting asset for the government — if yes, it's capital expenditure; if it's just a recurring cost, it's revenue.",
      },
    },
    {
      title: "Reading a Budget Line Item",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each budget line item to the correct pair of classifications (receipt/expenditure and revenue/capital).",
        slots: [
          { id: "s1", label: "Loan repayment received from a state government" },
          { id: "s2", label: "Subsidy paid to farmers" },
          { id: "s3", label: "Sale of a government-owned building" },
        ],
        components: [
          { id: "c1", label: "Capital Receipt — reduces an asset (the loan owed to the government) rather than being income" },
          { id: "c2", label: "Revenue Expenditure — a recurring transfer payment with no asset created" },
          { id: "c3", label: "Capital Receipt — reduces the government's asset holdings" },
          { id: "c4", label: "This item doesn't fit into any budget classification" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Loan repayments received and asset sales both reduce what the government owns or is owed, which is the hallmark of a capital receipt.",
      },
    },
  ];

  for (const challenge of receiptsChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: receiptsConcept._id,
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

  // ---- Concept 2: types of budget deficit ----
  let deficitConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Types of Budget Deficit" });
  if (!deficitConcept) {
    deficitConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Types of Budget Deficit",
      explanation_text:
        "Revenue deficit is revenue expenditure exceeding revenue receipts, showing the government is dissaving. Fiscal deficit is total expenditure exceeding total receipts excluding borrowing, showing the total amount the government must borrow. Primary deficit is fiscal deficit minus interest payments, showing the deficit from the current year's activities alone, excluding the burden of past borrowing.",
    });
    console.log("Created concept:", deficitConcept._id);
  } else {
    console.log("Using existing concept:", deficitConcept._id);
  }

  const deficitChallenges = [
    {
      title: "Match the Deficit to Its Definition",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each type of budget deficit to its correct definition.",
        slots: [
          { id: "s1", label: "Revenue Deficit" },
          { id: "s2", label: "Fiscal Deficit" },
          { id: "s3", label: "Primary Deficit" },
        ],
        components: [
          { id: "c1", label: "Revenue expenditure minus revenue receipts" },
          { id: "c2", label: "Total expenditure minus total receipts excluding borrowing" },
          { id: "c3", label: "Fiscal deficit minus interest payments" },
          { id: "c4", label: "Total receipts minus total expenditure, when receipts are higher" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each deficit measure strips out a different component — revenue deficit looks only at the revenue side, fiscal deficit shows total borrowing need, and primary deficit removes the interest burden from that.",
      },
    },
    {
      title: "What Does Each Deficit Actually Tell You?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each deficit measure to what it reveals about government finances.",
        slots: [
          { id: "s1", label: "A high revenue deficit" },
          { id: "s2", label: "A high fiscal deficit" },
          { id: "s3", label: "A primary deficit of zero" },
        ],
        components: [
          { id: "c1", label: "The government is spending on regular expenses beyond what it earns as regular income" },
          { id: "c2", label: "The government needs to borrow heavily to cover the full spending gap" },
          { id: "c3", label: "The entire fiscal deficit is just interest payments on past borrowing, not new overspending" },
          { id: "c4", label: "None of these deficits reveal anything about the government's finances" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about what's left over once you subtract out interest payments or borrowing from the totals — that remainder is what each measure is really telling you.",
      },
    },
    {
      title: "Comparing Deficits Across Two Budgets",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each observation comparing two years' budgets to the correct interpretation.",
        slots: [
          { id: "s1", label: "Fiscal deficit stayed the same, but primary deficit fell" },
          { id: "s2", label: "Revenue deficit rose while fiscal deficit stayed flat" },
          { id: "s3", label: "Primary deficit turned negative (a primary surplus)" },
        ],
        components: [
          { id: "c1", label: "Interest payments on past debt must have risen, eating up more of the fiscal deficit" },
          { id: "c2", label: "A larger share of borrowing is now going toward regular expenses rather than asset creation" },
          { id: "c3", label: "Non-interest receipts now exceed non-interest expenditure for that year" },
          { id: "c4", label: "These two deficit measures can never move independently of each other" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Because primary deficit = fiscal deficit − interest payments, any gap between how the two move must come from a change in interest payments.",
      },
    },
  ];

  for (const challenge of deficitChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: deficitConcept._id,
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

  // ---- Concept 3: financing a fiscal deficit ----
  let financeConcept = await Concept.findOne({ chapter_id: chapter._id, title: "How a Rising Fiscal Deficit Gets Financed" });
  if (!financeConcept) {
    financeConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "How a Rising Fiscal Deficit Gets Financed",
      explanation_text:
        "When government spending exceeds what it can raise through taxes and other non-borrowed receipts, it has to borrow to cover the gap — typically by issuing government securities to the public or to the Reserve Bank of India. That borrowing adds to the country's outstanding public debt, and the interest on that debt becomes a growing part of future budgets.",
    });
    console.log("Created concept:", financeConcept._id);
  } else {
    console.log("Using existing concept:", financeConcept._id);
  }

  const financeChallenges = [
    {
      title: "Process: Financing a Fiscal Deficit",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a fiscal deficit is actually financed.",
        scrambled_steps: [
          { id: "st4", label: "Outstanding public debt rises as a result of the new borrowing" },
          { id: "st3", label: "The government issues securities to raise the borrowed funds" },
          { id: "st2", label: "The government decides to bridge the gap through borrowing" },
          { id: "st1", label: "Total expenditure is found to exceed total non-borrowed receipts" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The gap has to be identified before a financing decision can be made, and public debt only rises after the borrowing actually takes place.",
      },
    },
    {
      title: "Process: How Rising Public Debt Affects Future Budgets",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order rising public debt actually affects future government budgets.",
        scrambled_steps: [
          { id: "st4", label: "Less of the budget is available for other spending priorities" },
          { id: "st3", label: "Interest payments become a larger fixed share of total revenue expenditure" },
          { id: "st2", label: "The government must pay interest on that larger stock of debt" },
          { id: "st1", label: "Persistent borrowing increases the total stock of outstanding public debt" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "A bigger debt stock means a bigger interest bill, and that bigger interest bill is what eventually crowds out other spending.",
      },
    },
    {
      title: "Process: RBI Financing of the Fiscal Deficit",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order the Reserve Bank of India's financing of a fiscal deficit plays out.",
        scrambled_steps: [
          { id: "st4", label: "The additional money supply can push up prices if output doesn't rise to match it" },
          { id: "st3", label: "The RBI creates new money to purchase these securities" },
          { id: "st2", label: "The government issues securities that the RBI agrees to buy" },
          { id: "st1", label: "The government needs funds beyond what it can borrow from the public" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "This route is different from public borrowing because the RBI's purchase involves creating new money, which is exactly why it carries an inflation risk the other route doesn't.",
      },
    },
  ];

  for (const challenge of financeChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: financeConcept._id,
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
