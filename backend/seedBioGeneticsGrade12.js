require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes another cell of the Biology 9-12 content gap found during
// the full-project audit: BIO_GENETICS_SIMULATOR previously existed
// only at Grade 10. Links to the existing "Mendelian Inheritance and
// Laws" concept created by seedGrade12_batch2.js — run that first.
//
// IMPORTANT constraint discovered while writing this: the actual
// GeneticsSimulator.jsx component hardcodes a 2x2 grid
// (`gridTemplateColumns: "auto repeat(2, 1fr)"`, and `cellAt(row,col)`
// throws if a rendered (row,col) isn't in `cells`). A true dihybrid
// cross needs a 4x4 grid, which this component cannot render — so
// rather than ship content that would crash on load, this uses
// X-linked recessive inheritance instead: still a genuinely harder,
// Grade-12-appropriate topic (ties to the same chapter's "Chromosomal
// Theory and Sex Determination" and "Mendelian Disorders" concepts),
// and it fits the real 2x2 grid exactly like every other grade's
// Genetics Simulator content.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Mendelian Inheritance and Laws" });
  if (!concept) {
    console.error(
      "Concept 'Mendelian Inheritance and Laws' not found — run seedGrade12_batch2.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const levels = [
    {
      title: "Carrier Mother x Unaffected Father — Color Blindness",
      difficulty: "hard",
      order_index: 1,
      payload: {
        scenario:
          "Cross a carrier mother (XᶜXᶜ' — one normal, one color-blindness allele) with an unaffected father (XᶜY) for red-green color blindness, an X-linked recessive trait.",
        trait: "Xᶜ = Normal vision (dominant), Xᶜ' = Color blindness (recessive), carried only on the X chromosome",
        parent1Label: "Mother: XᶜXᶜ'",
        parent2Label: "Father: XᶜY",
        colAlleles: ["Xᶜ", "Xᶜ'"],
        rowAlleles: ["Xᶜ", "Y"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["XᶜXᶜ", "XᶜXᶜ'", "XᶜY", "Xᶜ'Y"],
        correct_mapping: { cell_0_0: "XᶜXᶜ", cell_0_1: "XᶜXᶜ'", cell_1_0: "XᶜY", cell_1_1: "Xᶜ'Y" },
        explanation:
          "Daughters always receive an X from their father, so both daughters get his Xᶜ and are never color-blind (XᶜXᶜ or XᶜXᶜ' — at most carriers). Sons receive Y from their father and an X from their mother, so a son has a 50% chance of inheriting Xᶜ' and being color-blind (Xᶜ'Y) — this is why X-linked recessive traits appear far more often in males.",
        hint: "Sons take the Y from their father, so a son's phenotype depends entirely on which X his mother contributed.",
      },
    },
    {
      title: "Affected Father x Carrier Mother — Hemophilia",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scenario:
          "Cross an affected father (XʰY, hemophilia) with a carrier mother (XᴴXʰ) — the cross that can produce an affected daughter, unlike the more commonly taught case.",
        trait: "Xᴴ = Normal clotting (dominant), Xʰ = Hemophilia (recessive), X-linked",
        parent1Label: "Mother: XᴴXʰ",
        parent2Label: "Father: XʰY",
        colAlleles: ["Xᴴ", "Xʰ"],
        rowAlleles: ["Xʰ", "Y"],
        cells: [
          { id: "cell_0_0", row: 0, col: 0 },
          { id: "cell_0_1", row: 0, col: 1 },
          { id: "cell_1_0", row: 1, col: 0 },
          { id: "cell_1_1", row: 1, col: 1 },
        ],
        genotypeOptions: ["XᴴXʰ", "XʰXʰ", "XᴴY", "XʰY"],
        correct_mapping: { cell_0_0: "XᴴXʰ", cell_0_1: "XʰXʰ", cell_1_0: "XᴴY", cell_1_1: "XʰY" },
        explanation:
          "Because the father is affected, every daughter receives his only X (Xʰ). A daughter who also inherits Xʰ from her carrier mother becomes XʰXʰ — affected — with 50% probability. Sons receive Y from their father, so a son's phenotype depends only on the mother's contribution, again 50% affected. This cross shows X-linked recessive disorders CAN affect daughters, contrary to the common oversimplification that only sons are affected.",
        hint: "The father can only give an X-carrying Xʰ to daughters and Y to sons — work out each child's other allele from the mother.",
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
