require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 6 Biology hole in the integrated Science subject —
// Grade 6 previously only had Physics content (Exploring Magnets, via
// seedPhysicsMatchGrade6.js). Grounded in the current "Curiosity"
// textbook (NCF-SE 2023, 2026-27 session), whose confirmed chapter
// list includes "Diversity in Living World" — a real Grade 6 Biology
// chapter covering how living things are grouped by shared features.
//
// Gap 1 fix: Biology is not a separate top-level Subject below Grade
// 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Biology" for mastery/analytics.
//
// Reuses BIO_VIRTUAL_LAB (same hotspot-diagram single-choice check as
// the Grade 5/9/10/11 versions), applied to a classification diagram
// instead of a cell or germination diagram.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 6 });
    console.log("Created new Grade 6 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Diversity in the Living World" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Diversity in the Living World",
      order_index: 2,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Grouping Living Things by Shared Features" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Grouping Living Things by Shared Features",
      explanation_text:
        "Living things can be sorted into broad groups based on features they share, like how they move, what they eat, and how they're built. Plants make their own food and don't move from place to place; animals can't make their own food and usually can move; and some tiny living things like bacteria don't fit neatly into either group.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same hotspot-diagram single-choice check as
  // BIO_VIRTUAL_LAB elsewhere — student clicks the group matching
  // `prompt`; `correct_hotspot_id` is stripped before the client
  // sees it.
  const labChallenges = [
    {
      title: "Identify the Plant Group",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "classification_diagram",
        prompt: "Click the group that makes its own food and doesn't move from place to place.",
        hotspots: [
          { id: "h1", label: "Plants", x: 20, y: 30 },
          { id: "h2", label: "Animals", x: 50, y: 30 },
          { id: "h3", label: "Bacteria", x: 80, y: 30 },
        ],
        correct_hotspot_id: "h1",
        hint: "This group is rooted in one place and uses sunlight to make its own food.",
      },
    },
    {
      title: "Identify the Animal Group",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "classification_diagram",
        prompt: "Click the group that cannot make its own food and usually moves around to find it.",
        hotspots: [
          { id: "h1", label: "Plants", x: 20, y: 30 },
          { id: "h2", label: "Animals", x: 50, y: 30 },
          { id: "h3", label: "Fungi", x: 80, y: 30 },
        ],
        correct_hotspot_id: "h2",
        hint: "This group has to search for its food, which is why most of its members can move.",
      },
    },
    {
      title: "Identify the Odd One Out",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "classification_diagram",
        prompt: "A mushroom doesn't make its own food like a plant, but it also doesn't move around like an animal. Click the group it actually belongs to.",
        hotspots: [
          { id: "h1", label: "Plants", x: 15, y: 40 },
          { id: "h2", label: "Animals", x: 40, y: 40 },
          { id: "h3", label: "Fungi", x: 65, y: 40 },
          { id: "h4", label: "Bacteria", x: 90, y: 40 },
        ],
        correct_hotspot_id: "h3",
        hint: "Mushrooms and moulds belong to their own group — not plants, not animals.",
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
