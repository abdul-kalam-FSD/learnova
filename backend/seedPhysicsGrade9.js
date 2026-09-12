require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade-coverage gap-fill: Physics previously only had content at
// Grade 6. Reuses the existing PHYSICS_CIRCUIT_BUILDER mechanic/
// frontend (no code changes needed) with a series-vs-parallel
// wiring topic — assigning components to their correct role in
// series vs parallel arrangements, rather than Grade 6's basic
// single-loop circuit.
//
// Gap 5 fix: originally seeded at Grade 9. NCERT has no Electricity
// chapter at Class 9 at all — series/parallel circuits and Ohm's law
// are Class 10 Ch.11 ("Electricity"), a distinct chapter from the
// existing seedPhysicsGrade10.js content (Ch.12/13, magnetic and
// heating effects). Moved to Grade 10 as its own chapter rather than
// merged into that one, since they cover different NCERT chapters.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Physics is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Physics" for mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Physics content into this shape.
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 10 });
    console.log("Created new Grade 10 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Series and Parallel Circuits" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity",
      title: "Series and Parallel Circuits",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Circuit Behavior Under Different Wiring" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Circuit Behavior Under Different Wiring",
      explanation_text:
        "In a series circuit, all components share one path, so current is the same everywhere but voltage divides across components. In a parallel circuit, components each get their own path, so voltage is the same across each branch but current divides between them.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 6's Circuit Builder — `components`
  // are the tappable parts (tray), `slots` are positions/roles each
  // needs one part assigned to, `correct_mapping` (stripped before
  // the client sees it) is { slotId: componentId }.
  const circuitChallenges = [
    {
      title: "Series Circuit: Two Bulbs",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario:
          "Two bulbs are wired in series with one battery. If one bulb burns out, what happens to the other?",
        components: [
          { id: "g1", label: "The other bulb also goes out — the path is broken" },
          { id: "g2", label: "The other bulb gets brighter" },
          { id: "g3", label: "The other bulb keeps working normally" },
        ],
        slots: [{ id: "s1", label: "Effect on the second bulb" }],
        correct_mapping: { s1: "g1" },
        hint: "In series, there's only one path — break it anywhere and current stops everywhere on that path.",
      },
    },
    {
      title: "Parallel Circuit: Two Bulbs",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "Two bulbs are wired in parallel with one battery. If one bulb burns out, what happens to the other?",
        components: [
          { id: "h1", label: "The other bulb keeps working — it has its own path" },
          { id: "h2", label: "The other bulb also goes out" },
          { id: "h3", label: "The battery stops working entirely" },
        ],
        slots: [{ id: "s1", label: "Effect on the second bulb" }],
        correct_mapping: { s1: "h1" },
        hint: "In parallel, each branch has its own separate path back to the battery.",
      },
    },
    {
      title: "Series vs Parallel: Matching Properties",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each wiring type to what stays the same across its components.",
        components: [
          { id: "i1", label: "Current is the same through every component" },
          { id: "i2", label: "Voltage is the same across every branch" },
          { id: "i3", label: "Neither stays the same" },
        ],
        slots: [
          { id: "s1", label: "Series circuit" },
          { id: "s2", label: "Parallel circuit" },
        ],
        correct_mapping: { s1: "i1", s2: "i2" },
        hint: "One path shares current equally; separate paths share voltage equally.",
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
