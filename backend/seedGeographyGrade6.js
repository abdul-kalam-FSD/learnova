require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 6 Geography hole in Social Science — Grade 6
// previously only had a Civics strand (Understanding and Respecting
// Diversity, via seedSocialScienceGrade6.js), no History or
// Geography. Grounded in the current NCERT Class 6 Social Science
// textbook, "Exploring Society: India and Beyond" (NCF-SE 2023,
// 2026-27 session, replacing the earlier separate History/Geography/
// Civics books), confirmed 14-chapter, 5-theme structure — Ch.2
// "Oceans and Continents", a real Grade 6 Geography chapter covering
// the world's continents and oceans.
//
// Gap 1 fix: Geography is not a separate top-level Subject at Grade
// 6 — it lives inside "Social Science" (reusing the existing subject
// seeded by seedSocialScienceGrade6.js, not creating a duplicate),
// with its chapters tagged strand: "Geography" for mastery/analytics.
//
// Reuses GEOGRAPHY_ROUTE_BUILDER (same order-sensitive check as the
// Grade 7/8 river/road/monsoon versions), applied to ranking
// continents and oceans by size instead of tracing a physical route.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 6 });
    console.log("Created new Grade 6 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Oceans and Continents" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Earth",
      title: "Oceans and Continents",
      order_index: 2,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Ranking the World's Continents and Oceans by Size" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Ranking the World's Continents and Oceans by Size",
      explanation_text:
        "Earth's landmass is divided into seven continents and its water into five oceans, and each group has a fixed order by area. Asia is by far the largest continent and Australia the smallest of the seven; the Pacific is by far the largest ocean and the Arctic the smallest of the five.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as GEOGRAPHY_ROUTE_BUILDER elsewhere —
  // `scrambled_stops` is the same set of stops in shuffled order;
  // `correct_order` (stripped before it reaches the client) lists the
  // stop ids in true sequence — here, ranked by area, largest first.
  const routeChallenges = [
    {
      title: "Rank the Oceans: Largest to Smallest",
      difficulty: "easy",
      order_index: 1,
      payload: {
        journey_label: "Arrange the five oceans from largest to smallest by area",
        scrambled_stops: [
          { id: "o3", label: "Indian Ocean" },
          { id: "o1", label: "Pacific Ocean" },
          { id: "o5", label: "Arctic Ocean" },
          { id: "o2", label: "Atlantic Ocean" },
          { id: "o4", label: "Southern Ocean" },
        ],
        correct_order: ["o1", "o2", "o3", "o4", "o5"],
        hint: "The Pacific alone covers more area than all the landmasses on Earth put together — start there.",
      },
    },
    {
      title: "Rank the Continents: Largest to Smallest",
      difficulty: "medium",
      order_index: 2,
      payload: {
        journey_label: "Arrange the seven continents from largest to smallest by area",
        scrambled_stops: [
          { id: "c3", label: "North America" },
          { id: "c1", label: "Asia" },
          { id: "c5", label: "Antarctica" },
          { id: "c2", label: "Africa" },
          { id: "c7", label: "Australia" },
          { id: "c4", label: "South America" },
          { id: "c6", label: "Europe" },
        ],
        correct_order: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"],
        hint: "Asia is home to the majority of the world's population and land area — it comes first by a wide margin, and Australia is the smallest of the seven.",
      },
    },
    {
      title: "Trace a Journey: West to East Across Three Continents",
      difficulty: "hard",
      order_index: 3,
      payload: {
        journey_label: "Sequence these cities as you'd cross them travelling west to east from South America to Asia",
        scrambled_stops: [
          { id: "j3", label: "Cairo, Egypt (Africa)" },
          { id: "j1", label: "São Paulo, Brazil (South America)" },
          { id: "j4", label: "Mumbai, India (Asia)" },
          { id: "j2", label: "London, United Kingdom (Europe)" },
        ],
        correct_order: ["j1", "j2", "j3", "j4"],
        hint: "Start on the continent farthest west of the four, and end on the continent farthest east.",
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
