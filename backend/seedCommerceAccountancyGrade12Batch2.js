require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 12
// Accountancy previously had only one chapter ("Accounting for
// Partnership and Company Accounts"). Adds a second, genuinely
// distinct NCERT Class 12 Accountancy Part II chapter — "Analysis of
// Financial Statements" — with three concepts. Reuses
// COMMERCE_CONCEPT_MATCH and COMMERCE_PROCESS_BUILDER as-is.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: "Accountancy" });
  if (!subject) {
    subject = await Subject.create({ name: "Accountancy", grade: 12 });
    console.log("Created new Grade 12 Accountancy subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Analysis of Financial Statements" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Analysis of Financial Statements",
      title: "Analysis of Financial Statements",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: types of accounting ratios ----
  let ratioConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Types of Accounting Ratios" });
  if (!ratioConcept) {
    ratioConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Types of Accounting Ratios",
      explanation_text:
        "Liquidity ratios (like the Current Ratio) measure a firm's ability to meet short-term obligations. Solvency ratios (like the Debt-Equity Ratio) measure long-term financial stability. Profitability ratios (like Net Profit Ratio) measure how efficiently a firm turns revenue into profit. Each ratio type answers a different question about the same set of financial statements.",
    });
    console.log("Created concept:", ratioConcept._id);
  } else {
    console.log("Using existing concept:", ratioConcept._id);
  }

  const ratioChallenges = [
    {
      title: "Classify the Ratio",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each ratio to the category it belongs to.",
        slots: [
          { id: "s1", label: "Current Ratio" },
          { id: "s2", label: "Debt-Equity Ratio" },
          { id: "s3", label: "Net Profit Ratio" },
        ],
        components: [
          { id: "c1", label: "Liquidity ratio — measures short-term ability to pay obligations" },
          { id: "c2", label: "Solvency ratio — measures long-term financial stability" },
          { id: "c3", label: "Profitability ratio — measures efficiency at converting revenue into profit" },
          { id: "c4", label: "Activity/turnover ratio — measures how efficiently assets are used" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask what QUESTION each ratio answers: can we pay bills soon (liquidity), can we survive long-term debt (solvency), or are we actually profitable (profitability)?",
      },
    },
    {
      title: "What Does the Ratio Actually Tell You?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each ratio result to what it indicates about the company.",
        slots: [
          { id: "s1", label: "Current Ratio of 2:1" },
          { id: "s2", label: "Current Ratio of 0.5:1" },
          { id: "s3", label: "Debt-Equity Ratio of 3:1" },
        ],
        components: [
          { id: "c1", label: "Comfortable short-term liquidity — current assets are twice current liabilities" },
          { id: "c2", label: "Poor short-term liquidity — current liabilities exceed current assets" },
          { id: "c3", label: "Highly leveraged — the firm relies heavily on debt relative to owners' funds" },
          { id: "c4", label: "The company has no liabilities at all" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A ratio below 1 for Current Ratio is a red flag for liquidity; a high Debt-Equity Ratio signals heavy reliance on borrowed funds.",
      },
    },
    {
      title: "Interpreting Combinations of Ratios",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each combination of ratio results to the most likely conclusion about the firm.",
        slots: [
          { id: "s1", label: "High Net Profit Ratio but very low Current Ratio" },
          { id: "s2", label: "Low Debt-Equity Ratio and high Net Profit Ratio" },
          { id: "s3", label: "High Current Ratio but very low Net Profit Ratio" },
        ],
        components: [
          { id: "c1", label: "Profitable on paper, but may struggle to pay short-term bills — profit isn't the same as cash" },
          { id: "c2", label: "Financially strong: profitable and not overly dependent on debt" },
          { id: "c3", label: "Plenty of current assets, but they aren't being turned into meaningful profit" },
          { id: "c4", label: "These two ratios always move together, so this combination is impossible" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "No single ratio tells the whole story — a firm can be profitable yet illiquid, or liquid yet unprofitable, since each ratio measures a different dimension.",
      },
    },
  ];

  for (const challenge of ratioChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: ratioConcept._id,
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

  // ---- Concept 2: classifying cash flow activities ----
  let cfConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Classifying Cash Flow Activities" });
  if (!cfConcept) {
    cfConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Classifying Cash Flow Activities",
      explanation_text:
        "A Cash Flow Statement splits cash movements into three categories: Operating activities (day-to-day business, like cash from customers or paid to suppliers), Investing activities (buying/selling long-term assets or investments), and Financing activities (raising or repaying capital and loans, paying dividends).",
    });
    console.log("Created concept:", cfConcept._id);
  } else {
    console.log("Using existing concept:", cfConcept._id);
  }

  const cfChallenges = [
    {
      title: "Which Cash Flow Category?",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each cash transaction to its cash flow category.",
        slots: [
          { id: "s1", label: "Cash received from customers for goods sold" },
          { id: "s2", label: "Cash paid to purchase new machinery" },
          { id: "s3", label: "Cash received by issuing new equity shares" },
        ],
        components: [
          { id: "c1", label: "Operating activity — this is core day-to-day business" },
          { id: "c2", label: "Investing activity — buying a long-term asset" },
          { id: "c3", label: "Financing activity — raising capital from owners" },
          { id: "c4", label: "None of these — this isn't a cash flow at all" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask: is this the business's main activity (operating), building/selling long-term assets (investing), or raising/repaying funds (financing)?",
      },
    },
    {
      title: "Tricky Classifications",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scenario: "Match each less-obvious transaction to its correct cash flow category.",
        slots: [
          { id: "s1", label: "Interest received on an investment (for a non-financial company)" },
          { id: "s2", label: "Dividend paid to shareholders" },
          { id: "s3", label: "Interest paid on a long-term loan" },
        ],
        components: [
          { id: "c1", label: "Investing activity — it's a return earned on an investment made" },
          { id: "c2", label: "Financing activity — it's a payment to the providers of capital" },
          { id: "c3", label: "Financing activity — it's a cost of financing through borrowed funds" },
          { id: "c4", label: "Operating activity in every single case, with no exceptions" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Interest and dividends received/paid are classified by WHOSE money is moving and why — a return on an investment is investing, a cost of raising funds is financing.",
      },
    },
    {
      title: "Reading the Overall Pattern",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each pattern of cash flows across the three categories to what it most likely suggests about the company.",
        slots: [
          { id: "s1", label: "Strong positive operating cash flow, negative investing cash flow, negative financing cash flow" },
          { id: "s2", label: "Negative operating cash flow, positive financing cash flow" },
          { id: "s3", label: "Positive investing cash flow from selling assets, negative operating cash flow" },
        ],
        components: [
          { id: "c1", label: "A healthy, growing company reinvesting profits into assets and repaying debt/dividends" },
          { id: "c2", label: "A company struggling operationally and covering the gap by borrowing or raising capital" },
          { id: "c3", label: "A company possibly selling off assets to cover weak day-to-day operations — worth investigating further" },
          { id: "c4", label: "This pattern gives no useful information about the company at all" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The healthiest pattern is operating cash flow funding both investing and financing outflows — relying on financing or asset sales to cover operations is a warning sign.",
      },
    },
  ];

  for (const challenge of cfChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: cfConcept._id,
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

  // ---- Concept 3: preparing a cash flow statement (process) ----
  let cfProcessConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Steps to Prepare a Cash Flow Statement" });
  if (!cfProcessConcept) {
    cfProcessConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Steps to Prepare a Cash Flow Statement",
      explanation_text:
        "Preparing a Cash Flow Statement using the indirect method follows a fixed sequence: start from net profit, adjust for non-cash items and working capital changes to get operating cash flow, then add the investing and financing sections, and finally reconcile to the actual change in the cash balance.",
    });
    console.log("Created concept:", cfProcessConcept._id);
  } else {
    console.log("Using existing concept:", cfProcessConcept._id);
  }

  const cfProcessChallenges = [
    {
      title: "Process: Cash Flow from Operating Activities (Indirect Method)",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order the indirect method builds up operating cash flow.",
        scrambled_steps: [
          { id: "st4", label: "Adjust for changes in working capital (increase/decrease in debtors, stock, creditors)" },
          { id: "st3", label: "Add back non-cash expenses like depreciation" },
          { id: "st2", label: "Add back non-operating items already included, like loss on sale of an asset" },
          { id: "st1", label: "Start with Net Profit as per the Statement of Profit and Loss" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Start from the profit figure, remove anything non-operating that's mixed into it, add back non-cash charges, then adjust for working capital timing differences.",
      },
    },
    {
      title: "Process: Building the Full Cash Flow Statement",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a complete Cash Flow Statement is assembled.",
        scrambled_steps: [
          { id: "st5", label: "Add the net cash flows from all three activities to the opening cash balance" },
          { id: "st4", label: "Calculate net cash flow from financing activities" },
          { id: "st3", label: "Calculate net cash flow from investing activities" },
          { id: "st2", label: "Calculate net cash flow from operating activities" },
          { id: "st1", label: "Confirm the opening balance of cash and cash equivalents" },
        ],
        correct_order: ["st1", "st2", "st3", "st4", "st5"],
        hint: "Each section is calculated on its own first (operating, then investing, then financing), and only the final step combines them with the opening balance.",
      },
    },
    {
      title: "Process: Verifying the Statement Is Correct",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these final verification steps in the order they're actually carried out.",
        scrambled_steps: [
          { id: "st4", label: "Confirm this matches the closing cash and cash equivalents balance from the Balance Sheet" },
          { id: "st3", label: "Compute the net increase or decrease in cash for the year" },
          { id: "st2", label: "Sum the net cash flows from operating, investing and financing activities" },
          { id: "st1", label: "Note the opening cash and cash equivalents balance" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The whole point of the final check is that the computed closing balance must tie out exactly to the Balance Sheet's actual cash figure.",
      },
    },
  ];

  for (const challenge of cfProcessChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: cfProcessConcept._id,
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
