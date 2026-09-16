require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// 5th subject vertical slice (History). Core fantasy per the subject
// matrix: EXPLORE / RECONSTRUCT / DECIDE — Timeline Builder specifically.
// Deliberately NOT a Case Investigation reskin (Section 2/30): this is
// a sequencing mechanic, so it reuses the same order-sensitive
// checkAttempt branch as MATH_EQUATION_BUILDER / BIO_ECOSYSTEM_BALANCE
// rather than inventing new backend logic — same reason those two
// share a branch.
//
// GRADE CORRECTED (Gap 5, new-curriculum pass): originally seeded at
// Grade 7 (file was named seedHistoryGrade7.js accordingly; renamed
// to match its real grade as part of the Gap 8 audit fix). Under the
// current NCF-SE 2023 curriculum (2026-27
// session), Grade 7's new Social Science book drops medieval India
// (Delhi Sultanate, Mughal Empire) entirely in favour of expanded
// ancient-India coverage (Maurya, Shunga, Satavahana, Gupta) and new
// content on sacred geography/pilgrimage — confirmed via multiple
// independent news sources on the 2025-26 Class 7 textbook revision.
// The Mughal period is now covered at Grade 8 instead (also
// confirmed — the current Grade 8 Social Science book covers 1526-
// 1605). This file's dated-sequence content (Panipat, Akbar's reign,
// Shah Jahan to Aurangzeb) is retargeted there unchanged — it's
// neutral factual sequencing, not editorial framing, so no content
// rewrite was needed, only the grade/subject citation. NOTE: the
// current Grade 8 textbook's specific tone in covering this period
// is itself a live, publicly contested editorial matter (separate
// from the placement question this fix addresses) — not something
// this citation fix takes a position on either way.
// Grade 7's actual current History content is now ancient India —
// see seedHistoryAncientIndiaGrade7.js.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 3 fix: History is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Social Science"
  // subject, with its chapters tagged strand: "History" for
  // mastery/analytics. See
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Mughal Empire" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Medieval India",
      title: "The Mughal Empire",
      strand: "History",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Sequence of Mughal Rule" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Sequence of Mughal Rule",
      explanation_text:
        "Historical events happen in a specific order, and later events are often direct consequences of earlier ones. Placing events in their correct chronological sequence — rather than just memorizing dates — helps reveal cause and effect across a period of rule.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `scrambled_events` are shown out of order;
  // `correct_order` is the actual chronological sequence. Same shape
  // as BIO_ECOSYSTEM_BALANCE's scrambled_effects/correct_order, reused
  // deliberately (Section 16 — reuse the mechanic, not reinvent it).
  const timelineChallenges = [
    {
      title: "Founding to Consolidation",
      difficulty: "easy",
      order_index: 1,
      payload: {
        era_label: "1526 – 1556",
        scrambled_events: [
          { id: "m1", label: "Humayun briefly loses the throne and flees India" },
          { id: "m2", label: "Babur defeats the Sultan of Delhi at Panipat" },
          { id: "m3", label: "Akbar takes the throne as a young boy" },
        ],
        correct_order: ["m2", "m1", "m3"],
        hint: "Start with the founding battle — everything else follows from it.",
      },
    },
    {
      title: "Akbar's Reign",
      difficulty: "medium",
      order_index: 2,
      payload: {
        era_label: "1556 – 1605",
        scrambled_events: [
          { id: "a1", label: "Akbar expands the empire through military campaigns" },
          { id: "a2", label: "Akbar becomes emperor at age 13 under a regent" },
          { id: "a3", label: "Akbar introduces policies of religious tolerance" },
        ],
        correct_order: ["a2", "a1", "a3"],
        hint: "A young ruler needs to secure the throne before he can expand or reform it.",
      },
    },
    {
      title: "Peak to Decline",
      difficulty: "hard",
      order_index: 3,
      payload: {
        era_label: "1628 – 1707",
        scrambled_events: [
          { id: "s1", label: "Shah Jahan builds the Taj Mahal" },
          { id: "s2", label: "Aurangzeb's long wars drain the empire's treasury" },
          { id: "s3", label: "Shah Jahan becomes emperor after a war of succession" },
        ],
        correct_order: ["s3", "s1", "s2"],
        hint: "A costly monument needs a secure emperor on the throne first — decline comes after the peak, not before it.",
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
