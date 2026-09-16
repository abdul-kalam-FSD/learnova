require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 12 Business Studies
// currently has "Principles and Functions of Management" (order_index
// 1) and "Business Finance and Financial Markets" (order_index 2, see
// seedCommerceBusinessStudiesGrade12Batch2.js). This adds a genuine
// third NCERT Class 12 Business Studies chapter, "Marketing
// Management" (the marketing mix, functions of marketing, and
// distribution channels / product life cycle) \u2014 never covered on
// the platform before.
//
// Reuses COMMERCE_CONCEPT_MATCH and COMMERCE_PROCESS_BUILDER exactly
// as-is (same mapping-family / order-family generic checks already
// used for Grade 11 "Fundamentals of Accounting" and this chapter's
// own sibling "Principles and Functions of Management"). No new
// backend code.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Marketing Management" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Marketing Management",
      title: "Marketing Management",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: The Marketing Mix: The Four Ps ----
  let mixConcept = await Concept.findOne({ chapter_id: chapter._id, title: "The Marketing Mix: The Four Ps" });
  if (!mixConcept) {
    mixConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "The Marketing Mix: The Four Ps",
      explanation_text:
        "The marketing mix is the set of controllable tools a business blends together to reach its target market: Product (what is offered), Price (what it costs), Place (how it reaches the customer), and Promotion (how customers learn about it). Every marketing decision falls under one of these four Ps.",
    });
    console.log("Created concept:", mixConcept._id);
  } else {
    console.log("Using existing concept:", mixConcept._id);
  }

  const mixChallenges = [
    {
      title: "Identifying the Four Ps",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each marketing decision to the correct 'P' of the marketing mix.",
        slots: [
          { id: "s1", label: "Deciding the packaging and quality level of a new soap" },
          { id: "s2", label: "Deciding whether to sell through retail stores or directly online" },
          { id: "s3", label: "Deciding the selling price after considering cost and competition" },
        ],
        components: [
          { id: "c1", label: "Product" },
          { id: "c2", label: "Place" },
          { id: "c3", label: "Price" },
          { id: "c4", label: "Promotion" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Product is what's offered, Place is how it reaches customers, and Price is what it costs.",
      },
    },
    {
      title: "Promotion Mix Elements",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each promotional activity to the correct element of the promotion mix.",
        slots: [
          { id: "s1", label: "A paid television commercial for a soft drink" },
          { id: "s2", label: "A salesperson demonstrating a vacuum cleaner door-to-door" },
          { id: "s3", label: "A free press article announcing a company's new product" },
        ],
        components: [
          { id: "c1", label: "Advertising \u2014 a paid, non-personal form of promotion" },
          { id: "c2", label: "Personal selling \u2014 direct, face-to-face persuasion" },
          { id: "c3", label: "Publicity \u2014 coverage the company doesn't pay for or directly control" },
          { id: "c4", label: "Sales promotion \u2014 a short-term incentive like a discount coupon" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Advertising is paid and non-personal, personal selling is direct and face-to-face, and publicity is coverage the company doesn't pay for directly.",
      },
    },
    {
      title: "Pricing Strategy Choices",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each pricing situation to the strategy it best describes.",
        slots: [
          { id: "s1", label: "A new smartphone launches at a very high price aimed at early adopters, then the price gradually drops" },
          { id: "s2", label: "A new detergent launches at a low price to quickly capture a large market share" },
          { id: "s3", label: "A cinema charges a lower ticket price for students than for other customers" },
        ],
        components: [
          { id: "c1", label: "Price skimming \u2014 starting high to capture customers willing to pay a premium first" },
          { id: "c2", label: "Penetration pricing \u2014 starting low to gain market share quickly" },
          { id: "c3", label: "Price discrimination \u2014 charging different segments different prices for the same product" },
          { id: "c4", label: "Cost-plus pricing \u2014 simply adding a fixed markup to production cost regardless of the market" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Skimming starts high and comes down over time; penetration starts low to grab market share fast; price discrimination charges different segments differently for the same product.",
      },
    },
  ];

  for (const challenge of mixChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: mixConcept._id,
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

  // ---- Concept 2: Functions of Marketing ----
  let functionsConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Functions of Marketing" });
  if (!functionsConcept) {
    functionsConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Functions of Marketing",
      explanation_text:
        "Marketing is more than advertising \u2014 it covers a full set of functions: gathering marketing information, planning the product, pricing it, physically distributing it (transport, storage), promoting it, and providing supporting services like after-sales service and credit. Standardization and grading are also marketing functions, ensuring products meet consistent quality benchmarks before they reach the customer.",
    });
    console.log("Created concept:", functionsConcept._id);
  } else {
    console.log("Using existing concept:", functionsConcept._id);
  }

  const functionsChallenges = [
    {
      title: "Which Marketing Function Is This?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each marketing activity to the correct marketing function.",
        slots: [
          { id: "s1", label: "Surveying customers to find out what features they want in a new product" },
          { id: "s2", label: "Grading fruits into different quality classes before selling them" },
          { id: "s3", label: "Warehousing finished goods until they are shipped to retailers" },
        ],
        components: [
          { id: "c1", label: "Marketing information / research" },
          { id: "c2", label: "Standardization and grading" },
          { id: "c3", label: "Storage / warehousing" },
          { id: "c4", label: "Transportation" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Match the activity to what it's actually doing: finding out what customers want, sorting by quality, or holding goods until they're needed.",
      },
    },
    {
      title: "Physical Distribution Functions",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each physical distribution activity to its correct role.",
        slots: [
          { id: "s1", label: "Moving goods from the factory to a regional warehouse by truck" },
          { id: "s2", label: "Holding finished goods in a warehouse until customer demand arises" },
          { id: "s3", label: "Breaking a large bulk shipment into smaller lots for different retailers" },
        ],
        components: [
          { id: "c1", label: "Transportation \u2014 creates place utility by moving goods to where they're needed" },
          { id: "c2", label: "Storage / warehousing \u2014 creates time utility by holding goods until they're needed" },
          { id: "c3", label: "Bulk-breaking \u2014 makes goods available in quantities retailers and consumers can actually use" },
          { id: "c4", label: "Promotion \u2014 creates awareness of the product among final consumers" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Transportation solves a place problem, storage solves a time problem, and bulk-breaking solves a quantity problem.",
      },
    },
    {
      title: "Marketing Functions vs Mere Selling",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each statement about marketing versus mere selling to its correct explanation.",
        slots: [
          { id: "s1", label: "Marketing begins before the product is even made" },
          { id: "s2", label: "Selling focuses mainly on converting an existing product into cash" },
          { id: "s3", label: "Marketing includes after-sales service and customer feedback" },
        ],
        components: [
          { id: "c1", label: "Marketing starts with researching what customers actually want, which shapes the product itself" },
          { id: "c2", label: "Selling is only ONE function within the wider marketing process, not the whole of it" },
          { id: "c3", label: "Marketing continues even after the sale, building a long-term relationship with the customer" },
          { id: "c4", label: "Selling and marketing mean exactly the same thing in every situation" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Selling is just one narrow function inside the bigger marketing process, which starts with research and continues well after the sale is made.",
      },
    },
  ];

  for (const challenge of functionsChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: functionsConcept._id,
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

  // ---- Concept 3: Channels of Distribution and the Product Life Cycle ----
  let channelConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Channels of Distribution and the Product Life Cycle" });
  if (!channelConcept) {
    channelConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Channels of Distribution and the Product Life Cycle",
      explanation_text:
        "A product moves through a predictable sequence of stages after launch \u2014 the Product Life Cycle \u2014 and each stage calls for a different marketing emphasis. Similarly, a channel of distribution is the fixed sequence of intermediaries (like wholesalers and retailers) a product typically passes through on its way from producer to final consumer.",
    });
    console.log("Created concept:", channelConcept._id);
  } else {
    console.log("Using existing concept:", channelConcept._id);
  }

  const channelChallenges = [
    {
      title: "Process: A Typical Channel of Distribution",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the typical sequence goods pass through from producer to final consumer, using a two-level distribution channel.",
        scrambled_steps: [
          { id: "st4", label: "Retailer sells the goods to the final consumer" },
          { id: "st1", label: "Producer manufactures the goods" },
          { id: "st3", label: "Wholesaler sells smaller quantities to a retailer" },
          { id: "st2", label: "Goods are sold to a wholesaler" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "In a two-level channel, goods flow from producer to wholesaler to retailer, and only then to the final consumer.",
      },
    },
    {
      title: "Process: Stages of the Product Life Cycle",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these stages in the order a product actually moves through its life cycle.",
        scrambled_steps: [
          { id: "st4", label: "Decline \u2014 sales fall as customer preferences shift or new products replace it" },
          { id: "st1", label: "Introduction \u2014 the product is launched, sales grow slowly, heavy promotion is needed" },
          { id: "st3", label: "Maturity \u2014 sales growth slows down as the market becomes saturated" },
          { id: "st2", label: "Growth \u2014 sales rise rapidly as the product gains acceptance" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Every product follows the same broad sequence: introduction, growth, maturity, then decline \u2014 though how long each stage lasts varies.",
      },
    },
    {
      title: "Process: Launching a Product Through an Extended Channel",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a manufacturer actually takes a new product to market through a full multi-level distribution channel.",
        scrambled_steps: [
          { id: "st6", label: "The final consumer purchases the goods from the retailer" },
          { id: "st1", label: "The manufacturer produces the goods and checks quality (standardization and grading)" },
          { id: "st3", label: "A wholesaler purchases goods in bulk from the manufacturer" },
          { id: "st4", label: "The wholesaler breaks bulk and distributes smaller quantities to retailers" },
          { id: "st2", label: "Goods are transported and stored at a central warehouse" },
          { id: "st5", label: "The retailer displays and promotes the goods to attract customers" },
        ],
        correct_order: ["st1", "st2", "st3", "st4", "st5", "st6"],
        hint: "Production and quality checks always come first, followed by physical movement and storage, then the channel intermediaries \u2014 wholesaler before retailer \u2014 before the goods ever reach the final consumer.",
      },
    },
  ];

  for (const challenge of channelChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: channelConcept._id,
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
