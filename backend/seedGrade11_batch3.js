require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const Question = require("./src/models/Question");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Biology", grade: 11 });
    console.log("Created new Grade 11 Biology subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- CHAPTER 7: Cell: The Unit of Life ----------
  const ch7 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Cell Structure and Function",
    title: "Cell: The Unit of Life",
    order_index: 7,
  });

  const c7a = await Concept.create({
    chapter_id: ch7._id,
    title: "Cell Theory and Prokaryotic Cells",
    explanation_text:
      "Cell theory states all organisms are composed of cells and cells arise from pre-existing cells; prokaryotic cells lack a true nucleus and membrane-bound organelles, as seen in bacteria.",
  });
  const c7b = await Concept.create({
    chapter_id: ch7._id,
    title: "Eukaryotic Cell Organelles",
    explanation_text:
      "Eukaryotic cells contain membrane-bound organelles like nucleus, mitochondria, endoplasmic reticulum, Golgi apparatus, and lysosomes, each performing specialized functions.",
  });
  const c7c = await Concept.create({
    chapter_id: ch7._id,
    title: "Cell Membrane and Cell Wall",
    explanation_text:
      "The cell membrane is a selectively permeable barrier made of a lipid bilayer with proteins, regulating what enters/exits the cell; the cell wall provides rigid structural support in plants.",
  });

  await Question.insertMany([
    {
      concept_id: c7a._id,
      question_text: "The cell theory states that all living organisms are composed of cells and that:",
      options: [
        { id: "a", text: "Cells arise only from non-living matter" },
        { id: "b", text: "Cells arise from pre-existing cells" },
        { id: "c", text: "Only plants are made of cells" },
        { id: "d", text: "Cells never divide" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The cell theory, extended by Rudolf Virchow, states that all cells arise from pre-existing cells, refuting the earlier idea of spontaneous generation.",
      difficulty: "easy",
    },
    {
      concept_id: c7a._id,
      question_text: "Prokaryotic cells are distinguished from eukaryotic cells mainly by the absence of:",
      options: [
        { id: "a", text: "Cell wall" },
        { id: "b", text: "A true, membrane-bound nucleus" },
        { id: "c", text: "Ribosomes" },
        { id: "d", text: "Cytoplasm" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Prokaryotic cells lack a membrane-bound nucleus; their genetic material lies in a nucleoid region directly exposed to the cytoplasm, unlike eukaryotic cells.",
      difficulty: "medium",
    },
    {
      concept_id: c7a._id,
      question_text: "The jelly-like matrix filling the interior of a prokaryotic cell, where the nucleoid and ribosomes are suspended, is the:",
      options: [
        { id: "a", text: "Cytoplasm" },
        { id: "b", text: "Nucleus" },
        { id: "c", text: "Cell wall" },
        { id: "d", text: "Mesosome" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The cytoplasm is the ground substance filling the cell, in which the nucleoid, ribosomes, and other inclusion bodies of a prokaryotic cell are suspended.",
      difficulty: "easy",
    },
    {
      concept_id: c7a._id,
      question_text: "Small circular extrachromosomal DNA molecules found in many bacteria are called:",
      options: [
        { id: "a", text: "Plasmids" },
        { id: "b", text: "Ribosomes" },
        { id: "c", text: "Mesosomes" },
        { id: "d", text: "Nucleoli" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Plasmids are small, circular, extrachromosomal DNA molecules found in bacteria, often conferring special traits like antibiotic resistance.",
      difficulty: "hard",
    },
    {
      concept_id: c7a._id,
      question_text: "Which organelles are found in ALL prokaryotic cells, unlike other membrane-bound organelles?",
      options: [
        { id: "a", text: "Mitochondria" },
        { id: "b", text: "Ribosomes" },
        { id: "c", text: "Golgi apparatus" },
        { id: "d", text: "Lysosomes" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ribosomes are the only 'organelles' found in prokaryotic cells besides the cell membrane and nucleoid — they are not membrane-bound and are the site of protein synthesis.",
      difficulty: "medium",
    },
    {
      concept_id: c7a._id,
      question_text: "The infolding of the plasma membrane in bacteria, called a mesosome, primarily helps in:",
      options: [
        { id: "a", text: "Respiration and cell division" },
        { id: "b", text: "Photosynthesis only" },
        { id: "c", text: "DNA replication only" },
        { id: "d", text: "Protein folding" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mesosomes are extensions of the plasma membrane formed by infolding, helping in cell wall formation, DNA replication, respiration, and secretion.",
      difficulty: "hard",
    },

    {
      concept_id: c7b._id,
      question_text: "Which organelle is known as the 'powerhouse of the cell'?",
      options: [
        { id: "a", text: "Nucleus" },
        { id: "b", text: "Mitochondria" },
        { id: "c", text: "Golgi apparatus" },
        { id: "d", text: "Ribosome" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Mitochondria are called the powerhouse of the cell because they are the primary site of aerobic respiration, producing ATP, the cell's energy currency.",
      difficulty: "easy",
    },
    {
      concept_id: c7b._id,
      question_text: "Which organelle is primarily responsible for the modification, packaging, and dispatch of materials, hence called the 'packaging unit'?",
      options: [
        { id: "a", text: "Endoplasmic reticulum" },
        { id: "b", text: "Golgi apparatus" },
        { id: "c", text: "Lysosome" },
        { id: "d", text: "Peroxisome" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Golgi apparatus is involved in the packaging of materials, often synthesized in the ER, for secretion or delivery to other organelles, and is hence called the packaging unit of the cell.",
      difficulty: "medium",
    },
    {
      concept_id: c7b._id,
      question_text: "The organelle containing hydrolytic enzymes, active in an acidic environment, that digests worn-out cell components is the:",
      options: [
        { id: "a", text: "Lysosome" },
        { id: "b", text: "Ribosome" },
        { id: "c", text: "Plastid" },
        { id: "d", text: "Vacuole" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Lysosomes, called the 'suicide bags' of the cell, contain hydrolytic enzymes capable of digesting carbohydrates, proteins, lipids, and nucleic acids, active at acidic pH.",
      difficulty: "medium",
    },
    {
      concept_id: c7b._id,
      question_text: "Rough Endoplasmic Reticulum (RER) is 'rough' due to the presence of:",
      options: [
        { id: "a", text: "Ribosomes attached to its surface" },
        { id: "b", text: "Mitochondria" },
        { id: "c", text: "Chlorophyll" },
        { id: "d", text: "Cellulose deposits" },
      ],
      correct_option_id: "a",
      explanation_text:
        "RER appears rough under the microscope because ribosomes are attached to its outer surface, making it the primary site of protein synthesis and secretion.",
      difficulty: "medium",
    },
    {
      concept_id: c7b._id,
      question_text: "Chloroplasts, the site of photosynthesis, belong to which group of organelles?",
      options: [
        { id: "a", text: "Plastids" },
        { id: "b", text: "Ribosomes" },
        { id: "c", text: "Lysosomes" },
        { id: "d", text: "Centrioles" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Chloroplasts are a type of plastid containing chlorophyll, giving plants their green colour, and are the site where photosynthesis occurs.",
      difficulty: "easy",
    },
    {
      concept_id: c7b._id,
      question_text: "The nucleolus, found inside the nucleus, is mainly involved in the synthesis of:",
      options: [
        { id: "a", text: "ATP" },
        { id: "b", text: "Ribosomal RNA (rRNA)" },
        { id: "c", text: "Lipids" },
        { id: "d", text: "Cell wall material" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The nucleolus is a dense, non-membrane-bound structure within the nucleus, primarily involved in the synthesis of ribosomal RNA (rRNA) and ribosome assembly.",
      difficulty: "hard",
    },

    {
      concept_id: c7c._id,
      question_text: "The cell membrane is described as 'selectively permeable' because it:",
      options: [
        { id: "a", text: "Allows all substances to pass freely" },
        { id: "b", text: "Regulates the movement of substances into and out of the cell" },
        { id: "c", text: "Blocks all substances" },
        { id: "d", text: "Is only permeable to water" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The cell membrane's selective permeability means it allows some substances to pass through while restricting others, controlling the internal composition of the cell.",
      difficulty: "medium",
    },
    {
      concept_id: c7c._id,
      question_text: "According to the fluid mosaic model, the cell membrane is composed mainly of:",
      options: [
        { id: "a", text: "A lipid bilayer with embedded proteins" },
        { id: "b", text: "Pure cellulose" },
        { id: "c", text: "DNA and RNA only" },
        { id: "d", text: "Chitin fibres" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The fluid mosaic model describes the cell membrane as a lipid bilayer with proteins embedded within it, giving it a dynamic, fluid-like quality.",
      difficulty: "medium",
    },
    {
      concept_id: c7c._id,
      question_text: "In plant cells, the rigid outer layer that provides structural support and protection is the:",
      options: [
        { id: "a", text: "Cell membrane" },
        { id: "b", text: "Cell wall" },
        { id: "c", text: "Nuclear envelope" },
        { id: "d", text: "Tonoplast" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The cell wall is a rigid, non-living structure found outside the cell membrane in plant cells, made mainly of cellulose, providing shape and protection.",
      difficulty: "easy",
    },
    {
      concept_id: c7c._id,
      question_text: "Movement of water across the cell membrane through a semipermeable membrane, from higher to lower water potential, is called:",
      options: [
        { id: "a", text: "Diffusion" },
        { id: "b", text: "Osmosis" },
        { id: "c", text: "Active transport" },
        { id: "d", text: "Endocytosis" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Osmosis is the movement of water molecules across a semipermeable membrane from a region of higher water potential to lower water potential.",
      difficulty: "medium",
    },
    {
      concept_id: c7c._id,
      question_text: "Movement of molecules against their concentration gradient, requiring energy (ATP), is called:",
      options: [
        { id: "a", text: "Passive transport" },
        { id: "b", text: "Active transport" },
        { id: "c", text: "Simple diffusion" },
        { id: "d", text: "Osmosis" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Active transport moves molecules against their concentration gradient (low to high concentration), requiring the cell to expend energy in the form of ATP.",
      difficulty: "hard",
    },
    {
      concept_id: c7c._id,
      question_text: "The middle lamella, made mainly of calcium pectate, functions to:",
      options: [
        { id: "a", text: "Cement adjacent plant cell walls together" },
        { id: "b", text: "Store starch" },
        { id: "c", text: "Conduct water" },
        { id: "d", text: "Produce chlorophyll" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The middle lamella is a thin layer, mainly of calcium pectate, that cements together the cell walls of two adjacent plant cells, holding plant tissue together.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 7 (Cell: The Unit of Life) done");

  // ---------- CHAPTER 8: Biomolecules ----------
  const ch8 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Cell Structure and Function",
    title: "Biomolecules",
    order_index: 8,
  });

  const c8a = await Concept.create({
    chapter_id: ch8._id,
    title: "Carbohydrates and Lipids",
    explanation_text:
      "Carbohydrates are the primary source of energy, classified as monosaccharides, disaccharides, and polysaccharides; lipids include fats, oils, and phospholipids, key for energy storage and membranes.",
  });
  const c8b = await Concept.create({
    chapter_id: ch8._id,
    title: "Proteins and Amino Acids",
    explanation_text:
      "Proteins are polymers of amino acids linked by peptide bonds, performing structural, enzymatic, transport, and regulatory functions essential to all cellular processes.",
  });
  const c8c = await Concept.create({
    chapter_id: ch8._id,
    title: "Nucleic Acids and Enzymes",
    explanation_text:
      "Nucleic acids (DNA, RNA) store and transmit genetic information as polymers of nucleotides; enzymes are biological catalysts, mostly proteins, that speed up biochemical reactions.",
  });

  await Question.insertMany([
    {
      concept_id: c8a._id,
      question_text: "The simplest form of carbohydrate, which cannot be hydrolyzed further, is called a:",
      options: [
        { id: "a", text: "Monosaccharide" },
        { id: "b", text: "Disaccharide" },
        { id: "c", text: "Polysaccharide" },
        { id: "d", text: "Oligosaccharide" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Monosaccharides, like glucose and fructose, are the simplest carbohydrates and cannot be broken down into smaller sugar units by hydrolysis.",
      difficulty: "easy",
    },
    {
      concept_id: c8a._id,
      question_text: "Two monosaccharides joined together by a glycosidic bond form a:",
      options: [
        { id: "a", text: "Monosaccharide" },
        { id: "b", text: "Disaccharide" },
        { id: "c", text: "Amino acid" },
        { id: "d", text: "Nucleotide" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A disaccharide, such as sucrose or maltose, is formed when two monosaccharide units are joined by a glycosidic bond, with loss of a water molecule.",
      difficulty: "medium",
    },
    {
      concept_id: c8a._id,
      question_text: "Starch and glycogen are examples of:",
      options: [
        { id: "a", text: "Monosaccharides" },
        { id: "b", text: "Disaccharides" },
        { id: "c", text: "Polysaccharides used for energy storage" },
        { id: "d", text: "Amino acids" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Starch (in plants) and glycogen (in animals) are polysaccharides made of long chains of glucose units, functioning as major energy-storage molecules.",
      difficulty: "medium",
    },
    {
      concept_id: c8a._id,
      question_text: "Lipids are generally characterised as being:",
      options: [
        { id: "a", text: "Water-soluble" },
        { id: "b", text: "Insoluble in water but soluble in organic solvents" },
        { id: "c", text: "Made only of amino acids" },
        { id: "d", text: "Charged molecules only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Lipids, including fats and oils, are hydrophobic and insoluble in water, but they dissolve readily in organic solvents like ether and chloroform.",
      difficulty: "medium",
    },
    {
      concept_id: c8a._id,
      question_text: "A triglyceride (fat molecule) is formed by the combination of glycerol with:",
      options: [
        { id: "a", text: "Three fatty acid molecules" },
        { id: "b", text: "Three amino acids" },
        { id: "c", text: "Three sugar molecules" },
        { id: "d", text: "Three nucleotides" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A triglyceride, or fat, is formed by the esterification of one glycerol molecule with three fatty acid molecules.",
      difficulty: "hard",
    },
    {
      concept_id: c8a._id,
      question_text: "Phospholipids are especially important in biology because they form the basic structure of the:",
      options: [
        { id: "a", text: "Cell membrane" },
        { id: "b", text: "Cell wall" },
        { id: "c", text: "Nucleolus" },
        { id: "d", text: "Ribosome" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Phospholipids have both hydrophilic (water-loving) and hydrophobic (water-fearing) regions, allowing them to spontaneously form the lipid bilayer of the cell membrane.",
      difficulty: "medium",
    },

    {
      concept_id: c8b._id,
      question_text: "Proteins are polymers made up of monomeric units called:",
      options: [
        { id: "a", text: "Nucleotides" },
        { id: "b", text: "Amino acids" },
        { id: "c", text: "Monosaccharides" },
        { id: "d", text: "Fatty acids" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Proteins are polymers composed of amino acids linked together, and there are 20 different types of amino acids commonly found in proteins.",
      difficulty: "easy",
    },
    {
      concept_id: c8b._id,
      question_text: "Amino acids are linked together in a protein chain by which type of bond?",
      options: [
        { id: "a", text: "Glycosidic bond" },
        { id: "b", text: "Peptide bond" },
        { id: "c", text: "Phosphodiester bond" },
        { id: "d", text: "Hydrogen bond only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A peptide bond is formed between the carboxyl group of one amino acid and the amino group of the next, with the release of a water molecule, linking amino acids in a chain.",
      difficulty: "medium",
    },
    {
      concept_id: c8b._id,
      question_text: "The specific sequence of amino acids in a protein chain refers to its:",
      options: [
        { id: "a", text: "Primary structure" },
        { id: "b", text: "Secondary structure" },
        { id: "c", text: "Tertiary structure" },
        { id: "d", text: "Quaternary structure" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The primary structure of a protein refers to the linear sequence of amino acids joined by peptide bonds, which ultimately determines the protein's final shape.",
      difficulty: "medium",
    },
    {
      concept_id: c8b._id,
      question_text: "The three-dimensional folding of a single polypeptide chain into its functional shape is called its:",
      options: [
        { id: "a", text: "Primary structure" },
        { id: "b", text: "Tertiary structure" },
        { id: "c", text: "Peptide bond structure" },
        { id: "d", text: "Glycosidic structure" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The tertiary structure describes the overall three-dimensional folding of a single polypeptide chain, essential for the protein's biological function.",
      difficulty: "hard",
    },
    {
      concept_id: c8b._id,
      question_text: "Proteins made up of more than one polypeptide chain associated together are said to have which structure?",
      options: [
        { id: "a", text: "Primary" },
        { id: "b", text: "Secondary" },
        { id: "c", text: "Tertiary" },
        { id: "d", text: "Quaternary" },
      ],
      correct_option_id: "d",
      explanation_text:
        "The quaternary structure exists in proteins composed of two or more polypeptide subunits associated together, such as haemoglobin, which has four subunits.",
      difficulty: "hard",
    },
    {
      concept_id: c8b._id,
      question_text: "Which of the following is a key biological function performed by proteins in the body?",
      options: [
        { id: "a", text: "Acting as enzymes to catalyze reactions" },
        { id: "b", text: "Storing genetic information exclusively" },
        { id: "c", text: "Forming cell walls in animals" },
        { id: "d", text: "Serving only as a waste product" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Proteins perform many roles including acting as enzymes (biological catalysts), structural components, transport molecules (like haemoglobin), and hormones.",
      difficulty: "medium",
    },

    {
      concept_id: c8c._id,
      question_text: "Nucleic acids (DNA and RNA) are polymers of monomeric units called:",
      options: [
        { id: "a", text: "Amino acids" },
        { id: "b", text: "Nucleotides" },
        { id: "c", text: "Monosaccharides" },
        { id: "d", text: "Fatty acids" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Nucleic acids are polymers made of repeating units called nucleotides, each consisting of a nitrogenous base, a pentose sugar, and a phosphate group.",
      difficulty: "easy",
    },
    {
      concept_id: c8c._id,
      question_text: "A nucleotide is composed of a nitrogenous base, a pentose sugar, and a:",
      options: [
        { id: "a", text: "Phosphate group" },
        { id: "b", text: "Fatty acid" },
        { id: "c", text: "Amino group only" },
        { id: "d", text: "Glycosidic bond" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Each nucleotide consists of three components: a nitrogenous base, a five-carbon pentose sugar (deoxyribose or ribose), and a phosphate group.",
      difficulty: "medium",
    },
    {
      concept_id: c8c._id,
      question_text: "DNA differs from RNA in that DNA contains the sugar deoxyribose, while RNA contains:",
      options: [
        { id: "a", text: "Ribose" },
        { id: "b", text: "Glucose" },
        { id: "c", text: "Fructose" },
        { id: "d", text: "Sucrose" },
      ],
      correct_option_id: "a",
      explanation_text:
        "DNA contains deoxyribose sugar (lacking one oxygen compared to ribose), while RNA contains ribose sugar, one of the key chemical differences between the two nucleic acids.",
      difficulty: "medium",
    },
    {
      concept_id: c8c._id,
      question_text: "Enzymes primarily function in biological systems by:",
      options: [
        { id: "a", text: "Lowering the activation energy required for a reaction" },
        { id: "b", text: "Increasing the activation energy" },
        { id: "c", text: "Being consumed permanently in the reaction" },
        { id: "d", text: "Preventing all chemical reactions" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Enzymes are biological catalysts that speed up biochemical reactions by lowering the activation energy needed, without being consumed or permanently altered in the process.",
      difficulty: "medium",
    },
    {
      concept_id: c8c._id,
      question_text: "The specific region of an enzyme where the substrate binds is called the:",
      options: [
        { id: "a", text: "Active site" },
        { id: "b", text: "Cofactor" },
        { id: "c", text: "Coenzyme" },
        { id: "d", text: "Allosteric site only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The active site is the specific region of an enzyme, with a particular shape and chemical environment, where the substrate binds and the reaction is catalyzed.",
      difficulty: "medium",
    },
    {
      concept_id: c8c._id,
      question_text: "Enzyme activity is generally most efficient at:",
      options: [
        { id: "a", text: "Any temperature and pH" },
        { id: "b", text: "An optimum temperature and pH specific to the enzyme" },
        { id: "c", text: "Only extremely high temperatures" },
        { id: "d", text: "Only 0°C" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Each enzyme has an optimum temperature and pH at which its activity is maximal; deviations from this optimum can reduce activity or denature the enzyme.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 8 (Biomolecules) done");

  // ---------- CHAPTER 9: Cell Cycle and Cell Division ----------
  const ch9 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Cell Structure and Function",
    title: "Cell Cycle and Cell Division",
    order_index: 9,
  });

  const c9a = await Concept.create({
    chapter_id: ch9._id,
    title: "The Cell Cycle",
    explanation_text:
      "The cell cycle is the series of events a cell undergoes to divide, consisting of Interphase (G1, S, G2 phases) for growth and DNA replication, followed by the M phase (mitosis).",
  });
  const c9b = await Concept.create({
    chapter_id: ch9._id,
    title: "Mitosis",
    explanation_text:
      "Mitosis is a type of cell division producing two genetically identical daughter cells, occurring in four phases: prophase, metaphase, anaphase, and telophase.",
  });
  const c9c = await Concept.create({
    chapter_id: ch9._id,
    title: "Meiosis",
    explanation_text:
      "Meiosis is a specialized type of cell division that reduces the chromosome number by half, producing four genetically varied haploid gametes, essential for sexual reproduction.",
  });

  await Question.insertMany([
    {
      concept_id: c9a._id,
      question_text: "The cell cycle is broadly divided into which two main phases?",
      options: [
        { id: "a", text: "Interphase and M phase (Mitotic phase)" },
        { id: "b", text: "G1 and G2 only" },
        { id: "c", text: "Prophase and Metaphase" },
        { id: "d", text: "Mitosis and Meiosis only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The cell cycle consists of Interphase, the resting/preparatory phase, and the M phase (Mitotic phase), during which actual cell division occurs.",
      difficulty: "easy",
    },
    {
      concept_id: c9a._id,
      question_text: "During which phase of interphase does DNA replication occur?",
      options: [
        { id: "a", text: "G1 phase" },
        { id: "b", text: "S phase" },
        { id: "c", text: "G2 phase" },
        { id: "d", text: "M phase" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The S (synthesis) phase of interphase is when DNA replication occurs, doubling the amount of DNA in the cell in preparation for cell division.",
      difficulty: "medium",
    },
    {
      concept_id: c9a._id,
      question_text: "During G1 phase, the cell primarily:",
      options: [
        { id: "a", text: "Replicates its DNA" },
        { id: "b", text: "Grows metabolically active and synthesizes proteins/RNA" },
        { id: "c", text: "Divides into two cells" },
        { id: "d", text: "Undergoes crossing over" },
      ],
      correct_option_id: "b",
      explanation_text:
        "During G1 (Gap 1), the cell is metabolically active, growing continuously and synthesizing proteins and RNA needed for the upcoming S phase.",
      difficulty: "medium",
    },
    {
      concept_id: c9a._id,
      question_text: "Cells that do not divide further, such as heart muscle cells, exit the cell cycle and enter a resting phase called:",
      options: [
        { id: "a", text: "G0 phase (quiescent stage)" },
        { id: "b", text: "S phase" },
        { id: "c", text: "M phase" },
        { id: "d", text: "Prophase" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Cells that do not divide further exit the active cell cycle and enter G0, a quiescent (resting) stage, though they remain metabolically active.",
      difficulty: "hard",
    },
    {
      concept_id: c9a._id,
      question_text: "In a typical human cell, which phase of the cell cycle takes up the longest duration?",
      options: [
        { id: "a", text: "M phase" },
        { id: "b", text: "Interphase" },
        { id: "c", text: "Metaphase alone" },
        { id: "d", text: "Telophase alone" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Interphase takes up more than 95% of the total cell cycle duration in a typical human cell, as it includes growth, DNA replication, and preparation for division.",
      difficulty: "hard",
    },
    {
      concept_id: c9a._id,
      question_text: "During the G2 phase of interphase, the cell mainly:",
      options: [
        { id: "a", text: "Continues protein synthesis and prepares for mitosis" },
        { id: "b", text: "Replicates DNA" },
        { id: "c", text: "Undergoes cytokinesis" },
        { id: "d", text: "Forms gametes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "During G2 (Gap 2), the cell continues to grow and synthesizes proteins required for mitosis, preparing the cell for the upcoming division phase.",
      difficulty: "medium",
    },

    {
      concept_id: c9b._id,
      question_text: "Mitosis results in the formation of daughter cells that are:",
      options: [
        { id: "a", text: "Genetically identical to the parent cell" },
        { id: "b", text: "Genetically different from the parent cell" },
        { id: "c", text: "Haploid" },
        { id: "d", text: "Four in number" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mitosis produces two daughter cells that are genetically identical to each other and to the parent cell, maintaining the same chromosome number.",
      difficulty: "easy",
    },
    {
      concept_id: c9b._id,
      question_text: "During which phase of mitosis do chromosomes align at the equatorial plate (metaphase plate)?",
      options: [
        { id: "a", text: "Prophase" },
        { id: "b", text: "Metaphase" },
        { id: "c", text: "Anaphase" },
        { id: "d", text: "Telophase" },
      ],
      correct_option_id: "b",
      explanation_text:
        "During metaphase, condensed chromosomes align at the equatorial plate (metaphase plate) of the cell, attached to spindle fibres via their centromeres.",
      difficulty: "medium",
    },
    {
      concept_id: c9b._id,
      question_text: "The separation of sister chromatids and their movement to opposite poles occurs during:",
      options: [
        { id: "a", text: "Prophase" },
        { id: "b", text: "Metaphase" },
        { id: "c", text: "Anaphase" },
        { id: "d", text: "Interphase" },
      ],
      correct_option_id: "c",
      explanation_text:
        "During anaphase, the centromere splits, and sister chromatids separate and move towards opposite poles of the cell, pulled by shortening spindle fibres.",
      difficulty: "medium",
    },
    {
      concept_id: c9b._id,
      question_text: "During prophase, the nuclear envelope and nucleolus:",
      options: [
        { id: "a", text: "Reform" },
        { id: "b", text: "Gradually disappear" },
        { id: "c", text: "Remain unchanged" },
        { id: "d", text: "Split into four parts" },
      ],
      correct_option_id: "b",
      explanation_text:
        "During prophase, chromatin condenses into visible chromosomes, and the nuclear envelope and nucleolus gradually disintegrate and disappear.",
      difficulty: "medium",
    },
    {
      concept_id: c9b._id,
      question_text: "The final phase of mitosis, during which the nuclear envelope reforms around each set of chromosomes, is called:",
      options: [
        { id: "a", text: "Prophase" },
        { id: "b", text: "Metaphase" },
        { id: "c", text: "Anaphase" },
        { id: "d", text: "Telophase" },
      ],
      correct_option_id: "d",
      explanation_text:
        "During telophase, chromosomes decondense, and the nuclear envelope reforms around each set of chromosomes at opposite poles, forming two new nuclei.",
      difficulty: "medium",
    },
    {
      concept_id: c9b._id,
      question_text: "The division of the cytoplasm following nuclear division, resulting in two separate daughter cells, is called:",
      options: [
        { id: "a", text: "Karyokinesis" },
        { id: "b", text: "Cytokinesis" },
        { id: "c", text: "Synapsis" },
        { id: "d", text: "Crossing over" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Cytokinesis is the division of the cytoplasm that usually follows karyokinesis (nuclear division), resulting in the formation of two separate daughter cells.",
      difficulty: "medium",
    },

    {
      concept_id: c9c._id,
      question_text: "Meiosis results in daughter cells with a chromosome number that is:",
      options: [
        { id: "a", text: "The same as the parent cell" },
        { id: "b", text: "Half that of the parent cell (haploid)" },
        { id: "c", text: "Double that of the parent cell" },
        { id: "d", text: "Always zero" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Meiosis is a reductional division that halves the chromosome number, producing haploid (n) cells from a diploid (2n) parent cell, essential for sexual reproduction.",
      difficulty: "easy",
    },
    {
      concept_id: c9c._id,
      question_text: "How many daughter cells are typically produced at the end of meiosis?",
      options: [
        { id: "a", text: "Two" },
        { id: "b", text: "Four" },
        { id: "c", text: "One" },
        { id: "d", text: "Eight" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Meiosis involves two successive divisions (Meiosis I and Meiosis II), resulting in four haploid daughter cells from one diploid parent cell.",
      difficulty: "medium",
    },
    {
      concept_id: c9c._id,
      question_text: "The pairing of homologous chromosomes, which occurs during meiosis I, is called:",
      options: [
        { id: "a", text: "Synapsis" },
        { id: "b", text: "Cytokinesis" },
        { id: "c", text: "Karyokinesis" },
        { id: "d", text: "Fertilization" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Synapsis is the pairing of homologous chromosomes during prophase I of meiosis, forming a structure called a bivalent or tetrad.",
      difficulty: "hard",
    },
    {
      concept_id: c9c._id,
      question_text: "The exchange of genetic material between non-sister chromatids of homologous chromosomes during meiosis is called:",
      options: [
        { id: "a", text: "Crossing over" },
        { id: "b", text: "Cytokinesis" },
        { id: "c", text: "Synapsis only" },
        { id: "d", text: "Fertilization" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Crossing over is the exchange of genetic material between non-sister chromatids of homologous chromosomes during prophase I, generating genetic variation in offspring.",
      difficulty: "hard",
    },
    {
      concept_id: c9c._id,
      question_text: "Meiosis I is often called a reductional division because it separates:",
      options: [
        { id: "a", text: "Homologous chromosomes" },
        { id: "b", text: "Sister chromatids" },
        { id: "c", text: "Only the cytoplasm" },
        { id: "d", text: "Nothing; it's identical to mitosis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Meiosis I is called a reductional division because it separates homologous chromosome pairs, reducing the chromosome number from diploid to haploid.",
      difficulty: "hard",
    },
    {
      concept_id: c9c._id,
      question_text: "Meiosis II is similar to mitosis mainly because it involves the separation of:",
      options: [
        { id: "a", text: "Homologous chromosomes" },
        { id: "b", text: "Sister chromatids" },
        { id: "c", text: "Nothing at all" },
        { id: "d", text: "Only cytoplasmic organelles" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Meiosis II resembles mitosis because it separates sister chromatids, similar to mitotic anaphase, but starts with haploid cells rather than diploid cells.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 11 Batch 3 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
