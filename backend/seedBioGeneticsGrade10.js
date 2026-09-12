require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// First of Priority 7's three Biology mechanics (Genetics Simulator,
// then Diagnosis, then Specimen Analysis). Scored via the same
// mapping-equality check as Circuit Builder/Reaction Lab/etc (see
// gameControllers.js checkAttempt) — attempt.mapping (cellId ->
// chosen genotype string) compared key-by-key against
// payload.correct_mapping. Genotype options are reusable stamps
// (e.g. "TT", "Tt", "tt"), not one-use tile instances, because a
// genotype can legitimately be the correct outcome for more than one
// box in the same cross — using instance-based tiles here would make
// two interchangeable-but-distinct tile ids arbitrarily "more correct"
// than the other for a given box, which is the bug class this
// component was rebuilt to avoid.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Biology now lives inside the integrated "Science"
  // subject (see seedGrade10.js) rather than its own top-level
  // Subject, so this must match "Science" too, not just "Biology".
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science subject not found — run seedGrade10.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Genetics and Heredity" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Genetics and Heredity",
      title: "Genetics and Heredity",
      order_index: 101,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Punnett Squares and Monohybrid Crosses" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Punnett Squares and Monohybrid Crosses",
      explanation_text:
        "A Punnett square predicts the genotypes of offspring from a genetic cross by combining each parent's alleles across a grid. Reading the resulting genotype ratio, in turn, predicts the phenotype ratio among the offspring.",
    });
    console.log("Created concept:", concept._id);
  }

  const levels = [
    {
      title: "Tall vs Short Pea Plants (Tt x Tt)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Cross two heterozygous (Tt) pea plants.",
        trait: "T = Tall (dominant), t = short (recessive)",
        parent1Label: "Parent 1: Tt",
        parent2Label: "Parent 2: Tt",
        colAlleles: ["T", "t"],
        rowAlleles: ["T", "t"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["TT", "Tt", "tt"],
        correct_mapping: { cell_0_0: "TT", cell_0_1: "Tt", cell_1_0: "Tt", cell_1_1: "tt" },
        explanation:
          "This cross gives a 1 TT : 2 Tt : 1 tt genotype ratio. Since T (tall) is dominant, both TT and Tt plants are tall — so the phenotype ratio is 3 Tall : 1 short.",
        hint: "Combine the column allele and the row allele for each box — capital letters come first in a genotype.",
      },
    },
    {
      title: "Round vs Wrinkled Seeds (Rr x rr)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Cross a heterozygous (Rr) pea plant with a homozygous recessive (rr) pea plant.",
        trait: "R = Round seeds (dominant), r = wrinkled seeds (recessive)",
        parent1Label: "Parent 1: Rr",
        parent2Label: "Parent 2: rr",
        colAlleles: ["R", "r"],
        rowAlleles: ["r", "r"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["Rr", "rr"],
        correct_mapping: { cell_0_0: "Rr", cell_0_1: "rr", cell_1_0: "Rr", cell_1_1: "rr" },
        explanation:
          "This is a test cross: crossing a heterozygote (Rr) with a homozygous recessive (rr) always gives a 1:1 genotype ratio of Rr to rr, and since R is dominant, that's also a 1 Round : 1 wrinkled phenotype ratio — the classic way to test whether an unknown round-seeded plant is RR or Rr.",
        hint: "One parent only ever contributes an 'r' allele — the other parent's allele decides each box.",
      },
    },
    {
      title: "Brown vs Blue Eyes, Two Carrier Parents (Bb x Bb)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Cross two parents who are both carriers (Bb) for a simplified eye-color trait.",
        trait: "B = Brown eyes (dominant), b = blue eyes (recessive)",
        parent1Label: "Parent 1: Bb",
        parent2Label: "Parent 2: Bb",
        colAlleles: ["B", "b"],
        rowAlleles: ["B", "b"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["BB", "Bb", "bb"],
        correct_mapping: { cell_0_0: "BB", cell_0_1: "Bb", cell_1_0: "Bb", cell_1_1: "bb" },
        explanation:
          "Two Bb (carrier) parents give a 1 BB : 2 Bb : 1 bb genotype ratio. BB and Bb offspring are both brown-eyed, so the phenotype ratio is 3 Brown : 1 Blue — this is why two brown-eyed parents can still have a blue-eyed child.",
        hint: "Two carrier (Bb) parents can each pass on either allele — work through all four combinations before picking a genotype for each box.",
      },
    },
  ];

  for (const level of levels) {
    const exists = await GameContent.findOne({ game_type: "BIO_GENETICS_SIMULATOR", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_GENETICS_SIMULATOR",
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
