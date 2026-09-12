require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// First Geography vertical slice (Section 24/27 — Geography hadn't
// been touched yet). Route Builder reuses the exact same ordered-
// sequence check as HISTORY_TIMELINE_BUILDER / MATH_EQUATION_BUILDER
// / BIO_ECOSYSTEM_BALANCE (see checkAttempt in gameControllers.js) —
// arranging a river's course or a road's stops in the correct
// geographic order is the same "ordered placement" logic as
// arranging events in time, just a different fantasy (Section 30:
// core fantasy is EXPLORE / MAP / MANAGE, not Case Investigation).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 3 fix: Geography is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Social Science"
  // subject, with its chapters tagged strand: "Geography" for
  // mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Geography content into this shape.
  let subject = await Subject.findOne({ grade: 8, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 8 });
    console.log("Created new Grade 8 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Maps and Navigation" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Physical Geography",
      title: "Maps and Navigation",
      order_index: 1,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Tracing Routes on a Map" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Tracing Routes on a Map",
      explanation_text:
        "A river, road, or trade route follows a fixed physical order across the land — a river always flows from its source at higher elevation down to its mouth, and a route between two cities passes through the same stops in the same order every time. Reading a map means recognizing that order.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `scrambled_stops` is the same set of stops in
  // shuffled order; `correct_order` (stripped before it reaches the
  // client) lists the stop ids in true geographic sequence.
  const routeChallenges = [
    {
      title: "Trace the Ganges: Source to Sea",
      difficulty: "easy",
      order_index: 1,
      payload: {
        journey_label: "Follow the Ganges from its glacial source to the Bay of Bengal",
        scrambled_stops: [
          { id: "g3", label: "Varanasi" },
          { id: "g1", label: "Gangotri Glacier (source)" },
          { id: "g4", label: "Patna" },
          { id: "g2", label: "Haridwar" },
          { id: "g5", label: "Bay of Bengal (mouth)" },
        ],
        correct_order: ["g1", "g2", "g3", "g4", "g5"],
        hint: "Every river starts at its source and ends where it meets the sea — place those two ends first.",
      },
    },
    {
      title: "The Grand Trunk Road",
      difficulty: "medium",
      order_index: 2,
      payload: {
        journey_label: "Trace the historic Grand Trunk Road from east to west",
        scrambled_stops: [
          { id: "t3", label: "Delhi" },
          { id: "t1", label: "Kolkata" },
          { id: "t4", label: "Amritsar" },
          { id: "t2", label: "Varanasi" },
          { id: "t5", label: "Peshawar" },
        ],
        correct_order: ["t1", "t2", "t3", "t4", "t5"],
        hint: "The road runs broadly west across the Gangetic plain before crossing into Punjab.",
      },
    },
    {
      title: "Monsoon's Arrival, South to North",
      difficulty: "hard",
      order_index: 3,
      payload: {
        journey_label: "Sequence the southwest monsoon's onset as it moves across India",
        scrambled_stops: [
          { id: "m3", label: "Mumbai" },
          { id: "m1", label: "Thiruvananthapuram" },
          { id: "m4", label: "Delhi" },
          { id: "m2", label: "Mangalore" },
        ],
        correct_order: ["m1", "m2", "m3", "m4"],
        hint: "The monsoon makes landfall in the far south first and takes weeks to travel north.",
      },
    },
  ];

  for (const challenge of routeChallenges) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
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
