require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-gap fill (genuine gap list item 1): Grade 9 Social Science
// already has a Civics chapter (seedSocialScienceGrade9.js) but no
// Geography strand content. Curriculum reference: NCERT's new Grade 9
// book "Understanding Society: India and Beyond, Part 1" (NCF-SE
// 2023, released for the 2026-27 session) opens its Geography portion
// with "Shaping of the Earth's Surface" — landform-building processes
// and India's north-to-south physiographic sequence. Reuses the
// existing GEOGRAPHY_ROUTE_BUILDER mechanic (ordered-sequence check,
// same family as seedGeographyGrade8.js's river/road tracing), no new
// backend scoring logic needed.
//
// Note: Part 2 of the new Grade 9 book had not been confirmed
// released as of this writing, so this seed sticks to Part 1 content
// only rather than guessing at Part 2's scope.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 9 Social Science subject not found — run seedSocialScienceGrade9.js first.");
  }
  console.log("Using existing subject:", subject._id);

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Shaping of the Earth's Surface" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Understanding Society: India and Beyond",
      title: "Shaping of the Earth's Surface",
      order_index: 2,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "How Landforms Are Built, in Sequence" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "How Landforms Are Built, in Sequence",
      explanation_text:
        "The Earth's surface is shaped by processes that happen in a fixed order, not all at once — colliding plates fold rock upward before weathering and rivers begin wearing it back down. India's own landscape reflects this: its physical divisions line up in a real north-to-south sequence, from the young fold mountains of the Himalayas down to the old, worn plateau and finally the coast.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 8's Route Builder — `scrambled_stops`
  // shown out of order, `correct_order` (stripped before the client
  // sees it) is the true sequence.
  const routeChallenges = [
    {
      title: "How Fold Mountains Like the Himalayas Form",
      difficulty: "medium",
      order_index: 1,
      payload: {
        journey_label: "Put the stages of Himalayan mountain-building in the order they actually happen",
        scrambled_stops: [
          { id: "f3", label: "Sediment layers on the ocean floor between the plates get squeezed and folded" },
          { id: "f1", label: "The Indian tectonic plate drifts north and collides with the Eurasian plate" },
          { id: "f4", label: "The folded rock is pushed upward, forming young, jagged fold mountains" },
          { id: "f2", label: "The collision compresses the crust between the two plates" },
          { id: "f5", label: "Weathering and river erosion slowly begin wearing the new peaks down" },
        ],
        correct_order: ["f1", "f2", "f3", "f4", "f5"],
        hint: "Collision comes first, then compression and folding, then uplift — erosion is always the last stage, acting on a mountain that already exists.",
      },
    },
    {
      title: "Crossing India, North to South",
      difficulty: "easy",
      order_index: 2,
      payload: {
        journey_label: "Trace India's physical divisions in order, from the northern border down to the sea",
        scrambled_stops: [
          { id: "i3", label: "The Peninsular Plateau, an ancient block of hard, worn-down rock" },
          { id: "i1", label: "The Himalayas, young and still rising fold mountains" },
          { id: "i4", label: "The narrow coastal plains hugging the sea" },
          { id: "i2", label: "The Northern Plains, built from river-deposited alluvial soil" },
        ],
        correct_order: ["i1", "i2", "i3", "i4"],
        hint: "Start at the highest, youngest mountains in the north and work down toward the coast.",
      },
    },
    {
      title: "The Rock Cycle: One Path Through It",
      difficulty: "hard",
      order_index: 3,
      payload: {
        journey_label: "Sequence one possible path a piece of rock takes through the rock cycle",
        scrambled_stops: [
          { id: "r3", label: "Loose sediment is compacted and cemented into sedimentary rock" },
          { id: "r1", label: "Molten magma cools and hardens into igneous rock at the surface" },
          { id: "r4", label: "Heat and pressure deep underground transform it into metamorphic rock" },
          { id: "r2", label: "Weathering and erosion break the igneous rock down into loose sediment" },
        ],
        correct_order: ["r1", "r2", "r3", "r4"],
        hint: "A rock has to exist and then be broken down before it can be reformed into a new type — cooling and hardening always comes first in this path.",
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
