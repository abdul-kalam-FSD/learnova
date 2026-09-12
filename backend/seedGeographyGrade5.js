require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 5 EVS fill (Geography strand). Reuses GEOGRAPHY_ROUTE_BUILDER
// exactly as the Grade 4 "Water Around Us" (water cycle) and Grade 8
// Ganges/Grand Trunk Road versions do (order-sensitive check), applied
// to a river's journey from mountain source to the sea — a distinct
// topic from Grade 4's water-cycle loop, not a repeat of it.
//
// Source basis (Gap 5, CORRECTED): originally grounded in NCERT's
// Grade 5 EVS "Looking Around" Chapter 11 ("Sunita in Space"). That
// citation is now STALE — "Looking Around" was replaced by "Our
// Wondrous World" under NCF-SE 2023 for the current 2026-27 session.
// The current Grade 5 EVS textbook's Chapter 2 is literally titled
// "Journey of a River" — an exact, direct match for this chapter's
// topic (confirmed via the current book's published chapter list,
// not assumed). The game content itself (a river's journey from
// mountain source to sea) needed no rewrite, only this corrected
// citation.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "How a River Reaches the Sea" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Environment",
      title: "How a River Reaches the Sea",
      order_index: 1,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "The Journey of a River" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "The Journey of a River",
      explanation_text:
        "A river usually begins high up in the mountains, where melting snow or springs feed it. It flows downhill through hills and valleys, joined by smaller streams along the way, crosses the flatter plains, and finally reaches the sea, where its journey ends.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const routeChallenges = [
    {
      title: "Trace the River — Mountain to Sea",
      difficulty: "easy",
      order_index: 1,
      payload: {
        journey_label: "Follow a river from where it begins to where it ends.",
        scrambled_stops: [
          { id: "g1", label: "The river begins high in the mountains" },
          { id: "g2", label: "The river reaches the sea" },
          { id: "g3", label: "The river flows down through hills" },
          { id: "g4", label: "The river crosses the flat plains" },
        ],
        correct_order: ["g1", "g3", "g4", "g2"],
        hint: "A river always starts high up and ends at the sea — hills come before the plains, and the plains come last before the sea.",
      },
    },
    {
      title: "Trace the River — Joined by a Tributary",
      difficulty: "medium",
      order_index: 2,
      payload: {
        journey_label: "This river picks up water from a smaller stream partway through its journey.",
        scrambled_stops: [
          { id: "h1", label: "The river begins as melting snow in the mountains" },
          { id: "h2", label: "A smaller stream joins the river in the hills" },
          { id: "h3", label: "The wider river flows across the plains" },
          { id: "h4", label: "The river empties into the sea" },
        ],
        correct_order: ["h1", "h2", "h3", "h4"],
        hint: "The stream can only join the river after the river has already started flowing down from the mountains.",
      },
    },
    {
      title: "From Source to Sea — the Long Way",
      difficulty: "hard",
      order_index: 3,
      payload: {
        journey_label: "Trace the full journey of a major Indian river, from its mountain source to where it meets the sea.",
        scrambled_stops: [
          { id: "k1", label: "Snow melts in the high mountains, forming the river's source" },
          { id: "k2", label: "The river rushes down steep hills, gathering speed" },
          { id: "k3", label: "The river slows down and spreads across wide plains" },
          { id: "k4", label: "The river splits into several channels near the coast" },
          { id: "k5", label: "The river's water finally mixes with the sea" },
        ],
        correct_order: ["k1", "k2", "k3", "k4", "k5"],
        hint: "The river is fastest and narrowest near its mountain source, and widest and slowest right before it meets the sea.",
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
