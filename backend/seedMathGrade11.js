require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 11 Mathematics hole. Grade 11 previously had
// Biology (7 batch files, fully seeded) and Chemistry, but no
// Mathematics, Applied Mathematics, Computer Science, or Informatics
// Practices at all — despite Mathematics being a core Science-stream
// subject the master prompt explicitly requires (Phase 4, Grades
// 11-12: "Physics, Chemistry, Biology, Mathematics, Applied
// Mathematics, Computer Science, Informatics Practices").
//
// Grounded in the current NCERT Class 11 Mathematics textbook
// (unchanged 14-chapter core sequence for the 2026-27 CBSE session,
// after the removal of Mathematical Induction and Mathematical
// Reasoning during syllabus rationalisation), Chapter 1 "Sets" — the
// foundational chapter the rest of the book (Relations and
// Functions, Probability, etc.) builds on.
//
// Standalone "Mathematics" Subject at Grade 11 — matches the pattern
// already used for Grade 11 Biology/Chemistry/Physics, consistent
// with the master prompt's Grade 11-12 elective/stream architecture.
//
// Reuses MATH_NUMBER_MACHINE (same numeric dial-answer check as the
// Grade 6/7/8 versions), applied to set-cardinality problems using
// the inclusion-exclusion principle instead of equations or roots.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 11 });
    console.log("Created new Grade 11 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Sets" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Sets",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Counting Elements with the Inclusion-Exclusion Principle" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Counting Elements with the Inclusion-Exclusion Principle",
      explanation_text:
        "When two sets share some elements, simply adding their sizes double-counts the overlap. The inclusion-exclusion principle fixes this: the number of elements in A union B equals the number in A, plus the number in B, minus the number in both (the intersection), so the shared elements are only counted once.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const machineLevels = [
    {
      title: "Machine: Union of Disjoint Sets",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "Set A has 5 elements, Set B has 7 elements, and A and B share no elements. |A ∪ B| = ?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 12,
        hint: "With no overlap, the union is simply the sum of the two set sizes.",
      },
    },
    {
      title: "Machine: Union with Overlap",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "|A| = 15, |B| = 10, |A ∩ B| = 4. |A ∪ B| = ?",
        dial_min: 0,
        dial_max: 40,
        correct_answer: 21,
        hint: "Add the two set sizes, then subtract the overlap once so it isn't counted twice: 15 + 10 - 4.",
      },
    },
    {
      title: "Machine: Find the Missing Intersection",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "|A| = 18, |B| = 14, |A ∪ B| = 25. |A ∩ B| = ?",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 7,
        hint: "Rearrange the inclusion-exclusion formula: |A ∩ B| = |A| + |B| - |A ∪ B|.",
      },
    },
  ];

  for (const level of machineLevels) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: level.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
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
