require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Reuses HISTORY_TIMELINE_BUILDER exactly as the Grade 7/8 Mughal
// Empire versions do (order-sensitive check), with a simple
// biographical sequence (Gandhi's life) rather than dense political
// history.
//
// Gap 5 fix: originally seeded at Grade 4. NCERT has no formal
// History subject at Grade 4 at all — Classes 3-5 are EVS, and the
// freedom-struggle content this drew from is actually Class 8's "Our
// Pasts III". Moved to Grade 8, reusing the "India's Freedom
// Struggle" chapter seedHistoryGrade8.js already created there — this
// becomes that chapter's 2nd concept, a simpler biographical entry
// point alongside the existing "Milestones on the Road to
// Independence" content.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 3 fix: History is not a separate top-level Subject at Grade
  // 8 — it lives inside "Social Science" (reusing the existing
  // subject seeded by seedSocialScienceGrade8-equivalent files, not
  // creating a duplicate), with its chapters tagged strand: "History"
  // for mastery/analytics.
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

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "The Life of Mahatma Gandhi (Simplified)" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "The Life of Mahatma Gandhi (Simplified)",
      explanation_text:
        "Mahatma Gandhi's life had a clear order of key moments — he was born, grew up and studied law, worked in South Africa, and then returned to India to lead the freedom movement. Putting these moments in the right order helps you understand how one part of his life led to the next.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const timelineChallenges = [
    {
      title: "Gandhiji's Early Life",
      difficulty: "easy",
      order_index: 1,
      payload: {
        era_label: "Childhood and Youth",
        scrambled_events: [
          { id: "m1", label: "Gandhiji studies law in London" },
          { id: "m2", label: "Gandhiji is born in Porbandar, Gujarat" },
          { id: "m3", label: "Gandhiji grows up in a small town in India" },
        ],
        correct_order: ["m2", "m3", "m1"],
        hint: "Every life story starts with being born — think about what has to happen before someone can go abroad to study.",
      },
    },
    {
      title: "Gandhiji in South Africa",
      difficulty: "medium",
      order_index: 2,
      payload: {
        era_label: "South Africa Years",
        scrambled_events: [
          { id: "a1", label: "Gandhiji faces unfair treatment because of his race" },
          { id: "a2", label: "Gandhiji moves to South Africa to work as a lawyer" },
          { id: "a3", label: "Gandhiji begins peaceful protests for fair treatment" },
        ],
        correct_order: ["a2", "a1", "a3"],
        hint: "He had to arrive and start working first, before he could face unfair treatment there, before he could respond to it.",
      },
    },
    {
      title: "Gandhiji Returns to India",
      difficulty: "hard",
      order_index: 3,
      payload: {
        era_label: "Return and Leadership",
        scrambled_events: [
          { id: "b1", label: "Gandhiji becomes a leader of India's freedom movement" },
          { id: "b2", label: "Gandhiji returns to India from South Africa" },
          { id: "b3", label: "Gandhiji travels across India to understand people's lives" },
        ],
        correct_order: ["b2", "b3", "b1"],
        hint: "He had to come back and learn about India's people before he could lead a movement for them.",
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
