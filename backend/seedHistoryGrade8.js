require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade-coverage gap-fill: History previously only had content at
// Grade 7. Reuses the existing HISTORY_TIMELINE_BUILDER mechanic/
// frontend (no code changes needed) with a Grade 8-appropriate
// topic — India's freedom struggle — rather than Grade 7's Mughal
// Empire.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 3 fix: History is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Social Science"
  // subject, with its chapters tagged strand: "History" for
  // mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // History content into this shape.
  let subject = await Subject.findOne({ grade: 8, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 8 });
    console.log("Created new Grade 8 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "India's Freedom Struggle" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Modern India",
      title: "India's Freedom Struggle",
      order_index: 1,
      strand: "History",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Milestones on the Road to Independence" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Milestones on the Road to Independence",
      explanation_text:
        "India's independence movement built momentum over nearly a century, from early resistance through organized political mobilization to mass civil disobedience — each phase shaping the next, ending in independence in 1947.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 7's Timeline Builder —
  // `scrambled_events` shown out of order, `correct_order` (stripped
  // before the client sees it) is the true chronological sequence.
  const timelineChallenges = [
    {
      title: "From Revolt to Republic",
      difficulty: "medium",
      order_index: 1,
      payload: {
        era_label: "1857 – 1947",
        scrambled_events: [
          { id: "n3", label: "Jallianwala Bagh massacre in Amritsar (1919)" },
          { id: "n1", label: "The Revolt of 1857 against British rule" },
          { id: "n5", label: "India gains independence (1947)" },
          { id: "n2", label: "Indian National Congress is founded (1885)" },
          { id: "n4", label: "Gandhi leads the Salt March / Civil Disobedience Movement (1930)" },
        ],
        correct_order: ["n1", "n2", "n3", "n4", "n5"],
        hint: "Organized political mobilization (a founded organization) came before mass civil disobedience movements.",
      },
    },
    {
      title: "The Final Push for Independence",
      difficulty: "hard",
      order_index: 2,
      payload: {
        era_label: "1930 – 1947",
        scrambled_events: [
          { id: "p2", label: "Quit India Movement launched (1942)" },
          { id: "p1", label: "Civil Disobedience Movement and the Salt March (1930)" },
          { id: "p4", label: "India becomes independent, and is partitioned (1947)" },
          { id: "p3", label: "The Indian National Army under Subhas Chandra Bose fights for independence (1943–45)" },
        ],
        correct_order: ["p1", "p2", "p3", "p4"],
        hint: "The demand for immediate withdrawal ('Quit India') came after the earlier civil disobedience campaigns, not before.",
      },
    },
  ];

  for (const challenge of timelineChallenges) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_TIMELINE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_TIMELINE_BUILDER",
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
