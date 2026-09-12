require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes the final cell of the Biology 9-12 content gap found during
// the full-project audit — every mechanic/grade combination now has
// content. Links to the existing "Origin of Life and Evidence for
// Evolution" concept created by seedGrade12_batch2.js — run that
// first. Reinterprets the mechanic for Grade 12: instead of
// classifying an organism into a taxonomic group (Grade 9/10/11),
// the "specimen" here is a pair of structures, and the classification
// task is identifying which *type of evidence for evolution* it
// represents — homologous structures, analogous structures, or a
// vestigial organ — directly matching this concept's own explanation
// text ("comparative anatomy: homologous and analogous organs").
// Same single-choice-after-inspecting-every-feature shape and scoring
// path as every other Specimen Analysis grade.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Origin of Life and Evidence for Evolution" });
  if (!concept) {
    console.error(
      "Concept 'Origin of Life and Evidence for Evolution' not found — run seedGrade12_batch2.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const levels = [
    {
      title: "Evidence Sample 1: Forelimbs of a Bat, Whale, and Human",
      difficulty: "medium",
      order_index: 1,
      payload: {
        specimenName: "Evidence Sample 1: Forelimbs of a Bat, Whale, and Human",
        context: "Compare the bone structure of a bat's wing, a whale's flipper, and a human arm.",
        features: [
          { id: "f1", label: "Same underlying bone arrangement", detail: "All three share the same basic pattern: one upper bone, two lower bones, wrist bones, then digits — just scaled and shaped differently." },
          { id: "f2", label: "Different external functions", detail: "The bat's structure enables flight, the whale's enables swimming, and the human's enables grasping." },
          { id: "f3", label: "Common ancestry inferred", detail: "The shared skeletal blueprint suggests these three limbs descended from the same ancestral limb structure." },
          { id: "f4", label: "All three species are mammals", detail: "Bats, whales, and humans are all classified within Class Mammalia." },
        ],
        classificationOptions: [
          { id: "homologous", label: "Homologous structures" },
          { id: "analogous", label: "Analogous structures" },
          { id: "vestigial", label: "Vestigial organs" },
        ],
        correct_hotspot_id: "homologous",
        explanation:
          "Structures that share the same underlying anatomical blueprint and evolutionary origin, even when their current functions differ, are called homologous structures — strong evidence of common ancestry, exactly as this concept's explanation describes. Being mammals supports (but doesn't by itself define) the homology; the deciding feature is the shared internal bone arrangement.",
        hint: "Look at what's underneath the surface — a shared internal blueprint despite different external jobs points to one specific type of evidence.",
      },
    },
    {
      title: "Evidence Sample 2: Wings of a Butterfly and a Bird",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Evidence Sample 2: Wings of a Butterfly and a Bird",
        context: "Compare the wings of a butterfly (an insect) and a bird.",
        features: [
          { id: "f1", label: "Both structures enable flight", detail: "Both wings serve the same external function: powered flight through the air." },
          { id: "f2", label: "Completely different internal structure", detail: "A butterfly wing is a thin membrane supported by veins with no bones; a bird wing is built from modified forelimb bones covered in feathers." },
          { id: "f3", label: "Very distant common ancestor", detail: "Insects and birds diverged from a common ancestor far earlier than any shared limb structure could explain." },
          { id: "f4", label: "Both fly during daylight hours", detail: "Both are commonly observed flying in daytime." },
        ],
        classificationOptions: [
          { id: "homologous", label: "Homologous structures" },
          { id: "analogous", label: "Analogous structures" },
          { id: "vestigial", label: "Vestigial organs" },
        ],
        correct_hotspot_id: "analogous",
        explanation:
          "Structures that perform the same function but evolved independently from different origins — with no shared underlying anatomical blueprint — are called analogous structures, produced by convergent evolution rather than common ancestry. A shared daytime flying habit is just a coincidental behavioral note, not evidence either way.",
        hint: "Same job, but built completely differently underneath — that combination points away from a shared ancestral origin.",
      },
    },
    {
      title: "Evidence Sample 3: The Human Appendix",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Evidence Sample 3: The Human Appendix",
        context: "Examine the human appendix, a small pouch attached to the large intestine, compared to the much larger, functional caecum found in plant-eating mammals like rabbits.",
        features: [
          { id: "f1", label: "Greatly reduced in size", detail: "The human appendix is a small, narrow pouch, unlike the large, functional caecum in herbivores such as rabbits." },
          { id: "f2", label: "Minimal function in digestion today", detail: "It plays little to no role in digesting the modern human diet, unlike its full-sized counterpart in plant-eating mammals." },
          { id: "f3", label: "Homologous to a fully functional organ in ancestral/related species", detail: "It corresponds to the caecum, which is large and actively used for digesting cellulose in herbivorous relatives." },
          { id: "f4", label: "Can become inflamed (appendicitis)", detail: "It can still become infected and inflamed, sometimes requiring surgical removal." },
        ],
        classificationOptions: [
          { id: "homologous", label: "Homologous structures (general)" },
          { id: "analogous", label: "Analogous structures" },
          { id: "vestigial", label: "Vestigial organ" },
        ],
        correct_hotspot_id: "vestigial",
        explanation:
          "A structure that has been reduced in size and largely lost its original function over evolutionary time, while still corresponding to a fully functional organ in related species, is a vestigial organ — evidence that an ancestral species relied on it much more than modern humans do. That it can still become inflamed is a clinical fact about the organ, not evidence for its classification.",
        hint: "The organ still exists, but its size and role have shrunk dramatically compared to a working version in related species — that's a specific type of evolutionary evidence.",
      },
    },
  ];

  for (const level of levels) {
    const exists = await GameContent.findOne({ game_type: "BIO_SPECIMEN_ANALYSIS", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
