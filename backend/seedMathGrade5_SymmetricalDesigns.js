require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 10 "Symmetrical
// Designs" (2026-27 session). Confirmed via a current CBSE school's
// 2026-27 academic calendar ("draw different shapes and show their
// symmetry"). Direct Grade 5 continuation of Grade 4's "Fun with
// Symmetry" chapter, which deliberately reused MATH_SHAPE_MATCH
// (documented there as the right mechanic since no dedicated symmetry
// mechanic exists). Same choice repeated here, now applied to more
// complex composite designs rather than single basic shapes —
// appropriate for the Grade 5 step up. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 5 });
    console.log("Created new Grade 5 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Symmetrical Designs" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Geometry Basics",
      title: "Symmetrical Designs",
      order_index: 10,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Symmetry in Composite Designs" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Symmetry in Composite Designs",
      explanation_text:
        "A design made of several shapes together — like a rangoli, a paper cut-out, or a tiled border — is symmetric if it has at least one line along which folding makes both halves match exactly. Some designs have more than one line of symmetry; others, especially ones with an uneven mix of shapes on each side, have none at all. Looking at a whole pattern rather than a single shape means checking that every part of the design, not just one piece, matches across the fold line.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const designChallenges = [
    {
      title: "Match: Design to Its Number of Symmetry Lines",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each design to how many lines of symmetry it has.",
        slots: [
          { id: "s1", label: "A rangoli made of 8 identical petals arranged evenly around a centre" },
          { id: "s2", label: "A border pattern made of one repeated letter 'A' shape" },
          { id: "s3", label: "A design with a triangle on the left and a different-sized circle on the right" },
        ],
        components: [
          { id: "c1", label: "8 lines of symmetry" },
          { id: "c2", label: "1 line of symmetry" },
          { id: "c3", label: "0 lines of symmetry" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "An evenly-petalled design folds along each petal's centre line; a lopsided design with different shapes on each side usually has no matching fold at all.",
      },
    },
    {
      title: "Match: Is the Paper Cut-Out Symmetric?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each folded-paper cut-out description to whether it is symmetric.",
        slots: [
          { id: "s1", label: "A paper folded once, a shape cut through the fold, then unfolded" },
          { id: "s2", label: "A paper folded once, but the shape is cut only through one layer, missing the fold" },
          { id: "s3", label: "A paper folded and cut on both layers exactly along the same line" },
        ],
        components: [
          { id: "c1", label: "Symmetric — cutting through the fold line always produces two matching halves" },
          { id: "c2", label: "Not symmetric — the two halves will be different shapes" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1" },
        hint: "The fold line becomes the line of symmetry — as long as both layers are cut identically along it, the unfolded shape matches on both sides.",
      },
    },
    {
      title: "Match: Combined Shape to Its Symmetry",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each combined shape (made of two simpler shapes joined together) to its correct number of symmetry lines.",
        slots: [
          { id: "s1", label: "A square with an identical triangle attached to the top, point up, centred exactly on the square's top edge" },
          { id: "s2", label: "A rectangle with a semicircle attached off-centre on one short side" },
          { id: "s3", label: "Two identical circles touching side by side" },
        ],
        components: [
          { id: "c1", label: "1 line of symmetry — straight down the middle" },
          { id: "c2", label: "0 lines of symmetry — the off-centre piece breaks the balance" },
          { id: "c3", label: "2 lines of symmetry — one down the middle, one straight through both centres" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A combined shape keeps a line of symmetry only if every added piece is placed exactly on that same centre line — anything off-centre breaks it.",
      },
    },
  ];

  for (const challenge of designChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_SHAPE_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_SHAPE_MATCH",
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
