require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const Question = require("./src/models/Question");

// Citation note (Gap 5, new-curriculum pass): Grade 9 Science is now
// "Exploration" (NCF-SE 2023, 2026-27 session). This file's chapter
// titles ("The Fundamental Unit of Life", "Tissues" below) use the
// old book's naming; the new book covers the same core content as
// Ch.2 "Cell: Building Block of Life" and Ch.3 "Tissues in Action" —
// close paraphrase matches, not exact titles. The underlying biology
// (cell structure, organelles, membrane transport, tissue types) is
// standard, edition-independent content and needed no rewrite. Not
// renaming the chapter titles here since other code/data may already
// reference them by exact title (Chapter.findOne elsewhere) — flagged
// for a deliberate rename pass later rather than an in-place change
// that could silently orphan existing references.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Biology is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Biology" for mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Biology content into this shape. (The biology|science regex
  // above already matched "Science" here if Chemistry/Physics ran
  // first, so this reuses that document rather than creating a
  // second one.)
  let subject = await Subject.findOne({ grade: 9, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 9 });
    console.log("Created new Grade 9 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- CHAPTER 1: The Fundamental Unit of Life ----------
  const ch1 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Cell Biology",
    title: "The Fundamental Unit of Life",
    order_index: 1,
    strand: "Biology",
  });

  const c1a = await Concept.create({
    chapter_id: ch1._id,
    title: "Cell Structure and Organelles",
    explanation_text:
      "The cell is the basic structural and functional unit of life. It contains organelles such as the nucleus, mitochondria, and endoplasmic reticulum, each performing specific functions.",
  });
  const c1b = await Concept.create({
    chapter_id: ch1._id,
    title: "Plant Cell vs Animal Cell",
    explanation_text:
      "Plant cells have a cell wall, large central vacuole, and chloroplasts, which animal cells lack. Both share a nucleus, mitochondria, and cell membrane.",
  });
  const c1c = await Concept.create({
    chapter_id: ch1._id,
    title: "Cell Membrane and Transport",
    explanation_text:
      "The cell membrane is selectively permeable, controlling the movement of substances in and out of the cell through diffusion and osmosis.",
  });

  await Question.insertMany([
    {
      concept_id: c1a._id,
      question_text: "Who discovered the cell?",
      options: [
        { id: "a", text: "Robert Hooke" },
        { id: "b", text: "Charles Darwin" },
        { id: "c", text: "Gregor Mendel" },
        { id: "d", text: "Louis Pasteur" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Robert Hooke discovered cells in 1665 while observing cork under a microscope.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text: "Which organelle is known as the powerhouse of the cell?",
      options: [
        { id: "a", text: "Nucleus" },
        { id: "b", text: "Mitochondria" },
        { id: "c", text: "Ribosome" },
        { id: "d", text: "Golgi body" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Mitochondria generate ATP through cellular respiration, earning the name 'powerhouse of the cell'.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text: "The genetic material of a cell is located in the:",
      options: [
        { id: "a", text: "Cytoplasm" },
        { id: "b", text: "Nucleus" },
        { id: "c", text: "Cell membrane" },
        { id: "d", text: "Vacuole" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The nucleus houses DNA, the genetic material of the cell.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text: "Ribosomes are the site of:",
      options: [
        { id: "a", text: "Protein synthesis" },
        { id: "b", text: "Photosynthesis" },
        { id: "c", text: "Respiration" },
        { id: "d", text: "Excretion" },
      ],
      correct_option_id: "a",
      explanation_text: "Ribosomes synthesize proteins by translating mRNA.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "The endoplasmic reticulum is involved in:",
      options: [
        { id: "a", text: "Transport of materials" },
        { id: "b", text: "Digestion only" },
        { id: "c", text: "Storage of water only" },
        { id: "d", text: "Cell division only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The ER forms a network for transporting materials within the cell.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "Which organelle packages and ships proteins?",
      options: [
        { id: "a", text: "Golgi apparatus" },
        { id: "b", text: "Lysosome" },
        { id: "c", text: "Nucleolus" },
        { id: "d", text: "Peroxisome" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The Golgi apparatus modifies, packages, and ships proteins to their destinations.",
      difficulty: "medium",
    },

    {
      concept_id: c1b._id,
      question_text:
        "Which structure is present in plant cells but absent in animal cells?",
      options: [
        { id: "a", text: "Cell membrane" },
        { id: "b", text: "Cell wall" },
        { id: "c", text: "Nucleus" },
        { id: "d", text: "Mitochondria" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The cell wall, made of cellulose, is unique to plant cells and provides structural support.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text: "Chloroplasts are found in:",
      options: [
        { id: "a", text: "Animal cells only" },
        { id: "b", text: "Plant cells" },
        { id: "c", text: "Bacteria only" },
        { id: "d", text: "Fungal cells only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Chloroplasts, the site of photosynthesis, are found in plant cells.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text: "The large central vacuole in plant cells mainly stores:",
      options: [
        { id: "a", text: "Proteins only" },
        { id: "b", text: "Water and cell sap" },
        { id: "c", text: "DNA" },
        { id: "d", text: "Lipids only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The central vacuole stores water, ions, and cell sap, maintaining turgor pressure.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "Both plant and animal cells contain:",
      options: [
        { id: "a", text: "Cell wall" },
        { id: "b", text: "Chloroplast" },
        { id: "c", text: "Mitochondria" },
        { id: "d", text: "Large central vacuole" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Mitochondria are common to both plant and animal cells for energy production.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "Animal cells typically have a shape that is:",
      options: [
        { id: "a", text: "Fixed and rectangular" },
        { id: "b", text: "Irregular/round due to lack of cell wall" },
        { id: "c", text: "Always star-shaped" },
        { id: "d", text: "Always hexagonal" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Without a rigid cell wall, animal cells are typically round or irregular in shape.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "Plastids other than chloroplasts include:",
      options: [
        { id: "a", text: "Chromoplasts and leucoplasts" },
        { id: "b", text: "Mitochondria only" },
        { id: "c", text: "Ribosomes only" },
        { id: "d", text: "Lysosomes only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Chromoplasts (pigments) and leucoplasts (storage) are other types of plastids in plant cells.",
      difficulty: "hard",
    },

    {
      concept_id: c1c._id,
      question_text:
        "The cell membrane is described as 'selectively permeable' because it:",
      options: [
        { id: "a", text: "Blocks all substances" },
        { id: "b", text: "Allows only some substances to pass through" },
        { id: "c", text: "Allows everything to pass freely" },
        { id: "d", text: "Is solid and impermeable" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Selective permeability means the membrane controls which substances enter or exit the cell.",
      difficulty: "easy",
    },
    {
      concept_id: c1c._id,
      question_text:
        "Movement of water across a selectively permeable membrane is called:",
      options: [
        { id: "a", text: "Diffusion" },
        { id: "b", text: "Osmosis" },
        { id: "c", text: "Respiration" },
        { id: "d", text: "Excretion" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Osmosis is the movement of water molecules from a region of higher concentration to lower concentration through a semi-permeable membrane.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text: "Diffusion occurs due to:",
      options: [
        { id: "a", text: "Concentration gradient" },
        { id: "b", text: "Temperature difference only" },
        { id: "c", text: "Cell division" },
        { id: "d", text: "Gravity only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Diffusion is the movement of particles from higher to lower concentration.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text: "The cell membrane is mainly composed of:",
      options: [
        { id: "a", text: "Lipids and proteins" },
        { id: "b", text: "Cellulose only" },
        { id: "c", text: "Starch only" },
        { id: "d", text: "DNA only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The cell membrane is a phospholipid bilayer embedded with proteins.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text:
        "When a cell is placed in a hypertonic solution, water tends to:",
      options: [
        { id: "a", text: "Move into the cell" },
        { id: "b", text: "Move out of the cell" },
        { id: "c", text: "Stay unchanged" },
        { id: "d", text: "Freeze immediately" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In a hypertonic solution, water moves out of the cell, causing it to shrink.",
      difficulty: "hard",
    },
    {
      concept_id: c1c._id,
      question_text:
        "Which process requires energy to move substances against the concentration gradient?",
      options: [
        { id: "a", text: "Active transport" },
        { id: "b", text: "Passive diffusion" },
        { id: "c", text: "Osmosis" },
        { id: "d", text: "Free diffusion" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Active transport uses cellular energy (ATP) to move substances against their concentration gradient.",
      difficulty: "hard",
    },
  ]);

  // ---------- CHAPTER 2: Tissues ----------
  const ch2 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Cell Biology",
    title: "Tissues",
    order_index: 2,
    strand: "Biology",
  });

  const c2a = await Concept.create({
    chapter_id: ch2._id,
    title: "Plant Tissues",
    explanation_text:
      "Plant tissues are classified into meristematic (dividing) and permanent (non-dividing) tissues. Permanent tissues include simple tissues like parenchyma and complex tissues like xylem and phloem.",
  });
  const c2b = await Concept.create({
    chapter_id: ch2._id,
    title: "Animal Tissues",
    explanation_text:
      "Animal tissues are grouped into epithelial, connective, muscular, and nervous tissue, each specialized for covering, support, movement, or signal transmission.",
  });
  const c2c = await Concept.create({
    chapter_id: ch2._id,
    title: "Xylem and Phloem",
    explanation_text:
      "Xylem transports water and minerals upward from roots to leaves, while phloem transports food materials, mainly sugars, from leaves to other parts of the plant.",
  });

  await Question.insertMany([
    {
      concept_id: c2a._id,
      question_text: "Meristematic tissue is characterized by:",
      options: [
        { id: "a", text: "Continuous cell division" },
        { id: "b", text: "No cell division" },
        { id: "c", text: "Dead cells only" },
        { id: "d", text: "Only in animals" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Meristematic tissue consists of actively dividing cells found at growing regions of plants.",
      difficulty: "easy",
    },
    {
      concept_id: c2a._id,
      question_text:
        "Which tissue provides flexibility to plant parts like stems of climbers?",
      options: [
        { id: "a", text: "Parenchyma" },
        { id: "b", text: "Collenchyma" },
        { id: "c", text: "Sclerenchyma" },
        { id: "d", text: "Xylem" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Collenchyma provides mechanical support along with flexibility, especially in growing parts.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Sclerenchyma tissue cells are typically:",
      options: [
        { id: "a", text: "Living and flexible" },
        { id: "b", text: "Dead and rigid" },
        { id: "c", text: "Photosynthetic" },
        { id: "d", text: "Found only in roots" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Sclerenchyma cells are dead at maturity and provide rigidity due to thick lignified walls.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Parenchyma tissue mainly functions in:",
      options: [
        { id: "a", text: "Storage of food" },
        { id: "b", text: "Rapid signal conduction" },
        { id: "c", text: "Movement" },
        { id: "d", text: "Reproduction only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Parenchyma cells are living cells that mainly store food and other materials.",
      difficulty: "easy",
    },
    {
      concept_id: c2a._id,
      question_text: "Apical meristem is located at the:",
      options: [
        { id: "a", text: "Tips of roots and shoots" },
        { id: "b", text: "Middle of the stem only" },
        { id: "c", text: "Leaves only" },
        { id: "d", text: "Flower petals only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Apical meristem at root and shoot tips is responsible for the plant's increase in length.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Lateral meristem is responsible for:",
      options: [
        { id: "a", text: "Increase in girth (thickness)" },
        { id: "b", text: "Leaf color change" },
        { id: "c", text: "Flower formation only" },
        { id: "d", text: "Seed germination" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Lateral meristem (cambium) increases the girth/thickness of stems and roots.",
      difficulty: "hard",
    },

    {
      concept_id: c2b._id,
      question_text: "Which tissue covers the outer surface of the body?",
      options: [
        { id: "a", text: "Epithelial tissue" },
        { id: "b", text: "Muscular tissue" },
        { id: "c", text: "Nervous tissue" },
        { id: "d", text: "Connective tissue" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Epithelial tissue forms the covering or lining of body surfaces and organs.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text:
        "Which tissue is responsible for transmitting nerve impulses?",
      options: [
        { id: "a", text: "Nervous tissue" },
        { id: "b", text: "Muscular tissue" },
        { id: "c", text: "Connective tissue" },
        { id: "d", text: "Epithelial tissue" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Nervous tissue is specialized to transmit electrical impulses across the body.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text: "Blood is classified as a type of:",
      options: [
        { id: "a", text: "Muscular tissue" },
        { id: "b", text: "Connective tissue" },
        { id: "c", text: "Epithelial tissue" },
        { id: "d", text: "Nervous tissue" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Blood is a fluid connective tissue that transports substances throughout the body.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text: "Which type of muscle tissue is under voluntary control?",
      options: [
        { id: "a", text: "Cardiac muscle" },
        { id: "b", text: "Smooth muscle" },
        { id: "c", text: "Skeletal muscle" },
        { id: "d", text: "None of these" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Skeletal muscles are voluntary muscles attached to bones, controlled consciously.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text: "Cardiac muscle is found only in the:",
      options: [
        { id: "a", text: "Heart" },
        { id: "b", text: "Legs" },
        { id: "c", text: "Stomach lining" },
        { id: "d", text: "Skin" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Cardiac muscle is a specialized involuntary muscle found only in the heart.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text:
        "The basic functional and structural unit of nervous tissue is the:",
      options: [
        { id: "a", text: "Neuron" },
        { id: "b", text: "Myocyte" },
        { id: "c", text: "Erythrocyte" },
        { id: "d", text: "Osteocyte" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Neurons are the specialized cells that make up nervous tissue.",
      difficulty: "medium",
    },

    {
      concept_id: c2c._id,
      question_text: "Xylem is mainly responsible for the transport of:",
      options: [
        { id: "a", text: "Water and minerals" },
        { id: "b", text: "Food materials" },
        { id: "c", text: "Oxygen only" },
        { id: "d", text: "Hormones only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Xylem tissue transports water and dissolved minerals from roots to the rest of the plant.",
      difficulty: "easy",
    },
    {
      concept_id: c2c._id,
      question_text: "Phloem transports food mainly in the form of:",
      options: [
        { id: "a", text: "Sugars" },
        { id: "b", text: "Water" },
        { id: "c", text: "Oxygen" },
        { id: "d", text: "Minerals" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Phloem transports food, primarily sugars produced during photosynthesis, throughout the plant.",
      difficulty: "easy",
    },
    {
      concept_id: c2c._id,
      question_text: "The direction of phloem transport is typically:",
      options: [
        { id: "a", text: "Only upward" },
        { id: "b", text: "Only downward" },
        { id: "c", text: "Bidirectional (both up and down)" },
        { id: "d", text: "No specific direction" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Unlike xylem, phloem transport can occur in both directions depending on where food is needed.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text: "Xylem is composed of tracheids, vessels, and:",
      options: [
        { id: "a", text: "Xylem parenchyma and fibres" },
        { id: "b", text: "Sieve tubes only" },
        { id: "c", text: "Companion cells only" },
        { id: "d", text: "Guard cells" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Xylem tissue consists of tracheids, vessels, xylem parenchyma, and xylem fibres.",
      difficulty: "hard",
    },
    {
      concept_id: c2c._id,
      question_text: "Sieve tubes are a component of:",
      options: [
        { id: "a", text: "Xylem" },
        { id: "b", text: "Phloem" },
        { id: "c", text: "Epidermis" },
        { id: "d", text: "Cortex" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Sieve tubes, along with companion cells, form the conducting elements of phloem.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text: "Xylem vessels are typically:",
      options: [
        { id: "a", text: "Dead and hollow" },
        { id: "b", text: "Living with nuclei" },
        { id: "c", text: "Found only in leaves" },
        { id: "d", text: "Responsible for photosynthesis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mature xylem vessels are dead, hollow tubes that efficiently conduct water.",
      difficulty: "medium",
    },
  ]);

  // ---------- CHAPTER 3: Diversity in Living Organisms ----------
  const ch3 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Diversity in Living Organisms",
    title: "Diversity in Living Organisms",
    order_index: 3,
    strand: "Biology",
  });

  const c3a = await Concept.create({
    chapter_id: ch3._id,
    title: "Classification Basics",
    explanation_text:
      "Living organisms are classified based on characteristics such as cell structure, body organization, and mode of nutrition, helping scientists study and organize the diversity of life.",
  });
  const c3b = await Concept.create({
    chapter_id: ch3._id,
    title: "Kingdom Plantae and Animalia Overview",
    explanation_text:
      "Kingdom Plantae includes multicellular, autotrophic organisms with cell walls, while Kingdom Animalia includes multicellular, heterotrophic organisms without cell walls.",
  });
  const c3c = await Concept.create({
    chapter_id: ch3._id,
    title: "Vertebrates and Invertebrates",
    explanation_text:
      "Animals are broadly divided into vertebrates (with a backbone, like fish, birds, mammals) and invertebrates (without a backbone, like insects, worms, and mollusks).",
  });

  await Question.insertMany([
    {
      concept_id: c3a._id,
      question_text: "Classification of organisms helps scientists to:",
      options: [
        { id: "a", text: "Study organisms systematically" },
        { id: "b", text: "Reduce the number of species" },
        { id: "c", text: "Eliminate rare species" },
        { id: "d", text: "Avoid studying evolution" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Classification organizes the vast diversity of life for systematic study.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text: "The basic criteria for classification includes:",
      options: [
        { id: "a", text: "Cell structure and body organization" },
        { id: "b", text: "Color of the organism only" },
        { id: "c", text: "Geographic location only" },
        { id: "d", text: "Size only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Cell structure, body organization, and mode of nutrition are key classification criteria.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text:
        "Organisms are grouped into hierarchical categories, with the smallest unit being:",
      options: [
        { id: "a", text: "Kingdom" },
        { id: "b", text: "Species" },
        { id: "c", text: "Phylum" },
        { id: "d", text: "Class" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Species is the basic and smallest unit of biological classification.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text:
        "Which characteristic distinguishes prokaryotes from eukaryotes?",
      options: [
        { id: "a", text: "Presence of a defined nucleus" },
        { id: "b", text: "Ability to move" },
        { id: "c", text: "Color" },
        { id: "d", text: "Habitat" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Eukaryotes have a membrane-bound nucleus, while prokaryotes do not.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text: "The mode of nutrition is used to classify organisms as:",
      options: [
        { id: "a", text: "Autotrophic or heterotrophic" },
        { id: "b", text: "Large or small" },
        { id: "c", text: "Fast or slow" },
        { id: "d", text: "Colored or colorless" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Autotrophic organisms make their own food, while heterotrophic organisms depend on others.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text: "Body organization level used in classification includes:",
      options: [
        { id: "a", text: "Unicellular vs multicellular" },
        { id: "b", text: "Tall vs short" },
        { id: "c", text: "Fast vs slow growing" },
        { id: "d", text: "Native vs foreign" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Whether an organism is unicellular or multicellular is a key classification criterion.",
      difficulty: "medium",
    },

    {
      concept_id: c3b._id,
      question_text: "Kingdom Plantae organisms are characterized by being:",
      options: [
        { id: "a", text: "Autotrophic with cell walls" },
        { id: "b", text: "Heterotrophic without cell walls" },
        { id: "c", text: "Unicellular only" },
        { id: "d", text: "Prokaryotic only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Plants are autotrophic (make their own food via photosynthesis) and have cellulose cell walls.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text: "Kingdom Animalia organisms lack:",
      options: [
        { id: "a", text: "Cell wall" },
        { id: "b", text: "Cell membrane" },
        { id: "c", text: "Nucleus" },
        { id: "d", text: "Cytoplasm" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Animal cells lack a rigid cell wall, unlike plant cells.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text:
        "Both Plantae and Animalia kingdoms consist of organisms that are:",
      options: [
        { id: "a", text: "Multicellular" },
        { id: "b", text: "Prokaryotic" },
        { id: "c", text: "Unicellular only" },
        { id: "d", text: "Always microscopic" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Both kingdoms are made up of multicellular, eukaryotic organisms.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text:
        "Which is a key functional difference between plants and animals?",
      options: [
        { id: "a", text: "Plants photosynthesize, animals do not" },
        { id: "b", text: "Only animals have cells" },
        { id: "c", text: "Only plants can move" },
        { id: "d", text: "Only animals reproduce" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Photosynthesis, the ability to make food using sunlight, is unique to plants among these two kingdoms.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text: "Animals are generally capable of:",
      options: [
        { id: "a", text: "Locomotion (movement)" },
        { id: "b", text: "Photosynthesis" },
        { id: "c", text: "Cellulose synthesis" },
        { id: "d", text: "Making their own food" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Most animals are capable of active movement, unlike most plants.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text: "Fungi are different from Plantae mainly because fungi:",
      options: [
        { id: "a", text: "Are heterotrophic" },
        { id: "b", text: "Have cell walls" },
        { id: "c", text: "Are multicellular" },
        { id: "d", text: "Are eukaryotic" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Fungi are heterotrophic and absorb nutrients, unlike autotrophic plants — this is why they are classified separately.",
      difficulty: "hard",
    },

    {
      concept_id: c3c._id,
      question_text: "Vertebrates are animals that possess a:",
      options: [
        { id: "a", text: "Backbone" },
        { id: "b", text: "Shell" },
        { id: "c", text: "Exoskeleton only" },
        { id: "d", text: "Wings" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Vertebrates are defined by the presence of a vertebral column (backbone).",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text: "Which of these is an invertebrate?",
      options: [
        { id: "a", text: "Earthworm" },
        { id: "b", text: "Frog" },
        { id: "c", text: "Fish" },
        { id: "d", text: "Snake" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Earthworms lack a backbone and are classified as invertebrates.",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text: "Which of these is a vertebrate group?",
      options: [
        { id: "a", text: "Mammals" },
        { id: "b", text: "Insects" },
        { id: "c", text: "Mollusks" },
        { id: "d", text: "Annelids" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mammals possess a backbone and are classified as vertebrates.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text:
        "Invertebrates make up approximately what portion of known animal species?",
      options: [
        { id: "a", text: "A small minority" },
        { id: "b", text: "The vast majority" },
        { id: "c", text: "Exactly half" },
        { id: "d", text: "None" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Invertebrates constitute the vast majority of known animal species on Earth.",
      difficulty: "hard",
    },
    {
      concept_id: c3c._id,
      question_text: "Insects belong to which broader animal group?",
      options: [
        { id: "a", text: "Vertebrates" },
        { id: "b", text: "Invertebrates" },
        { id: "c", text: "Neither" },
        { id: "d", text: "Plants" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Insects, lacking a backbone, are classified as invertebrates.",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text: "The presence of a backbone provides animals with:",
      options: [
        {
          id: "a",
          text: "Structural support and protection for the spinal cord",
        },
        { id: "b", text: "The ability to photosynthesize" },
        { id: "c", text: "Immunity to disease" },
        { id: "d", text: "The ability to reproduce asexually" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The backbone provides structural support and protects the spinal cord, a key nerve pathway.",
      difficulty: "medium",
    },
  ]);

  console.log(
    "Grade 9 seed complete: 3 chapters, 9 concepts, 54 questions added.",
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
