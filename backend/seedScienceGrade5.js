require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill + Gap 1 fix (post Grade-4-EVS revision): Grade 5, like
// Grade 4, is EVS in NCERT (Classes 3-5 share one integrated EVS
// subject, not a Science/Social Science split — that split is
// correct only from Grade 6 onward). This is the first Science-side
// content for Grade 5 — seeded directly into the single "EVS"
// subject with a strand tag (per the Gap 1/3 fix), not as a separate
// top-level "Biology" subject or a separate "Science" subject.
//
// Source basis (Gap 5, CORRECTED): originally grounded in NCERT's
// Grade 5 EVS "Looking Around" Chapter 5 ("Seeds and Seeds") and
// Chapter 9 ("Up You Go!"). That citation is now STALE — "Looking
// Around" was replaced by "Our Wondrous World" under NCF-SE 2023 for
// the current 2026-27 session, and the new book's confirmed 10
// chapters (Water; Journey of a River; The Mystery of Food; Our
// School; Our Vibrant Country; Some Unique Places; Energy; Clothes;
// Rhythms of Nature; Earth — Our Shared Home) don't include a
// dedicated seed-germination chapter the way the old book did. Unlike
// Geography (which had an exact new-chapter match), this content
// currently has NO confirmed exact match in the new edition — flagged
// here honestly rather than guessing one. The single-cell-stage,
// hotspot-diagram game content stays valid as an age-appropriate
// plant-growth topic either way, but this citation needs a real
// re-check against "Our Wondrous World" (possibly Ch.9 "Rhythms of
// Nature" if that chapter covers seasonal plant cycles — unconfirmed)
// before it can be called sourced rather than merely plausible.
//
// Reuses BIO_VIRTUAL_LAB (same hotspot-diagram single-choice check as
// the Grade 9/11 versions — see seedGrade9.js / seedBioVirtualLabGrade11.js),
// applied to a seed-germination diagram instead of a cell diagram.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    subject = await Subject.create({ name: "EVS", grade: 5 });
    console.log("Created new Grade 5 EVS subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "How Seeds Grow" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Plants Around Us",
      title: "How Seeds Grow",
      order_index: 1,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Stages of Seed Germination" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Stages of Seed Germination",
      explanation_text:
        "A seed needs water, warmth, and air to start growing. First it swells and its outer coat splits, then a small root grows downward to reach water, then a shoot grows upward toward light, and finally the first leaves open up so the young plant can make its own food.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same hotspot-diagram single-choice check as
  // BIO_VIRTUAL_LAB elsewhere — student clicks the stage matching
  // `prompt`; `correct_hotspot_id` is stripped before the client sees it.
  const labChallenges = [
    {
      title: "Identify the Swelling Seed",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "seed_germination_diagram",
        prompt: "Click the stage where the seed has just taken in water and its coat is starting to split.",
        hotspots: [
          { id: "h1", label: "Swelling Seed", x: 20, y: 70 },
          { id: "h2", label: "Root Growing Down", x: 35, y: 80 },
          { id: "h3", label: "Shoot Growing Up", x: 55, y: 55 },
          { id: "h4", label: "First Leaves Open", x: 75, y: 30 },
        ],
        correct_hotspot_id: "h1",
        hint: "This is the very first stage, before any root or shoot has appeared yet.",
      },
    },
    {
      title: "Identify the Root Stage",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "seed_germination_diagram",
        prompt: "Click the stage where a small root is growing downward to reach water in the soil.",
        hotspots: [
          { id: "h1", label: "Swelling Seed", x: 20, y: 70 },
          { id: "h2", label: "Root Growing Down", x: 35, y: 80 },
          { id: "h3", label: "Shoot Growing Up", x: 55, y: 55 },
          { id: "h4", label: "First Leaves Open", x: 75, y: 30 },
        ],
        correct_hotspot_id: "h2",
        hint: "Roots always grow downward, toward water and to anchor the plant.",
      },
    },
    {
      title: "Identify the First-Leaves Stage",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "seed_germination_diagram",
        prompt: "Click the stage where the first leaves have opened and the young plant can start making its own food.",
        hotspots: [
          { id: "h1", label: "Root Growing Down", x: 35, y: 80 },
          { id: "h2", label: "Shoot Growing Up", x: 55, y: 55 },
          { id: "h3", label: "First Leaves Open", x: 75, y: 30 },
          { id: "h4", label: "Fully Grown Plant", x: 90, y: 10 },
        ],
        correct_hotspot_id: "h3",
        hint: "Leaves are the last of these four stages to appear, and they're needed before the plant can make its own food.",
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
