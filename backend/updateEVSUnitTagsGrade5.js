require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");

// Batch 2 / Grade 5 — Decision E-1 (APPROVED) + Decision E-3 (APPROVED).
//
// Metadata-only fix: retags each existing Grade 5 EVS chapter's
// `unit_name` so it matches the real current NCERT "Our Wondrous
// World" (2026-27 session) 5-unit structure where the chapter's
// topic genuinely belongs to one of those units (E-1), and clearly
// marks the two chapters that do NOT belong to any of the 10 current
// chapters as non-NCERT enrichment rather than silently leaving them
// under an invented unit name that looks like real curriculum
// grouping (E-3).
//
// No concepts, no GameContent, no chapter titles are touched — this
// script only updates the Chapter.unit_name field on documents that
// already exist, via findOne + updateOne, so it is idempotent and
// safe to re-run.
//
// Mapping used (see BATCH 2 — GRADE 5 PHASE 1 AUDIT, section C):
//   "How a River Reaches the Sea"              -> Unit 1: Life Around Us
//     (matches NCERT Ch.2 "Journey of a River")
//   "Circuits: Bulbs, Buzzers, and Switches"    -> Unit 4: Things Around Us
//     (this chapter is being expanded, see seedMathGrade5_... sibling
//     pattern equivalent for EVS: seedEVSEnergyExpansionGrade5.js, to
//     represent NCERT Ch.7 "Energy: How Things Work")
//   "Sharing What We Have Fairly"               -> left as Learnova
//     enrichment; no real NCERT chapter match exists for civic
//     resource-sharing in "Our Wondrous World"'s 10 chapters, so its
//     unit_name is set to an explicit enrichment label instead of
//     "Living Together" (which reads like a real textbook unit name)
//   "How Seeds Grow"                            -> enrichment (no
//     confirmed match in the current book; was sourced from the
//     retired "Looking Around" edition)
//   "The Air We Breathe"                        -> enrichment (no
//     NCERT citation was ever recorded for this chapter)
const RETAGS = [
  { chapterTitle: "How a River Reaches the Sea", newUnitName: "Life Around Us" },
  {
    chapterTitle: "Circuits: Bulbs, Buzzers, and Switches",
    newUnitName: "Things Around Us",
  },
  {
    chapterTitle: "Sharing What We Have Fairly",
    newUnitName: "Learnova Enrichment (not an NCERT \"Our Wondrous World\" chapter)",
  },
  {
    chapterTitle: "How Seeds Grow",
    newUnitName: "Learnova Enrichment (not an NCERT \"Our Wondrous World\" chapter)",
  },
  {
    chapterTitle: "The Air We Breathe",
    newUnitName: "Learnova Enrichment (not an NCERT \"Our Wondrous World\" chapter)",
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    console.log("No Grade 5 EVS subject found — nothing to retag.");
    await mongoose.disconnect();
    return;
  }

  for (const { chapterTitle, newUnitName } of RETAGS) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.log(`Chapter not found, skipping: "${chapterTitle}"`);
      continue;
    }
    if (chapter.unit_name === newUnitName) {
      console.log(`Already tagged, skipping: "${chapterTitle}"`);
      continue;
    }
    const previousUnitName = chapter.unit_name;
    chapter.unit_name = newUnitName;
    await chapter.save();
    console.log(
      `Retagged "${chapterTitle}": unit_name "${previousUnitName}" -> "${newUnitName}"`
    );
  }

  console.log("Done.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
