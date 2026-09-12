require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 5 EVS fill (Physics strand). Reuses PHYSICS_CIRCUIT_BUILDER
// exactly as the Grade 4 "Simple Circuits" chapter does
// (mapping-equality check), stepping up in two ways rather than
// repeating Grade 4's battery/bulb/switch progression: (1) a new
// component type, the buzzer, alongside the bulb, and (2) circuits
// where two loads are controlled by their OWN separate switch instead
// of sharing one switch (Grade 4's hardest challenge used one shared
// switch for two bulbs). Still stops well short of Grade 6's formal
// "Electricity and Circuits" chapter (no resistors, no series/parallel
// terminology).
//
// Source basis (Gap 5, book name corrected): same honest framing as
// Grade 4's Physics content — no dedicated electricity chapter exists
// at the Grade 5 EVS level, so this is an age-appropriate progression
// of the same simplified circuit idea, not sourced from one specific
// EVS chapter. Note: the Grade 5 EVS textbook is now "Our Wondrous
// World" (NCF-SE 2023, current 2026-27 session), not "Looking
// Around" — this file never cited a specific Grade 5 chapter, so no
// correction was needed there. Separately: the original claim that
// electricity/circuits content sits at "Class 6" should NOT be
// treated as still confirmed — Grade 6 Science is now "Curiosity",
// and its confirmed chapter list (Wonderful World of Science;
// Diversity in Living World; Mindful Eating; Exploring Magnets;
// Measurement of Length and Motion; Materials Around Us; Temperature;
// States of Water; Methods of Separation; Living Creatures;
// Nature's Treasures; Beyond Earth) has NO electricity/circuits
// chapter at all. This needs re-checking as part of the Grade 6-10
// pass, not assumed to still be true.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Circuits: Bulbs, Buzzers, and Switches" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity Basics",
      title: "Circuits: Bulbs, Buzzers, and Switches",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "One Circuit Can Power Different Things" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "One Circuit Can Power Different Things",
      explanation_text:
        "A complete circuit can light up a bulb or make a buzzer sound — both just need a battery and an unbroken loop. If two loads share one switch, they turn on and off together. To control them separately, each load needs its own switch.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const circuitChallenges = [
    {
      title: "Make the Buzzer Sound",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Connect the battery and buzzer correctly so the buzzer sounds.",
        components: [
          { id: "c1", label: "Battery" },
          { id: "c2", label: "Buzzer" },
        ],
        slots: [
          { id: "s1", label: "Power Source" },
          { id: "s2", label: "Sound Load" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "The battery pushes the electricity — it always goes in the power source slot, no matter which load it's powering.",
      },
    },
    {
      title: "A Buzzer You Can Switch Off",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "This circuit adds a switch so you can turn the buzzer on and off.",
        components: [
          { id: "d1", label: "Battery" },
          { id: "d2", label: "Switch" },
          { id: "d3", label: "Buzzer" },
        ],
        slots: [
          { id: "t1", label: "Power Source" },
          { id: "t2", label: "On/Off Control" },
          { id: "t3", label: "Sound Load" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "The switch controls whether current can flow to the buzzer — it doesn't make the sound itself.",
      },
    },
    {
      title: "Bulb and Buzzer, Controlled Separately",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "One battery powers both a bulb and a buzzer, but each has its own switch so you can turn them on or off independently.",
        components: [
          { id: "e1", label: "Battery" },
          { id: "e2", label: "Switch for the Bulb" },
          { id: "e3", label: "Switch for the Buzzer" },
          { id: "e4", label: "Bulb" },
          { id: "e5", label: "Buzzer" },
        ],
        slots: [
          { id: "v1", label: "Power Source" },
          { id: "v2", label: "Bulb's On/Off Control" },
          { id: "v3", label: "Buzzer's On/Off Control" },
          { id: "v4", label: "Light Load" },
          { id: "v5", label: "Sound Load" },
        ],
        correct_mapping: { v1: "e1", v2: "e2", v3: "e3", v4: "e4", v5: "e5" },
        hint: "Unlike a shared switch, each load here needs to be matched to its OWN switch, not just any switch.",
      },
    },
  ];

  for (const challenge of circuitChallenges) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_CIRCUIT_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
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
