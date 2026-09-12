require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Commerce stream build-out (Grade 12 Accountancy), part of
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

  let subject = await Subject.findOne({ grade: 12, name: "Accountancy" });
  if (!subject) {
    subject = await Subject.create({ name: "Accountancy", grade: 12 });
    console.log("Created new Grade 12 Accountancy subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Accounting for Partnership and Company Accounts" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Partnership and Company Accounts",
      title: "Accounting for Partnership and Company Accounts",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let matchConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Partnership and Company Concepts" });
  if (!matchConcept) {
    matchConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Partnership and Company Concepts",
      explanation_text: "Grade 12 accounting builds on the basics with partnership-specific and company-specific concepts — reconstitution of a partnership and a company's layers of share capital both have their own precise vocabulary.",
    });
    console.log("Created concept:", matchConcept._id);
  } else {
    console.log("Using existing concept:", matchConcept._id);
  }

  const matchChallenges = [
    {
      title: "Partnership Basics",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each partnership concept to its correct definition.",
        slots: [
          { id: "s1", label: "A Partnership Deed" },
          { id: "s2", label: "Profit Sharing Ratio" },
          { id: "s3", label: "A Partner's Capital Account" },
        ],
        components: [
          { id: "c1", label: "A written agreement stating the terms agreed upon by all partners" },
          { id: "c2", label: "The ratio in which partners agree to share profits and losses" },
          { id: "c3", label: "Records a partner's contribution and share of profits over time" },
          { id: "c4", label: "A document only required once a partnership has more than 50 partners" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each concept tracks a different thing: the agreement itself, the profit split, or one partner's running balance.",
      },
    },
    {
      title: "Reconstitution of a Partnership",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each partnership event to what it actually requires.",
        slots: [
          { id: "s1", label: "Admission of a new partner" },
          { id: "s2", label: "Retirement of an existing partner" },
          { id: "s3", label: "Death of a partner" },
        ],
        components: [
          { id: "c1", label: "Requires revaluing assets and liabilities and adjusting the new profit-sharing ratio" },
          { id: "c2", label: "Requires settling the retiring partner's dues, including their share of goodwill" },
          { id: "c3", label: "Requires calculating dues payable to the deceased partner's legal representatives" },
          { id: "c4", label: "Never requires any change to the existing profit-sharing ratio" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each event changes who shares in the firm's profits, and each requires its own specific settlement.",
      },
    },
    {
      title: "Company Share Capital",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each share capital term to its correct definition.",
        slots: [
          { id: "s1", label: "Authorized Capital" },
          { id: "s2", label: "Issued Capital" },
          { id: "s3", label: "Paid-up Capital" },
        ],
        components: [
          { id: "c1", label: "The maximum capital a company is allowed to raise, as stated in its memorandum" },
          { id: "c2", label: "The part of authorized capital actually offered to the public for subscription" },
          { id: "c3", label: "The part of issued capital that shareholders have actually paid to the company" },
          { id: "c4", label: "The total profit a company has ever made since incorporation" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each layer is a subset of the one before it: authorized is the ceiling, issued is what's offered, paid-up is what's actually collected.",
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

  let processConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Partnership and Company Processes" });
  if (!processConcept) {
    processConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Partnership and Company Processes",
      explanation_text: "Reconstituting a partnership or issuing company shares both follow a required sequence — you can't finalize a settlement or allotment before the earlier steps that determine its amount are done.",
    });
    console.log("Created concept:", processConcept._id);
  } else {
    console.log("Using existing concept:", processConcept._id);
  }

  const processChallenges = [
    {
      title: "Process: Admission of a New Partner",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a new partner is actually admitted to a firm.",
        scrambled_steps: [
          { id: "st4", label: "The new partner brings in capital and their share is finalized" },
          { id: "st3", label: "Goodwill is calculated and adjusted among partners" },
          { id: "st2", label: "The firm revalues its assets and liabilities" },
          { id: "st1", label: "Existing partners agree to admit a new partner" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Agreement comes first, and the new partner's final share can only be settled after revaluation and goodwill are worked out.",
      },
    },
    {
      title: "Process: Issue of Shares by a Company",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a company actually issues shares.",
        scrambled_steps: [
          { id: "st4", label: "The company calls for the remaining allotment and call money" },
          { id: "st3", label: "The company allots shares to successful applicants" },
          { id: "st2", label: "Applicants apply and pay the application money" },
          { id: "st1", label: "The company invites applications for shares through a prospectus" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Shares can't be allotted before applications exist, and call money can only be requested after allotment.",
      },
    },
    {
      title: "Process: Dissolution of a Partnership Firm",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a partnership firm is actually dissolved.",
        scrambled_steps: [
          { id: "st4", label: "The remaining balance is distributed to partners in final settlement" },
          { id: "st3", label: "Any remaining loss or profit is shared among partners" },
          { id: "st2", label: "Assets are sold and liabilities are paid off" },
          { id: "st1", label: "All partners agree to dissolve the firm" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Nothing can be settled until assets are sold and liabilities are cleared first.",
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
