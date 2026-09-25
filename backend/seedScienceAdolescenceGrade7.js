require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Science Batch 3. Adds the current NCERT Class 7 Science
// ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter 6, "Adolescence:
// A Stage of Growth and Change" — verified via multiple independent
// sources. The full NCERT chapter also covers puberty and secondary
// sexual characteristics in a factual, textbook way; this seed
// deliberately scopes its interactive content to the chapter's
// growth/hormones/emotional-health/hygiene/nutrition material only —
// keeping content age-appropriate and free of anatomical detail, per
// the batch's explicit instruction to avoid unnecessary medical
// detail. Nutrition and hygiene are called out by essentially every
// source as central, testable chapter content, so this is a faithful
// (if intentionally narrower) slice of the real chapter, not a
// substitute topic.
//
// Reuses GEOGRAPHY_FEATURE_MATCH and HISTORY_CAUSE_EFFECT_MATCH's
// shared mapping-equality check (same family already reused across
// Grade 7 for Nature of Science, Heat Transfer, etc.) purely for their
// interaction shape — no new mechanic, and the "History"/"Geography"
// prefix in the type name has no bearing on the subject it's used for.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Adolescence: A Stage of Growth and Change" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Biology",
      title: "Adolescence: A Stage of Growth and Change",
      order_index: 2,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---------- Concept 1: physical vs emotional change ----------
  let conceptChanges = await Concept.findOne({ chapter_id: chapter._id, title: "Physical and Emotional Changes During Adolescence" });
  if (!conceptChanges) {
    conceptChanges = await Concept.create({
      chapter_id: chapter._id,
      title: "Physical and Emotional Changes During Adolescence",
      explanation_text:
        "Adolescence (roughly ages 10-19) brings both physical changes — like rapid growth in height and increased need for sleep, driven by hormones — and emotional changes, like mood swings, more sensitivity to feedback, and a growing desire for independence. Both kinds of change are a normal, expected part of this stage.",
    });
    console.log("Created concept:", conceptChanges._id);
  } else {
    console.log("Using existing concept:", conceptChanges._id);
  }

  const featureMatchChallenges = [
    {
      title: "Sort the Change: Physical or Emotional",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Sort each change into Physical or Emotional.",
        slots: [
          { id: "s1", label: "Growing noticeably taller in a short period of time" },
          { id: "s2", label: "Feeling very happy one moment and irritated the next, for no clear reason" },
          { id: "s3", label: "Needing more sleep than before because the body is working hard to grow" },
          { id: "s4", label: "Wanting more independence and valuing friendships more than before" },
        ],
        components: [
          { id: "c1", label: "Physical Change" },
          { id: "c2", label: "Emotional Change" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Physical changes are things your body is doing; emotional changes are things you're feeling.",
      },
    },
    {
      title: "Sort by Example: Physical or Emotional",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Sort each change into Physical or Emotional.",
        slots: [
          { id: "s1", label: "Muscles and bones growing stronger and more developed" },
          { id: "s2", label: "Becoming more sensitive to criticism or feedback from others" },
          { id: "s3", label: "The body producing more of certain hormones that drive growth" },
          { id: "s4", label: "Spending more time thinking about who you are and what you care about" },
        ],
        components: [
          { id: "c1", label: "Physical Change" },
          { id: "c2", label: "Emotional Change" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Hormones drive the body's growth — that's physical, even though you can't see the hormones themselves.",
      },
    },
  ];

  for (const challenge of featureMatchChallenges) {
    const exists = await GameContent.findOne({ game_type: "GEOGRAPHY_FEATURE_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
        concept_id: conceptChanges._id,
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

  // ---------- Concept 2: healthy habits ----------
  let conceptHabits = await Concept.findOne({ chapter_id: chapter._id, title: "Healthy Habits During Adolescence" });
  if (!conceptHabits) {
    conceptHabits = await Concept.create({
      chapter_id: chapter._id,
      title: "Healthy Habits During Adolescence",
      explanation_text:
        "A fast-growing, changing body needs extra support: good hygiene, balanced nutrition, enough sleep, and healthy ways to handle emotional ups and downs. Each of these habits directly supports something specific the body is going through during this stage.",
    });
    console.log("Created concept:", conceptHabits._id);
  } else {
    console.log("Using existing concept:", conceptHabits._id);
  }

  const causeEffectChallenges = [
    {
      title: "Match: Habit to Why It Matters",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each healthy habit to the reason it matters during adolescence.",
        slots: [
          { id: "s1", label: "Bathing regularly and keeping skin clean" },
          { id: "s2", label: "Eating plenty of fruits, vegetables, and protein-rich foods" },
          { id: "s3", label: "Getting 8-9 hours of sleep each night" },
        ],
        components: [
          { id: "c1", label: "Helps prevent body odour and skin problems as oil and sweat glands become more active" },
          { id: "c2", label: "Gives a fast-growing body the nutrients it needs" },
          { id: "c3", label: "Gives the body time to rest, repair, and grow" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each habit supports one specific thing the body is doing during this stage.",
      },
    },
    {
      title: "Match: Another Habit to Why It Matters",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each healthy habit to the reason it matters during adolescence.",
        slots: [
          { id: "s1", label: "Drinking enough water throughout the day" },
          { id: "s2", label: "Talking to a trusted adult about confusing feelings" },
          { id: "s3", label: "Staying physically active with sports or exercise" },
        ],
        components: [
          { id: "c1", label: "Helps the body's systems work properly and supports healthy skin" },
          { id: "c2", label: "Helps process the emotional ups and downs of this stage in a healthy way" },
          { id: "c3", label: "Builds strong bones and muscles and helps release stress" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Talking things through with someone you trust is a healthy way to handle mood swings.",
      },
    },
  ];

  for (const challenge of causeEffectChallenges) {
    const exists = await GameContent.findOne({ game_type: "HISTORY_CAUSE_EFFECT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_CAUSE_EFFECT_MATCH",
        concept_id: conceptHabits._id,
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
