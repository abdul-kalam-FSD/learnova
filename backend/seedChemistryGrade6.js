require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 6 Chemistry hole in the integrated Science subject —
// Grade 6 previously had Physics (Exploring Magnets, via
// seedPhysicsMatchGrade6.js) and, as of this pass, Biology (Diversity
// in the Living World, via seedBiologyGrade6.js), but no Chemistry.
// Grounded in the current "Curiosity" textbook (NCF-SE 2023, 2026-27
// session), confirmed 12-chapter list, Ch.9 "Methods of Separation in
// Everyday Life" — a real Grade 6 chapter covering how mixtures are
// separated (sieving, sedimentation, filtration, evaporation,
// winnowing) depending on what they're made of.
//
// Gap 1 fix: Chemistry is not a separate top-level Subject below
// Grade 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Chemistry" for mastery/analytics.
//
// Reuses CHEMISTRY_MATCH (same slot/component mapping-equality check
// as the Grade 8 "Metals and Non-Metals" version), applied to
// separation methods instead of material properties.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 6 });
    console.log("Created new Grade 6 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Methods of Separation in Everyday Life" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Methods of Separation in Everyday Life",
      order_index: 9,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Choosing the Right Way to Separate a Mixture" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Choosing the Right Way to Separate a Mixture",
      explanation_text:
        "Different mixtures need different separation methods, depending on the size, weight, and state of what's mixed together. Sieving separates by particle size, sedimentation and filtration separate solids from liquids, and evaporation separates a dissolved solid from a liquid by removing the liquid entirely.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same slot/component mapping-equality check as
  // CHEMISTRY_MATCH elsewhere — student matches each mixture (slot)
  // to the separation method that would work on it (component).
  const separationChallenges = [
    {
      title: "Match: Mixture to Separation Method",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each mixture to the method that would separate it.",
        slots: [
          { id: "s1", label: "Stones mixed into rice" },
          { id: "s2", label: "Salt dissolved in water" },
          { id: "s3", label: "Husk mixed into grain" },
        ],
        components: [
          { id: "c3", label: "Winnowing" },
          { id: "c2", label: "Evaporation" },
          { id: "c1", label: "Hand-picking / Sieving" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask whether the mixture is solid-in-solid, dissolved, or light chaff mixed with heavier grain.",
      },
    },
    {
      title: "Match: Muddy Water Cleanup",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "A jar of muddy pond water needs to be cleaned up in stages. Match each stage to what it does.",
        slots: [
          { id: "s1", label: "Letting the jar sit untouched for an hour" },
          { id: "s2", label: "Pouring the clearer water through a cloth" },
          { id: "s3", label: "Heating the filtered water until it boils away" },
        ],
        components: [
          { id: "c3", label: "Evaporation — removes the water, leaving dissolved salts behind" },
          { id: "c2", label: "Filtration — traps remaining fine particles" },
          { id: "c1", label: "Sedimentation — heavier mud settles to the bottom" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The order matters: settle the heavy stuff first, then filter what's left, then deal with what's actually dissolved.",
      },
    },
    {
      title: "Match: Method to a Trickier Mixture",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "These mixtures are less obvious than rice-and-stones. Match each one to the method that actually works — extra methods are listed to test your reasoning.",
        slots: [
          { id: "s1", label: "Iron nails mixed into sand" },
          { id: "s2", label: "Sugar dissolved in tea" },
          { id: "s3", label: "Fine flour mixed with a few small pebbles" },
        ],
        components: [
          { id: "c5", label: "Filtration" },
          { id: "c4", label: "Winnowing" },
          { id: "c3", label: "Sieving" },
          { id: "c2", label: "Evaporation" },
          { id: "c1", label: "Magnetic Separation" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "One of these mixtures has a metal in it — think about what property makes that one different from the rest.",
      },
    },
  ];

  for (const challenge of separationChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
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
