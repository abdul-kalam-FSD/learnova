require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 7 Biology hole in the integrated Science subject —
// Grade 7 previously had Physics (Electric Circuits) and Chemistry
// (via seedScienceGrade7.js), but no Biology. Grounded in the
// current "Curiosity" textbook (NCF-SE 2023, 2026-27 session),
// confirmed 12-chapter list, Ch.9 "Life Processes in Animals" — a
// real Grade 7 Biology chapter covering how animals digest food.
//
// Gap 1 fix: Biology is not a separate top-level Subject below Grade
// 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Biology" for mastery/analytics.
//
// Reuses BIO_VIRTUAL_LAB (same hotspot-diagram single-choice check as
// the Grade 5/6/9/10/11 versions), applied to a digestive-system
// diagram instead of a cell or classification diagram.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Life Processes in Animals" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Biology",
      title: "Life Processes in Animals",
      order_index: 1,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "The Journey of Food Through the Body" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "The Journey of Food Through the Body",
      explanation_text:
        "Digestion breaks food down step by step so the body can absorb it. Food is chewed and mixed with saliva in the mouth, churned with acid in the stomach, broken down further and absorbed in the small intestine, and whatever's left has its water absorbed in the large intestine before leaving the body.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const labChallenges = [
    {
      title: "Identify Where Digestion Begins",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "digestive_system_diagram",
        prompt: "Click the organ where food is first chewed and mixed with saliva.",
        hotspots: [
          { id: "h1", label: "Mouth", x: 50, y: 10 },
          { id: "h2", label: "Stomach", x: 45, y: 45 },
          { id: "h3", label: "Small Intestine", x: 50, y: 65 },
          { id: "h4", label: "Large Intestine", x: 55, y: 80 },
        ],
        correct_hotspot_id: "h1",
        hint: "This is the very first organ food passes through, where chewing happens.",
      },
    },
    {
      title: "Identify the Acid Churn",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "digestive_system_diagram",
        prompt: "Click the organ where food is churned and mixed with strong acid.",
        hotspots: [
          { id: "h1", label: "Mouth", x: 50, y: 10 },
          { id: "h2", label: "Stomach", x: 45, y: 45 },
          { id: "h3", label: "Small Intestine", x: 50, y: 65 },
          { id: "h4", label: "Large Intestine", x: 55, y: 80 },
        ],
        correct_hotspot_id: "h2",
        hint: "This sac-like organ churns food and breaks it down using acid before passing it further along.",
      },
    },
    {
      title: "Identify Where Water Is Absorbed",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "digestive_system_diagram",
        prompt: "Click the organ where water is absorbed from whatever food is left, before it leaves the body.",
        hotspots: [
          { id: "h1", label: "Stomach", x: 45, y: 40 },
          { id: "h2", label: "Small Intestine", x: 50, y: 60 },
          { id: "h3", label: "Large Intestine", x: 55, y: 75 },
          { id: "h4", label: "Liver", x: 30, y: 40 },
        ],
        correct_hotspot_id: "h3",
        hint: "This is the last stop before waste leaves the body — its main job here is absorbing leftover water.",
      },
    },
  ];

  for (const challenge of labChallenges) {
    const exists = await GameContent.findOne({
      game_type: "BIO_VIRTUAL_LAB",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_VIRTUAL_LAB",
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
