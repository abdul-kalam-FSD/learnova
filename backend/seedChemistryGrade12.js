require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass, Grade 11-12 gap: Grade 12 previously had
// Biology only. This is the first non-Biology Grade 12 subject.
// Reuses CHEMISTRY_REACTION_LAB's mapping-equality mechanic as-is
// (same shared checkAttempt branch as PHYSICS_CIRCUIT_BUILDER — see
// gameControllers.js) rather than introducing a new mechanic, since
// "match each setup to what actually happens" fits electrochemistry
// (which half-reaction happens at which electrode) just as well as
// it fit Grade 10's reaction classification.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: /chemistry/i });
  if (!subject) {
    subject = await Subject.create({ name: "Chemistry", grade: 12 });
    console.log("Created new Grade 12 Chemistry subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Electrochemistry" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Physical Chemistry",
      title: "Electrochemistry",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Electrode Reactions in Galvanic Cells" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Electrode Reactions in Galvanic Cells",
      explanation_text:
        "In a galvanic cell, oxidation always happens at the anode and reduction always happens at the cathode — electrons flow from the anode, through the external circuit, to the cathode. The species with the higher reduction potential gets reduced (gains electrons) at the cathode; the other is oxidized (loses electrons) at the anode.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const electrochemChallenges = [
    {
      title: "Daniell Cell: Match Electrode to Reaction",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "A Daniell cell has a Zn electrode in ZnSO₄ solution and a Cu electrode in CuSO₄ solution, connected by a salt bridge. Assign the correct half-reaction to each electrode.",
        slots: [
          { id: "s1", label: "Zn electrode (anode)" },
          { id: "s2", label: "Cu electrode (cathode)" },
        ],
        components: [
          { id: "c1", label: "Zn(s) → Zn²⁺(aq) + 2e⁻ — oxidation, electrons released" },
          { id: "c2", label: "Cu²⁺(aq) + 2e⁻ → Cu(s) — reduction, electrons gained" },
          { id: "c3", label: "Zn²⁺(aq) + 2e⁻ → Zn(s) — reduction" },
          { id: "c4", label: "Cu(s) → Cu²⁺(aq) + 2e⁻ — oxidation" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "Zinc is more reactive than copper — it's the one that gives up electrons, and the electrode that gives up electrons is always the anode.",
      },
    },
    {
      title: "Which Way Do Electrons Flow?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Three different galvanic cell pairs. For each, identify what happens at the named electrode.",
        slots: [
          { id: "s1", label: "Mg electrode paired with Ag electrode — at the Mg electrode" },
          { id: "s2", label: "Fe electrode paired with Cu electrode — at the Fe electrode" },
          { id: "s3", label: "Ag electrode paired with Cu electrode — at the Ag electrode" },
        ],
        components: [
          { id: "c1", label: "Oxidation — Mg is more reactive than Ag, so it loses electrons" },
          { id: "c2", label: "Oxidation — Fe is more reactive than Cu, so it loses electrons" },
          { id: "c3", label: "Reduction — Ag is less reactive than Cu, so it gains electrons here" },
          { id: "c4", label: "Reduction — this electrode gains electrons" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The more reactive metal in each pair always gives up electrons (oxidation); the less reactive one gains them (reduction).",
      },
    },
    {
      title: "Cell Notation to Electrode Role",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Given the cell notation Zn(s) | Zn²⁺(aq) || Ag⁺(aq) | Ag(s), match each electrode to its role.",
        slots: [
          { id: "s1", label: "Left electrode (written first, before ||)" },
          { id: "s2", label: "Right electrode (written last, after ||)" },
        ],
        components: [
          { id: "c1", label: "Anode — oxidation occurs; by convention always written on the left" },
          { id: "c2", label: "Cathode — reduction occurs; by convention always written on the right" },
          { id: "c3", label: "Cathode — written on the left" },
          { id: "c4", label: "Anode — written on the right" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "Standard cell notation always lists anode | anode solution || cathode solution | cathode — left to right, oxidation to reduction.",
      },
    },
  ];

  for (const challenge of electrochemChallenges) {
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
