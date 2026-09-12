require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Mechanic-diversity pass for Grade 8 History: reuses the existing
// "India's Freedom Struggle" chapter from seedHistoryGrade8.js
// (currently HISTORY_TIMELINE_BUILDER only), adds a new Concept +
// HISTORY_CAUSE_EFFECT_MATCH. Distinct events from the existing
// "Causes and Consequences of Colonial Rule" chapter's Cause-Effect
// content (which covers land revenue, 1857, and Gandhi's movements) —
// this one covers Partition of Bengal, Jallianwala Bagh, and Quit India.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 8 Social Science subject not found — run seedHistoryGrade8.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "India's Freedom Struggle" });
  if (!chapter) {
    throw new Error("Chapter 'India's Freedom Struggle' not found — run seedHistoryGrade8.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Freedom Struggle Events to Their Effects" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Freedom Struggle Events to Their Effects",
      explanation_text:
        "Knowing the order of milestones in the freedom struggle isn't the same as understanding why each one mattered. The Partition of Bengal, the Jallianwala Bagh massacre, and the Quit India Movement each triggered specific, real consequences for the movement.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const causeEffectChallenges = [
    {
      title: "The Partition of Bengal (1905) → Effect",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each part of the Partition of Bengal story to what it actually led to.",
        slots: [
          { id: "s1", label: "Curzon partitioned Bengal, officially citing administrative convenience" },
          { id: "s2", label: "Many Indians saw the partition as an attempt to divide people along religious lines" },
          { id: "s3", label: "Indians launched the Swadeshi movement, boycotting British goods" },
        ],
        components: [
          { id: "c1", label: "Sparked massive protests and further fueled the freedom struggle" },
          { id: "c2", label: "Deepened distrust of British intentions among Indian nationalists" },
          { id: "c3", label: "Encouraged the use of Indian-made goods instead of British imports" },
          { id: "c4", label: "Was welcomed by nearly all Indians as a fair administrative decision" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The partition set off a chain reaction — a policy, a suspicion about its real motive, then a response.",
      },
    },
    {
      title: "The Jallianwala Bagh Massacre (1919) → Effect",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each part of the Jallianwala Bagh story to what it actually led to.",
        slots: [
          { id: "s1", label: "British troops under General Dyer fired on an unarmed crowd at Jallianwala Bagh" },
          { id: "s2", label: "News of the massacre spread across India" },
          { id: "s3", label: "Gandhi and the Congress launched the Non-Cooperation Movement soon after" },
        ],
        components: [
          { id: "c1", label: "Killed and wounded hundreds of unarmed men, women and children" },
          { id: "c2", label: "Turned many Indians who had been loyal to the British firmly against colonial rule" },
          { id: "c3", label: "United people across India in a mass campaign to withdraw cooperation from British rule" },
          { id: "c4", label: "Convinced most Indians that British rule had become fairer than before" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "This event is often described as a turning point — a shocking act, the public reaction to it, and the organized response that followed.",
      },
    },
    {
      title: "The Quit India Movement (1942) → Effect",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each part of the Quit India story to what it actually led to.",
        slots: [
          { id: "s1", label: "In 1942, the Congress launched the Quit India Movement demanding immediate British withdrawal" },
          { id: "s2", label: "The British responded by arresting Gandhi and the entire Congress leadership overnight" },
          { id: "s3", label: "The Indian National Army (INA) trials after the war drew massive public support" },
        ],
        components: [
          { id: "c1", label: "Sparked spontaneous protests, strikes and underground resistance across the country" },
          { id: "c2", label: "Left the movement leaderless in the short term, but did not stop the demand for independence" },
          { id: "c3", label: "United Indians of different backgrounds in demanding release of INA soldiers" },
          { id: "c4", label: "Persuaded the movement's leaders to give up the demand for independence" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The British crackdown was meant to end the movement — check whether it actually did.",
      },
    },
  ];

  for (const challenge of causeEffectChallenges) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_CAUSE_EFFECT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_CAUSE_EFFECT_MATCH",
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
