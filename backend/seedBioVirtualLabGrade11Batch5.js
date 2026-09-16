require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Virtual Lab coverage for "Structural Organisation in Animals"
// (seedGrade11_batch8.js — run that first), the chapter added to close
// the last missing cell of the current 19-chapter Class 11 syllabus.
// Diagram-labeling fits this chapter better than the other Biology
// mechanics: tissue types and cockroach anatomy are both identified
// visually. Same hotspot payload and scoring path as every other
// Virtual Lab file.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Biology subject not found — run seedGrade11_batch8.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({
    subject_id: subject._id,
    title: "Structural Organisation in Animals",
  });
  if (!chapter) {
    console.error("Chapter 'Structural Organisation in Animals' not found — run seedGrade11_batch8.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptTitles = [
    "Animal Tissues: Epithelial and Connective",
    "Animal Tissues: Muscular and Neural",
    "Morphology and Anatomy of the Cockroach",
  ];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade11_batch8.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Animal Tissues: Epithelial and Connective"],
      levels: [
        {
          title: "Identify Simple Squamous Epithelium",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimen: "epithelial_tissue_slide",
            prompt: "Click the epithelium made of a single layer of flat, tile-like cells, suited to diffusion across thin walls.",
            hotspots: [
              { id: "h1", label: "Simple squamous epithelium", x: 30, y: 35 },
              { id: "h2", label: "Simple cuboidal epithelium", x: 55, y: 30 },
              { id: "h3", label: "Simple columnar epithelium", x: 45, y: 60 },
              { id: "h4", label: "Stratified squamous epithelium", x: 70, y: 65 },
            ],
            correct_hotspot_id: "h1",
            hint: "Think about the lining of alveoli and blood vessels — as thin as possible so gases cross easily.",
          },
        },
        {
          title: "Identify Cartilage",
          difficulty: "medium",
          order_index: 2,
          payload: {
            specimen: "connective_tissue_slide",
            prompt: "Click the connective tissue whose cells sit in fluid-filled lacunae within a solid but pliable matrix.",
            hotspots: [
              { id: "h1", label: "Areolar tissue", x: 25, y: 40 },
              { id: "h2", label: "Cartilage", x: 50, y: 45 },
              { id: "h3", label: "Bone", x: 70, y: 35 },
              { id: "h4", label: "Adipose tissue", x: 40, y: 70 },
            ],
            correct_hotspot_id: "h2",
            hint: "It is solid enough to hold shape but flexible — found in the pinna of the ear and at the ends of long bones.",
          },
        },
      ],
    },
    {
      concept: concepts["Animal Tissues: Muscular and Neural"],
      levels: [
        {
          title: "Identify Cardiac Muscle",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimen: "muscle_tissue_slide",
            prompt: "Click the muscle tissue showing striations together with branching fibres joined at intercalated discs.",
            hotspots: [
              { id: "h1", label: "Skeletal muscle", x: 30, y: 35 },
              { id: "h2", label: "Smooth muscle", x: 60, y: 30 },
              { id: "h3", label: "Cardiac muscle", x: 45, y: 65 },
              { id: "h4", label: "Tendon", x: 75, y: 60 },
            ],
            correct_hotspot_id: "h3",
            hint: "Only one muscle type is both striated and branched — and it never tires.",
          },
        },
        {
          title: "Identify the Axon",
          difficulty: "hard",
          order_index: 2,
          payload: {
            specimen: "neuron_diagram",
            prompt: "Click the single long process that carries the nerve impulse away from the cell body.",
            hotspots: [
              { id: "h1", label: "Dendrites", x: 20, y: 30 },
              { id: "h2", label: "Cell body (cyton)", x: 35, y: 45 },
              { id: "h3", label: "Axon", x: 65, y: 50 },
              { id: "h4", label: "Synaptic knob", x: 85, y: 55 },
            ],
            correct_hotspot_id: "h3",
            hint: "Dendrites bring signals in; only one structure carries them out toward the next cell.",
          },
        },
      ],
    },
    {
      concept: concepts["Morphology and Anatomy of the Cockroach"],
      levels: [
        {
          title: "Identify the Malpighian Tubules",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimen: "cockroach_internal_anatomy",
            prompt: "Click the fine yellow tubules at the midgut–hindgut junction that remove nitrogenous waste from the haemolymph.",
            hotspots: [
              { id: "h1", label: "Crop", x: 25, y: 40 },
              { id: "h2", label: "Gizzard (proventriculus)", x: 40, y: 40 },
              { id: "h3", label: "Malpighian tubules", x: 62, y: 50 },
              { id: "h4", label: "Hepatic caecae", x: 50, y: 30 },
            ],
            correct_hotspot_id: "h3",
            hint: "They are the insect equivalent of kidneys, and they sit exactly where the midgut meets the hindgut.",
          },
        },
        {
          title: "Identify the Gizzard",
          difficulty: "hard",
          order_index: 2,
          payload: {
            specimen: "cockroach_digestive_system",
            prompt: "Click the thick-walled muscular chamber lined with six chitinous teeth that grinds the food.",
            hotspots: [
              { id: "h1", label: "Crop", x: 28, y: 45 },
              { id: "h2", label: "Gizzard (proventriculus)", x: 45, y: 45 },
              { id: "h3", label: "Midgut", x: 62, y: 45 },
              { id: "h4", label: "Rectum", x: 80, y: 50 },
            ],
            correct_hotspot_id: "h2",
            hint: "The crop only stores food — look for the part that mechanically breaks it down straight afterwards.",
          },
        },
      ],
    },
  ];

  for (const { concept, levels } of allChallenges) {
    for (const level of levels) {
      const exists = await GameContent.findOne({
        game_type: "BIO_VIRTUAL_LAB",
        title: level.title,
      });
      if (!exists) {
        const created = await GameContent.create({
          game_type: "BIO_VIRTUAL_LAB",
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
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
