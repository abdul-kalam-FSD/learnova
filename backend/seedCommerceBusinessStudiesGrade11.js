require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Commerce stream build-out (Grade 11 Business Studies), part of
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

  let subject = await Subject.findOne({ grade: 11, name: "Business Studies" });
  if (!subject) {
    subject = await Subject.create({ name: "Business Studies", grade: 11 });
    console.log("Created new Grade 11 Business Studies subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Nature and Forms of Business Organisation" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Business Foundations",
      title: "Nature and Forms of Business Organisation",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let matchConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Forms and Features of Business Organisation" });
  if (!matchConcept) {
    matchConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Forms and Features of Business Organisation",
      explanation_text: "Different business forms trade off control, liability and capital differently. Knowing which form fits a given situation — and what 'limited liability' or 'perpetual succession' actually means — is the foundation of business studies.",
    });
    console.log("Created concept:", matchConcept._id);
  } else {
    console.log("Using existing concept:", matchConcept._id);
  }

  const matchChallenges = [
    {
      title: "Forms of Business Organisation",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each business form to its correct description.",
        slots: [
          { id: "s1", label: "Sole Proprietorship" },
          { id: "s2", label: "Partnership" },
          { id: "s3", label: "Joint Stock Company" },
        ],
        components: [
          { id: "c1", label: "Owned and managed by a single individual who bears all the risk" },
          { id: "c2", label: "Owned by two or more people who share profits and liability" },
          { id: "c3", label: "A separate legal entity owned by shareholders with limited liability" },
          { id: "c4", label: "A business form that legally cannot ever have more than one employee" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Think about how many owners each form has, and how much personal risk each owner carries.",
      },
    },
    {
      title: "Features of a Company",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each company feature to what it actually means.",
        slots: [
          { id: "s1", label: "Limited Liability" },
          { id: "s2", label: "Separate Legal Entity" },
          { id: "s3", label: "Perpetual Succession" },
        ],
        components: [
          { id: "c1", label: "Shareholders are only liable up to the amount unpaid on their shares" },
          { id: "c2", label: "The company can own property and sue or be sued in its own name" },
          { id: "c3", label: "The company continues to exist even if shareholders change or die" },
          { id: "c4", label: "Means a company automatically closes down when its founder retires" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each feature protects the company or its shareholders in a different way — from loss, from being confused with its owners, or from ending with any one person.",
      },
    },
    {
      title: "Choosing the Right Business Form",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each business situation to the form that actually suits it best.",
        slots: [
          { id: "s1", label: "A business needing large capital for expansion" },
          { id: "s2", label: "A business wanting quick decisions with full control" },
          { id: "s3", label: "A small local business run by family members" },
        ],
        components: [
          { id: "c1", label: "A joint stock company suits this best, since it can raise capital from many shareholders" },
          { id: "c2", label: "A sole proprietorship suits this best, since one owner can decide quickly" },
          { id: "c3", label: "A partnership often suits this, letting family members share work and profit" },
          { id: "c4", label: "Every business, regardless of size, should always become a joint stock company" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Match the situation's real need — capital, speed of decisions, or shared family involvement — to the form built for it.",
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

  let processConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Starting a Business" });
  if (!processConcept) {
    processConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Starting a Business",
      explanation_text: "Starting any business form follows a required sequence — capital and agreements have to be arranged before registration, and registration has to happen before operations legally begin.",
    });
    console.log("Created concept:", processConcept._id);
  } else {
    console.log("Using existing concept:", processConcept._id);
  }

  const processChallenges = [
    {
      title: "Process: Starting a Sole Proprietorship",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a sole proprietorship is actually started.",
        scrambled_steps: [
          { id: "st4", label: "Begin operations and start serving customers" },
          { id: "st3", label: "Register the business as required by local law" },
          { id: "st2", label: "Arrange the capital needed to start the business" },
          { id: "st1", label: "Decide on the type of business activity to start" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need to know what the business does before you can figure out how much capital it needs.",
      },
    },
    {
      title: "Process: Forming a Partnership Firm",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a partnership firm is actually formed.",
        scrambled_steps: [
          { id: "st4", label: "The partnership begins its business operations" },
          { id: "st3", label: "The firm is registered with the Registrar of Firms" },
          { id: "st2", label: "A partnership deed is drafted and signed by all partners" },
          { id: "st1", label: "Partners agree on the terms of the partnership" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Terms have to be agreed before they can be written into a deed, and the deed exists before registration.",
      },
    },
    {
      title: "Process: Incorporating a Joint Stock Company",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a joint stock company is actually incorporated.",
        scrambled_steps: [
          { id: "st4", label: "The company is now a separate legal entity and can begin business" },
          { id: "st3", label: "The Registrar issues a Certificate of Incorporation" },
          { id: "st2", label: "The documents are filed with the Registrar of Companies" },
          { id: "st1", label: "Promoters prepare the Memorandum and Articles of Association" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "The founding documents have to exist before they can be filed, and the certificate is what actually creates the legal entity.",
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
