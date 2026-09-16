require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 11 Accountancy currently has
// "Fundamentals of Accounting" (order_index 1) and "Depreciation and
// Rectification of Errors" (order_index 2, see
// seedCommerceAccountancyGrade11Batch2.js). This adds a genuine third
// NCERT Class 11 Accountancy chapter, "Bank Reconciliation Statement"
// (why cash book/pass book balances differ, common reconciling items,
// and the reconciliation process itself) — never covered on the
// platform before.
//
// Reuses COMMERCE_CONCEPT_MATCH and COMMERCE_PROCESS_BUILDER exactly
// as-is (same mapping-family / order-family generic checks already
// used for "Fundamentals of Accounting" — see
// seedCommerceAccountancyGrade11.js). No new backend code.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Bank Reconciliation Statement" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Bank Reconciliation Statement",
      title: "Bank Reconciliation Statement",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Why Cash Book and Pass Book Balances Differ ----
  let whyDifferConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Why Cash Book and Pass Book Balances Differ" });
  if (!whyDifferConcept) {
    whyDifferConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Why Cash Book and Pass Book Balances Differ",
      explanation_text:
        "A business keeps its own record of bank transactions (the Cash Book) while the bank keeps its own record (the Pass Book). The two balances often differ on any given day \u2014 not because of an error, but because of timing differences (a cheque issued but not yet presented, or a cheque deposited but not yet cleared) and items the bank records first (like bank charges or interest) that the business hasn't recorded yet.",
    });
    console.log("Created concept:", whyDifferConcept._id);
  } else {
    console.log("Using existing concept:", whyDifferConcept._id);
  }

  const whyDifferChallenges = [
    {
      title: "Basic Reasons for Difference",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each situation to the correct reason cash book and pass book balances might differ.",
        slots: [
          { id: "s1", label: "A cheque issued by the business but not yet presented for payment" },
          { id: "s2", label: "A cheque deposited by the business but not yet cleared by the bank" },
          { id: "s3", label: "Bank charges deducted by the bank but not yet recorded by the business" },
        ],
        components: [
          { id: "c1", label: "Reduces the pass book balance later than the cash book, since the bank hasn't paid it out yet" },
          { id: "c2", label: "Increases the pass book balance later than the cash book, since the bank hasn't cleared it yet" },
          { id: "c3", label: "The pass book already reflects it, but the cash book won't until the business finds out" },
          { id: "c4", label: "This never causes any difference between the two balances" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask which side (the business's cash book, or the bank's pass book) records the item FIRST, and which one only finds out later.",
      },
    },
    {
      title: "Debit Balance vs Credit Balance in the Pass Book",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each pass book fact to its correct meaning.",
        slots: [
          { id: "s1", label: "The pass book shows a credit balance" },
          { id: "s2", label: "The pass book shows a debit balance (overdraft)" },
          { id: "s3", label: "The cash book shows a debit balance" },
        ],
        components: [
          { id: "c1", label: "The business has money in the bank \u2014 from the bank's point of view, it owes this to the business, so it's a credit" },
          { id: "c2", label: "The business has overdrawn its account \u2014 the business owes the bank money" },
          { id: "c3", label: "Money is available in the bank, from the business's own point of view" },
          { id: "c4", label: "A credit balance in the cash book always means an overdraft" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The pass book is written from the BANK's point of view, where money owed to the business is a credit balance \u2014 the opposite of how the same thing looks in the business's own cash book.",
      },
    },
    {
      title: "Effect on the Reconciled Balance",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each reconciling item to its effect when moving FROM the cash book balance TO the pass book balance.",
        slots: [
          { id: "s1", label: "Cheque issued but not yet presented" },
          { id: "s2", label: "Interest credited by the bank but not yet entered in the cash book" },
          { id: "s3", label: "Bank charges debited by the bank but not yet entered in the cash book" },
        ],
        components: [
          { id: "c1", label: "Add it \u2014 the cash book has already reduced the balance, but the bank hasn't paid it out yet" },
          { id: "c2", label: "Add it \u2014 the bank already added it, so the cash book balance needs to catch up" },
          { id: "c3", label: "Subtract it \u2014 the bank already deducted it, so the cash book balance needs to catch up" },
          { id: "c4", label: "Ignore it \u2014 it never affects the bank reconciliation statement" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "When starting from the cash book balance: add back anything the cash book already subtracted that the bank hasn't paid out yet, and add or subtract anything the bank has already recorded that the cash book hasn't caught up to.",
      },
    },
  ];

  for (const challenge of whyDifferChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: whyDifferConcept._id,
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

  // ---- Concept 2: Common Reconciling Items and Their Treatment ----
  let itemsConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Common Reconciling Items and Their Treatment" });
  if (!itemsConcept) {
    itemsConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Common Reconciling Items and Their Treatment",
      explanation_text:
        "Every reconciling item falls into one of two categories: timing differences (things both books will eventually record \u2014 a cheque issued but not presented, or a deposit not yet cleared) and items the business simply hasn't recorded yet (bank charges, interest, or a dishonoured cheque that the bank already adjusted for). Knowing which category an item belongs to is what tells you whether to add or subtract it.",
    });
    console.log("Created concept:", itemsConcept._id);
  } else {
    console.log("Using existing concept:", itemsConcept._id);
  }

  const itemsChallenges = [
    {
      title: "Timing Difference or Unrecorded Item?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each reconciling item to its correct category.",
        slots: [
          { id: "s1", label: "A cheque issued to a supplier, not yet presented at the bank" },
          { id: "s2", label: "Bank interest credited to the account, not yet entered in the cash book" },
          { id: "s3", label: "A cheque deposited by the business, not yet collected by the bank" },
        ],
        components: [
          { id: "c1", label: "Timing difference \u2014 both books will agree once the cheque is presented" },
          { id: "c2", label: "Unrecorded item \u2014 the business needs to update its own cash book to match what the bank already did" },
          { id: "c3", label: "Timing difference \u2014 both books will agree once the cheque is collected" },
          { id: "c4", label: "An accounting error that must be corrected in the cash book" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Timing differences resolve themselves once the transaction clears the bank; unrecorded items need the business to catch up its own books.",
      },
    },
    {
      title: "A Dishonoured Cheque",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each fact about a dishonoured (bounced) cheque to its correct effect.",
        slots: [
          { id: "s1", label: "A customer's cheque deposited earlier is dishonoured by the bank" },
          { id: "s2", label: "The bank reduces the pass book balance as soon as it learns of the dishonour" },
          { id: "s3", label: "The cash book still shows the cheque as good money" },
        ],
        components: [
          { id: "c1", label: "The cheque is reversed out \u2014 it turns out the money was never actually received" },
          { id: "c2", label: "This often happens before the business itself finds out" },
          { id: "c3", label: "This is exactly the kind of unrecorded item a bank reconciliation statement is meant to catch" },
          { id: "c4", label: "The cash book automatically updates itself the moment a cheque is dishonoured" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A dishonoured cheque is bad news the BANK finds out about first \u2014 the business's cash book won't reflect it until reconciliation reveals the gap.",
      },
    },
    {
      title: "Direct Bank Transactions",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each direct bank transaction (handled directly by the bank, not through the business's own cash entries) to its correct treatment.",
        slots: [
          { id: "s1", label: "The bank collects a dividend directly for the business" },
          { id: "s2", label: "The bank pays an insurance premium directly on standing instruction" },
          { id: "s3", label: "The bank debits a cheque book issue charge" },
        ],
        components: [
          { id: "c1", label: "Add to the cash book balance \u2014 money came in that the business hasn't recorded yet" },
          { id: "c2", label: "Subtract from the cash book balance \u2014 money went out that the business hasn't recorded yet" },
          { id: "c3", label: "Subtract from the cash book balance \u2014 a bank charge the business hasn't recorded yet" },
          { id: "c4", label: "No adjustment needed \u2014 direct bank transactions never require reconciliation" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Anything the bank does directly, without the business writing a cheque or making a deposit, is money the cash book hasn't caught up to yet \u2014 add if it's income, subtract if it's an expense or charge.",
      },
    },
  ];

  for (const challenge of itemsChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: itemsConcept._id,
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

  // ---- Concept 3: Preparing a Bank Reconciliation Statement ----
  let processConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Preparing a Bank Reconciliation Statement" });
  if (!processConcept) {
    processConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Preparing a Bank Reconciliation Statement",
      explanation_text:
        "Preparing a Bank Reconciliation Statement follows a fixed sequence: start from one balance (usually the cash book), list every reconciling item with the correct add/subtract treatment, and total up to arrive at the other balance (the pass book) \u2014 proving the two accounts actually agree once timing and unrecorded items are accounted for.",
    });
    console.log("Created concept:", processConcept._id);
  } else {
    console.log("Using existing concept:", processConcept._id);
  }

  const processChallenges = [
    {
      title: "Process: Basic Reconciliation Starting from the Cash Book",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a bank reconciliation statement is actually prepared, starting from the cash book balance.",
        scrambled_steps: [
          { id: "st4", label: "The resulting total should equal the pass book balance" },
          { id: "st1", label: "Start with the cash book balance as on the given date" },
          { id: "st3", label: "List cheques deposited but not yet collected, and subtract them" },
          { id: "st2", label: "List cheques issued but not yet presented, and add them back" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Always start from a known balance, adjust for every timing difference in the correct direction, and the final total should match the other book's balance.",
      },
    },
    {
      title: "Process: Handling Bank Charges and Interest",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order they're applied when reconciling a cash book balance that hasn't caught up with bank charges and interest.",
        scrambled_steps: [
          { id: "st5", label: "Arrive at the balance as per the pass book" },
          { id: "st1", label: "Start with the cash book balance as on the given date" },
          { id: "st3", label: "Add interest the bank credited but the business hasn't recorded" },
          { id: "st4", label: "Continue with any remaining timing differences" },
          { id: "st2", label: "Subtract bank charges the bank deducted but the business hasn't recorded" },
        ],
        correct_order: ["st1", "st2", "st3", "st4", "st5"],
        hint: "Unrecorded charges and interest are adjusted the same way as any other item: subtract what reduced the bank balance, add what increased it \u2014 before moving on to timing differences.",
      },
    },
    {
      title: "Process: Full Reconciliation with a Dishonoured Cheque",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a full bank reconciliation statement is prepared, including a dishonoured cheque.",
        scrambled_steps: [
          { id: "st6", label: "The final total should equal the balance as per the pass book" },
          { id: "st1", label: "Start with the cash book balance as on the given date" },
          { id: "st3", label: "Subtract cheques deposited but not yet collected by the bank" },
          { id: "st4", label: "Subtract a customer's cheque that was dishonoured but still shown as good in the cash book" },
          { id: "st2", label: "Add cheques issued but not yet presented for payment" },
          { id: "st5", label: "Adjust for any remaining bank charges or interest not yet recorded" },
        ],
        correct_order: ["st1", "st2", "st3", "st4", "st5", "st6"],
        hint: "Work through every category one at a time \u2014 timing differences first, then unrecorded items like a dishonoured cheque or bank charges \u2014 and the final total must tie out to the pass book.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
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
