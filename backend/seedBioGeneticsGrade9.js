require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes part of the Biology 9-12 content gap found during the full-
// project audit: BIO_GENETICS_SIMULATOR previously existed only at
// Grade 10 (seedBioGeneticsGrade10.js), so Grade 9 students never had
// it recommended or shown as a chapter game option — not a bug, since
// the Game Selection Engine (chapterControllers.js / gameControllers.js
// getGameCatalog) only ever offers mechanics with real content, but a
// genuine content gap nonetheless.
//
// Pitched a notch simpler than the Grade 10 file: single dominant/
// recessive trait crosses only, no test-cross framing, and different
// concrete examples throughout (rabbit fur, pea color, earlobes) so
// this isn't just the Grade 10 content re-labeled. Uses the exact
// same GameContent shape and scoring path (mapping-equality check in
// gameControllers.js checkAttempt) as the Grade 10 script — genotype
// options are reusable stamps, not one-use tiles, for the same reason
// documented there.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 9 Science subject not found — run seedGrade9.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Heredity and Traits" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Heredity and Traits",
      title: "Heredity and Traits",
      order_index: 102,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Dominant and Recessive Traits" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Dominant and Recessive Traits",
      explanation_text:
        "Each parent passes one allele for a trait to their offspring. A Punnett square lines up both parents' alleles in a grid so every possible offspring genotype can be read off directly. A dominant allele (capital letter) shows its trait even when paired with a recessive allele (lowercase); the recessive trait only appears when both alleles are recessive.",
    });
    console.log("Created concept:", concept._id);
  }

  const levels = [
    {
      title: "Furry vs Hairless Rabbits (Ff x ff)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Cross a heterozygous (Ff) rabbit with a hairless (ff) rabbit.",
        trait: "F = Furry (dominant), f = hairless (recessive)",
        parent1Label: "Parent 1: Ff",
        parent2Label: "Parent 2: ff",
        colAlleles: ["F", "f"],
        rowAlleles: ["f", "f"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["Ff", "ff"],
        correct_mapping: { cell_0_0: "Ff", cell_0_1: "ff", cell_1_0: "Ff", cell_1_1: "ff" },
        explanation:
          "One parent can only ever pass an 'f' allele. The other parent's 'F' or 'f' decides each box, giving a 1:1 ratio of Ff (furry) to ff (hairless) offspring.",
        hint: "Every box gets an 'f' from Parent 2 — only the letter from Parent 1's column changes.",
      },
    },
    {
      title: "Yellow vs Green Peas (Yy x Yy)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Cross two heterozygous (Yy) pea plants for seed color.",
        trait: "Y = Yellow seeds (dominant), y = green seeds (recessive)",
        parent1Label: "Parent 1: Yy",
        parent2Label: "Parent 2: Yy",
        colAlleles: ["Y", "y"],
        rowAlleles: ["Y", "y"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["YY", "Yy", "yy"],
        correct_mapping: { cell_0_0: "YY", cell_0_1: "Yy", cell_1_0: "Yy", cell_1_1: "yy" },
        explanation:
          "This cross gives a 1 YY : 2 Yy : 1 yy genotype ratio. Since Y (yellow) is dominant, YY and Yy peas both look yellow — a 3 Yellow : 1 Green phenotype ratio overall.",
        hint: "Combine the letter above each column with the letter beside each row for that box.",
      },
    },
    {
      title: "Attached vs Free Earlobes (Ee x ee)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "One parent is a carrier (Ee) and the other has attached earlobes (ee).",
        trait: "E = Free earlobes (dominant), e = attached earlobes (recessive)",
        parent1Label: "Parent 1: Ee",
        parent2Label: "Parent 2: ee",
        colAlleles: ["E", "e"],
        rowAlleles: ["e", "e"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["Ee", "ee"],
        correct_mapping: { cell_0_0: "Ee", cell_0_1: "ee", cell_1_0: "Ee", cell_1_1: "ee" },
        explanation:
          "Parent 2 can only contribute an 'e' allele, so every child gets at least one 'e'. Half the children get 'E' from Parent 1 (free earlobes, Ee) and half get 'e' (attached earlobes, ee) — a 1:1 ratio.",
        hint: "Parent 2's row is all 'e' — look at Parent 1's column to see which letter joins it in each box.",
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
