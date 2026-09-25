require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 7's Social Science only had History
// (seedHistoryAncientIndiaGrade7.js) — Geography was entirely missing. Reuses
// the "Social Science" Subject that seedHistoryAncientIndiaGrade7.js already
// creates (find-or-create on {grade, name}, order between the two
// files doesn't matter), tagging this chapter's strand: "Geography"
// so mastery/analytics can still tell the two apart.
//
// Source basis (Gap 5): grounded in NCERT Class 7 Geography ("Our
// Environment"), the "Water" chapter — specifically the water cycle
// — reworded into an original ordering challenge, not textbook text.
//
// Reuses GEOGRAPHY_ROUTE_BUILDER (same scrambled-stops/correct-order
// check as the Grade 4/8 versions — see seedGeographyGrade8.js — but
// ordering the stages of the water cycle instead of a river's course).
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Journey of Water" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Environment",
      title: "The Journey of Water",
      order_index: 1,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Stages of the Water Cycle" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Stages of the Water Cycle",
      explanation_text:
        "Water constantly moves between the Earth's surface and the atmosphere in a fixed sequence: the sun's heat evaporates water from oceans, rivers, and lakes into vapour; that vapour rises and cools into clouds through condensation; the clouds release water back down as precipitation (rain or snow); and that water collects in rivers, lakes, and underground, ready to evaporate again.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as seedGeographyGrade8.js — `scrambled_stops`
  // is the same set of stages shuffled; `correct_order` (stripped
  // before the client sees it) lists the stage ids in true sequence.
  const routeChallenges = [
    {
      title: "Trace the Water Cycle: Ocean to Cloud",
      difficulty: "easy",
      order_index: 1,
      payload: {
        journey_label: "Follow water as it evaporates from the ocean and rises to form a cloud",
        scrambled_stops: [
          { id: "w2", label: "Water vapour rises into the air" },
          { id: "w1", label: "Sun heats the ocean surface" },
          { id: "w3", label: "Vapour cools and condenses into a cloud" },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Heat always comes first — nothing evaporates without it.",
      },
    },
    {
      title: "Trace the Full Water Cycle",
      difficulty: "medium",
      order_index: 2,
      payload: {
        journey_label: "Follow the complete water cycle from ocean to rainfall and back",
        scrambled_stops: [
          { id: "x3", label: "Clouds release rain (precipitation)" },
          { id: "x1", label: "Sun heats water and it evaporates" },
          { id: "x4", label: "Rain collects in rivers and lakes" },
          { id: "x2", label: "Water vapour condenses into clouds" },
        ],
        correct_order: ["x1", "x2", "x3", "x4"],
        hint: "Evaporation always starts the cycle, and collection is always the last stage before it repeats.",
      },
    },
    {
      title: "Trace a Mountain River's Cycle",
      difficulty: "hard",
      order_index: 3,
      payload: {
        journey_label: "Follow water from a mountain snowfall to a river reaching the sea",
        scrambled_stops: [
          { id: "y2", label: "Melting snow feeds a mountain stream" },
          { id: "y4", label: "The river reaches the sea" },
          { id: "y1", label: "Snow falls and settles on a mountain peak" },
          { id: "y3", label: "The stream joins a larger river downhill" },
        ],
        correct_order: ["y1", "y2", "y3", "y4"],
        hint: "Water on a mountain always moves downhill — start with the snowfall at the highest point.",
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
