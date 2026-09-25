require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 7 had zero Science content of any kind (per the
// audit's curriculum matrix — unlike Grades 6/8/9/10, there was no
// legacy standalone Bio/Chem/Physics subject to migrate here, so
// Gap 1/3's migration never touched Grade 7). Seeded directly into a
// new integrated "Science" subject with a strand tag.
//
// Source basis (Gap 5): grounded in NCERT Class 7 Science ("Curiosity",
// NCF-SE 2023, 2026-27 session), Chapter 2 "Exploring Substances:
// Acidic, Basic and Neutral" — classifying common substances using an
// indicator — reworded into an original classification task, not
// textbook text.
//
// Grade 7 Audit fix (Batch 1, curriculum alignment): this chapter was
// originally titled "Acids, Bases, and Salts", which was the title
// used in the pre-NCF-SE-2023 NCERT edition. The current "Curiosity"
// textbook's actual Chapter 2 title is "Exploring Substances: Acidic,
// Basic and Neutral" — renamed below to match. This only changes the
// chapter's title string; its _id, concepts, and GameContent are
// unaffected.
//
// Reuses CHEMISTRY_REACTION_LAB's mapping-equality check (same
// beaker-to-outcome mapping as the Grade 10 version — see
// seedChemistryReactionLab.js — applied here to substance-to-nature
// classification instead of reaction-type prediction).
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Exploring Substances: Acidic, Basic and Neutral" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Materials Around Us",
      title: "Exploring Substances: Acidic, Basic and Neutral",
      order_index: 1,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Classifying Substances with an Indicator" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Classifying Substances with an Indicator",
      explanation_text:
        "Litmus paper is an indicator that changes colour depending on what it touches: it turns red in an acidic substance (like lemon juice or vinegar), stays or turns blue in a basic substance (like soap or baking soda solution), and doesn't change colour at all for a neutral substance (like pure water).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same mapping-equality check as
  // CHEMISTRY_REACTION_LAB elsewhere — `slots` are substances being
  // tested, `components` are the possible litmus results (more than
  // slots, including plausible decoys), `correct_mapping` names the
  // right result id for each substance slot id.
  const reactionChallenges = [
    {
      title: "Test Three Kitchen Substances",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Blue litmus paper is dipped into three substances. Assign the correct result to each.",
        slots: [
          { id: "s1", label: "Lemon juice" },
          { id: "s2", label: "Baking soda solution" },
          { id: "s3", label: "Pure water" },
        ],
        components: [
          { id: "c1", label: "Blue litmus turns red" },
          { id: "c2", label: "Blue litmus stays blue" },
          { id: "c3", label: "No visible reaction of any kind" },
          { id: "c4", label: "Blue litmus turns green" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Lemon juice is acidic (turns litmus red), baking soda is basic (litmus stays blue), and pure water is neutral.",
      },
    },
    {
      title: "Test Three Household Cleaners",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scenario: "Red litmus paper is dipped into three household substances. Assign the correct result to each.",
        slots: [
          { id: "t1", label: "Soap solution" },
          { id: "t2", label: "Vinegar" },
          { id: "t3", label: "Salt water" },
        ],
        components: [
          { id: "d1", label: "Red litmus turns blue" },
          { id: "d2", label: "Red litmus stays red" },
          { id: "d3", label: "No visible reaction of any kind" },
          { id: "d4", label: "The litmus paper dissolves" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "Soap is basic (red litmus turns blue), vinegar is acidic (red litmus stays red — no change), and salt water is neutral.",
      },
    },
  ];

  for (const challenge of reactionChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_REACTION_LAB",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
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
