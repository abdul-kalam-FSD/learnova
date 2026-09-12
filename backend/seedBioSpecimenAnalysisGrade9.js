require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes another cell of the Biology 9-12 content gap found during
// the full-project audit: BIO_SPECIMEN_ANALYSIS previously existed
// only at Grade 10. Links to the existing "Vertebrates and
// Invertebrates" concept created by seedGrade9.js — run that first.
// Same single-choice-after-inspecting-every-feature shape and scoring
// path (attempt.selectedHotspotId vs payload.correct_hotspot_id) as
// the Grade 10 script — simpler classification level (vertebrate vs
// invertebrate broad groups) than Grade 10's insect/arachnid class-
// level distinctions, matching where this concept sits in the
// curriculum.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Vertebrates and Invertebrates" });
  if (!concept) {
    console.error(
      "Concept 'Vertebrates and Invertebrates' not found — run seedGrade9.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const levels = [
    {
      title: "Specimen A: The Pond Visitor",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen A: The Pond Visitor",
        context: "A creature is spotted swimming near the edge of a garden pond.",
        features: [
          { id: "f1", label: "Smooth, moist skin", detail: "The skin has no scales, feathers, or fur and feels damp to the touch." },
          { id: "f2", label: "Backbone present", detail: "An internal skeleton with a segmented spinal column runs the length of its body." },
          { id: "f3", label: "Lives both in water and on land", detail: "Seen swimming, but also spotted resting on a rock at the water's edge." },
          { id: "f4", label: "Found near a pond", detail: "Ponds and other freshwater bodies are its typical habitat." },
        ],
        classificationOptions: [
          { id: "vertebrate", label: "Vertebrate" },
          { id: "invertebrate", label: "Invertebrate" },
        ],
        correct_hotspot_id: "vertebrate",
        explanation:
          "The presence of a backbone is the single defining feature that separates vertebrates from invertebrates — every other clue here (skin type, habitat) describes what kind of vertebrate it might be (an amphibian), but only the backbone decides the vertebrate/invertebrate classification itself.",
        hint: "Only one feature actually decides vertebrate vs invertebrate — look for it directly.",
      },
    },
    {
      title: "Specimen B: The Garden Digger",
      difficulty: "easy",
      order_index: 2,
      payload: {
        specimenName: "Specimen B: The Garden Digger",
        context: "A specimen is dug up while turning over soil in a vegetable garden.",
        features: [
          { id: "f1", label: "Long, segmented body", detail: "The body is divided into many identical ring-like segments." },
          { id: "f2", label: "No backbone or internal skeleton", detail: "The body is soft throughout, with no internal bony support." },
          { id: "f3", label: "Moves by muscular contractions", detail: "It moves by squeezing and stretching its segments against the soil." },
          { id: "f4", label: "Found underground", detail: "Located several centimeters below the surface." },
        ],
        classificationOptions: [
          { id: "vertebrate", label: "Vertebrate" },
          { id: "invertebrate", label: "Invertebrate" },
        ],
        correct_hotspot_id: "invertebrate",
        explanation:
          "No backbone or internal skeleton means this is an invertebrate — in this case, an earthworm (an annelid). Its segmented body and underground habitat are both consistent with that, but it's the absence of a backbone that actually settles the classification.",
        hint: "Check for a backbone first — everything else here just adds detail about which kind of invertebrate it is.",
      },
    },
    {
      title: "Specimen C: The High Flyer",
      difficulty: "medium",
      order_index: 3,
      payload: {
        specimenName: "Specimen C: The High Flyer",
        context: "A specimen is observed soaring at altitude before landing briefly on a wire, then flying on.",
        features: [
          { id: "f1", label: "Feathers covering the body", detail: "The entire body is covered in overlapping feathers." },
          { id: "f2", label: "Backbone present", detail: "A clearly segmented internal spinal column is visible in the skeleton." },
          { id: "f3", label: "Two wings, two legs", detail: "Forelimbs are modified into wings; hind limbs are used for perching." },
          { id: "f4", label: "Observed at high altitude", detail: "Was seen flying well above the treeline before descending." },
        ],
        classificationOptions: [
          { id: "vertebrate", label: "Vertebrate" },
          { id: "invertebrate", label: "Invertebrate" },
        ],
        correct_hotspot_id: "vertebrate",
        explanation:
          "The backbone is again the deciding feature — this specimen is a bird, a vertebrate. Feathers and wings tell you it's specifically a bird rather than another vertebrate group, but altitude and flight behavior are not classification evidence on their own (some invertebrates, like insects, fly too).",
        hint: "Flying alone doesn't prove vertebrate or invertebrate — plenty of invertebrates fly too. Look for the backbone.",
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
