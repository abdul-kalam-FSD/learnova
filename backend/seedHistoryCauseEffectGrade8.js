require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Mechanic-diversity pass: History previously had exactly one
// mechanic (HISTORY_TIMELINE_BUILDER, order-sensitive sequencing).
// This adds a genuinely different interaction — HISTORY_CAUSE_EFFECT_
// MATCH, a mapping-equality task (registered alongside Circuit
// Builder / Reaction Lab / Proverb Match etc. in gameControllers.js's
// shared mapping checkAttempt branch, and in gameTypeRegistry.js).
// Where Timeline Builder asks "what order did these happen in?",
// this asks "what did each of these events actually cause?" — a
// different historical-thinking skill, not a reskin.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 3 fix: History is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Social Science"
  // subject, with its chapters tagged strand: "History" for
  // mastery/analytics. Uses the same Subject document as
  // seedHistoryGrade8.js (find-or-create on {grade, name}, order
  // doesn't matter). See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // History content into this shape.
  let subject = await Subject.findOne({ grade: 8, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 8 });
    console.log("Created new Grade 8 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Causes and Consequences of Colonial Rule" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Modern India",
      title: "Causes and Consequences of Colonial Rule",
      order_index: 2,
      strand: "History",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Events to Their Effects" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Events to Their Effects",
      explanation_text:
        "Knowing the order events happened in isn't the same as understanding why they happened. Each major policy or event during colonial rule triggered specific, identifiable consequences — for the economy, for society, or for the independence movement — and being able to connect a cause to its actual effect (not just a plausible-sounding one) is a different skill from sequencing dates.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const causeEffectChallenges = [
    {
      title: "Colonial Policy → Consequence",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each colonial-era policy to the consequence it actually caused.",
        slots: [
          { id: "s1", label: "Heavy land revenue demands on farmers" },
          { id: "s2", label: "Import of cheap machine-made British cloth" },
          { id: "s3", label: "Introduction of railways across India" },
        ],
        components: [
          { id: "c1", label: "Widespread farmer debt and frequent famines" },
          { id: "c2", label: "Collapse of India's traditional handloom weaving industry" },
          { id: "c3", label: "Faster movement of raw materials out and troops in — mainly served British economic and military interests" },
          { id: "c4", label: "A sharp rise in Indian industrial exports to Britain" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about who each policy actually benefited, and who bore the cost — that usually reveals the real effect.",
      },
    },
    {
      title: "Response to the 1857 Revolt",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "After the Revolt of 1857, several major changes followed. Match each cause to its result.",
        slots: [
          { id: "s1", label: "The British Crown took over rule from the East India Company" },
          { id: "s2", label: "The British army was reorganized to increase the ratio of British to Indian soldiers" },
          { id: "s3", label: "Princely states that had stayed loyal to the British" },
        ],
        components: [
          { id: "c1", label: "Governance shifted to direct Crown control (British Raj) instead of company rule" },
          { id: "c2", label: "Reduced the risk of another large-scale mutiny within the army" },
          { id: "c3", label: "Were allowed to keep their territories under British protection" },
          { id: "c4", label: "Were immediately annexed regardless of loyalty" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The British response after 1857 was mostly about reducing the risk of it happening again — think about what each change was designed to prevent.",
      },
    },
    {
      title: "Gandhi's Movements → What They Achieved",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Each of Gandhi's major movements had a specific, different outcome. Match each movement to what it actually achieved.",
        slots: [
          { id: "s1", label: "Non-Cooperation Movement (1920-22)" },
          { id: "s2", label: "Salt March / Civil Disobedience Movement (1930)" },
          { id: "s3", label: "Quit India Movement (1942)" },
        ],
        components: [
          { id: "c1", label: "Mass withdrawal from British institutions, schools, and titles — called off after the Chauri Chaura violence" },
          { id: "c2", label: "Broke the salt tax law publicly, drawing global attention to colonial injustice" },
          { id: "c3", label: "Demanded immediate British withdrawal — met with mass arrests, but signaled that British rule's end was now inevitable" },
          { id: "c4", label: "Immediately resulted in full independence being granted" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "None of Gandhi's movements directly ended British rule by themselves — each achieved something specific, but full independence came later, in 1947.",
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
