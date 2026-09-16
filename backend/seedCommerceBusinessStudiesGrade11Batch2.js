require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 11
// Business Studies previously had only one chapter ("Nature and Forms
// of Business Organisation", seedCommerceBusinessStudiesGrade11.js).
// Adds a second, genuinely distinct NCERT Class 11 chapter — "Private,
// Public and Global Enterprises" — with three concepts. Reuses
// COMMERCE_CONCEPT_MATCH and COMMERCE_PROCESS_BUILDER as-is, same
// mechanics the existing Commerce chapters already use.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Private, Public and Global Enterprises" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Private, Public and Global Enterprises",
      title: "Private, Public and Global Enterprises",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: forms of public sector enterprises ----
  let psuConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Forms of Public Sector Enterprises" });
  if (!psuConcept) {
    psuConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Forms of Public Sector Enterprises",
      explanation_text:
        "The government runs enterprises in three distinct legal forms. A Departmental Undertaking is run as a government department itself, funded directly from the budget. A Statutory Corporation is created by a special Act of Parliament or a state legislature, which defines its powers and objectives. A Government Company is registered under the Companies Act like any private company, but the government holds at least 51% of its paid-up share capital.",
    });
    console.log("Created concept:", psuConcept._id);
  } else {
    console.log("Using existing concept:", psuConcept._id);
  }

  const psuChallenges = [
    {
      title: "Match the Public Enterprise to Its Form",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each public enterprise feature to the form it describes.",
        slots: [
          { id: "s1", label: "Financed entirely through the government's own budget, like any other department" },
          { id: "s2", label: "Created by a special Act that spells out its powers and objectives" },
          { id: "s3", label: "Registered under the Companies Act, with the government holding at least 51% of shares" },
        ],
        components: [
          { id: "c1", label: "Departmental Undertaking" },
          { id: "c2", label: "Statutory Corporation" },
          { id: "c3", label: "Government Company" },
          { id: "c4", label: "A private company with no government involvement" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "One form is a plain government department, one is created by law with defined powers, and one is a company where government just happens to be the majority shareholder.",
      },
    },
    {
      title: "Why Choose This Form of Public Enterprise?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each public enterprise form to the reason it's typically chosen.",
        slots: [
          { id: "s1", label: "The government wants very tight control, as for defence production or the postal system" },
          { id: "s2", label: "The government wants operational freedom but still needs powers defined by law, as for the Reserve Bank of India" },
          { id: "s3", label: "The government wants the flexibility of private-company management, as for many public sector banks" },
        ],
        components: [
          { id: "c1", label: "Departmental Undertaking — direct government control, no separate legal identity" },
          { id: "c2", label: "Statutory Corporation — an Act grants exactly the powers needed, with more autonomy than a department" },
          { id: "c3", label: "Government Company — company-style flexibility while the government retains majority ownership" },
          { id: "c4", label: "None of these forms allow any government involvement at all" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Match how much control the government wants to keep against how much operational independence the enterprise needs.",
      },
    },
    {
      title: "Public Enterprise or Private Company?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each statement to whether it is true of a Government Company or a private limited company.",
        slots: [
          { id: "s1", label: "At least 51% of paid-up share capital must be held by the government" },
          { id: "s2", label: "Its employees are recruited the same way as any other company, not through the UPSC" },
          { id: "s3", label: "Its annual report is placed before Parliament even though it's registered like a company" },
        ],
        components: [
          { id: "c1", label: "True only of a Government Company — this is exactly what defines it" },
          { id: "c2", label: "True of both — this is a general company-law feature, not specific to ownership" },
          { id: "c3", label: "True only of a Government Company — accountability to Parliament comes from government ownership" },
          { id: "c4", label: "True of neither — companies never report to Parliament" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A Government Company is a company in its legal form, but its majority government ownership brings extra accountability that an ordinary private company doesn't have.",
      },
    },
  ];

  for (const challenge of psuChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: psuConcept._id,
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

  // ---- Concept 2: features of global enterprises (MNCs) ----
  let mncConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Features of Global Enterprises (MNCs)" });
  if (!mncConcept) {
    mncConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Features of Global Enterprises (MNCs)",
      explanation_text:
        "A multinational corporation (MNC) operates in more than one country at the same time, usually with huge capital resources, advanced technology, and highly skilled management. Its foreign operations are typically controlled centrally from the home country's headquarters, and it can shift production between countries to take advantage of cheaper resources or better markets.",
    });
    console.log("Created concept:", mncConcept._id);
  } else {
    console.log("Using existing concept:", mncConcept._id);
  }

  const mncChallenges = [
    {
      title: "Features of a Multinational Corporation",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each feature to what it means for a multinational corporation.",
        slots: [
          { id: "s1", label: "Huge capital resources" },
          { id: "s2", label: "Centralized control" },
          { id: "s3", label: "Advanced technology" },
        ],
        components: [
          { id: "c1", label: "Can fund large-scale operations across several countries at once" },
          { id: "c2", label: "Foreign branches take major decisions from the head office in the home country" },
          { id: "c3", label: "Uses capital-intensive, cutting-edge production methods research and development can afford" },
          { id: "c4", label: "Means every branch operates completely independently with no head office" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each feature is about a different resource or structure — money, decision-making authority, or technology.",
      },
    },
    {
      title: "MNC or Domestic Company?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each business behaviour to whether it's typical of a multinational corporation or a purely domestic company.",
        slots: [
          { id: "s1", label: "Shifts a factory from one country to another to take advantage of cheaper labour" },
          { id: "s2", label: "Sells its products only within the country where it is registered" },
          { id: "s3", label: "Uses transfer pricing between its own branches in different countries" },
        ],
        components: [
          { id: "c1", label: "Typical of an MNC — international mobility of production is a defining feature" },
          { id: "c2", label: "Typical of a domestic company — its operations don't cross national borders" },
          { id: "c3", label: "Typical of an MNC — only a firm with branches in multiple countries can price transfers between them" },
          { id: "c4", label: "Typical of every company regardless of where it operates" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Anything that only makes sense when a firm operates across more than one country's borders points to an MNC.",
      },
    },
    {
      title: "Impact of Global Enterprises on the Host Economy",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each outcome to whether it's generally considered a benefit or a concern when an MNC sets up in a host country.",
        slots: [
          { id: "s1", label: "Brings in advanced technology and management practices the local industry lacked" },
          { id: "s2", label: "Profits earned locally are often repatriated back to the home country" },
          { id: "s3", label: "Creates employment and boosts foreign exchange through exports" },
        ],
        components: [
          { id: "c1", label: "A benefit — technology transfer raises the host country's industrial capability" },
          { id: "c2", label: "A concern — it can mean less capital stays within the host economy" },
          { id: "c3", label: "A benefit — jobs and export earnings support the host economy" },
          { id: "c4", label: "Always a concern, with no benefit to the host country in any case" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "MNCs bring real benefits like technology and jobs, but repatriation of profits is a genuine, commonly cited concern — it isn't purely one-sided either way.",
      },
    },
  ];

  for (const challenge of mncChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: mncConcept._id,
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

  // ---- Concept 3: formation of a statutory corporation ----
  let statConcept = await Concept.findOne({ chapter_id: chapter._id, title: "How a Statutory Corporation Is Formed" });
  if (!statConcept) {
    statConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "How a Statutory Corporation Is Formed",
      explanation_text:
        "A Statutory Corporation doesn't come into existence by registering with the Registrar of Companies the way a Government Company does. Instead, it is created directly by a special Act passed by Parliament or a state legislature, and that same Act lays down exactly what powers, objectives and functions the corporation will have.",
    });
    console.log("Created concept:", statConcept._id);
  } else {
    console.log("Using existing concept:", statConcept._id);
  }

  const statChallenges = [
    {
      title: "Process: Creating a Statutory Corporation",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a statutory corporation is actually created.",
        scrambled_steps: [
          { id: "st4", label: "The corporation begins functioning with the powers the Act granted it" },
          { id: "st3", label: "The Act specifies the corporation's powers, objectives and functions" },
          { id: "st2", label: "Parliament or the state legislature passes a special Act" },
          { id: "st1", label: "The government identifies a need for a public enterprise in a specific sector" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "A need is identified first, then a law is passed to create the body, and that law is what defines its powers before it can start operating.",
      },
    },
    {
      title: "Process: Statutory Corporation vs Government Company Formation",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a Government Company (not a statutory corporation) is actually formed.",
        scrambled_steps: [
          { id: "st4", label: "The Registrar issues a Certificate of Incorporation" },
          { id: "st3", label: "Memorandum and Articles of Association are filed with the Registrar of Companies" },
          { id: "st2", label: "The government subscribes to at least 51% of the paid-up share capital" },
          { id: "st1", label: "Promoters, including the government, decide to register a new company" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Unlike a statutory corporation, a Government Company follows the ordinary Companies Act route — registration and a certificate, not an Act of the legislature.",
      },
    },
    {
      title: "Process: Amending a Statutory Corporation's Powers",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order the powers of an existing statutory corporation would actually be changed.",
        scrambled_steps: [
          { id: "st4", label: "The corporation now operates under the newly amended powers" },
          { id: "st3", label: "The legislature passes an amendment to the original Act" },
          { id: "st2", label: "A bill to amend the corporation's founding Act is introduced in the legislature" },
          { id: "st1", label: "The government decides the corporation's current powers no longer fit its needs" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Because a statutory corporation's powers come from an Act, changing those powers requires going back through the legislature, not a simple company resolution.",
      },
    },
  ];

  for (const challenge of statChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: statConcept._id,
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
