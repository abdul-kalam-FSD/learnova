require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 10 "Earth: Our
// Shared Home" (2026-27 session, Unit 5: Our Amazing Planet, final
// chapter of the book).
//
// Reuses SOCIAL_SCIENCE_CIVIC_DECISION — the same single-choice
// "pick the most responsible response" mechanic already used for
// "Sharing What We Have Fairly" and "Our School" — a genuine fit for
// conservation choices about a shared, limited planet. No new
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Earth: Our Shared Home" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Amazing Planet",
      title: "Earth: Our Shared Home",
      order_index: 10,
      strand: "Social Science",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Caring for a Shared Planet" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Caring for a Shared Planet",
      explanation_text:
        "Earth's air, water, soil, and forests are shared by every living thing, and by every country — pollution or overuse in one place can affect life far away. Small everyday choices, like saving water, not littering, or planting trees, add up when many people make them, the same way a shared resource like a water tap only stays fair when everyone plays their part.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const earthChallenges = [
    {
      title: "Wasting Water at Home",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "You notice a tap left running while nobody is using it. What's the most responsible thing to do?",
        options: [
          { id: "o1", label: "Leave it — it's not your tap" },
          { id: "o2", label: "Turn it off and mention it to whoever left it running" },
          { id: "o3", label: "Assume someone else will notice and fix it" },
          { id: "o4", label: "Use the running water since it's already flowing" },
        ],
        correct_hotspot_id: "o2",
        hint: "Fresh water is a limited shared resource — wasting it affects everyone, not just the person who left the tap on.",
      },
    },
    {
      title: "A Classroom Recycling Decision",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Your class generates a lot of paper waste. Some classmates say recycling is 'too much effort' for one classroom. What's the best response?",
        options: [
          { id: "o1", label: "Agree — one classroom's waste is too small to matter" },
          { id: "o2", label: "Set up a simple recycling bin and encourage everyone to use it" },
          { id: "o3", label: "Recycle only your own paper and ignore the rest" },
          { id: "o4", label: "Wait for the school to make it compulsory before doing anything" },
        ],
        correct_hotspot_id: "o2",
        hint: "Shared environmental habits only work if someone is willing to start them, even at a small scale.",
      },
    },
    {
      title: "A Factory Polluting a Shared River",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "A factory near a village releases waste into the river that villages downstream also depend on for drinking water. What is the most responsible course of action for the community?",
        options: [
          { id: "o1", label: "Downstream villages should just find a different water source permanently" },
          { id: "o2", label: "Ignore it since the factory provides local jobs" },
          { id: "o3", label: "Raise the issue with local authorities and request the factory treats its waste before releasing it" },
          { id: "o4", label: "Only the village nearest the factory should worry about it" },
        ],
        correct_hotspot_id: "o3",
        hint: "A shared resource like a river affects everyone along it — the fair fix addresses the source of the problem, not just its effect on one group.",
      },
    },
  ];

  for (const challenge of earthChallenges) {
    const exists = await GameContent.findOne({ game_type: "SOCIAL_SCIENCE_CIVIC_DECISION", title: challenge.title });
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
