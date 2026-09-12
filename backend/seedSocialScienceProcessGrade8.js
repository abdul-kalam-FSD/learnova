require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-gap fill (genuine gap list item 6): Grade 8 Social Science
// has History and Geography strand content (seedHistoryGrade8.js /
// seedHistoryCauseEffectGrade8.js / seedGeographyGrade8.js /
// seedGeographyFeatureGrade8.js) but no Civics strand content at all.
// Curriculum reference: NCERT's Class 8 civics syllabus covers "Why
// Do We Need a Parliament?" — the ordered legislative process by
// which a proposed law actually becomes one. Deliberately NOT using
// the new NCF-SE "Exploring Society: India and Beyond, Vol II"
// Judiciary chapter as a source: that book's Chapter IV ("The Role of
// Judiciary in our Society") was withdrawn by NCERT in March 2026
// after inappropriate material was found in it, so it isn't a stable
// or currently-valid reference — "How a Bill Becomes a Law" is a
// long-standing, unaffected topic instead. Reuses the existing
// SOCIAL_SCIENCE_PROCESS_BUILDER mechanic (same ordered-sequence
// check as seedSocialScienceProcessGrade6.js / Grade9.js), no new
// backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 8 Social Science subject not found — run seedHistoryGrade8.js or seedGeographyGrade8.js first.");
  }
  console.log("Using existing subject:", subject._id);

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Why Do We Need a Parliament?" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "The Indian Constitution and Parliament",
      title: "Why Do We Need a Parliament?",
      order_index: 1,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "How a Bill Actually Becomes a Law" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "How a Bill Actually Becomes a Law",
      explanation_text:
        "A law doesn't exist just because someone proposes it — it has to pass through a fixed sequence of debate, voting, and formal approval first. A bill is introduced, then discussed and voted on by elected representatives, and only becomes law once it clears every one of those stages, ending with the President's assent.",
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
      title: "Process: How a Bill Becomes a Law",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a bill actually becomes a law in India.",
        scrambled_steps: [
          { id: "m3", label: "Members of Parliament debate the bill and vote on whether to pass it" },
          { id: "m1", label: "A Member of Parliament introduces a new bill in either house of Parliament" },
          { id: "m4", label: "The President gives assent to the bill, and it officially becomes law" },
          { id: "m2", label: "The bill is discussed and, if needed, reviewed by a parliamentary committee" },
        ],
        correct_order: ["m1", "m2", "m3", "m4"],
        hint: "A bill has to be introduced and reviewed before it can be debated and voted on — presidential assent is always the final step, not the first.",
      },
    },
    {
      title: "Process: Holding the Government Accountable in Parliament",
      difficulty: "easy",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order Parliament actually holds ministers accountable for their decisions.",
        scrambled_steps: [
          { id: "n3", label: "The minister must answer the question in Parliament, on the record" },
          { id: "n1", label: "A Member of Parliament notices a problem with how a government department is being run" },
          { id: "n4", label: "If the answer is unsatisfactory, Parliament can debate and criticize the decision further" },
          { id: "n2", label: "The MP raises a formal question to the minister responsible for that department" },
        ],
        correct_order: ["n1", "n2", "n3", "n4"],
        hint: "A concern has to be noticed and formally raised before a minister can be made to answer it — follow-up debate only happens after that answer is given.",
      },
    },
    {
      title: "Process: Why Elected Representatives Are Needed",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order representative democracy actually works, from citizen to law.",
        scrambled_steps: [
          { id: "p3", label: "The MPs meet in Parliament to debate and decide on laws for the whole country" },
          { id: "p1", label: "Since millions of citizens can't all discuss every law in person, they elect a smaller number of MPs to represent them" },
          { id: "p4", label: "The laws Parliament passes then apply to every citizen, including those who couldn't attend the debate themselves" },
          { id: "p2", label: "Each elected MP represents the views of the voters in their own constituency" },
        ],
        correct_order: ["p1", "p2", "p3", "p4"],
        hint: "Representation exists because direct participation by everyone isn't practical — election has to come before representation, and representation before the laws that bind everyone.",
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
