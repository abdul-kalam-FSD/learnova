require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the content hole left by the Gap 5 curriculum-citation fix:
// seedHistoryMughalTimelineGrade8.js ("The Mughal Empire") was regraded to Grade 8,
// since Grade 7's current Social Science book drops medieval India
// in favour of expanded ancient-India coverage — confirmed via
// multiple independent sources on the 2025-26 Class 7 textbook
// revision, which specifically calls out Ashoka and the Mauryan
// empire as an expanded focus area. This fills that exact gap with
// a factually stable, uncontested ancient-history topic rather than
// inventing a new one or picking something editorially charged.
//
// Gap 3 fix: History is not a separate top-level Subject below
// Grade 11 — it lives inside the integrated "Social Science" subject,
// with chapters tagged strand: "History" for mastery/analytics.
//
// Reuses HISTORY_TIMELINE_BUILDER exactly as the (now Grade 8)
// Mughal chapter did — same order-sensitive sequencing shape, just a
// different era.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 7 });
    console.log("Created new Grade 7 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Mauryan Empire" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ancient India",
      title: "The Mauryan Empire",
      strand: "History",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Sequence of Mauryan Rule" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Sequence of Mauryan Rule",
      explanation_text:
        "The Mauryan Empire was one of ancient India's largest, built up over three generations of rulers. Chandragupta Maurya founded it, his son Bindusara expanded it further, and his grandson Ashoka ruled over its greatest extent — before Ashoka's own outlook changed dramatically after a single, decisive war.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `scrambled_events` are shown out of order;
  // `correct_order` is the actual chronological sequence.
  const timelineChallenges = [
    {
      title: "Founding to Expansion",
      difficulty: "easy",
      order_index: 1,
      payload: {
        era_label: "c. 322 – 297 BCE",
        scrambled_events: [
          { id: "m1", label: "Chandragupta Maurya founds the Mauryan Empire" },
          { id: "m2", label: "Chandragupta expands his territory with guidance from his advisor Chanakya" },
          { id: "m3", label: "Chandragupta's son Bindusara inherits and further expands the empire" },
        ],
        correct_order: ["m1", "m2", "m3"],
        hint: "An empire has to be founded before it can be expanded, and expanded before it can be inherited.",
      },
    },
    {
      title: "Ashoka's Early Reign",
      difficulty: "medium",
      order_index: 2,
      payload: {
        era_label: "c. 268 – 261 BCE",
        scrambled_events: [
          { id: "a1", label: "Ashoka becomes emperor after Bindusara's death" },
          { id: "a2", label: "Ashoka continues Mauryan military campaigns of expansion" },
          { id: "a3", label: "Ashoka wages the brutal Kalinga War" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "Ashoka had to take the throne, and continue the family's pattern of expansion, before Kalinga specifically happened.",
      },
    },
    {
      title: "After Kalinga: A Change in Direction",
      difficulty: "hard",
      order_index: 3,
      payload: {
        era_label: "c. 261 – 232 BCE",
        scrambled_events: [
          { id: "s1", label: "Ashoka is deeply affected by the suffering caused by the Kalinga War" },
          { id: "s2", label: "Ashoka adopts Buddhism and turns toward policies of non-violence" },
          { id: "s3", label: "Ashoka has edicts inscribed on pillars and rocks across the empire to spread his new principles" },
        ],
        correct_order: ["s1", "s2", "s3"],
        hint: "The change of heart came first — the new beliefs and the public inscriptions spreading them came after.",
      },
    },
  ];

  for (const challenge of timelineChallenges) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_TIMELINE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_TIMELINE_BUILDER",
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
