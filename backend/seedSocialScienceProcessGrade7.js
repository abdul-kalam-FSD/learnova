require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-gap fill (genuine gap list item 5): Grade 7 Social Science
// has History and Geography strand content (seedHistoryGrade7.js /
// seedHistoryCauseEffectGrade7.js / seedGeographyGrade7.js /
// seedGeographyFeatureGrade7.js) but no Civics strand content at all
// — unlike Grades 4-6 and 9, which each have at least one Civics
// chapter. Curriculum reference: NCERT's Class 7 Social and Political
// Life-2 civics syllabus covers "How the State Government Works" —
// the ordered chain from state election to a functioning government
// department. Reuses the existing SOCIAL_SCIENCE_PROCESS_BUILDER
// mechanic (same ordered-sequence check as
// seedSocialScienceProcessGrade6.js / Grade9.js), no new backend
// scoring logic needed. Per the task's Civics G7/G8 note, this uses
// SOCIAL_SCIENCE_PROCESS_BUILDER rather than inventing a new
// mechanic, since it already fits.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 7 Social Science subject not found — run seedHistoryGrade7.js or seedGeographyGrade7.js first.");
  }
  console.log("Using existing subject:", subject._id);

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "How State Government Works" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Social and Political Life",
      title: "How State Government Works",
      order_index: 1,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "From Election to a Working Government Department" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "From Election to a Working Government Department",
      explanation_text:
        "A state government doesn't appear all at once after an election — it forms in a set order. Voters elect MLAs first; only then can a majority party form a government; only then are ministers appointed; only then do government departments actually carry out day-to-day work like running schools or hospitals.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same order-family as the other Process Builder
  // seeds — `scrambled_steps` shown out of order, `correct_order`
  // (stripped before the client sees it) is the true sequence.
  const processChallenges = [
    {
      title: "Process: How a State Government Is Formed",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a state government actually forms after an election.",
        scrambled_steps: [
          { id: "g3", label: "The Chief Minister selects other MLAs to become ministers, each in charge of a department" },
          { id: "g1", label: "Voters across the state elect their local MLAs (Members of the Legislative Assembly)" },
          { id: "g4", label: "Ministers and their departments begin carrying out day-to-day government work" },
          { id: "g2", label: "The party (or alliance) with a majority of MLAs is invited to form the government, and its leader becomes Chief Minister" },
        ],
        correct_order: ["g1", "g2", "g3", "g4"],
        hint: "Voting has to happen before a majority party can be identified, and a Chief Minister has to be chosen before they can appoint anyone else.",
      },
    },
    {
      title: "Process: How a Village Gets a New Health Sub-Centre",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange the steps in the order the government department actually responds to a local need.",
        scrambled_steps: [
          { id: "h3", label: "The Health Department reviews the request and allocates a budget for a new health sub-centre" },
          { id: "h1", label: "Villagers notice they must travel far for even basic medical care" },
          { id: "h4", label: "Staff are hired and the sub-centre opens to serve the village" },
          { id: "h2", label: "The Gram Panchayat raises the need with the state Health Department" },
        ],
        correct_order: ["h1", "h2", "h3", "h4"],
        hint: "A need has to be identified and formally raised before any department can review and budget for it — staffing always comes last.",
      },
    },
    {
      title: "Process: How a New State Law Gets Enforced",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a new state law actually gets made and enforced.",
        scrambled_steps: [
          { id: "k3", label: "MLAs debate and vote on the bill in the State Legislative Assembly" },
          { id: "k1", label: "A minister proposes a new law as a bill in the State Legislative Assembly" },
          { id: "k4", label: "Once passed and signed by the Governor, government departments begin enforcing the new law" },
          { id: "k2", label: "Committees review the bill's details before it is put to a vote" },
        ],
        correct_order: ["k1", "k2", "k3", "k4"],
        hint: "A bill has to be proposed and reviewed before it can be debated and voted on — enforcement only happens after it's been passed and signed.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept._id,
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
