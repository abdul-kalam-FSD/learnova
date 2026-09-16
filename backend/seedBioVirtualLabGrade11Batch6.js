require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Virtual Lab coverage for "Biomolecules" and "Locomotion and
// Movement". Both chapters are taught from labelled structures — a
// biomolecule's functional group or a bone/joint/sarcomere region —
// so the identify-the-structure loop fits directly.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Biology subject not found — run seedGrade11_batch3.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptChapters = {
    "Carbohydrates and Lipids": "Biomolecules",
    "Proteins and Amino Acids": "Biomolecules",
    "Nucleic Acids and Enzymes": "Biomolecules",
    "Types of Movement and Skeletal Muscle Structure": "Locomotion and Movement",
    "Mechanism of Muscle Contraction": "Locomotion and Movement",
    "Skeletal System, Joints, and Locomotor Disorders": "Locomotion and Movement",
  };

  const concepts = {};
  for (const [title, chapterTitle] of Object.entries(conceptChapters)) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.error(`Chapter "${chapterTitle}" not found — run the Grade 11 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run the Grade 11 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Carbohydrates and Lipids"],
      levels: [
        {
          title: "Identify the Glycosidic Bond",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimen: "disaccharide_structure",
            prompt: "Click the bond that links the two monosaccharide units of this sugar together.",
            hotspots: [
              { id: "h1", label: "Hydroxyl (-OH) group", x: 20, y: 30 },
              { id: "h2", label: "Glycosidic bond", x: 50, y: 45 },
              { id: "h3", label: "Peptide bond", x: 72, y: 32 },
              { id: "h4", label: "Ester bond", x: 40, y: 70 },
            ],
            correct_hotspot_id: "h2",
            hint: "Peptide bonds join amino acids and ester bonds join fatty acids to glycerol — only one bond type joins sugars.",
          },
        },
      ],
    },
    {
      concept: concepts["Proteins and Amino Acids"],
      levels: [
        {
          title: "Identify the Peptide Bond",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimen: "dipeptide_structure",
            prompt: "Click the bond formed between the carboxyl group of one amino acid and the amino group of the next.",
            hotspots: [
              { id: "h1", label: "Amino (-NH2) group", x: 18, y: 40 },
              { id: "h2", label: "Peptide bond", x: 48, y: 48 },
              { id: "h3", label: "Carboxyl (-COOH) group", x: 78, y: 40 },
              { id: "h4", label: "R group (side chain)", x: 48, y: 75 },
            ],
            correct_hotspot_id: "h2",
            hint: "Look between the two amino acid units, not at the free ends of the chain.",
          },
        },
        {
          title: "Identify the Active Site",
          difficulty: "hard",
          order_index: 2,
          payload: {
            specimen: "enzyme_substrate_complex",
            prompt: "Click the region of the enzyme where the substrate binds and the reaction is catalysed.",
            hotspots: [
              { id: "h1", label: "Active site", x: 45, y: 40 },
              { id: "h2", label: "Substrate molecule", x: 45, y: 20 },
              { id: "h3", label: "Bulk of the enzyme's tertiary structure", x: 25, y: 65 },
              { id: "h4", label: "Product released after the reaction", x: 75, y: 60 },
            ],
            correct_hotspot_id: "h1",
            hint: "It is a pocket or crevice on the enzyme itself, shaped to fit the substrate — not the substrate molecule.",
          },
        },
      ],
    },
    {
      concept: concepts["Nucleic Acids and Enzymes"],
      levels: [
        {
          title: "Identify the Phosphodiester Linkage",
          difficulty: "hard",
          order_index: 1,
          payload: {
            specimen: "polynucleotide_chain",
            prompt: "Click the linkage that joins the sugar of one nucleotide to the sugar of the next along the backbone.",
            hotspots: [
              { id: "h1", label: "Nitrogenous base", x: 70, y: 30 },
              { id: "h2", label: "Phosphodiester linkage", x: 30, y: 50 },
              { id: "h3", label: "Pentose sugar", x: 50, y: 40 },
              { id: "h4", label: "Hydrogen bond between bases", x: 80, y: 60 },
            ],
            correct_hotspot_id: "h2",
            hint: "The backbone is sugar–phosphate–sugar; hydrogen bonds hold the two strands together, not one strand's backbone.",
          },
        },
      ],
    },
    {
      concept: concepts["Types of Movement and Skeletal Muscle Structure"],
      levels: [
        {
          title: "Identify the Sarcomere",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimen: "myofibril_striation_pattern",
            prompt: "Click the functional unit of contraction — the region lying between two successive Z-lines.",
            hotspots: [
              { id: "h1", label: "A band", x: 50, y: 30 },
              { id: "h2", label: "I band", x: 25, y: 30 },
              { id: "h3", label: "Sarcomere (Z-line to Z-line)", x: 50, y: 60 },
              { id: "h4", label: "H zone", x: 68, y: 30 },
            ],
            correct_hotspot_id: "h3",
            hint: "The A band, I band, and H zone are all regions inside the unit — you want the whole repeating unit itself.",
          },
        },
      ],
    },
    {
      concept: concepts["Mechanism of Muscle Contraction"],
      levels: [
        {
          title: "Identify the Shortening Band",
          difficulty: "hard",
          order_index: 1,
          payload: {
            specimen: "sarcomere_during_contraction",
            prompt: "Click the band that becomes shorter during contraction as the thin filaments slide inward.",
            hotspots: [
              { id: "h1", label: "A band (stays the same length)", x: 50, y: 35 },
              { id: "h2", label: "I band (shortens)", x: 22, y: 55 },
              { id: "h3", label: "Thick filament (myosin)", x: 55, y: 70 },
              { id: "h4", label: "Z-line", x: 12, y: 35 },
            ],
            correct_hotspot_id: "h2",
            hint: "In the sliding filament theory the filaments themselves never shorten — only the band containing thin filaments alone does.",
          },
        },
      ],
    },
    {
      concept: concepts["Skeletal System, Joints, and Locomotor Disorders"],
      levels: [
        {
          title: "Identify the Ball and Socket Joint",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimen: "human_skeleton_joints",
            prompt: "Click the joint that allows movement in all planes, where a rounded head fits into a cup-shaped cavity.",
            hotspots: [
              { id: "h1", label: "Shoulder joint", x: 35, y: 25 },
              { id: "h2", label: "Elbow joint", x: 25, y: 45 },
              { id: "h3", label: "Knee joint", x: 50, y: 75 },
              { id: "h4", label: "Skull suture", x: 50, y: 10 },
            ],
            correct_hotspot_id: "h1",
            hint: "Elbow and knee are hinge joints moving in one plane only, and sutures are immovable — look for the joint with the widest range of motion.",
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
