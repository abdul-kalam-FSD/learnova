require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — Decision E-2 (APPROVED): expand the
// existing "Circuits: Bulbs, Buzzers, and Switches" chapter (found
// via findOne, NOT renamed or deleted) with a sibling concept so it
// represents the fuller scope of NCERT Chapter 7 "Energy: How Things
// Work" (2026-27 session, Unit 4: Things Around Us) — which covers
// energy sources and simple machines more broadly, not just circuits.
// Existing GameContent under this chapter is untouched.
//
// Reuses PHYSICS_MATCH — an existing, already-registered Physics
// mapping mechanic (currently used for magnetism elsewhere) — for
// classifying energy sources and simple machines, a genuine mapping
// task. No new mechanic needed.
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

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Circuits: Bulbs, Buzzers, and Switches" });
  if (!chapter) {
    console.error(
      "ERROR: expected chapter 'Circuits: Bulbs, Buzzers, and Switches' to already exist (created by seedPhysicsGrade5.js). Run that seed first."
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Energy Sources and Simple Machines" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Energy Sources and Simple Machines",
      explanation_text:
        "Energy makes things work — a bulb needs electrical energy, a moving car needs energy from fuel, and a plant needs energy from sunlight. Some energy sources, like sunlight and wind, can be used again and again (renewable); others, like coal and petrol, get used up and can't be replaced quickly (non-renewable). Simple machines like a lever, pulley, or wheel don't create energy — they just make a task easier by changing how much force or effort is needed.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const energyChallenges = [
    {
      title: "Match: Device to Its Energy Source",
      difficulty: "easy",
      order_index: 4,
      payload: {
        scenario: "Match each device to the type of energy that mainly powers it.",
        slots: [
          { id: "s1", label: "A solar-powered calculator" },
          { id: "s2", label: "A wind turbine" },
          { id: "s3", label: "A wood-burning stove" },
        ],
        components: [
          { id: "c1", label: "Sunlight (solar energy)" },
          { id: "c2", label: "Moving air (wind energy)" },
          { id: "c3", label: "Burning fuel (chemical energy in wood)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Match the device's design to the natural source it's built to capture.",
      },
    },
    {
      title: "Match: Renewable or Non-Renewable",
      difficulty: "medium",
      order_index: 5,
      payload: {
        scenario: "Match each energy source to whether it is renewable or non-renewable.",
        slots: [
          { id: "s1", label: "Sunlight" },
          { id: "s2", label: "Coal" },
          { id: "s3", label: "Wind" },
          { id: "s4", label: "Petrol" },
        ],
        components: [
          { id: "c1", label: "Renewable — naturally available again and again" },
          { id: "c2", label: "Non-renewable — takes millions of years to form, gets used up" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1", s4: "c2" },
        hint: "Ask: will this source still be freely available tomorrow no matter how much is used today?",
      },
    },
    {
      title: "Match: Simple Machine to What It Makes Easier",
      difficulty: "hard",
      order_index: 6,
      payload: {
        scenario: "Match each simple machine to the task it makes easier.",
        slots: [
          { id: "s1", label: "A see-saw / lever" },
          { id: "s2", label: "A pulley over a well" },
          { id: "s3", label: "A ramp / inclined plane" },
        ],
        components: [
          { id: "c1", label: "Lifting a heavy load with less effort by changing the direction of pull" },
          { id: "c2", label: "Lifting one end of a heavy object by pushing down on the other end" },
          { id: "c3", label: "Moving a heavy object to a higher level without lifting it straight up" },
        ],
        correct_mapping: { s1: "c2", s2: "c1", s3: "c3" },
        hint: "A pulley changes the direction you pull; a lever uses a pivot point; a ramp trades distance for less lifting force.",
      },
    },
  ];

  for (const challenge of energyChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_MATCH",
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
