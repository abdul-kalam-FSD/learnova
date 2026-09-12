require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const Case = require("./src/models/Case");

const CASES = [
  // ---------------- GRADE 9 ----------------
  {
    chapterTitle: "The Fundamental Unit of Life",
    title: "The Cell That Stopped Working",
    intro_text:
      "A lab sample of onion cells under the microscope looks abnormal — one cell has stopped producing proteins and started swelling. Something along its internal delivery route has failed.",
    mission_text:
      "Trace the protein's delivery route through the cell and find out exactly where the pathway broke down.",
    dragdrop: {
      prompt: "Trace the Protein's Journey",
      clue_text:
        "Reconstruct the path a protein takes from where it's built to where it's shipped out of the cell.",
      items: [
        "Nucleus",
        "Rough Endoplasmic Reticulum",
        "Golgi Apparatus",
        "Cell Membrane",
      ],
    },
    matching: {
      prompt: "Match the Organelle to Its Job",
      clue_text:
        "Before ruling any organelle out, confirm what each one actually does.",
      pairs: [
        { structure: "Nucleus", role: "Controls cell activities" },
        { structure: "Mitochondria", role: "Powerhouse of the cell" },
        { structure: "Ribosome", role: "Site of protein synthesis" },
        { structure: "Golgi Apparatus", role: "Packages and ships proteins" },
      ],
    },
  },
  {
    chapterTitle: "Tissues",
    title: "The Wilting Sapling",
    intro_text:
      "A young sapling in the school garden is wilting even though it's watered daily. The gardener suspects something inside the stem isn't moving water where it needs to go.",
    mission_text:
      "Trace water's path through the plant's tissues to find out why it isn't reaching the leaves.",
    dragdrop: {
      prompt: "Trace the Water's Route",
      clue_text: "Arrange the path water takes from the soil to the leaves.",
      items: ["Root Hair", "Root Xylem", "Stem Xylem", "Leaf"],
    },
    matching: {
      prompt: "Match the Tissue to Its Function",
      clue_text:
        "Confirm which tissue is responsible for what before diagnosing the sapling.",
      pairs: [
        { structure: "Xylem", role: "Transports water upward" },
        { structure: "Phloem", role: "Transports food" },
        { structure: "Epidermis", role: "Protects outer surface" },
        { structure: "Meristem", role: "Site of active growth" },
      ],
    },
  },
  {
    chapterTitle: "Diversity in Living Organisms",
    title: "The Unidentified Specimen",
    intro_text:
      "A field trip sample — a small, spore-producing organism — has arrived at the lab with no label. It needs to be placed correctly before it can be studied further.",
    mission_text:
      "Classify the specimen correctly by working through the taxonomic ranks and its kingdom.",
    dragdrop: {
      prompt: "Build the Classification Ladder",
      clue_text: "Arrange the taxonomic ranks from broadest to most specific.",
      items: ["Kingdom", "Phylum", "Class", "Species"],
    },
    matching: {
      prompt: "Match the Organism to Its Kingdom",
      clue_text: "Sort each sample into the kingdom it actually belongs to.",
      pairs: [
        { structure: "Mushroom", role: "Kingdom Fungi" },
        { structure: "Amoeba", role: "Kingdom Protista" },
        { structure: "Bacteria", role: "Kingdom Monera" },
        { structure: "Fern", role: "Kingdom Plantae" },
      ],
    },
  },
  {
    chapterTitle: "Why Do We Fall Ill",
    title: "The Mystery Fever",
    intro_text:
      "A student has been running a fever for three days with no visible injury. The school nurse needs to trace how the illness took hold before deciding on treatment.",
    mission_text:
      "Trace how the illness took hold, from exposure to symptoms, and identify the pathogen behind it.",
    dragdrop: {
      prompt: "Trace How the Illness Took Hold",
      clue_text: "Arrange the stages from exposure to visible sickness.",
      items: [
        "Pathogen Enters Body",
        "Pathogen Multiplies",
        "Immune Response Triggered",
        "Symptoms Appear",
      ],
    },
    matching: {
      prompt: "Match the Disease to Its Cause",
      clue_text: "Identify what kind of pathogen is behind each disease.",
      pairs: [
        { structure: "Malaria", role: "Caused by a protozoan" },
        { structure: "Tuberculosis", role: "Caused by bacteria" },
        { structure: "Common Cold", role: "Caused by a virus" },
        { structure: "Ringworm", role: "Caused by a fungus" },
      ],
    },
  },
  {
    chapterTitle: "Natural Resources",
    title: "The Vanishing Rainfall",
    intro_text:
      "A village that once had reliable monsoons has seen rainfall drop sharply this year. Environmental officers need to trace the water cycle to find where it's breaking down.",
    mission_text:
      "Trace the water cycle stage by stage to find out where it's breaking down this year.",
    dragdrop: {
      prompt: "Trace the Water Cycle",
      clue_text: "Arrange the stages of the water cycle in order.",
      items: ["Evaporation", "Condensation", "Precipitation", "Collection"],
    },
    matching: {
      prompt: "Match the Cycle to Its Key Process",
      clue_text: "Confirm what drives each natural cycle.",
      pairs: [
        { structure: "Water Cycle", role: "Evaporation and precipitation" },
        { structure: "Carbon Cycle", role: "Photosynthesis and respiration" },
        { structure: "Nitrogen Cycle", role: "Nitrogen fixation" },
        { structure: "Ozone Layer", role: "Blocks harmful UV rays" },
      ],
    },
  },
  {
    chapterTitle: "Improvement in Food Resources",
    title: "The Underperforming Harvest",
    intro_text:
      "A farmer's wheat yield has dropped for two seasons straight, despite normal rainfall. An agricultural officer needs to trace what's missing from the crop-improvement process.",
    mission_text:
      "Trace the crop-improvement process to find out what step is missing from this harvest.",
    dragdrop: {
      prompt: "Trace the Crop Improvement Process",
      clue_text:
        "Arrange the steps taken to develop a better-yielding crop variety.",
      items: [
        "Select Parent Plants",
        "Cross-breed (Hybridization)",
        "Test New Variety",
        "Release for Farming",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm what each food-resource term actually refers to.",
      pairs: [
        {
          structure: "Hybridization",
          role: "Crossing two different varieties",
        },
        { structure: "Biofertilizer", role: "Natural source of nutrients" },
        { structure: "Vermicompost", role: "Compost made using earthworms" },
        { structure: "Apiculture", role: "Rearing of honeybees" },
      ],
    },
  },

  // ---------------- GRADE 10 ----------------
  {
    chapterTitle: "Life Processes",
    title: "Why Can't She Breathe?",
    conceptTitles: ["Respiration"],
    intro_text:
      "During today's sports period, a Grade 10 student ran a single lap and had to stop — gasping, chest tight, unable to catch her breath. The school nurse ruled out injury. Something inside her body is not moving air the way it should.",
    mission_text:
      "Trace the airflow pathway through her respiratory system to find where the breathing problem is happening.",
    dragdrop: {
      prompt: "Arrange the Airflow Pathway",
      clue_text:
        "To trace how air actually reaches her lungs, reconstruct the pathway it travels — in order.",
      items: ["Nose", "Trachea", "Bronchi", "Lungs"],
    },
    matching: {
      prompt: "Match the Structure to Its Role",
      clue_text:
        "Before you rule this system in for good, confirm each structure is doing the job you think it is.",
      pairs: [
        { structure: "Lungs", role: "Site of gas exchange" },
        { structure: "Trachea", role: "Air passage tube" },
        { structure: "Diaphragm", role: "Main breathing muscle" },
        { structure: "Alveoli", role: "Tiny air sacs" },
      ],
    },
  },
  {
    chapterTitle: "Control and Coordination",
    title: "The Instant Reaction",
    intro_text:
      "A student touched a hot vessel and pulled her hand back before she even registered the pain. A biology teacher wants the class to trace exactly what happened in that split second.",
    mission_text:
      "Trace the reflex pathway to see exactly how her body reacted before the pain even registered.",
    dragdrop: {
      prompt: "Trace the Reflex Pathway",
      clue_text:
        "Arrange the steps of a reflex action in the order they occur.",
      items: [
        "Receptor Detects Stimulus",
        "Sensory Neuron",
        "Spinal Cord",
        "Motor Neuron to Muscle",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Function",
      clue_text: "Confirm what each part of the nervous system actually does.",
      pairs: [
        { structure: "Neuron", role: "Transmits nerve impulses" },
        { structure: "Synapse", role: "Junction between two neurons" },
        { structure: "Hormone", role: "Chemical messenger in blood" },
        { structure: "Reflex Arc", role: "Pathway for a quick response" },
      ],
    },
  },
  {
    chapterTitle: "How Do Organisms Reproduce",
    title: "The Unexpected Offspring",
    intro_text:
      "A pond sample of Hydra shows small buds growing off its body — no mate, no eggs involved. A researcher needs to trace exactly how this new individual is forming.",
    mission_text:
      "Trace how this new individual formed to identify the mode of reproduction at work.",
    dragdrop: {
      prompt: "Trace the Path to a New Individual",
      clue_text: "Arrange the stages of sexual reproduction in order.",
      items: [
        "Gamete Formation",
        "Fertilization",
        "Zygote Formation",
        "Embryo Development",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Example",
      clue_text: "Confirm which mode of reproduction fits which organism.",
      pairs: [
        { structure: "Budding", role: "Seen in Hydra" },
        { structure: "Binary Fission", role: "Seen in Amoeba" },
        { structure: "Regeneration", role: "Seen in Planaria" },
        {
          structure: "Fertilization",
          role: "Fusion of male and female gametes",
        },
      ],
    },
  },
  {
    chapterTitle: "Heredity and Evolution",
    title: "The Trait That Skipped a Generation",
    intro_text:
      "In a family of tall parents, a child was born short — and the grandparents were short too. A genetics student wants to trace how this trait resurfaced.",
    mission_text:
      "Trace the cross across generations to find out how this trait resurfaced.",
    dragdrop: {
      prompt: "Trace Mendel's Cross",
      clue_text: "Arrange the stages of a classic Mendelian cross in order.",
      items: [
        "Parent Cross",
        "F1 Generation",
        "Self-Pollination",
        "F2 Generation",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each genetics term before drawing conclusions.",
      pairs: [
        { structure: "Dominant Trait", role: "Trait that gets expressed" },
        { structure: "Recessive Trait", role: "Trait that stays masked" },
        { structure: "Gene", role: "Basic unit of heredity" },
        { structure: "Chromosome", role: "Carries genes" },
      ],
    },
  },
  {
    chapterTitle: "Our Environment",
    title: "The Collapsing Food Chain",
    intro_text:
      "A grassland ecosystem is showing a sudden crash in its deer population, and tigers in the reserve are struggling to find food. An ecologist needs to trace the chain to find the break.",
    mission_text:
      "Trace the food chain step by step to find where the break is causing the crash.",
    dragdrop: {
      prompt: "Trace the Food Chain",
      clue_text:
        "Arrange the organisms in the order energy flows through them.",
      items: ["Grass", "Deer", "Tiger", "Decomposer"],
    },
    matching: {
      prompt: "Match the Role to Its Organism Type",
      clue_text: "Confirm each organism's role in the ecosystem.",
      pairs: [
        { structure: "Producer", role: "Makes its own food" },
        { structure: "Consumer", role: "Feeds on other organisms" },
        { structure: "Decomposer", role: "Breaks down dead matter" },
        { structure: "Trophic Level", role: "An organism's feeding position" },
      ],
    },
  },
  {
    chapterTitle: "Management of Natural Resources",
    title: "The Depleting Reservoir",
    intro_text:
      "A town's main water reservoir has dropped to a third of its usual level mid-year. The municipal board needs to trace what sustainable steps were skipped.",
    mission_text:
      "Trace the resource-management process to find which sustainable step got skipped.",
    dragdrop: {
      prompt: "Trace the Sustainable Management Process",
      clue_text:
        "Arrange the steps of managing a natural resource sustainably.",
      items: [
        "Assess Resource Use",
        "Reduce Wastage",
        "Reuse and Recycle",
        "Monitor and Conserve",
      ],
    },
    matching: {
      prompt: "Match the Practice to Its Meaning",
      clue_text: "Confirm what each conservation practice actually involves.",
      pairs: [
        { structure: "Reduce", role: "Using less of a resource" },
        { structure: "Reuse", role: "Using an item again" },
        { structure: "Recycle", role: "Converting waste into new material" },
        { structure: "Afforestation", role: "Planting new forests" },
      ],
    },
  },

  // ---------------- GRADE 11 ----------------
  {
    chapterTitle: "The Living World",
    title: "Is It Alive?",
    intro_text:
      "A dormant seed shows no visible movement or activity, yet biologists insist it's alive. A student is asked to trace what actually qualifies something as 'living.'",
    mission_text:
      "Run through the checks that define life and confirm whether this dormant seed actually qualifies as living.",
    dragdrop: {
      prompt: "Trace the Checks for Life",
      clue_text:
        "Arrange the checks a biologist runs, in a logical investigative order.",
      items: [
        "Check for Metabolism",
        "Check for Growth",
        "Check for Response to Stimuli",
        "Check for Reproduction",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each classification term before using it.",
      pairs: [
        { structure: "Taxonomy", role: "Study of classification" },
        {
          structure: "Systematics",
          role: "Study of diversity and relationships",
        },
        { structure: "Nomenclature", role: "System of naming organisms" },
        {
          structure: "Binomial Nomenclature",
          role: "Two-part scientific name",
        },
      ],
    },
  },
  {
    chapterTitle: "Biological Classification",
    title: "The Sample With No Kingdom",
    intro_text:
      "A microbiology sample doesn't fit neatly into 'plant' or 'animal.' The lab needs to trace it through the five-kingdom system to place it correctly.",
    mission_text:
      "Trace the sample through the five-kingdom system to place it in the kingdom it actually belongs to.",
    dragdrop: {
      prompt: "Arrange the Five Kingdoms by Complexity",
      clue_text:
        "Order the kingdoms from simplest to most complex cell organization.",
      items: ["Monera", "Protista", "Fungi", "Plantae"],
    },
    matching: {
      prompt: "Match the Kingdom to Its Example",
      clue_text: "Confirm which kingdom each organism belongs to.",
      pairs: [
        { structure: "Monera", role: "Bacteria" },
        { structure: "Protista", role: "Amoeba" },
        { structure: "Fungi", role: "Mushroom" },
        { structure: "Plantae", role: "Moss" },
      ],
    },
  },
  {
    chapterTitle: "Plant Kingdom",
    title: "The Seedless Plant",
    intro_text:
      "A botanist finds a plant that reproduces without ever producing a seed. To identify its group, she needs to trace where it fits in plant evolution.",
    mission_text:
      "Trace plant evolutionary order to find out which group this seedless plant belongs to.",
    dragdrop: {
      prompt: "Trace Plant Evolutionary Order",
      clue_text: "Arrange these plant groups from earliest to most evolved.",
      items: ["Algae", "Bryophytes", "Pteridophytes", "Gymnosperms"],
    },
    matching: {
      prompt: "Match the Group to Its Feature",
      clue_text: "Confirm the defining feature of each plant group.",
      pairs: [
        { structure: "Algae", role: "Simple aquatic photosynthesizers" },
        { structure: "Bryophytes", role: "Amphibians of the plant kingdom" },
        {
          structure: "Pteridophytes",
          role: "First plants with vascular tissue",
        },
        { structure: "Gymnosperms", role: "Produce naked seeds" },
      ],
    },
  },
  {
    chapterTitle: "Animal Kingdom",
    title: "The Unclassified Invertebrate",
    intro_text:
      "A marine survey team pulls up a soft-bodied invertebrate they can't immediately place. They need to trace its body plan through increasing complexity to find its phylum.",
    mission_text:
      "Trace body-plan complexity across the phyla to identify which one this invertebrate belongs to.",
    dragdrop: {
      prompt: "Trace Body-Plan Complexity",
      clue_text:
        "Arrange these animal phyla from simplest to more complex body organization.",
      items: ["Porifera", "Cnidaria", "Platyhelminthes", "Annelida"],
    },
    matching: {
      prompt: "Match the Phylum to Its Feature",
      clue_text: "Confirm the defining feature of each phylum.",
      pairs: [
        { structure: "Porifera", role: "Body full of pores" },
        { structure: "Cnidaria", role: "Has stinging cells" },
        { structure: "Mollusca", role: "Soft body, often with a shell" },
        { structure: "Chordata", role: "Has a notochord" },
      ],
    },
  },
  {
    chapterTitle: "Morphology of Flowering Plants",
    title: "The Mislabeled Specimen",
    intro_text:
      "A herbarium specimen has lost its label, and its parts have been mixed up in storage. A student needs to trace which structure belongs where on the plant.",
    mission_text:
      "Trace the plant's body plan to figure out which structure each mixed-up part actually is.",
    dragdrop: {
      prompt: "Trace the Plant Body Plan",
      clue_text:
        "Arrange these structures from the below-ground part to the reproductive part.",
      items: ["Root", "Stem", "Leaf", "Flower"],
    },
    matching: {
      prompt: "Match the Part to Its Function",
      clue_text: "Confirm what each plant part is actually for.",
      pairs: [
        { structure: "Root", role: "Absorption and anchorage" },
        { structure: "Stem", role: "Support and transport" },
        { structure: "Leaf", role: "Site of photosynthesis" },
        { structure: "Flower", role: "Reproductive structure" },
      ],
    },
  },
  {
    chapterTitle: "Anatomy of Flowering Plants",
    title: "The Cross-Section Puzzle",
    intro_text:
      "A cross-section of a plant stem under the microscope shows several distinct layers, but the slide's labels are missing. A student needs to trace the layers from outside in.",
    mission_text:
      "Trace the stem's tissue layers from outside to center to identify each unlabeled layer.",
    dragdrop: {
      prompt: "Trace the Stem Cross-Section",
      clue_text:
        "Arrange these tissue layers from the outside of the stem to the center.",
      items: ["Epidermis", "Cortex", "Vascular Bundle", "Pith"],
    },
    matching: {
      prompt: "Match the Tissue to Its Function",
      clue_text: "Confirm what each tissue layer does.",
      pairs: [
        { structure: "Epidermis", role: "Protects the outer surface" },
        { structure: "Cortex", role: "Stores food material" },
        { structure: "Xylem", role: "Transports water" },
        { structure: "Phloem", role: "Transports food" },
      ],
    },
  },
  {
    chapterTitle: "Cell: The Unit of Life",
    title: "The Cell With No Nucleus",
    intro_text:
      "Two cell samples are placed side by side — one has a clearly visible nucleus, the other doesn't. A student needs to trace the internal organization to tell them apart.",
    mission_text:
      "Trace each cell's internal organization to tell the two samples apart.",
    dragdrop: {
      prompt: "Trace the Secretory Pathway",
      clue_text:
        "Arrange the path a protein takes through a eukaryotic cell before export.",
      items: [
        "Nucleus",
        "Rough Endoplasmic Reticulum",
        "Golgi Apparatus",
        "Cell Membrane",
      ],
    },
    matching: {
      prompt: "Match the Organelle to Its Function",
      clue_text:
        "Confirm each organelle's role before you decide the cell type.",
      pairs: [
        { structure: "Mitochondria", role: "Produces ATP" },
        { structure: "Ribosome", role: "Synthesizes proteins" },
        { structure: "Lysosome", role: "Digests waste material" },
        {
          structure: "Golgi Apparatus",
          role: "Packages and dispatches proteins",
        },
      ],
    },
  },
  {
    chapterTitle: "Biomolecules",
    title: "The Unidentified Sample",
    intro_text:
      "A biochemistry lab receives an unlabeled organic sample. A series of tests needs to trace which biomolecule it's built from, based on its building blocks.",
    mission_text:
      "Trace how the sample's building blocks assemble to identify which biomolecule it is.",
    dragdrop: {
      prompt: "Trace How a Protein Is Built",
      clue_text: "Arrange the stages of protein assembly in order.",
      items: [
        "Amino Acids",
        "Peptide Bond Formation",
        "Polypeptide Chain",
        "Folded Protein",
      ],
    },
    matching: {
      prompt: "Match the Biomolecule to Its Building Block",
      clue_text: "Confirm what each biomolecule is made of.",
      pairs: [
        { structure: "Protein", role: "Made of amino acids" },
        { structure: "Carbohydrate", role: "Made of monosaccharides" },
        { structure: "Nucleic Acid", role: "Made of nucleotides" },
        { structure: "Fat", role: "Made of fatty acids and glycerol" },
      ],
    },
  },
  {
    chapterTitle: "Cell Cycle and Cell Division",
    title: "The Cell That Won't Stop Dividing",
    intro_text:
      "A tissue sample under the microscope shows cells dividing far more often than normal. A researcher needs to trace the cell cycle to see where the control is breaking down.",
    mission_text:
      "Trace the cell cycle phase by phase to find where the division control is breaking down.",
    dragdrop: {
      prompt: "Trace the Cell Cycle",
      clue_text: "Arrange the phases of the cell cycle in order.",
      items: ["G1 Phase", "S Phase", "G2 Phase", "M Phase"],
    },
    matching: {
      prompt: "Match the Mitotic Stage to Its Event",
      clue_text: "Confirm what happens at each stage of mitosis.",
      pairs: [
        { structure: "Prophase", role: "Chromatin condenses into chromosomes" },
        { structure: "Metaphase", role: "Chromosomes align at the center" },
        { structure: "Anaphase", role: "Chromatids separate" },
        { structure: "Telophase", role: "Nuclear envelope reforms" },
      ],
    },
  },
  {
    chapterTitle: "Transport in Plants",
    title: "The Thirsty Tree",
    intro_text:
      "A tall tree in a botanical garden shows leaves wilting at the top first, even with wet soil. A botanist needs to trace how water moves against gravity to find the fault.",
    mission_text:
      "Trace water's upward journey through the tree to find where the fault is happening.",
    dragdrop: {
      prompt: "Trace the Water's Journey Upward",
      clue_text: "Arrange the stages water passes through to reach the leaves.",
      items: ["Soil", "Root Hair", "Xylem", "Leaf"],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each transport term before diagnosing the tree.",
      pairs: [
        { structure: "Osmosis", role: "Water movement across a membrane" },
        { structure: "Transpiration", role: "Water loss from leaves" },
        { structure: "Translocation", role: "Food transport in phloem" },
        { structure: "Water Potential", role: "Tendency of water to move" },
      ],
    },
  },
  {
    chapterTitle: "Mineral Nutrition",
    title: "The Yellowing Leaves",
    intro_text:
      "A greenhouse crop is showing yellowing leaves despite regular watering. An agronomist needs to trace which mineral deficiency is behind the symptom.",
    mission_text:
      "Trace the diagnostic process to identify which mineral deficiency is causing the yellowing.",
    dragdrop: {
      prompt: "Trace the Diagnostic Process",
      clue_text: "Arrange the steps taken to diagnose a mineral deficiency.",
      items: [
        "Observe Symptoms",
        "Test the Soil",
        "Identify Missing Element",
        "Apply Correct Fertilizer",
      ],
    },
    matching: {
      prompt: "Match the Element to Its Deficiency Symptom",
      clue_text: "Confirm which element is missing based on the symptom.",
      pairs: [
        { structure: "Nitrogen", role: "Yellowing of leaves" },
        { structure: "Magnesium", role: "Chlorosis between veins" },
        { structure: "Potassium", role: "Curling of leaf edges" },
        { structure: "Calcium", role: "Stunted growth" },
      ],
    },
  },
  {
    chapterTitle: "Photosynthesis in Higher Plants",
    title: "The Plant That Won't Grow",
    intro_text:
      "A potted plant kept indoors under dim light has stopped growing, despite regular watering. A student needs to trace the light reaction pathway to find what's missing.",
    mission_text:
      "Trace the light reaction step by step to find what's missing in this plant's growth process.",
    dragdrop: {
      prompt: "Trace the Light Reaction",
      clue_text: "Arrange the stages of the light reaction in order.",
      items: [
        "Light Absorption",
        "Water Splitting",
        "ATP and NADPH Formation",
        "Calvin Cycle",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Role",
      clue_text: "Confirm what each photosynthesis structure or term does.",
      pairs: [
        { structure: "Chlorophyll", role: "Absorbs light energy" },
        { structure: "Stomata", role: "Site of gas exchange" },
        { structure: "Thylakoid", role: "Site of the light reaction" },
        { structure: "Stroma", role: "Site of the Calvin cycle" },
      ],
    },
  },
  {
    chapterTitle: "Respiration in Plants",
    title: "The Seed That Won't Sprout",
    intro_text:
      "A batch of seeds soaked overnight still refuses to sprout, even with adequate warmth and moisture. A student needs to trace the respiration pathway to find where energy production is failing.",
    mission_text:
      "Trace aerobic respiration stage by stage to find where energy production is failing.",
    dragdrop: {
      prompt: "Trace Aerobic Respiration",
      clue_text: "Arrange the stages of aerobic respiration in order.",
      items: [
        "Glycolysis",
        "Krebs Cycle",
        "Electron Transport Chain",
        "ATP Formation",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Role",
      clue_text: "Confirm where each respiration process actually occurs.",
      pairs: [
        { structure: "Glycolysis", role: "Occurs in the cytoplasm" },
        {
          structure: "Krebs Cycle",
          role: "Occurs in the mitochondrial matrix",
        },
        {
          structure: "Electron Transport Chain",
          role: "Produces most of the ATP",
        },
        { structure: "Fermentation", role: "Anaerobic pathway" },
      ],
    },
  },
  {
    chapterTitle: "Plant Growth and Development",
    title: "The Plant That Won't Flower",
    intro_text:
      "A crop that usually flowers on schedule hasn't bloomed this season, despite healthy leaf growth. A researcher needs to trace the growth and hormone pathway to find the block.",
    mission_text:
      "Trace the growth and hormone pathway to find what's blocking flowering this season.",
    dragdrop: {
      prompt: "Trace the Growth Sequence",
      clue_text: "Arrange the stages of plant growth in order.",
      items: [
        "Cell Division",
        "Cell Elongation",
        "Cell Differentiation",
        "Maturation",
      ],
    },
    matching: {
      prompt: "Match the Hormone to Its Function",
      clue_text: "Confirm what each plant hormone actually does.",
      pairs: [
        { structure: "Auxin", role: "Promotes cell elongation" },
        { structure: "Gibberellin", role: "Promotes stem growth" },
        { structure: "Cytokinin", role: "Promotes cell division" },
        { structure: "Abscisic Acid", role: "Triggers stress response" },
      ],
    },
  },
  {
    chapterTitle: "Digestion and Absorption",
    title: "The Missing Nutrients",
    intro_text:
      "A patient shows signs of nutrient deficiency despite eating a full diet. A doctor needs to trace the digestive pathway to find where absorption is failing.",
    mission_text:
      "Trace the digestive pathway organ by organ to find where absorption is failing.",
    dragdrop: {
      prompt: "Trace the Digestive Pathway",
      clue_text: "Arrange the organs food passes through in order.",
      items: ["Mouth", "Stomach", "Small Intestine", "Large Intestine"],
    },
    matching: {
      prompt: "Match the Organ to Its Role",
      clue_text: "Confirm what each digestive organ contributes.",
      pairs: [
        { structure: "Stomach", role: "Pepsin digests protein here" },
        { structure: "Liver", role: "Produces bile" },
        { structure: "Pancreas", role: "Produces digestive enzymes" },
        { structure: "Small Intestine", role: "Main site of absorption" },
      ],
    },
  },
  {
    chapterTitle: "Breathing and Exchange of Gases",
    title: "The Breathless Climber",
    intro_text:
      "A hiker at high altitude starts breathing rapidly and feels dizzy despite no physical injury. A doctor needs to trace the breathing pathway to explain the distress.",
    mission_text:
      "Trace the airflow route to explain why the hiker is struggling to breathe at altitude.",
    dragdrop: {
      prompt: "Trace the Airflow Route",
      clue_text:
        "Arrange the structures air passes through before reaching the blood.",
      items: ["Nose", "Trachea", "Bronchi", "Alveoli"],
    },
    matching: {
      prompt: "Match the Term to Its Role",
      clue_text: "Confirm what each part of the respiratory system does.",
      pairs: [
        { structure: "Diaphragm", role: "Main muscle of breathing" },
        { structure: "Alveoli", role: "Site of gas exchange" },
        { structure: "Hemoglobin", role: "Carries oxygen in blood" },
        { structure: "Residual Volume", role: "Air left after full exhale" },
      ],
    },
  },
  {
    chapterTitle: "Body Fluids and Circulation",
    title: "The Irregular Heartbeat",
    intro_text:
      "A patient's heartbeat is irregular during a routine check-up. A doctor needs to trace the cardiac cycle to find where the rhythm is breaking down.",
    mission_text:
      "Trace the cardiac cycle stage by stage to find where the rhythm is breaking down.",
    dragdrop: {
      prompt: "Trace the Cardiac Cycle",
      clue_text: "Arrange the stages of one heartbeat in order.",
      items: [
        "Blood Enters the Atria",
        "Atria Contract",
        "Ventricles Contract",
        "Blood Pumped Out",
      ],
    },
    matching: {
      prompt: "Match the Blood Component to Its Function",
      clue_text: "Confirm what each blood component actually does.",
      pairs: [
        { structure: "Platelets", role: "Help blood clot" },
        { structure: "Red Blood Cells", role: "Carry oxygen" },
        { structure: "White Blood Cells", role: "Provide immunity" },
        { structure: "Plasma", role: "Carries nutrients and waste" },
      ],
    },
  },
  {
    chapterTitle: "Excretory Products and their Elimination",
    title: "The Concentrated Urine",
    intro_text:
      "A patient's urine test shows unusually high waste concentration. A doctor needs to trace the filtering process inside the kidney to find where it's going wrong.",
    mission_text:
      "Trace urine formation through the nephron to find where the filtering process is going wrong.",
    dragdrop: {
      prompt: "Trace Urine Formation",
      clue_text:
        "Arrange the stages of urine formation in the nephron in order.",
      items: ["Filtration", "Reabsorption", "Secretion", "Urine Formed"],
    },
    matching: {
      prompt: "Match the Structure to Its Function",
      clue_text: "Confirm what each excretory structure does.",
      pairs: [
        { structure: "Nephron", role: "Functional unit of the kidney" },
        { structure: "Glomerulus", role: "Filters the blood" },
        { structure: "Bowman's Capsule", role: "Collects the filtrate" },
        { structure: "Ureter", role: "Carries urine to the bladder" },
      ],
    },
  },
  {
    chapterTitle: "Locomotion and Movement",
    title: "The Weak Grip",
    intro_text:
      "An athlete notices sudden weakness in his grip during training, with no visible injury. A physiotherapist needs to trace the muscle contraction pathway to find the cause.",
    mission_text:
      "Trace the muscle contraction pathway to find what's causing the sudden weakness.",
    dragdrop: {
      prompt: "Trace Muscle Contraction",
      clue_text: "Arrange the steps of a muscle contraction in order.",
      items: [
        "Nerve Impulse Arrives",
        "Calcium Released",
        "Actin-Myosin Binding",
        "Muscle Contracts",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Function",
      clue_text:
        "Confirm what each structure in the musculoskeletal system does.",
      pairs: [
        { structure: "Actin", role: "Thin filament in muscle" },
        { structure: "Myosin", role: "Thick filament in muscle" },
        { structure: "Tendon", role: "Attaches muscle to bone" },
        { structure: "Ligament", role: "Attaches bone to bone" },
      ],
    },
  },
  {
    chapterTitle: "Neural Control and Coordination",
    title: "The Delayed Response",
    intro_text:
      "A patient takes noticeably longer than normal to react to a touch stimulus during a check-up. A neurologist needs to trace the nerve impulse pathway to locate the delay.",
    mission_text:
      "Trace the nerve impulse pathway to locate exactly where the delay is happening.",
    dragdrop: {
      prompt: "Trace the Nerve Impulse",
      clue_text:
        "Arrange the stages of a nerve impulse reaching the brain, in order.",
      items: [
        "Stimulus",
        "Receptor",
        "Sensory Neuron",
        "Brain Processes Signal",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Function",
      clue_text: "Confirm what each neuron part does.",
      pairs: [
        { structure: "Dendrite", role: "Receives the signal" },
        { structure: "Axon", role: "Transmits the signal" },
        { structure: "Synapse", role: "Junction between two neurons" },
        {
          structure: "Neurotransmitter",
          role: "Chemical messenger at the synapse",
        },
      ],
    },
  },
  {
    chapterTitle: "Chemical Coordination and Integration",
    title: "The Growth Spurt That Didn't Stop",
    intro_text:
      "A teenager has grown unusually tall compared to their peers, faster than expected. A doctor needs to trace the hormone pathway responsible for growth to find the cause.",
    mission_text:
      "Trace the hormone pathway responsible for growth to find what's driving this spurt.",
    dragdrop: {
      prompt: "Trace How a Hormone Acts",
      clue_text: "Arrange the steps of hormone action in order.",
      items: [
        "Gland Secretes Hormone",
        "Hormone Travels in Blood",
        "Binds to Receptor",
        "Target Cell Responds",
      ],
    },
    matching: {
      prompt: "Match the Gland to Its Hormone",
      clue_text: "Confirm which gland releases which hormone.",
      pairs: [
        { structure: "Pituitary Gland", role: "Releases Growth Hormone" },
        { structure: "Thyroid Gland", role: "Releases Thyroxine" },
        { structure: "Pancreas", role: "Releases Insulin" },
        { structure: "Adrenal Gland", role: "Releases Adrenaline" },
      ],
    },
  },

  // ---------------- GRADE 12 ----------------
  {
    chapterTitle: "Sexual Reproduction in Flowering Plants",
    title: "The Fruit That Never Formed",
    intro_text:
      "A flowering plant was pollinated on schedule this season, but no fruit ever developed. A botanist needs to trace the fertilization process to find where it stalled.",
    mission_text:
      "Trace the fertilization process from pollination onward to find where it stalled.",
    dragdrop: {
      prompt: "Trace Fertilization in a Flower",
      clue_text: "Arrange the events from pollination to seed formation.",
      items: [
        "Pollination",
        "Pollen Tube Growth",
        "Fertilization",
        "Seed Formation",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each reproductive term before diagnosing the plant.",
      pairs: [
        { structure: "Self-Pollination", role: "Pollen from the same flower" },
        {
          structure: "Cross-Pollination",
          role: "Pollen from a different plant",
        },
        {
          structure: "Double Fertilization",
          role: "Unique to flowering plants",
        },
        { structure: "Endosperm", role: "Nourishes the developing embryo" },
      ],
    },
  },
  {
    chapterTitle: "Human Reproduction",
    title: "The Delayed Pregnancy",
    intro_text:
      "A couple trying to conceive for over a year is referred for evaluation. A doctor needs to trace the reproductive pathway from gamete formation to implantation to identify where things might be going wrong.",
    mission_text:
      "Trace the reproductive pathway from gamete formation to implantation to identify where things might be going wrong.",
    dragdrop: {
      prompt: "Trace the Reproductive Pathway",
      clue_text: "Arrange the stages from gamete formation to birth in order.",
      items: ["Gamete Formation", "Fertilization", "Implantation", "Birth"],
    },
    matching: {
      prompt: "Match the Organ to Its Function",
      clue_text: "Confirm what each reproductive organ does.",
      pairs: [
        { structure: "Ovary", role: "Produces eggs" },
        { structure: "Testis", role: "Produces sperm" },
        { structure: "Uterus", role: "Site of embryo development" },
        { structure: "Placenta", role: "Nourishes the fetus" },
      ],
    },
  },
  {
    chapterTitle: "Reproductive Health",
    title: "The Awareness Gap",
    intro_text:
      "A community health survey finds many young adults confusing basic reproductive health terms. A health worker needs to trace the correct process, from awareness to treatment.",
    mission_text:
      "Trace the reproductive health process from awareness to treatment and clear up the confusion.",
    dragdrop: {
      prompt: "Trace the Reproductive Health Process",
      clue_text:
        "Arrange the stages of a reproductive health program in order.",
      items: ["Awareness", "Prevention", "Screening", "Treatment"],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each reproductive health term.",
      pairs: [
        { structure: "Contraception", role: "Prevents pregnancy" },
        { structure: "STD", role: "Sexually transmitted disease" },
        { structure: "MTP", role: "Medical termination of pregnancy" },
        { structure: "ART", role: "Assisted reproductive technology" },
      ],
    },
  },
  {
    chapterTitle: "Principles of Inheritance and Variation",
    title: "The Recurring Trait",
    intro_text:
      "In a family with no history of a certain trait, it suddenly appears in a grandchild. A geneticist needs to trace the cross pattern across generations to explain it.",
    mission_text:
      "Trace the genetic cross across generations to explain why this trait resurfaced.",
    dragdrop: {
      prompt: "Trace a Genetic Cross",
      clue_text: "Arrange the stages of a Mendelian cross in order.",
      items: [
        "Parental Cross",
        "F1 Generation",
        "Self-Cross",
        "F2 Generation Ratio",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text:
        "Confirm each genetics term before tracing the pattern further.",
      pairs: [
        { structure: "Genotype", role: "An organism's genetic makeup" },
        { structure: "Phenotype", role: "An organism's observable trait" },
        { structure: "Homozygous", role: "Two identical alleles" },
        { structure: "Heterozygous", role: "Two different alleles" },
      ],
    },
  },
  {
    chapterTitle: "Molecular Basis of Inheritance",
    title: "The Faulty Protein",
    intro_text:
      "A cell is producing a malformed protein that doesn't function correctly. A molecular biologist needs to trace the process from DNA to protein to find where the error occurred.",
    mission_text:
      "Trace the process from DNA to protein to find where the error occurred.",
    dragdrop: {
      prompt: "Trace the Central Dogma",
      clue_text: "Arrange the steps from DNA to a functioning protein.",
      items: [
        "DNA Replication",
        "Transcription",
        "Translation",
        "Protein Formed",
      ],
    },
    matching: {
      prompt: "Match the Molecule to Its Function",
      clue_text:
        "Confirm what each molecule in protein synthesis actually does.",
      pairs: [
        { structure: "DNA", role: "Stores genetic information" },
        { structure: "mRNA", role: "Carries the genetic message" },
        { structure: "tRNA", role: "Brings amino acids to the ribosome" },
        { structure: "Ribosome", role: "Site of translation" },
      ],
    },
  },
  {
    chapterTitle: "Evolution",
    title: "The Changing Population",
    intro_text:
      "Over several generations, a moth population has shifted from mostly light-colored to mostly dark-colored. A biologist needs to trace the process behind the shift.",
    mission_text:
      "Trace how this new trait spread through the population, generation by generation.",
    dragdrop: {
      prompt: "Trace How a New Trait Spreads",
      clue_text:
        "Arrange the stages of evolution by natural selection in order.",
      items: [
        "Variation Arises",
        "Natural Selection Acts",
        "Favorable Traits Increase",
        "Population Changes",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each evolution term before drawing conclusions.",
      pairs: [
        { structure: "Natural Selection", role: "Survival of the fittest" },
        { structure: "Adaptation", role: "A trait suited to the environment" },
        { structure: "Speciation", role: "Formation of a new species" },
        { structure: "Fossil", role: "Evidence of past life" },
      ],
    },
  },
  {
    chapterTitle: "Human Health and Disease",
    title: "The Body's Defense",
    intro_text:
      "A patient recovers quickly from an infection that made a family member seriously ill. A doctor needs to trace the immune response to explain the difference.",
    mission_text:
      "Trace the immune response to explain why one patient recovered so much faster.",
    dragdrop: {
      prompt: "Trace the Immune Response",
      clue_text:
        "Arrange the stages of an immune response to infection in order.",
      items: [
        "Pathogen Enters",
        "Antigen Detected",
        "Antibody Produced",
        "Pathogen Destroyed",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each immunity term before continuing.",
      pairs: [
        { structure: "Antigen", role: "A foreign substance" },
        { structure: "Antibody", role: "A protein that fights antigens" },
        { structure: "Vaccine", role: "Induces immunity in advance" },
        { structure: "Pathogen", role: "A disease-causing organism" },
      ],
    },
  },
  {
    chapterTitle: "Microbes in Human Welfare",
    title: "The Fermented Batch",
    intro_text:
      "A batch of milk left out overnight has turned into curd, and no one added anything to it. A food scientist needs to trace the microbial process responsible.",
    mission_text:
      "Trace the microbial process responsible for turning the milk into curd overnight.",
    dragdrop: {
      prompt: "Trace the Fermentation Process",
      clue_text: "Arrange the stages of microbial fermentation in order.",
      items: [
        "Raw Material",
        "Microbes Introduced",
        "Fermentation Occurs",
        "Product Formed",
      ],
    },
    matching: {
      prompt: "Match the Microbe to Its Use",
      clue_text: "Confirm what each microbe is used for.",
      pairs: [
        { structure: "Lactobacillus", role: "Converts milk into curd" },
        { structure: "Yeast", role: "Used in bread and alcohol production" },
        { structure: "Rhizobium", role: "Fixes nitrogen in soil" },
        { structure: "Methanogens", role: "Produce biogas" },
      ],
    },
  },
  {
    chapterTitle: "Biotechnology: Principles and Processes",
    title: "The Custom-Built Gene",
    intro_text:
      "A lab has successfully inserted a useful gene from one organism into another. A student needs to trace the recombinant DNA process step by step.",
    mission_text:
      "Trace the recombinant DNA process step by step to see how the gene was inserted.",
    dragdrop: {
      prompt: "Trace Recombinant DNA Technology",
      clue_text:
        "Arrange the steps of creating a recombinant organism in order.",
      items: [
        "Isolate the Gene",
        "Cut with Restriction Enzyme",
        "Insert into Vector",
        "Transfer into Host",
      ],
    },
    matching: {
      prompt: "Match the Tool to Its Function",
      clue_text: "Confirm what each biotechnology tool does.",
      pairs: [
        { structure: "Restriction Enzyme", role: "Cuts DNA at specific sites" },
        { structure: "Vector", role: "Carries the gene into a host" },
        { structure: "Plasmid", role: "A commonly used vector" },
        { structure: "PCR", role: "Amplifies a DNA sample" },
      ],
    },
  },
  {
    chapterTitle: "Biotechnology and its Applications",
    title: "The Pest-Resistant Crop",
    intro_text:
      "A cotton crop this season has resisted a pest outbreak that destroyed neighboring fields. An agricultural scientist needs to trace how the crop was engineered to resist it.",
    mission_text:
      "Trace how the crop was engineered, step by step, to resist this season's pest outbreak.",
    dragdrop: {
      prompt: "Trace How a Transgenic Crop Is Made",
      clue_text:
        "Arrange the steps of creating a transgenic organism in order.",
      items: [
        "Identify Useful Gene",
        "Insert Gene into Organism",
        "Confirm Gene Expression",
        "Test the New Trait",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Example",
      clue_text:
        "Confirm what each biotechnology application actually refers to.",
      pairs: [
        { structure: "Bt Cotton", role: "A pest-resistant crop" },
        { structure: "Golden Rice", role: "Enriched with Vitamin A" },
        { structure: "Gene Therapy", role: "Treats a genetic disorder" },
        { structure: "Transgenic Animal", role: "Carries a foreign gene" },
      ],
    },
  },
  {
    chapterTitle: "Organisms and Populations",
    title: "The Sudden Population Boom",
    intro_text:
      "A pond's fish population has grown far faster than expected this season. An ecologist needs to trace the growth pattern to understand why.",
    mission_text:
      "Trace the population growth stages to understand why the boom happened so fast.",
    dragdrop: {
      prompt: "Trace Population Growth Stages",
      clue_text: "Arrange the stages of population growth in order.",
      items: [
        "Lag Phase",
        "Exponential Phase",
        "Stationary Phase",
        "Decline Phase",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each population term before drawing conclusions.",
      pairs: [
        { structure: "Natality", role: "Birth rate of a population" },
        { structure: "Mortality", role: "Death rate of a population" },
        {
          structure: "Carrying Capacity",
          role: "Maximum sustainable population size",
        },
        { structure: "Population Density", role: "Individuals per unit area" },
      ],
    },
  },
  {
    chapterTitle: "Ecosystem",
    title: "The Disrupted Energy Flow",
    intro_text:
      "A forest ecosystem is showing an unusual buildup of dead plant matter that isn't breaking down. An ecologist needs to trace the flow of energy to find the missing link.",
    mission_text:
      "Trace the flow of energy through the ecosystem to find the missing link.",
    dragdrop: {
      prompt: "Trace the Flow of Energy",
      clue_text:
        "Arrange the stages of energy flow through an ecosystem in order.",
      items: [
        "Sunlight",
        "Producers",
        "Primary Consumers",
        "Secondary Consumers",
      ],
    },
    matching: {
      prompt: "Match the Term to Its Meaning",
      clue_text: "Confirm each ecosystem term before diagnosing the problem.",
      pairs: [
        { structure: "Producer", role: "Makes its own food" },
        { structure: "Decomposer", role: "Breaks down dead organic matter" },
        { structure: "Food Web", role: "Interconnected food chains" },
        {
          structure: "Ecological Pyramid",
          role: "Shows energy or biomass flow",
        },
      ],
    },
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of CASES) {
    const chapter = await Chapter.findOne({ title: c.chapterTitle });
    if (!chapter) {
      console.warn(`Chapter not found, skipping: "${c.chapterTitle}"`);
      skipped++;
      continue;
    }

    let concepts = await Concept.find({ chapter_id: chapter._id });
    if (c.conceptTitles && c.conceptTitles.length > 0) {
      concepts = concepts.filter((cn) => c.conceptTitles.includes(cn.title));
    }

    if (concepts.length === 0) {
      console.warn(
        `No matching concepts for chapter, skipping: "${c.chapterTitle}"`,
      );
      skipped++;
      continue;
    }

    const doc = {
      title: c.title,
      intro_text: c.intro_text,
      concept_ids: concepts.map((cn) => cn._id),
      clue_count: c.clue_count || 3,
      dragdrop_task: {
        prompt: c.dragdrop.prompt,
        clue_text: c.dragdrop.clue_text,
        items: c.dragdrop.items,
      },
      matching_task: {
        prompt: c.matching.prompt,
        clue_text: c.matching.clue_text,
        pairs: c.matching.pairs,
      },
    };

    const existing = await Case.findOne({ title: c.title });
    if (existing) {
      await Case.updateOne({ _id: existing._id }, { $set: doc });
      updated++;
    } else {
      await Case.create(doc);
      created++;
    }
  }

  console.log(
    `Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`,
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
