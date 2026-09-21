require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 6 "Some Unique
// Places" (2026-27 session, Unit 3: Incredible India).
//
// Reuses GEOGRAPHY_ROUTE_BUILDER — the same ordered-sequence mechanic
// already used for the river's journey — for a "plan a visiting
// order" itinerary across a few of India's unique natural sites, a
// genuine sequencing task (e.g. geographic order along a route),
// rather than a straight matching task, which is why this chapter
// varies from the previous chapter's FEATURE_MATCH choice. No new
// mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Some Unique Places" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Incredible India",
      title: "Some Unique Places",
      order_index: 6,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "What Makes a Place Unique" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "What Makes a Place Unique",
      explanation_text:
        "Some places are unlike anywhere else because of an unusual natural feature or a very specific ecosystem — a living root bridge grown from tree roots, a floating national park on a lake, or a rock formation shaped entirely by wind and time. Planning a visit to several such places in a sensible geographic order (rather than zig-zagging back and forth) is part of understanding how they're actually laid out on a map.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const placesChallenges = [
    {
      title: "Order: A Northeast India Nature Trip",
      difficulty: "easy",
      order_index: 1,
      payload: {
        journey_label: "Arrange these Meghalaya stops in a sensible visiting order for a trip starting in the state capital, Shillong.",
        scrambled_stops: [
          { id: "p3", label: "Mawlynnong — Asia's cleanest village, farthest from Shillong" },
          { id: "p2", label: "Cherrapunji — one of the wettest places on Earth, partway along the route" },
          { id: "p1", label: "Shillong — the starting point" },
        ],
        correct_order: ["p1", "p2", "p3"],
        hint: "Start where the trip begins, then visit the closer unique place before travelling on to the farthest one.",
      },
    },
    {
      title: "Order: Visiting India's Floating National Park",
      difficulty: "medium",
      order_index: 2,
      payload: {
        journey_label: "Arrange these steps in the order you would take to properly visit Keibul Lamjao, India's floating national park in Manipur.",
        scrambled_stops: [
          { id: "p4", label: "Board a small boat to reach the floating phumdi (mat of vegetation) habitat" },
          { id: "p3", label: "Travel to Loktak Lake, where the park is located" },
          { id: "p2", label: "Learn about the sangai deer that lives only in this unique habitat" },
          { id: "p1", label: "Arrive in Manipur, the state where the park is located" },
        ],
        correct_order: ["p1", "p3", "p4", "p2"],
        hint: "You need to reach the state, then the specific lake, then actually get onto the floating habitat, before you can observe what lives there.",
      },
    },
    {
      title: "Order: Exploring a Living Root Bridge",
      difficulty: "hard",
      order_index: 3,
      payload: {
        journey_label: "Arrange these steps in the order they actually happen, from how a living root bridge is made to how it is eventually used.",
        scrambled_stops: [
          { id: "p4", label: "Villagers cross the river safely on the now-strong root bridge for generations" },
          { id: "p3", label: "Over many years, the roots thicken and weave into a strong, natural bridge" },
          { id: "p2", label: "The growing roots are guided across a river using bamboo or betel-nut trunks as a frame" },
          { id: "p1", label: "Villagers plant rubber fig tree roots near a riverbank" },
        ],
        correct_order: ["p1", "p2", "p3", "p4"],
        hint: "This is a slow, living process — the tree has to be planted and guided long before the bridge is strong enough to actually use.",
      },
    },
  ];

  for (const challenge of placesChallenges) {
    const exists = await GameContent.findOne({ game_type: "GEOGRAPHY_ROUTE_BUILDER", title: challenge.title });
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
