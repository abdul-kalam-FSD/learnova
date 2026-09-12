require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-gap fill (genuine gap list item 4): Grade 10 Social Science
// already has an Economics chapter (seedSocialScienceGrade10.js,
// "Protecting Consumer Rights") but no History strand content.
// Curriculum reference: as of the 2026-27 CBSE session, Grade 10
// History still follows the long-standing "India and the Contemporary
// World II" syllabus, whose "Nationalism in India" chapter is a
// stable, well-documented topic centred on specific triggering events
// and the mass movements they caused — a natural fit for
// HISTORY_CAUSE_EFFECT_MATCH (the same mapping-family check as
// seedHistoryCauseEffectGrade8.js), so no new backend scoring logic
// is needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 10 Social Science subject not found — run seedSocialScienceGrade10.js first.");
  }
  console.log("Using existing subject:", subject._id);

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Nationalism in India" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "India and the Contemporary World",
      title: "Nationalism in India",
      order_index: 2,
      strand: "History",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "What Each Flashpoint Actually Caused" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "What Each Flashpoint Actually Caused",
      explanation_text:
        "India's mass nationalist movements didn't arise out of nowhere — each one was triggered by a specific event or policy that pushed people to act. Knowing the movements by name is one skill; correctly matching each triggering event to the movement it actually caused is another.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 8's Cause & Effect Match — `causes`
  // matched against `effects`; `correct_mapping` (stripped before the
  // client sees it) is the true cause-id -> effect-id pairing.
  const causeEffectChallenges = [
    {
      title: "Triggers of the Non-Cooperation Movement",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each 1919 flashpoint to what it actually caused.",
        slots: [
          { id: "a1", label: "The Rowlatt Act lets the British government imprison people without trial" },
          { id: "a2", label: "British troops open fire on an unarmed crowd at Jallianwala Bagh in Amritsar" },
        ],
        components: [
          { id: "b1", label: "Widespread outrage, protests, and hartals (strikes) break out across India" },
          { id: "b2", label: "Public anger hardens, convincing Gandhi and the Congress to launch the Non-Cooperation Movement" },
          { id: "b3", label: "The British government immediately grants India full independence" },
        ],
        correct_mapping: { "a1": "b1", "a2": "b2" },
        hint: "The unjust law provoked protest first; the massacre that followed is what actually pushed the movement into being launched.",
      },
    },
    {
      title: "Triggers of the Civil Disobedience Movement",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each cause to what it actually led to in the early 1930s.",
        slots: [
          { id: "c1", label: "The British government imposes a tax on salt, a necessity used by every household" },
          { id: "c2", label: "Gandhi and his followers march roughly 240 miles to the sea at Dandi to break the salt law" },
        ],
        components: [
          { id: "d1", label: "Gandhi decides to make the tax the target of a new mass campaign" },
          { id: "d2", label: "The march sparks the wider Civil Disobedience Movement across India, as people defy other British laws too" },
          { id: "d3", label: "The British government abolishes the salt tax immediately" },
        ],
        correct_mapping: { "c1": "d1", "c2": "d2" },
        hint: "The tax gave Gandhi his target; the march itself is what actually set off the broader movement of defiance that followed it.",
      },
    },
    {
      title: "Why the Non-Cooperation Movement Was Called Off",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each event to its actual consequence for the movement.",
        slots: [
          { id: "f1", label: "A violent clash at Chauri Chaura leaves police officers dead at the hands of a protesting crowd" },
          { id: "f2", label: "Gandhi insists the movement must stay strictly non-violent to succeed" },
        ],
        components: [
          { id: "g1", label: "Gandhi calls off the Non-Cooperation Movement, judging it had strayed from non-violence" },
          { id: "g2", label: "The violence at Chauri Chaura becomes the immediate reason Gandhi suspends the movement" },
          { id: "g3", label: "The British government praises the movement's discipline" },
        ],
        correct_mapping: { "f1": "g2", "f2": "g1" },
        hint: "One is Gandhi's underlying principle; the other is the specific incident that actually forced his hand to suspend the movement.",
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
