require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// First Social Science vertical slice (Section 13 — DECIDE / MANAGE
// / UNDERSTAND fantasy). Civic Decision reuses the exact same
// single-choice check as BIO_VIRTUAL_LAB / CS_DEBUGGING_LAB (see
// checkAttempt in gameControllers.js): picking the one most
// democratic/lawful response to a scenario is the same "did they
// pick the correct id" logic as identifying a microscope hotspot or
// a buggy code line.
//
// Note (Gap 5, new-curriculum pass): Grade 9 Social Science is now
// the merged "Understanding Society: India and Beyond" (NCF-SE 2023,
// 2026-27 session) rather than four separate History/Geography/
// Civics/Economics books. Local-governance/civics content likely
// still belongs here, but which part (Part 1, released, or Part 2,
// pending as of this writing) it falls under hasn't been confirmed —
// flagged honestly rather than assumed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: /social science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 9 });
    console.log("Created new Grade 9 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Civics and Local Governance" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Democracy in Practice",
      title: "Civics and Local Governance",
      order_index: 1,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Democratic Decision-Making" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Democratic Decision-Making",
      explanation_text:
        "A democratic decision is one made with the participation of everyone it affects, following fair and lawful process — not one made unilaterally by whoever holds the most power, money, or authority in the moment.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `options` presents several plausible responses to
  // a civic scenario; `correct_hotspot_id` (stripped before the
  // client sees it) names the id of the option that best reflects
  // democratic/lawful process.
  const civicChallenges = [
    {
      title: "Gram Sabha Budget Decision",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label:
          "Your village Panchayat has surplus funds this year. How should it decide what to spend them on?",
        options: [
          { id: "o1", label: "The Sarpanch alone decides, since they were elected to lead" },
          { id: "o2", label: "Hold a Gram Sabha meeting so all villagers can discuss and prioritize needs" },
          { id: "o3", label: "Whoever donated the most to the last campaign gets to decide" },
          { id: "o4", label: "Split it equally with no discussion, to avoid any conflict" },
        ],
        correct_hotspot_id: "o2",
        hint: "Democratic decision-making means giving everyone affected a voice, not just the leader or the wealthiest.",
      },
    },
    {
      title: "Right to Information Request",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label:
          "A citizen files an RTI request asking how road-repair funds were spent in their ward. What should happen next, under the law?",
        options: [
          { id: "p1", label: "The officer ignores it since the citizen isn't a contractor" },
          { id: "p2", label: "The department must respond within the legally set time limit with the requested information" },
          { id: "p3", label: "The request is forwarded to the citizen's employer for approval" },
          { id: "p4", label: "Only journalists are allowed to file such requests" },
        ],
        correct_hotspot_id: "p2",
        hint: "The Right to Information Act gives any citizen the right to request such records, with a legal deadline for a response.",
      },
    },
    {
      title: "Election Day Dilemma",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label:
          "On election day, a candidate's supporter offers voters cash if they vote a certain way. What should a citizen who sees this do?",
        options: [
          { id: "q1", label: "Accept the cash — everyone else is probably doing it too" },
          { id: "q2", label: "Stay silent, since it isn't their election to worry about" },
          { id: "q3", label: "Report the bribery attempt to election officials, since it undermines free and fair voting" },
          { id: "q4", label: "Confront the supporter directly and take the cash for themselves as compensation" },
        ],
        correct_hotspot_id: "q3",
        hint: "Free and fair elections depend on voters choosing without coercion or bribery — reporting protects everyone's right to vote freely.",
      },
    },
  ];

  for (const challenge of civicChallenges) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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
