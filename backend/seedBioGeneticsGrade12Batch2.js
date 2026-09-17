require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Mendelian Inheritance and Laws"
// (Grade 12 Biology, seedGrade12_batch2.js for the concept +
// seedBioGeneticsGrade12.js for its first 2 BIO_GENETICS_SIMULATOR
// levels) only has those 2 X-linked recessive crosses. This adds 2
// more BIO_GENETICS_SIMULATOR levels to the SAME existing concept,
// this time covering ordinary AUTOSOMAL monohybrid crosses (an
// F1 x F1 self-cross, and a test cross) — the foundational Mendelian
// case the concept is named after, which this concept never actually
// had a level for. Same 2x2-grid Punnett-square payload shape as the
// existing 2 levels (matching the real GeneticsSimulator.jsx
// component's hardcoded 2x2 grid) — no new mechanic. Errors out if
// the subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 12 Science/Biology subject not found — run seedBioGeneticsGrade12.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Principles of Inheritance and Variation" });
  if (!chapter) {
    console.error('Chapter "Principles of Inheritance and Variation" not found — run seedBioGeneticsGrade12.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Mendelian Inheritance and Laws" });
  if (!concept) {
    console.error('Concept "Mendelian Inheritance and Laws" not found — run seedBioGeneticsGrade12.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const levels = [
    {
      title: "Heterozygous x Heterozygous — Monohybrid F1 Self-Cross",
      difficulty: "medium",
      order_index: 3,
      payload: {
        scenario:
          "Cross two heterozygous (Tt) tall pea plants with each other — the classic F1 self-cross Mendel used to reveal the 3:1 phenotype ratio, where T = Tall (dominant) and t = Dwarf (recessive).",
        trait: "T = Tall (dominant), t = Dwarf (recessive)",
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
        genotypeOptions: ["TT", "Tt", "Tt", "tt"],
        correct_mapping: { cell_0_0: "TT", cell_0_1: "Tt", cell_1_0: "Tt", cell_1_1: "tt" },
        explanation:
          "Each parent contributes either T or t with equal chance. The 2x2 grid gives 1 TT : 2 Tt : 1 tt genotypically — but since T is dominant, TT and Tt both look Tall, giving the famous 3 Tall : 1 Dwarf phenotype ratio Mendel observed.",
        hint: "Fill each cell with one allele from the top (Parent 2) and one from the side (Parent 1).",
      },
    },
    {
      title: "Test Cross — Revealing an Unknown Genotype",
      difficulty: "hard",
      order_index: 4,
      payload: {
        scenario:
          "A Tall pea plant of UNKNOWN genotype (TT or Tt) is crossed with a Dwarf plant (tt) — a test cross, used to determine whether the tall parent is homozygous or heterozygous. Here the tall parent turns out to be heterozygous (Tt).",
        trait: "T = Tall (dominant), t = Dwarf (recessive)",
        parent1Label: "Unknown Tall Parent: Tt",
        parent2Label: "Known Dwarf Tester: tt",
        colAlleles: ["t", "t"],
        rowAlleles: ["T", "t"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["Tt", "Tt", "tt", "tt"],
        correct_mapping: { cell_0_0: "Tt", cell_0_1: "Tt", cell_1_0: "tt", cell_1_1: "tt" },
        explanation:
          "The dwarf tester can only contribute t. If the unknown parent is Tt, half the offspring are Tt (Tall) and half are tt (Dwarf) — a 1:1 ratio in the offspring, unlike the all-Tall offspring a TT parent would have produced. This is exactly how a test cross reveals a hidden heterozygous genotype.",
        hint: "The dwarf parent can only ever contribute a t allele — the offspring ratio depends entirely on what the unknown parent contributes.",
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
