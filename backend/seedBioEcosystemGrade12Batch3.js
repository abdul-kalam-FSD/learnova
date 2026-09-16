require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Ecosystem Balance (order-sensitive chain building) coverage for the
// three Grade 12 chapters taught as ordered processes: gametogenesis
// and the events of fertilisation, the central dogma, and the rDNA
// workflow. Reproductive content here follows the NCERT sequence and
// stays at the scientific level the textbook uses.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 12 Biology subject not found — run the Grade 12 batch seeds first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptChapters = {
    "Gametogenesis and the Menstrual Cycle": "Human Reproduction",
    "Fertilization, Pregnancy, and Parturition": "Human Reproduction",
    "DNA Structure and Replication": "Molecular Basis of Inheritance",
    "Transcription and the Genetic Code": "Molecular Basis of Inheritance",
    "Processes of Recombinant DNA Technology": "Biotechnology: Principles and Processes",
    "Tools of Recombinant DNA Technology": "Biotechnology: Principles and Processes",
  };

  const concepts = {};
  for (const [title, chapterTitle] of Object.entries(conceptChapters)) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.error(`Chapter "${chapterTitle}" not found — run the Grade 12 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run the Grade 12 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Gametogenesis and the Menstrual Cycle"],
      levels: [
        {
          title: "Stages of Spermatogenesis",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "Trace the formation of mature sperm in the seminiferous tubules. Arrange the stages in order.",
            scrambled_effects: [
              { id: "sp3", label: "Secondary spermatocytes complete meiosis II to form spermatids" },
              { id: "sp1", label: "Spermatogonia divide by mitosis to produce primary spermatocytes" },
              { id: "sp4", label: "Spermatids differentiate into mature spermatozoa (spermiogenesis)" },
              { id: "sp2", label: "Primary spermatocytes complete meiosis I to form secondary spermatocytes" },
            ],
            correct_order: ["sp1", "sp2", "sp3", "sp4"],
            hint: "Mitosis increases numbers first, then the two meiotic divisions halve the chromosome number, and shaping the cell comes last.",
          },
        },
        {
          title: "Phases of the Menstrual Cycle",
          difficulty: "medium",
          order_index: 2,
          payload: {
            trigger: "Arrange the phases of one menstrual cycle in the order they occur, beginning from day 1.",
            scrambled_effects: [
              { id: "m3", label: "Luteal phase — the corpus luteum secretes progesterone to maintain the endometrium" },
              { id: "m1", label: "Menstrual phase — the endometrial lining breaks down and is shed" },
              { id: "m2", label: "Follicular phase — a follicle matures and the endometrium rebuilds, ending in ovulation" },
            ],
            correct_order: ["m1", "m2", "m3"],
            hint: "Day 1 of the cycle is the first day of shedding; ovulation marks the change from the second phase to the third.",
          },
        },
      ],
    },
    {
      concept: concepts["Fertilization, Pregnancy, and Parturition"],
      levels: [
        {
          title: "From Zygote to Implantation",
          difficulty: "hard",
          order_index: 1,
          payload: {
            trigger: "A secondary oocyte is fertilised in the ampullary region of the fallopian tube. Arrange the events that follow, up to implantation.",
            scrambled_effects: [
              { id: "z3", label: "Morula develops into a blastocyst with an inner cell mass and trophoblast" },
              { id: "z1", label: "Sperm and egg nuclei fuse to form a diploid zygote" },
              { id: "z4", label: "Trophoblast attaches to the uterine endometrium — implantation" },
              { id: "z2", label: "Zygote undergoes cleavage divisions to form a solid morula" },
            ],
            correct_order: ["z1", "z2", "z3", "z4"],
            hint: "Fusion makes the single cell, repeated division makes the solid ball, cavitation makes the hollow stage, and only then can it attach.",
          },
        },
      ],
    },
    {
      concept: concepts["DNA Structure and Replication"],
      levels: [
        {
          title: "Semi-Conservative Replication",
          difficulty: "hard",
          order_index: 1,
          payload: {
            trigger: "A DNA molecule begins replicating at the origin. Arrange the steps of semi-conservative replication in order.",
            scrambled_effects: [
              { id: "r3", label: "DNA polymerase adds complementary nucleotides in the 5' to 3' direction" },
              { id: "r1", label: "Helicase unwinds the double helix and separates the two strands" },
              { id: "r4", label: "Two daughter molecules form, each with one parent and one new strand" },
              { id: "r2", label: "Each separated strand acts as a template for a new strand" },
            ],
            correct_order: ["r1", "r2", "r3", "r4"],
            hint: "The helix has to open before a strand can act as a template, and nucleotides must be added before daughter molecules exist.",
          },
        },
      ],
    },
    {
      concept: concepts["Transcription and the Genetic Code"],
      levels: [
        {
          title: "The Central Dogma",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "A gene is switched on and its protein appears in the cell. Arrange the steps of the central dogma in order.",
            scrambled_effects: [
              { id: "c2", label: "mRNA is processed and moves out of the nucleus to the cytoplasm" },
              { id: "c4", label: "Amino acids are joined in order to form the polypeptide chain" },
              { id: "c1", label: "RNA polymerase transcribes the DNA template strand into mRNA" },
              { id: "c3", label: "Ribosome reads the mRNA codons and tRNA brings matching amino acids" },
            ],
            correct_order: ["c1", "c2", "c3", "c4"],
            hint: "DNA to RNA to protein — transcription happens in the nucleus, translation in the cytoplasm.",
          },
        },
      ],
    },
    {
      concept: concepts["Tools of Recombinant DNA Technology"],
      levels: [
        {
          title: "Cutting and Joining DNA",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "A gene of interest must be inserted into a plasmid vector. Arrange the steps that use restriction enzymes and ligase.",
            scrambled_effects: [
              { id: "t3", label: "Complementary sticky ends of gene and vector base-pair with each other" },
              { id: "t1", label: "The same restriction enzyme cuts both the source DNA and the plasmid" },
              { id: "t4", label: "DNA ligase seals the joins, producing recombinant DNA" },
              { id: "t2", label: "Cutting at staggered sites produces single-stranded sticky ends on both" },
            ],
            correct_order: ["t1", "t2", "t3", "t4"],
            hint: "Using one enzyme on both pieces is what makes their cut ends complementary — pairing comes before sealing.",
          },
        },
      ],
    },
    {
      concept: concepts["Processes of Recombinant DNA Technology"],
      levels: [
        {
          title: "The Recombinant DNA Workflow",
          difficulty: "hard",
          order_index: 1,
          payload: {
            trigger: "A laboratory sets out to produce a human protein in bacteria. Arrange the main steps of the rDNA workflow in order.",
            scrambled_effects: [
              { id: "w3", label: "Recombinant vector is introduced into a competent host cell" },
              { id: "w5", label: "Product is extracted and purified downstream" },
              { id: "w1", label: "DNA is isolated from the source organism" },
              { id: "w4", label: "Transformed cells are cultured in a bioreactor to express the gene" },
              { id: "w2", label: "Gene of interest is cut out and ligated into a vector" },
            ],
            correct_order: ["w1", "w2", "w3", "w4", "w5"],
            hint: "Isolate, then construct, then transform, then grow, then purify — downstream processing is always the final step.",
          },
        },
      ],
    },
  ];

  for (const { concept, levels } of allChallenges) {
    for (const level of levels) {
      const exists = await GameContent.findOne({
        game_type: "BIO_ECOSYSTEM_BALANCE",
        title: level.title,
      });
      if (!exists) {
        const created = await GameContent.create({
          game_type: "BIO_ECOSYSTEM_BALANCE",
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
