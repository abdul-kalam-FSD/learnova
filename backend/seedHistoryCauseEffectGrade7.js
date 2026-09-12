require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Mechanic-diversity pass for Grade 7 History: reuses the existing
// "The Mauryan Empire" chapter from seedHistoryAncientIndiaGrade7.js
// (currently HISTORY_TIMELINE_BUILDER only), adds a new Concept +
// HISTORY_CAUSE_EFFECT_MATCH — same mapping mechanic and payload
// shape as seedHistoryCauseEffectGrade8.js.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 7 Social Science subject not found — run seedHistoryAncientIndiaGrade7.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Mauryan Empire" });
  if (!chapter) {
    throw new Error("Chapter 'The Mauryan Empire' not found — run seedHistoryAncientIndiaGrade7.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Mauryan Events to Their Effects" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Mauryan Events to Their Effects",
      explanation_text:
        "Knowing the sequence of Mauryan rulers isn't the same as understanding why each major decision mattered. Chandragupta's rise, Ashoka's war and his change of policy, and the empire's administration each led to specific, real consequences.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const causeEffectChallenges = [
    {
      title: "Chandragupta Maurya's Rise to Power → Effect",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each event in Chandragupta Maurya's rise to the effect it actually had.",
        slots: [
          { id: "s1", label: "Chandragupta, guided by Chanakya, overthrew the Nanda dynasty" },
          { id: "s2", label: "Chanakya's Arthashastra laid out detailed rules for administration and taxation" },
          { id: "s3", label: "Mauryan kings maintained a large standing army and network of officials" },
        ],
        components: [
          { id: "c1", label: "Established the Mauryan dynasty as the ruling power over Magadha" },
          { id: "c2", label: "Gave the empire a well-organized system of governance and economy" },
          { id: "c3", label: "Allowed the empire to control and defend a very large territory" },
          { id: "c4", label: "Led to the empire immediately splitting into small kingdoms" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each step built the foundation for the empire that came after it — think about what each one made possible.",
      },
    },
    {
      title: "The Kalinga War → Effect",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each part of the Kalinga War story to what it actually led to.",
        slots: [
          { id: "s1", label: "Ashoka waged a brutal war to conquer Kalinga" },
          { id: "s2", label: "Ashoka witnessed the massive loss of life the war had caused" },
          { id: "s3", label: "Ashoka adopted and began spreading the policy of Dhamma" },
        ],
        components: [
          { id: "c1", label: "Brought Kalinga under Mauryan control but caused enormous death and destruction" },
          { id: "c2", label: "Filled Ashoka with deep remorse and changed his approach to ruling" },
          { id: "c3", label: "Encouraged non-violence, tolerance and moral conduct across the empire" },
          { id: "c4", label: "Made Ashoka decide to conquer even more kingdoms by force" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ashoka's story is defined by a turning point — the war came first, then a change of heart, then a change of policy.",
      },
    },
    {
      title: "Mauryan Administration and Its Legacy → Effect",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each fact about later Mauryan rule to what it actually led to.",
        slots: [
          { id: "s1", label: "Ashoka had edicts inscribed on rocks and pillars across the empire" },
          { id: "s2", label: "The Mauryan empire built and maintained a network of roads" },
          { id: "s3", label: "After Ashoka's death, weaker successors could not hold the empire together" },
        ],
        components: [
          { id: "c1", label: "Let ordinary people in many regions learn about the emperor's policies directly" },
          { id: "c2", label: "Made trade, travel and communication easier across a vast empire" },
          { id: "c3", label: "Led to the gradual decline and eventual break-up of the Mauryan empire" },
          { id: "c4", label: "Caused the empire to grow even larger after Ashoka's death" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Not every effect here is positive — think about what tends to happen to a large empire once strong central leadership disappears.",
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
