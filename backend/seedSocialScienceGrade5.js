require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill + Gap 1 fix (post Grade-4-EVS revision): Grade 5, like
// Grade 4, is EVS in NCERT — one integrated subject, not a Science /
// Social Science split (that split is correct only from Grade 6
// onward). This is the first Social-Science-side content for Grade
// 5 — seeded directly into the single "EVS" subject (same convention
// as the corrected Grade 4 fix), not as a separate top-level
// "Social Science" subject.
//
// Source basis (Gap 5, CORRECTED): originally grounded in NCERT's
// Grade 5 EVS "Looking Around" Chapter 17 ("Across the Wall"). That
// citation is now STALE — "Looking Around" was replaced by "Our
// Wondrous World" under NCF-SE 2023 for the current 2026-27 session,
// and the new book's confirmed chapter list (Water; Journey of a
// River; The Mystery of Food; Our School — A Happy Place; Our Vibrant
// Country; Some Unique Places; Energy; Clothes; Rhythms of Nature;
// Earth — Our Shared Home) has no direct "Across the Wall" equivalent.
// No confirmed exact match currently exists for this fairness/sharing
// topic in the new edition — flagged honestly rather than guessing
// one. "Our School — A Happy Place" (Ch.4) is a plausible thematic
// home (cooperation/community at school) but is UNCONFIRMED and needs
// a real check against the new book before being cited as sourced.
//
// Reuses SOCIAL_SCIENCE_CIVIC_DECISION (same single-choice check as
// the Grade 4 and Grade 9 versions — see seedSocialScienceGrade4.js).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    subject = await Subject.create({ name: "EVS", grade: 5 });
    console.log("Created new Grade 5 EVS subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Sharing What We Have Fairly" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Living Together",
      title: "Sharing What We Have Fairly",
      order_index: 1,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Fair Access to Shared Resources" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Fair Access to Shared Resources",
      explanation_text:
        "When a resource like water, land, or a shared space is limited, it's easy for one group to end up with much more than another. A fair community works out ways for everyone to get what they genuinely need, instead of whoever is strongest or first simply taking the most.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const civicChallenges = [
    {
      title: "The Shared Water Tap",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Two streets share one water tap that only gives water for an hour each morning. One street always fills up first and leaves none for the other. What's the fairest fix?",
        options: [
          { id: "o1", label: "Let whichever street gets there first keep doing so" },
          { id: "o2", label: "Agree on a fixed time each street gets to use the tap" },
          { id: "o3", label: "Let the two streets argue about it every morning" },
          { id: "o4", label: "Have only one street use the tap from now on" },
        ],
        correct_hotspot_id: "o2",
        hint: "A shared, agreed schedule means neither street depends on rushing to get there first.",
      },
    },
    {
      title: "The Playground Everyone Wants",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "A new playground was built for the whole neighbourhood, but older kids have been using it all day and younger kids never get a turn. What's the fair thing to do?",
        options: [
          { id: "p1", label: "Set aside specific times for younger kids to use it too" },
          { id: "p2", label: "Let the older kids keep using it since they got there first" },
          { id: "p3", label: "Build a separate, smaller playground only for younger kids" },
          { id: "p4", label: "Close the playground so no one argues about it" },
        ],
        correct_hotspot_id: "p1",
        hint: "The playground was built for everyone — a shared schedule lets both groups actually use it.",
      },
    },
    {
      title: "Farmland After a Flood",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "After a flood, only some farmland in a village is left usable. Some families now have no land to grow food on. What's the fairest response from the village?",
        options: [
          { id: "q1", label: "Families who still have land should keep all of it to themselves" },
          { id: "q2", label: "The village works out a way to share the usable land so every family can grow some food" },
          { id: "q3", label: "Whoever can pay the most gets to use the remaining land" },
          { id: "q4", label: "Families without land should simply move away" },
        ],
        correct_hotspot_id: "q2",
        hint: "A flood affects the whole village unevenly — sharing what's left keeps every family fed, not just the lucky ones.",
      },
    },
  ];

  for (const challenge of civicChallenges) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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
