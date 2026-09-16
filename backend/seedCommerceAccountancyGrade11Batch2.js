require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 11
// Accountancy previously had only one chapter ("Fundamentals of
// Accounting", two concepts, seedCommerceAccountancyGrade11.js). Adds
// a second, genuinely distinct NCERT Class 11 Accountancy chapter —
// "Depreciation and Rectification of Errors" — with three concepts.
// Reuses COMMERCE_CONCEPT_MATCH and COMMERCE_PROCESS_BUILDER as-is,
// same mechanics the existing Commerce chapters already use.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Depreciation and Rectification of Errors" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Depreciation and Rectification of Errors",
      title: "Depreciation and Rectification of Errors",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: depreciation methods ----
  let depConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Methods of Charging Depreciation" });
  if (!depConcept) {
    depConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Methods of Charging Depreciation",
      explanation_text:
        "Depreciation spreads a fixed asset's cost over its useful life. The Straight Line Method charges an equal amount every year, based on original cost. The Written Down Value Method charges a fixed percentage of the asset's reducing book value each year, so the depreciation amount gets smaller over time even though the rate stays the same.",
    });
    console.log("Created concept:", depConcept._id);
  } else {
    console.log("Using existing concept:", depConcept._id);
  }

  const depChallenges = [
    {
      title: "Straight Line vs Written Down Value",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each depreciation feature to the method it describes.",
        slots: [
          { id: "s1", label: "Charges the same rupee amount every year" },
          { id: "s2", label: "Charges a fixed percentage of the reducing book value" },
          { id: "s3", label: "Book value can reach exactly zero at the end of useful life" },
        ],
        components: [
          { id: "c1", label: "Straight Line Method" },
          { id: "c2", label: "Written Down Value Method" },
          { id: "c3", label: "Straight Line Method (WDV never quite reaches zero)" },
          { id: "c4", label: "Neither method — this only happens if the asset is sold" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Straight Line keeps the depreciation amount fixed; Written Down Value keeps the rate fixed but the amount shrinks as book value shrinks.",
      },
    },
    {
      title: "Why Does WDV Depreciation Shrink Each Year?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each fact about the Written Down Value method to the reasoning behind it.",
        slots: [
          { id: "s1", label: "Year 1 depreciation on a ₹1,00,000 asset at 10% WDV" },
          { id: "s2", label: "Year 2 depreciation on the same asset" },
          { id: "s3", label: "Why does the depreciation amount keep falling?" },
        ],
        components: [
          { id: "c1", label: "₹10,000 (10% of the original ₹1,00,000 book value)" },
          { id: "c2", label: "₹9,000 (10% of the reduced ₹90,000 book value)" },
          { id: "c3", label: "Because the rate is applied to a shrinking base (book value) each year, not the original cost" },
          { id: "c4", label: "Because the asset is being used less each year" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "WDV always applies the fixed percentage to whatever book value remains at the START of that year, not to the original cost.",
      },
    },
    {
      title: "Choosing the Right Method",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each business situation to the more suitable depreciation method.",
        slots: [
          { id: "s1", label: "An asset whose repair costs rise as it ages, needing lower depreciation later to balance total cost" },
          { id: "s2", label: "An asset that provides roughly equal benefit and wears down at a steady pace every year" },
          { id: "s3", label: "Matching depreciation with the Income Tax Act's prescribed method for many block assets" },
        ],
        components: [
          { id: "c1", label: "Written Down Value — higher depreciation early keeps total annual cost roughly level as repairs rise" },
          { id: "c2", label: "Straight Line Method — steady equal charges suit steady equal benefit" },
          { id: "c3", label: "Written Down Value Method — this is the method Indian tax law generally prescribes" },
          { id: "c4", label: "Neither method applies to any real business situation" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about which method makes total yearly cost (depreciation + repairs) most level, and which one matches how the asset is actually used.",
      },
    },
  ];

  for (const challenge of depChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: depConcept._id,
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

  // ---- Concept 2: types of errors ----
  let errorConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Types of Errors and Their Effect on Trial Balance" });
  if (!errorConcept) {
    errorConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Types of Errors and Their Effect on Trial Balance",
      explanation_text:
        "Errors of omission (a transaction not recorded at all) and errors of principle (recording a capital item as revenue, or vice versa) don't affect the trial balance's agreement, since both sides are equally unaffected. Errors of commission (wrong amount, wrong account) can either agree or disagree the trial balance depending on whether both the debit and credit sides were affected equally.",
    });
    console.log("Created concept:", errorConcept._id);
  } else {
    console.log("Using existing concept:", errorConcept._id);
  }

  const errorChallenges = [
    {
      title: "Classify the Error",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each error scenario to its correct classification.",
        slots: [
          { id: "s1", label: "A credit purchase of goods was never recorded anywhere" },
          { id: "s2", label: "Machinery purchase was wrongly debited to the Purchases account" },
          { id: "s3", label: "A sale of ₹5,000 was recorded as ₹500 in both the Sales account and the customer's account" },
        ],
        components: [
          { id: "c1", label: "Error of omission — the transaction is completely missing" },
          { id: "c2", label: "Error of principle — a capital expenditure was treated as a revenue expense" },
          { id: "c3", label: "Error of commission — wrong amount posted, but posted correctly to both accounts" },
          { id: "c4", label: "This isn't an error at all, since it was recorded somewhere" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Omission means nothing was recorded; principle means the wrong TYPE of account was used; commission means the right accounts but a wrong figure or a one-sided posting.",
      },
    },
    {
      title: "Does This Error Affect the Trial Balance?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each error to whether it disturbs the trial balance's agreement.",
        slots: [
          { id: "s1", label: "A transaction is completely omitted from the books" },
          { id: "s2", label: "An amount is posted to the wrong side of one account only" },
          { id: "s3", label: "A sale is recorded correctly in the Sales Book but never posted to the customer's account" },
        ],
        components: [
          { id: "c1", label: "Trial balance still agrees — both sides are equally unaffected" },
          { id: "c2", label: "Trial balance disagrees — only one side of the double entry was affected" },
          { id: "c3", label: "Trial balance disagrees — the customer's (debit) account is short, but Sales (credit) was posted normally" },
          { id: "c4", label: "Trial balance always disagrees whenever there's any error" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The trial balance only disagrees when debit and credit totals actually become unequal — errors that skip both sides equally, or aren't posted at all, don't unbalance it.",
      },
    },
    {
      title: "One-Sided vs Two-Sided Errors",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each error pattern to whether it's a one-sided error (needs a suspense account) or a two-sided error (rectified with a normal journal entry).",
        slots: [
          { id: "s1", label: "Sales account is undercast (totaled too low) by ₹1,000" },
          { id: "s2", label: "Purchase of furniture debited to Purchases account instead of Furniture account" },
          { id: "s3", label: "Discount allowed ₹200 was posted to the debit of Discount Received account" },
        ],
        components: [
          { id: "c1", label: "One-sided error — only the Sales account total is wrong; rectify via Suspense Account" },
          { id: "c2", label: "Two-sided error — both accounts have equal, opposite entries; a normal journal entry fixes it without Suspense" },
          { id: "c3", label: "Two-sided error — a compound entry through both discount accounts fixes it without Suspense" },
          { id: "c4", label: "Neither type — this can never be rectified" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "If only ONE account's figure is wrong, a Suspense Account is needed to balance the books temporarily; if both sides of the original entry are traceable, a direct journal entry rectifies it.",
      },
    },
  ];

  for (const challenge of errorChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: errorConcept._id,
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

  // ---- Concept 3: bank reconciliation process ----
  let brsConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Steps to Prepare a Bank Reconciliation Statement" });
  if (!brsConcept) {
    brsConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Steps to Prepare a Bank Reconciliation Statement",
      explanation_text:
        "A Bank Reconciliation Statement (BRS) explains why the cash book's bank balance differs from the passbook's balance — usually because of cheques issued but not yet presented, or cheques deposited but not yet cleared. Preparing one follows a fixed sequence: start from one balance, then adjust for every timing difference until it matches the other balance.",
    });
    console.log("Created concept:", brsConcept._id);
  } else {
    console.log("Using existing concept:", brsConcept._id);
  }

  const brsChallenges = [
    {
      title: "Process: Preparing a Bank Reconciliation Statement",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a Bank Reconciliation Statement is actually prepared.",
        scrambled_steps: [
          { id: "st4", label: "Confirm the adjusted total now equals the passbook balance" },
          { id: "st3", label: "Subtract cheques deposited but not yet credited by the bank" },
          { id: "st2", label: "Add back cheques issued but not yet presented for payment" },
          { id: "st1", label: "Start with the bank balance as shown in the cash book" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Always start from one known balance, then work through each timing difference, ending with a check against the other balance.",
      },
    },
    {
      title: "Process: Locating a Reconciliation Difference",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order you'd actually investigate a cash book vs passbook mismatch.",
        scrambled_steps: [
          { id: "st4", label: "Prepare the reconciliation statement listing each adjustment" },
          { id: "st3", label: "Check for bank charges, interest, or direct deposits the cash book hasn't recorded yet" },
          { id: "st2", label: "Compare cheque issue/deposit dates against when the bank actually processed them" },
          { id: "st1", label: "Compare the two closing balances and note that they don't match" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "You can't list adjustments until you've actually found what's causing the mismatch — investigation comes before the final statement.",
      },
    },
    {
      title: "Process: Reconciling When Starting from Passbook Balance",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps for preparing a BRS that starts from the passbook (bank statement) balance instead of the cash book.",
        scrambled_steps: [
          { id: "st5", label: "The result should now equal the cash book balance" },
          { id: "st4", label: "Add cheques deposited by the business but not yet credited by the bank" },
          { id: "st3", label: "Subtract cheques issued by the business but not yet presented for payment" },
          { id: "st2", label: "Adjust for any bank charges or interest already reflected in the passbook but not the cash book" },
          { id: "st1", label: "Start with the closing balance as per the bank passbook" },
        ],
        correct_order: ["st1", "st2", "st3", "st4", "st5"],
        hint: "Starting from the passbook reverses the additions and subtractions used when starting from the cash book — work through each difference, then verify against the other balance.",
      },
    },
  ];

  for (const challenge of brsChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: brsConcept._id,
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
