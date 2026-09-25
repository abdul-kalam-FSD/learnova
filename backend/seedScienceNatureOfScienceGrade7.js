require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Science Batch 2. Adds the current NCERT Class 7 Science
// ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter 1, "The
// Ever-Evolving World of Science" — verified via multiple independent
// sources as the opening, introductory chapter: it frames science as
// an ongoing process of observation, questioning, and experimentation
// rather than a fixed set of facts, and (per several sources) has no
// end-of-chapter exercise of its own — a deliberately short chapter,
// hence only 2 concepts here rather than the usual 2-4+ range.
//
// This chapter's content is about the *process* of doing science
// (observation -> hypothesis -> experiment -> conclusion), not any one
// discipline, so it reuses two already-registered, subject-agnostic
// mechanics rather than a Chemistry/Physics/Biology-prefixed one:
//   - HISTORY_CAUSE_EFFECT_MATCH's mapping-equality check (matching a
//     science scenario to which step of inquiry it demonstrates)
//   - SOCIAL_SCIENCE_PROCESS_BUILDER's ordering check (sequencing the
//     steps of an investigation)
// Both are reused purely for their interaction shape; no new mechanic.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Ever-Evolving World of Science" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Foundations of Science",
      title: "The Ever-Evolving World of Science",
      order_index: 1,
      strand: "General Science",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---------- Concept 1: recognizing the steps ----------
  let conceptSteps = await Concept.findOne({ chapter_id: chapter._id, title: "Observation, Questions, and Experiments" });
  if (!conceptSteps) {
    conceptSteps = await Concept.create({
      chapter_id: chapter._id,
      title: "Observation, Questions, and Experiments",
      explanation_text:
        "Science starts with noticing something (observation), guessing a reason for it (hypothesis), and testing that guess in a fair, controlled way (experiment) to reach a conclusion. Curiosity — asking 'why' about ordinary things — is what starts the whole process.",
    });
    console.log("Created concept:", conceptSteps._id);
  } else {
    console.log("Using existing concept:", conceptSteps._id);
  }

  const causeEffectChallenges = [
    {
      title: "Match: Step of a Science Investigation",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each part of the story to the step of scientific thinking it shows.",
        slots: [
          { id: "s1", label: "Noticing that bread left out for a week has green fuzzy spots on it" },
          { id: "s2", label: "Guessing the spots are caused by something living growing on the bread" },
          { id: "s3", label: "Leaving one piece of bread sealed and one open, then comparing them after a week" },
        ],
        components: [
          { id: "c1", label: "Observation" },
          { id: "c2", label: "Hypothesis" },
          { id: "c3", label: "Experiment" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Notice first, guess a reason second, then test the guess.",
      },
    },
    {
      title: "Match: Reading Evidence Like a Scientist",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each part of the story to the step of scientific thinking it shows.",
        slots: [
          { id: "s1", label: "A plant near the window leans toward the light" },
          { id: "s2", label: "Guessing that plants grow toward light because they need it to make food" },
          { id: "s3", label: "Turning the pot around and checking if the plant leans back toward the window again" },
          { id: "s4", label: "Concluding that light direction does affect which way a plant grows, since it leaned back" },
        ],
        components: [
          { id: "c1", label: "Observation" },
          { id: "c2", label: "Hypothesis" },
          { id: "c3", label: "Experiment" },
          { id: "c4", label: "Conclusion" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3", s4: "c4" },
        hint: "A conclusion only comes after the experiment has actually been run and checked.",
      },
    },
  ];

  for (const challenge of causeEffectChallenges) {
    const exists = await GameContent.findOne({ game_type: "HISTORY_CAUSE_EFFECT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_CAUSE_EFFECT_MATCH",
        concept_id: conceptSteps._id,
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

  // ---------- Concept 2: the order of an investigation ----------
  let conceptOrder = await Concept.findOne({ chapter_id: chapter._id, title: "The Order of a Scientific Investigation" });
  if (!conceptOrder) {
    conceptOrder = await Concept.create({
      chapter_id: chapter._id,
      title: "The Order of a Scientific Investigation",
      explanation_text:
        "A real investigation always follows the same order: notice something, guess a reason, test the guess, then decide whether the test supports the guess. Skipping ahead — testing before you've even noticed a pattern, for example — isn't really doing science.",
    });
    console.log("Created concept:", conceptOrder._id);
  } else {
    console.log("Using existing concept:", conceptOrder._id);
  }

  const processChallenges = [
    {
      title: "Process: Investigating Why the Plant Wilted",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a real investigation would actually happen.",
        scrambled_steps: [
          { id: "g3", label: "Move the plant to a sunnier spot for a week and watch what happens" },
          { id: "g1", label: "Notice that the plant in the corner of the room looks wilted every afternoon" },
          { id: "g4", label: "Conclude that light was the problem, since the plant perked up in the new spot" },
          { id: "g2", label: "Guess that the corner might not be getting enough sunlight" },
        ],
        correct_order: ["g1", "g2", "g3", "g4"],
        hint: "You have to notice a problem before you can guess a cause, and guess a cause before you can test it.",
      },
    },
    {
      title: "Process: Investigating a Squeaky Door",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a real investigation would actually happen.",
        scrambled_steps: [
          { id: "h2", label: "Guess that moisture in the air is making the hinge swell and rub" },
          { id: "h4", label: "Conclude that oil fixed the problem, since the squeak was gone even on a humid day" },
          { id: "h1", label: "Notice that the door only squeaks when it's humid outside" },
          { id: "h3", label: "Oil the hinge and check whether it still squeaks on the next humid day" },
        ],
        correct_order: ["h1", "h2", "h3", "h4"],
        hint: "The conclusion has to come after you've actually checked what the oil did.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({ game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: conceptOrder._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
