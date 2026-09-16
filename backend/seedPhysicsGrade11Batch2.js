require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 11
// Physics previously had only one chapter ("Work, Energy and Power",
// two concepts, seedPhysicsGrade11b.js + its Speed Challenge sibling).
// Adds a second, genuinely distinct NCERT Class 11 Physics chapter —
// "Gravitation" — with three concepts.
//
// Reuses PHYSICS_CIRCUIT_BUILDER (no code changes) rather than
// PHYSICS_MATCH: PhysicsMatch.jsx hardcodes its on-screen copy to
// "Magnetism Match" / "Match Magnetic or Non-Magnetic" with no theme
// override available, which would mislabel a Gravitation challenge.
// CircuitBuilder.jsx already supports a `theme` override (used by
// Grade 12's Capacitor and Diode chapters for the same reason) so
// this reuses that same established pattern instead.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /physics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Physics", grade: 11 });
    console.log("Created new Grade 11 Physics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Gravitation" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Mechanics",
      title: "Gravitation",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  const GRAVITY_THEME = {
    topBarLabel: "Gravity Lab",
    badge: "PHYSICS · GRAVITATION",
    heading: "Match the Gravitational Scenario",
    intro: "Match each scenario to what actually happens — get every match right to complete the lab.",
    itemsNoun: "scenarios to match",
    objective: "Match each scenario to its correct outcome.",
    slotsLabel: "Scenarios (tap an outcome below, then tap a scenario to place it):",
    componentsLabel: "Outcomes:",
    testButtonLabel: "Check Matches",
    testingLabel: "Checking...",
    verdictCorrect: "✓ All matched correctly!",
    verdictIncorrect: "✕ Not quite right yet.",
    whatYouLearned: "Gravity follows an inverse-square law and depends only on mass and distance — not on an object's speed, shape, or composition.",
    resultTopBarLabel: "Lab Complete",
    resultBadge: "CONCEPT MASTERED",
    playAnotherLabel: "Try Another Scenario",
  };

  // ---- Concept 1: universal law of gravitation ----
  let lawConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Universal Law of Gravitation and Free Fall" });
  if (!lawConcept) {
    lawConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Universal Law of Gravitation and Free Fall",
      explanation_text:
        "Every object in the universe attracts every other object with a force proportional to the product of their masses and inversely proportional to the square of the distance between them: F = GMm/r². Near Earth's surface, this force gives every falling object the same acceleration g (~9.8 m/s²), regardless of its mass, because the extra force on a heavier object is exactly canceled by its extra inertia.",
    });
    console.log("Created concept:", lawConcept._id);
  } else {
    console.log("Using existing concept:", lawConcept._id);
  }

  const lawChallenges = [
    {
      title: "What Happens When Distance Doubles?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "Two masses are moved further apart. Match each change in distance to what happens to the gravitational force between them.",
        slots: [
          { id: "s1", label: "Distance is doubled" },
          { id: "s2", label: "Distance is tripled" },
          { id: "s3", label: "Distance is halved" },
        ],
        components: [
          { id: "c1", label: "Force drops to 1/4 of the original (inverse square of 2)" },
          { id: "c2", label: "Force drops to 1/9 of the original (inverse square of 3)" },
          { id: "c3", label: "Force increases to 4 times the original (inverse square of 1/2)" },
          { id: "c4", label: "Force drops to 1/2 of the original" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Gravity follows an inverse-SQUARE law — a distance change of factor n changes the force by a factor of 1/n².",
      },
    },
    {
      title: "Why Do All Objects Fall at the Same Rate?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "A feather and a hammer are dropped together in a vacuum. Match each fact to what it explains.",
        slots: [
          { id: "s1", label: "A heavier object experiences a larger gravitational force" },
          { id: "s2", label: "A heavier object also has more inertia (resistance to acceleration)" },
          { id: "s3", label: "Both objects hit the ground at the same time in a vacuum" },
        ],
        components: [
          { id: "c1", label: "True — force is proportional to mass, F = GMm/r²" },
          { id: "c2", label: "True — by Newton's second law, a = F/m, so more mass needs more force to accelerate the same amount" },
          { id: "c3", label: "Because the extra force on the heavier object exactly cancels its extra inertia, leaving the same acceleration g for both" },
          { id: "c4", label: "Only true because air resistance is equal on both objects" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Mass appears in both the force (more mass, more pull) and the resistance to acceleration (more mass, harder to speed up) — the two effects cancel exactly.",
      },
    },
    {
      title: "Comparing Gravity on Different Planets",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "Match each planetary comparison to what it implies about surface gravity (g = GM/R²).",
        slots: [
          { id: "s1", label: "A planet with the same mass as Earth but twice the radius" },
          { id: "s2", label: "A planet with twice Earth's mass and the same radius" },
          { id: "s3", label: "A planet with twice Earth's mass and twice the radius" },
        ],
        components: [
          { id: "c1", label: "Surface gravity is 1/4 of Earth's (radius squared in the denominator dominates)" },
          { id: "c2", label: "Surface gravity is double Earth's (mass doubled, radius unchanged)" },
          { id: "c3", label: "Surface gravity is half of Earth's (mass doubled, but radius-squared quadruples the denominator)" },
          { id: "c4", label: "Surface gravity is exactly the same as Earth's in every case" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "g = GM/R² — mass increases g proportionally, but radius shrinks it by the square, so radius changes matter more.",
      },
    },
  ];

  for (const challenge of lawChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_CIRCUIT_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
        concept_id: lawConcept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else if (!exists.payload?.theme) {
      exists.payload = { ...exists.payload, theme: challenge.payload.theme };
      exists.markModified("payload");
      await exists.save();
      console.log("Patched theme onto existing GameContent:", exists.title, exists._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---- Concept 2: Kepler's laws ----
  let keplerConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Kepler's Laws of Planetary Motion" });
  if (!keplerConcept) {
    keplerConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Kepler's Laws of Planetary Motion",
      explanation_text:
        "Kepler's first law says planets orbit the Sun in ellipses with the Sun at one focus. His second law says a planet sweeps out equal areas in equal times, which means it moves fastest at its closest approach (perihelion) and slowest at its farthest point (aphelion). His third law says the square of a planet's orbital period is proportional to the cube of its average orbital radius (T² ∝ r³).",
    });
    console.log("Created concept:", keplerConcept._id);
  } else {
    console.log("Using existing concept:", keplerConcept._id);
  }

  const keplerChallenges = [
    {
      title: "Match Each Law to Its Statement",
      difficulty: "medium",
      order_index: 1,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "Match each of Kepler's laws to what it actually states.",
        slots: [
          { id: "s1", label: "Kepler's First Law" },
          { id: "s2", label: "Kepler's Second Law" },
          { id: "s3", label: "Kepler's Third Law" },
        ],
        components: [
          { id: "c1", label: "Planets orbit in ellipses with the Sun at one focus" },
          { id: "c2", label: "A planet sweeps equal areas in equal time intervals" },
          { id: "c3", label: "T² is proportional to r³ for any orbiting planet" },
          { id: "c4", label: "All planets take exactly one year to orbit the Sun" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "First law is about shape, second is about speed varying around the orbit, third is about period versus distance.",
      },
    },
    {
      title: "Where Is the Planet Moving Fastest?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "A planet's elliptical orbit brings it closer to and farther from the Sun at different points. Match each position to its orbital speed.",
        slots: [
          { id: "s1", label: "Perihelion (closest point to the Sun)" },
          { id: "s2", label: "Aphelion (farthest point from the Sun)" },
          { id: "s3", label: "Midway between perihelion and aphelion" },
        ],
        components: [
          { id: "c1", label: "Fastest speed in the orbit" },
          { id: "c2", label: "Slowest speed in the orbit" },
          { id: "c3", label: "Speed between the fastest and slowest values" },
          { id: "c4", label: "Speed is zero at this point" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Equal areas in equal times means the planet must move faster when it's closer to the Sun (a shorter, wider sweep) to cover the same area.",
      },
    },
    {
      title: "Applying Kepler's Third Law",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "Match each orbital comparison to what Kepler's Third Law (T² ∝ r³) predicts.",
        slots: [
          { id: "s1", label: "Planet B orbits at 4 times Planet A's distance from the Sun" },
          { id: "s2", label: "Two planets have the same orbital period" },
          { id: "s3", label: "A satellite is moved to a smaller orbital radius" },
        ],
        components: [
          { id: "c1", label: "Planet B's period is 8 times Planet A's (since 4³ = 64, and √64 = 8)" },
          { id: "c2", label: "They must also have the same average orbital radius" },
          { id: "c3", label: "Its orbital period must decrease" },
          { id: "c4", label: "Planet B's period is 4 times Planet A's" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "T² ∝ r³ means T ∝ r^1.5 — a factor-of-4 increase in radius gives a factor of 4^1.5 = 8 increase in period.",
      },
    },
  ];

  for (const challenge of keplerChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_CIRCUIT_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
        concept_id: keplerConcept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else if (!exists.payload?.theme) {
      exists.payload = { ...exists.payload, theme: challenge.payload.theme };
      exists.markModified("payload");
      await exists.save();
      console.log("Patched theme onto existing GameContent:", exists.title, exists._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---- Concept 3: escape and orbital velocity ----
  let velocityConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Escape Velocity and Orbital Velocity" });
  if (!velocityConcept) {
    velocityConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Escape Velocity and Orbital Velocity",
      explanation_text:
        "Escape velocity is the minimum speed an object needs to permanently break free of a planet's gravity without further propulsion, given by v_escape = √(2GM/R). Orbital velocity is the speed needed to maintain a stable circular orbit at a given radius, v_orbital = √(GM/r) — always slower than escape velocity at the same distance, by a factor of √2.",
    });
    console.log("Created concept:", velocityConcept._id);
  } else {
    console.log("Using existing concept:", velocityConcept._id);
  }

  const velocityChallenges = [
    {
      title: "Escape Velocity vs Orbital Velocity",
      difficulty: "medium",
      order_index: 1,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "Match each velocity concept to its correct description.",
        slots: [
          { id: "s1", label: "Escape velocity" },
          { id: "s2", label: "Orbital velocity" },
          { id: "s3", label: "A speed less than orbital velocity at that radius" },
        ],
        components: [
          { id: "c1", label: "Minimum speed to permanently leave the planet's gravity" },
          { id: "c2", label: "Speed needed to maintain a stable circular orbit at that radius" },
          { id: "c3", label: "The object will fall back toward the planet, not maintain orbit" },
          { id: "c4", label: "The object will fly off in a straight line immediately" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Anything slower than orbital velocity can't maintain a circular path and will spiral inward instead.",
      },
    },
    {
      title: "What Changes Escape Velocity?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "Match each change to what happens to a planet's escape velocity (v_escape = √(2GM/R)).",
        slots: [
          { id: "s1", label: "Planet's mass is quadrupled, radius unchanged" },
          { id: "s2", label: "Planet's radius is quadrupled, mass unchanged" },
          { id: "s3", label: "Both mass and radius are quadrupled" },
        ],
        components: [
          { id: "c1", label: "Escape velocity doubles (square root of 4)" },
          { id: "c2", label: "Escape velocity halves (square root of 1/4)" },
          { id: "c3", label: "Escape velocity stays the same (M/R ratio unchanged)" },
          { id: "c4", label: "Escape velocity quadruples" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Escape velocity depends on the square root of M/R — track how that ratio changes, then take the square root.",
      },
    },
    {
      title: "Why Is Escape Velocity √2 Times Orbital Velocity?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: GRAVITY_THEME,
        scenario: "Match each energy statement to what it implies about escape vs orbital velocity at the same radius.",
        slots: [
          { id: "s1", label: "A circular orbit balances gravitational pull with centripetal requirement" },
          { id: "s2", label: "Escaping requires total mechanical energy to reach exactly zero at infinity" },
          { id: "s3", label: "Comparing v_orbital = √(GM/r) with v_escape = √(2GM/R) at the same r" },
        ],
        components: [
          { id: "c1", label: "This gives v_orbital² = GM/r" },
          { id: "c2", label: "This requires exactly twice the kinetic energy of a circular orbit at that radius" },
          { id: "c3", label: "v_escape = √2 × v_orbital, since escape velocity squared is exactly double orbital velocity squared" },
          { id: "c4", label: "The two velocities are always unrelated to each other" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Escape velocity's formula has a factor of 2 inside the square root that orbital velocity's doesn't — pulling that 2 out gives exactly √2.",
      },
    },
  ];

  for (const challenge of velocityChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_CIRCUIT_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
        concept_id: velocityConcept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else if (!exists.payload?.theme) {
      exists.payload = { ...exists.payload, theme: challenge.payload.theme };
      exists.markModified("payload");
      await exists.save();
      console.log("Patched theme onto existing GameContent:", exists.title, exists._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
