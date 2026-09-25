require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Science Batch 3 (final chapter). Adds the current NCERT
// Class 7 Science ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter
// 12, "Earth, Moon and the Sun" — verified via multiple independent
// sources: Earth's rotation and revolution, day/night, axial tilt and
// seasons, phases of the Moon, solar and lunar eclipses. Kept
// Grade-7-appropriate: no umbra/penumbra terminology, no orbital
// mechanics beyond "Earth orbits the Sun, tilted on its axis."
//
// Reuses GEOGRAPHY_FEATURE_MATCH's mapping-equality check (cause of
// motion -> observed effect, and eclipse type -> what causes it) and
// SOCIAL_SCIENCE_PROCESS_BUILDER's ordering check (sequencing the
// Moon's phases) — no new mechanic; both are reused purely for their
// interaction shape, same as earlier Grade 7 Science chapters.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Earth, Moon and the Sun" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Earth and Space",
      title: "Earth, Moon and the Sun",
      order_index: 1,
      strand: "Earth Science",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---------- Concept 1: rotation and revolution ----------
  let conceptMotion = await Concept.findOne({ chapter_id: chapter._id, title: "Earth's Rotation and Revolution" });
  if (!conceptMotion) {
    conceptMotion = await Concept.create({
      chapter_id: chapter._id,
      title: "Earth's Rotation and Revolution",
      explanation_text:
        "Earth spins on its own axis once every 24 hours (rotation), which causes day and night. Earth also travels all the way around the Sun once every year (revolution). Because Earth's axis is tilted rather than upright, different parts of Earth tilt toward or away from the Sun as it revolves — this tilt, not distance from the Sun, is what causes the seasons.",
    });
    console.log("Created concept:", conceptMotion._id);
  } else {
    console.log("Using existing concept:", conceptMotion._id);
  }

  const motionChallenges = [
    {
      title: "Match: Earth's Motion to What It Causes",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each fact about Earth's motion to what it actually causes.",
        slots: [
          { id: "s1", label: "Earth spins on its own axis once every 24 hours" },
          { id: "s2", label: "Earth orbits the Sun once every 365.25 days" },
          { id: "s3", label: "Earth's axis is tilted rather than upright" },
        ],
        components: [
          { id: "c1", label: "Day turns to night and back again" },
          { id: "c2", label: "One full year passes" },
          { id: "c3", label: "The seasons change as different parts of Earth tilt toward or away from the Sun" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "It's the tilt, combined with the yearly orbit, that actually causes the seasons — not distance from the Sun.",
      },
    },
    {
      title: "Match: Observation to Its Cause",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each observation to what causes it.",
        slots: [
          { id: "s1", label: "The Sun appears to rise in the east and set in the west every day" },
          { id: "s2", label: "Different stars are visible in the night sky at different times of the year" },
          { id: "s3", label: "The North Pole gets continuous daylight in June but continuous darkness in December" },
        ],
        components: [
          { id: "c1", label: "Earth's rotation on its axis" },
          { id: "c2", label: "Earth's revolution around the Sun over the year" },
          { id: "c3", label: "Earth's tilted axis combined with its yearly orbit" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The Sun's daily rise and set is about the fast 24-hour spin, not the year-long orbit.",
      },
    },
  ];

  for (const challenge of motionChallenges) {
    const exists = await GameContent.findOne({ game_type: "GEOGRAPHY_FEATURE_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
        concept_id: conceptMotion._id,
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

  // ---------- Concept 2: moon phases and eclipses ----------
  let conceptMoon = await Concept.findOne({ chapter_id: chapter._id, title: "Phases of the Moon and Eclipses" });
  if (!conceptMoon) {
    conceptMoon = await Concept.create({
      chapter_id: chapter._id,
      title: "Phases of the Moon and Eclipses",
      explanation_text:
        "The Moon doesn't make its own light — we see it because it reflects sunlight. As the Moon orbits Earth, we see different amounts of its lit half, giving us phases from New Moon to Full Moon and back. A solar eclipse happens when the Moon passes between the Sun and Earth; a lunar eclipse happens when Earth passes between the Sun and Moon.",
    });
    console.log("Created concept:", conceptMoon._id);
  } else {
    console.log("Using existing concept:", conceptMoon._id);
  }

  const moonPhaseProcess = {
    title: "Process: The Moon's Phases in Order",
    difficulty: "easy",
    order_index: 1,
    payload: {
      scenario_label: "Arrange the Moon's phases in the order they actually occur.",
      scrambled_steps: [
        { id: "g3", label: "Full Moon — the whole face of the Moon is lit" },
        { id: "g1", label: "New Moon — the Moon is not visible at all" },
        { id: "g4", label: "Last Quarter — half the Moon's face is lit, and shrinking" },
        { id: "g2", label: "First Quarter — half the Moon's face is lit, and growing" },
      ],
      correct_order: ["g1", "g2", "g3", "g4"],
      hint: "The lit portion grows from nothing to a full circle, then shrinks back down again.",
    },
  };

  const existsProcess = await GameContent.findOne({ game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER", title: moonPhaseProcess.title });
  if (!existsProcess) {
    const created = await GameContent.create({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      concept_id: conceptMoon._id,
      title: moonPhaseProcess.title,
      difficulty: moonPhaseProcess.difficulty,
      order_index: moonPhaseProcess.order_index,
      payload: moonPhaseProcess.payload,
    });
    console.log("Created GameContent:", created.title, created._id);
  } else {
    console.log("Using existing GameContent:", existsProcess.title, existsProcess._id);
  }

  const eclipseMatch = {
    title: "Match: Eclipse Type to What Causes It",
    difficulty: "medium",
    order_index: 2,
    payload: {
      scenario: "Match each eclipse type to what actually causes it.",
      slots: [
        { id: "s1", label: "The Moon passes directly between the Sun and Earth, blocking sunlight from part of Earth" },
        { id: "s2", label: "Earth passes directly between the Sun and Moon, and Earth's shadow falls on the Moon" },
      ],
      components: [
        { id: "c1", label: "Solar Eclipse" },
        { id: "c2", label: "Lunar Eclipse" },
      ],
      correct_mapping: { s1: "c1", s2: "c2" },
      hint: "Whichever object is in the middle is the one blocking the light — the other one goes dark or gets blocked.",
    },
  };

  const existsEclipse = await GameContent.findOne({ game_type: "GEOGRAPHY_FEATURE_MATCH", title: eclipseMatch.title });
  if (!existsEclipse) {
    const created = await GameContent.create({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      concept_id: conceptMoon._id,
      title: eclipseMatch.title,
      difficulty: eclipseMatch.difficulty,
      order_index: eclipseMatch.order_index,
      payload: eclipseMatch.payload,
    });
    console.log("Created GameContent:", created.title, created._id);
  } else {
    console.log("Using existing GameContent:", existsEclipse.title, existsEclipse._id);
  }

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
