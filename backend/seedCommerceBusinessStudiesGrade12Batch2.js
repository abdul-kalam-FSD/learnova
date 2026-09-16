require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 12
// Business Studies previously had only one chapter ("Principles and
// Functions of Management", seedCommerceBusinessStudiesGrade12.js).
// Adds a second, genuinely distinct NCERT Class 12 chapter pairing —
// "Business Finance and Financial Markets" — with three concepts.
// Reuses COMMERCE_CONCEPT_MATCH and COMMERCE_PROCESS_BUILDER as-is,
// same mechanics the existing Commerce chapters already use.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Business Finance and Financial Markets" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Business Finance and Financial Markets",
      title: "Business Finance and Financial Markets",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: sources of business finance ----
  let sourceConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Sources of Business Finance" });
  if (!sourceConcept) {
    sourceConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Sources of Business Finance",
      explanation_text:
        "A business can raise funds from owners (equity shares, retained earnings) or from outsiders (debentures, term loans, trade credit). Equity shareholders bear ownership risk and get variable dividends, while debenture holders are creditors who receive a fixed rate of interest regardless of profit. Retained earnings — profit kept back instead of distributed — cost nothing to raise but reduce what shareholders receive as dividend.",
    });
    console.log("Created concept:", sourceConcept._id);
  } else {
    console.log("Using existing concept:", sourceConcept._id);
  }

  const sourceChallenges = [
    {
      title: "Match the Source of Finance to Its Feature",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each source of business finance to its correct feature.",
        slots: [
          { id: "s1", label: "Equity Shares" },
          { id: "s2", label: "Debentures" },
          { id: "s3", label: "Retained Earnings" },
        ],
        components: [
          { id: "c1", label: "Ownership capital with a variable, profit-dependent return" },
          { id: "c2", label: "Borrowed capital carrying a fixed rate of interest" },
          { id: "c3", label: "Profit ploughed back into the business instead of distributed as dividend" },
          { id: "c4", label: "A source of finance available only to government companies" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "One source is ownership capital, one is a fixed-return loan instrument, and one is simply profit the business chooses to keep.",
      },
    },
    {
      title: "Owned Capital or Borrowed Capital?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each source of finance to whether it counts as owned capital or borrowed capital.",
        slots: [
          { id: "s1", label: "Equity share capital" },
          { id: "s2", label: "Debentures and term loans" },
          { id: "s3", label: "Retained earnings" },
        ],
        components: [
          { id: "c1", label: "Owned capital — shareholders are part-owners of the business" },
          { id: "c2", label: "Borrowed capital — must be repaid with interest regardless of profit" },
          { id: "c3", label: "Owned capital — it belongs to the shareholders even though it isn't distributed" },
          { id: "c4", label: "Neither category applies to any of these sources" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Owned capital carries no obligation to repay; borrowed capital always does, with interest, regardless of how the business performs.",
      },
    },
    {
      title: "Choosing a Source of Finance",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each business situation to the source of finance that suits it best.",
        slots: [
          { id: "s1", label: "A profitable, established company wants funds without diluting ownership or paying interest" },
          { id: "s2", label: "A company wants funds but doesn't want to give lenders a claim on profit-linked returns" },
          { id: "s3", label: "A company wants a fixed-cost source of funds and is confident it can service regular interest payments" },
        ],
        components: [
          { id: "c1", label: "Retained earnings — free of both dilution and interest cost, but only available if profits exist" },
          { id: "c2", label: "Equity shares — dividend is paid only if profits allow, unlike a fixed obligation" },
          { id: "c3", label: "Debentures — interest is a known, fixed cost regardless of profit levels" },
          { id: "c4", label: "There is no source of finance that varies by situation like this" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about what each situation is trying to avoid — dilution of ownership, an obligation to pay regardless of profit, or uncertainty about the cost of funds.",
      },
    },
  ];

  for (const challenge of sourceChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: sourceConcept._id,
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

  // ---- Concept 2: money market vs capital market ----
  let marketConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Money Market vs Capital Market Instruments" });
  if (!marketConcept) {
    marketConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Money Market vs Capital Market Instruments",
      explanation_text:
        "Financial markets are split by how long the instrument takes to mature. The money market deals in short-term instruments (up to one year) like Treasury Bills and Commercial Paper, used mainly to manage working capital. The capital market deals in long-term instruments like equity shares and debentures, used to raise funds for fixed assets and long-term growth.",
    });
    console.log("Created concept:", marketConcept._id);
  } else {
    console.log("Using existing concept:", marketConcept._id);
  }

  const marketChallenges = [
    {
      title: "Money Market or Capital Market Instrument?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each instrument to the market it belongs to.",
        slots: [
          { id: "s1", label: "Treasury Bill" },
          { id: "s2", label: "Equity Share" },
          { id: "s3", label: "Commercial Paper" },
        ],
        components: [
          { id: "c1", label: "Money Market — a short-term instrument issued by the government" },
          { id: "c2", label: "Capital Market — represents long-term ownership in a company" },
          { id: "c3", label: "Money Market — a short-term unsecured promissory note issued by companies" },
          { id: "c4", label: "Neither market — this instrument doesn't actually exist" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The money market deals in instruments maturing within a year; the capital market deals in long-term instruments.",
      },
    },
    {
      title: "Why This Market Fits This Purpose",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each business need to the market that meets it.",
        slots: [
          { id: "s1", label: "A company needs funds for just 90 days to cover a temporary cash shortfall" },
          { id: "s2", label: "A company needs funds to build a new factory that will run for 20 years" },
          { id: "s3", label: "The government needs to borrow for a very short period to manage its cash flow" },
        ],
        components: [
          { id: "c1", label: "Money Market — short-term borrowing exactly matches a short-term need" },
          { id: "c2", label: "Capital Market — long-term funding matches a long-term fixed asset" },
          { id: "c3", label: "Money Market — Treasury Bills exist exactly for this government need" },
          { id: "c4", label: "Both markets are always interchangeable regardless of the funding period" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Match the length of time the funds are needed for to the market built for that time horizon.",
      },
    },
    {
      title: "Primary Market or Secondary Market?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Within the capital market, match each transaction to whether it happens in the primary market or the secondary market.",
        slots: [
          { id: "s1", label: "A company issues new shares directly to investors for the first time" },
          { id: "s2", label: "An existing shareholder sells shares to another investor on the stock exchange" },
          { id: "s3", label: "Funds raised go directly to the company issuing the securities" },
        ],
        components: [
          { id: "c1", label: "Primary Market — new securities are created and sold for the first time" },
          { id: "c2", label: "Secondary Market — ownership changes hands between investors, not involving the company" },
          { id: "c3", label: "Primary Market — this direct flow of funds to the issuer only happens here" },
          { id: "c4", label: "Both markets send funds directly to the company in every transaction" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The primary market is where new securities are born; the secondary market is where already-issued securities simply change owners.",
      },
    },
  ];

  for (const challenge of marketChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: marketConcept._id,
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

  // ---- Concept 3: steps in a public issue (IPO) ----
  let ipoConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Steps in a Company's Public Issue (IPO)" });
  if (!ipoConcept) {
    ipoConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Steps in a Company's Public Issue (IPO)",
      explanation_text:
        "When a company raises capital from the public for the first time through an Initial Public Offering, the process follows a required sequence: regulatory approval and disclosure come first, then the offer is opened to investors, and only after shares are allotted can they be traded on a stock exchange.",
    });
    console.log("Created concept:", ipoConcept._id);
  } else {
    console.log("Using existing concept:", ipoConcept._id);
  }

  const ipoChallenges = [
    {
      title: "Process: A Company's Initial Public Offering (IPO)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order an IPO actually happens.",
        scrambled_steps: [
          { id: "st4", label: "The allotted shares are listed and start trading on a stock exchange" },
          { id: "st3", label: "Shares are allotted to successful applicants" },
          { id: "st2", label: "The issue opens and investors apply for shares" },
          { id: "st1", label: "The company files a prospectus with SEBI disclosing all required details" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Regulatory disclosure has to happen before the public can apply, and listing on an exchange only happens after shares are actually allotted.",
      },
    },
    {
      title: "Process: Deciding How Much Capital to Raise via an IPO",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a company would actually plan the size of its public issue.",
        scrambled_steps: [
          { id: "st4", label: "The company decides the total amount of capital to raise and the share price" },
          { id: "st3", label: "The company weighs this against the cost of alternative sources like debentures or loans" },
          { id: "st2", label: "It works out how much of that need should come from owned capital versus borrowed capital" },
          { id: "st1", label: "The company identifies its total funding requirement for the planned project" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "You need to know the total funding requirement before splitting it between owned and borrowed capital, and that split is compared against alternatives before a final decision.",
      },
    },
    {
      title: "Process: A Share's Journey After Allotment",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a share moves through the market after an IPO allotment.",
        scrambled_steps: [
          { id: "st4", label: "The share can then be freely bought and sold between investors" },
          { id: "st3", label: "The stock exchange grants listing approval" },
          { id: "st2", label: "The company applies to a stock exchange for listing" },
          { id: "st1", label: "An investor receives allotment of newly issued shares" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "A share only reaches the secondary market's free trading stage after it is allotted, the company applies for listing, and the exchange approves it.",
      },
    },
  ];

  for (const challenge of ipoChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: ipoConcept._id,
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
