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

  // ---------- CHAPTER 10: Transport in Plants ----------
  const ch10 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Plant Physiology",
    title: "Transport in Plants",
    order_index: 10,
  });

  const c10a = await Concept.create({
    chapter_id: ch10._id,
    title: "Diffusion, Osmosis, and Water Potential",
    explanation_text:
      "Diffusion is passive movement of molecules along a concentration gradient; osmosis is water movement across a membrane; water potential determines the direction of water movement between cells.",
  });
  const c10b = await Concept.create({
    chapter_id: ch10._id,
    title: "Long-Distance Transport of Water (Xylem)",
    explanation_text:
      "Water moves from roots to leaves through xylem, driven mainly by transpiration pull, aided by root pressure and the cohesive-tensile properties of water (cohesion-tension theory).",
  });
  const c10c = await Concept.create({
    chapter_id: ch10._id,
    title: "Transpiration and Translocation (Phloem)",
    explanation_text:
      "Transpiration is water loss through stomata, driving the transpiration pull; translocation moves food (mainly sucrose) through the phloem via the pressure flow (mass flow) hypothesis.",
  });

  await Question.insertMany([
    {
      concept_id: c10a._id,
      question_text: "Diffusion refers to the movement of molecules from a region of:",
      options: [
        { id: "a", text: "Lower to higher concentration" },
        { id: "b", text: "Higher to lower concentration" },
        { id: "c", text: "Equal concentration only" },
        { id: "d", text: "No movement occurs" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Diffusion is the passive, spontaneous movement of molecules from a region of higher concentration to a region of lower concentration, requiring no energy input.",
      difficulty: "easy",
    },
    {
      concept_id: c10a._id,
      question_text: "Osmosis is defined as the movement of:",
      options: [
        { id: "a", text: "Solute molecules through a membrane" },
        { id: "b", text: "Water molecules across a selectively permeable membrane" },
        { id: "c", text: "Gases only" },
        { id: "d", text: "Proteins across the cytoplasm" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Osmosis is the passive movement of water molecules from a region of higher water potential to lower water potential, across a selectively permeable membrane.",
      difficulty: "medium",
    },
    {
      concept_id: c10a._id,
      question_text: "Water potential of pure water at standard conditions is taken to be:",
      options: [
        { id: "a", text: "Zero" },
        { id: "b", text: "Negative" },
        { id: "c", text: "Always positive" },
        { id: "d", text: "Undefined" },
      ],
      correct_option_id: "a",
      explanation_text:
        "By convention, the water potential of pure water at standard temperature and pressure is taken as zero, serving as the reference point for comparing solutions.",
      difficulty: "hard",
    },
    {
      concept_id: c10a._id,
      question_text: "When plant cells are placed in a hypertonic solution, water moves out of the cell, causing the cell to:",
      options: [
        { id: "a", text: "Swell" },
        { id: "b", text: "Plasmolyze (shrink)" },
        { id: "c", text: "Remain unchanged" },
        { id: "d", text: "Burst" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In a hypertonic solution, water potential outside the cell is lower, so water moves out of the cell by osmosis, causing the protoplast to shrink — plasmolysis.",
      difficulty: "medium",
    },
    {
      concept_id: c10a._id,
      question_text: "Water potential is influenced by two main components: solute potential and:",
      options: [
        { id: "a", text: "Pressure potential" },
        { id: "b", text: "Gravitational potential only" },
        { id: "c", text: "Osmotic pressure only" },
        { id: "d", text: "Temperature only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Water potential is the sum of solute potential (effect of dissolved solutes) and pressure potential (effect of physical pressure, such as turgor pressure).",
      difficulty: "hard",
    },
    {
      concept_id: c10a._id,
      question_text: "The process by which large molecules move across the cell membrane with the help of carrier proteins, without requiring energy, is called:",
      options: [
        { id: "a", text: "Facilitated diffusion" },
        { id: "b", text: "Active transport" },
        { id: "c", text: "Osmosis" },
        { id: "d", text: "Endocytosis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Facilitated diffusion is a passive process where molecules move across the membrane with the help of carrier or channel proteins, following the concentration gradient without using energy.",
      difficulty: "hard",
    },

    {
      concept_id: c10b._id,
      question_text: "The tissue mainly responsible for the long-distance transport of water in plants is:",
      options: [
        { id: "a", text: "Phloem" },
        { id: "b", text: "Xylem" },
        { id: "c", text: "Epidermis" },
        { id: "d", text: "Cortex" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Xylem is the vascular tissue primarily responsible for conducting water and dissolved minerals from the roots upward to the rest of the plant.",
      difficulty: "easy",
    },
    {
      concept_id: c10b._id,
      question_text: "The main driving force for the ascent of water in tall trees is:",
      options: [
        { id: "a", text: "Root pressure" },
        { id: "b", text: "Transpiration pull" },
        { id: "c", text: "Gravity" },
        { id: "d", text: "Osmotic pressure of xylem only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Transpiration pull, generated by water evaporation from leaf surfaces, is the main force driving the ascent of water through xylem, especially in tall trees.",
      difficulty: "medium",
    },
    {
      concept_id: c10b._id,
      question_text: "The cohesion-tension theory explaining ascent of sap depends on which unique property of water?",
      options: [
        { id: "a", text: "High cohesion and adhesion between water molecules" },
        { id: "b", text: "Low boiling point" },
        { id: "c", text: "High compressibility" },
        { id: "d", text: "Low surface tension" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The cohesion-tension theory relies on the strong cohesive forces between water molecules (due to hydrogen bonding) and adhesive forces with xylem walls, forming an unbroken water column.",
      difficulty: "hard",
    },
    {
      concept_id: c10b._id,
      question_text: "Root pressure is generated mainly due to:",
      options: [
        { id: "a", text: "Active absorption of ions/water by root cells" },
        { id: "b", text: "Leaf transpiration" },
        { id: "c", text: "Gravity" },
        { id: "d", text: "Photosynthesis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Root pressure develops due to the active absorption of water and mineral ions by root cells, creating a positive pressure that pushes water upward into the xylem.",
      difficulty: "medium",
    },
    {
      concept_id: c10b._id,
      question_text: "Guttation, the loss of water in liquid form from leaf tips, is caused primarily by:",
      options: [
        { id: "a", text: "Root pressure" },
        { id: "b", text: "Transpiration" },
        { id: "c", text: "Osmosis in leaves only" },
        { id: "d", text: "Photosynthesis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Guttation occurs when root pressure pushes excess water out through special pores (hydathodes) at leaf tips or margins, typically seen in humid conditions at night.",
      difficulty: "hard",
    },
    {
      concept_id: c10b._id,
      question_text: "Water moves from soil into root hairs mainly because the soil water potential is:",
      options: [
        { id: "a", text: "Higher than that of root cells" },
        { id: "b", text: "Lower than that of root cells" },
        { id: "c", text: "Equal to root cells" },
        { id: "d", text: "Irrelevant to water movement" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Water moves into root hairs because the water potential of soil water is generally higher than that of the root cells, so water flows down the potential gradient into the roots.",
      difficulty: "medium",
    },

    {
      concept_id: c10c._id,
      question_text: "Transpiration mainly occurs through small pores present on the leaf surface called:",
      options: [
        { id: "a", text: "Lenticels" },
        { id: "b", text: "Stomata" },
        { id: "c", text: "Hydathodes" },
        { id: "d", text: "Root hairs" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Transpiration is the loss of water in vapour form mainly through stomata, the small pores on the leaf surface regulated by guard cells.",
      difficulty: "easy",
    },
    {
      concept_id: c10c._id,
      question_text: "The opening and closing of stomata is regulated by changes in the turgidity of:",
      options: [
        { id: "a", text: "Guard cells" },
        { id: "b", text: "Root hair cells" },
        { id: "c", text: "Xylem vessels" },
        { id: "d", text: "Mesophyll cells only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Stomatal opening and closing are regulated by changes in the turgor pressure of guard cells — increased turgidity opens the stomata, decreased turgidity closes them.",
      difficulty: "medium",
    },
    {
      concept_id: c10c._id,
      question_text: "The transport of food materials (mainly sucrose) through phloem is called:",
      options: [
        { id: "a", text: "Translocation" },
        { id: "b", text: "Transpiration" },
        { id: "c", text: "Guttation" },
        { id: "d", text: "Diffusion only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Translocation refers to the movement of food materials, primarily sucrose, from the site of production (source) to the site of utilization or storage (sink) through phloem.",
      difficulty: "medium",
    },
    {
      concept_id: c10c._id,
      question_text: "According to the pressure flow (mass flow) hypothesis, phloem transport occurs due to a pressure gradient between the:",
      options: [
        { id: "a", text: "Source and sink" },
        { id: "b", text: "Root and shoot only" },
        { id: "c", text: "Xylem and phloem" },
        { id: "d", text: "Stomata and lenticels" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The pressure flow hypothesis explains that a pressure gradient is created between the source (high pressure, where sugar is loaded) and sink (low pressure, where sugar is unloaded), driving mass flow of phloem sap.",
      difficulty: "hard",
    },
    {
      concept_id: c10c._id,
      question_text: "Unlike xylem transport, phloem translocation can occur:",
      options: [
        { id: "a", text: "Only upward" },
        { id: "b", text: "Only downward" },
        { id: "c", text: "In both upward and downward directions (bidirectional)" },
        { id: "d", text: "Only during the night" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Unlike the unidirectional (upward) flow of water in xylem, phloem transport is bidirectional, moving food from source to sink, which may be located above or below the source.",
      difficulty: "medium",
    },
    {
      concept_id: c10c._id,
      question_text: "Excess transpiration under conditions of low water availability can lead to:",
      options: [
        { id: "a", text: "Wilting of the plant" },
        { id: "b", text: "Increased root pressure" },
        { id: "c", text: "Faster photosynthesis" },
        { id: "d", text: "No effect on the plant" },
      ],
      correct_option_id: "a",
      explanation_text:
        "When transpiration exceeds the rate of water absorption by roots, the plant loses more water than it gains, leading to a loss of turgor and wilting.",
      difficulty: "medium",
    },
  ]);

  console.log("Chapter 10 (Transport in Plants) done");

  // ---------- CHAPTER 11: Mineral Nutrition ----------
  const ch11 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Plant Physiology",
    title: "Mineral Nutrition",
    order_index: 11,
  });

  const c11a = await Concept.create({
    chapter_id: ch11._id,
    title: "Essential Mineral Elements",
    explanation_text:
      "Essential mineral elements are classified as macronutrients (needed in large amounts, e.g. N, P, K) and micronutrients (needed in trace amounts, e.g. Fe, Zn, Cu), based on criteria of essentiality.",
  });
  const c11b = await Concept.create({
    chapter_id: ch11._id,
    title: "Deficiency Symptoms",
    explanation_text:
      "Deficiency of specific mineral elements produces characteristic symptoms such as chlorosis, necrosis, or stunted growth, helping identify which nutrient is lacking in the plant.",
  });
  const c11c = await Concept.create({
    chapter_id: ch11._id,
    title: "Nitrogen Metabolism",
    explanation_text:
      "Nitrogen fixation converts atmospheric nitrogen into usable forms via biological nitrogen-fixing organisms like Rhizobium, essential since plants cannot use atmospheric N2 directly.",
  });

  await Question.insertMany([
    {
      concept_id: c11a._id,
      question_text: "Elements required by plants in relatively large amounts are called:",
      options: [
        { id: "a", text: "Micronutrients" },
        { id: "b", text: "Macronutrients" },
        { id: "c", text: "Trace elements" },
        { id: "d", text: "Toxic elements" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Macronutrients, such as nitrogen, phosphorus, and potassium, are required by plants in relatively large amounts for normal growth and development.",
      difficulty: "easy",
    },
    {
      concept_id: c11a._id,
      question_text: "Elements required by plants in very small (trace) amounts are called:",
      options: [
        { id: "a", text: "Macronutrients" },
        { id: "b", text: "Micronutrients" },
        { id: "c", text: "Major elements" },
        { id: "d", text: "Structural elements" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Micronutrients, such as iron, zinc, manganese, and copper, are required by plants only in very small (trace) quantities but are still essential for normal function.",
      difficulty: "easy",
    },
    {
      concept_id: c11a._id,
      question_text: "For an element to be considered 'essential' for plant growth, one criterion is that:",
      options: [
        { id: "a", text: "The plant cannot complete its life cycle without it" },
        { id: "b", text: "It must be present in large quantities" },
        { id: "c", text: "It has to be a metal" },
        { id: "d", text: "It has to be visible under a microscope" },
      ],
      correct_option_id: "a",
      explanation_text:
        "One key criterion for essentiality is that, in the absence of the element, the plant cannot complete its vegetative or reproductive life cycle normally.",
      difficulty: "medium",
    },
    {
      concept_id: c11a._id,
      question_text: "Which of these is classified as a macronutrient?",
      options: [
        { id: "a", text: "Zinc" },
        { id: "b", text: "Potassium" },
        { id: "c", text: "Molybdenum" },
        { id: "d", text: "Boron" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Potassium is one of the essential macronutrients (along with nitrogen, phosphorus, calcium, magnesium, and sulfur), required by plants in comparatively large amounts.",
      difficulty: "medium",
    },
    {
      concept_id: c11a._id,
      question_text: "Which technique is commonly used to study the mineral requirements of plants by growing them without soil?",
      options: [
        { id: "a", text: "Hydroponics" },
        { id: "b", text: "Grafting" },
        { id: "c", text: "Tissue culture" },
        { id: "d", text: "Vernalization" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Hydroponics is a technique of growing plants in a nutrient solution without soil, widely used to study the essentiality and function of different mineral elements.",
      difficulty: "medium",
    },
    {
      concept_id: c11a._id,
      question_text: "Elements that are toxic to plants when present in excess include:",
      options: [
        { id: "a", text: "Manganese and other micronutrients in high concentration" },
        { id: "b", text: "Only macronutrients" },
        { id: "c", text: "Water only" },
        { id: "d", text: "None; no element is ever toxic" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Micronutrients like manganese, though essential in small amounts, become toxic to plants when present in excess, often interfering with the availability of other nutrients.",
      difficulty: "hard",
    },

    {
      concept_id: c11b._id,
      question_text: "Yellowing of leaves due to loss of chlorophyll, often from nitrogen or magnesium deficiency, is called:",
      options: [
        { id: "a", text: "Chlorosis" },
        { id: "b", text: "Necrosis" },
        { id: "c", text: "Wilting" },
        { id: "d", text: "Plasmolysis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Chlorosis is the yellowing of leaf tissue due to reduced chlorophyll production, commonly caused by deficiency of nitrogen, magnesium, sulfur, or iron.",
      difficulty: "medium",
    },
    {
      concept_id: c11b._id,
      question_text: "Death of plant tissue, often appearing as dark, dead patches, due to severe nutrient deficiency is called:",
      options: [
        { id: "a", text: "Chlorosis" },
        { id: "b", text: "Necrosis" },
        { id: "c", text: "Turgidity" },
        { id: "d", text: "Guttation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Necrosis refers to the death of plant tissue, often observed as dark, dead patches on leaves, typically resulting from severe deficiency of certain minerals like potassium or calcium.",
      difficulty: "medium",
    },
    {
      concept_id: c11b._id,
      question_text: "Deficiency of a mobile nutrient, like nitrogen, typically shows symptoms first in:",
      options: [
        { id: "a", text: "Older (basal) leaves" },
        { id: "b", text: "Younger (apical) leaves" },
        { id: "c", text: "Roots only" },
        { id: "d", text: "Flowers only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mobile nutrients like nitrogen are redirected from older to younger leaves when in short supply, so deficiency symptoms appear first in older, basal leaves.",
      difficulty: "hard",
    },
    {
      concept_id: c11b._id,
      question_text: "Deficiency of an immobile nutrient, like calcium or iron, typically shows symptoms first in:",
      options: [
        { id: "a", text: "Older leaves" },
        { id: "b", text: "Younger leaves" },
        { id: "c", text: "Roots only" },
        { id: "d", text: "Nowhere, symptoms never appear" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Immobile nutrients like calcium and iron cannot be translocated from older to younger tissues, so deficiency symptoms appear first in the younger, developing leaves.",
      difficulty: "hard",
    },
    {
      concept_id: c11b._id,
      question_text: "Stunted plant growth is a common general symptom associated with the deficiency of:",
      options: [
        { id: "a", text: "Any essential nutrient, especially nitrogen" },
        { id: "b", text: "Only micronutrients" },
        { id: "c", text: "Only water" },
        { id: "d", text: "Only carbon dioxide" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Stunted growth is a common, general symptom of deficiency in various essential nutrients, but is especially associated with nitrogen deficiency, since nitrogen is key for protein synthesis and growth.",
      difficulty: "medium",
    },
    {
      concept_id: c11b._id,
      question_text: "Deficiency of magnesium, a component of the chlorophyll molecule, primarily causes:",
      options: [
        { id: "a", text: "Interveinal chlorosis" },
        { id: "b", text: "Root rot" },
        { id: "c", text: "Excess flowering" },
        { id: "d", text: "Faster stem elongation" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Since magnesium is a central component of the chlorophyll molecule, its deficiency typically causes interveinal chlorosis, where the tissue between veins yellows while veins remain green.",
      difficulty: "hard",
    },

    {
      concept_id: c11c._id,
      question_text: "The conversion of atmospheric nitrogen (N2) into a usable form for plants is called:",
      options: [
        { id: "a", text: "Nitrogen fixation" },
        { id: "b", text: "Denitrification" },
        { id: "c", text: "Ammonification" },
        { id: "d", text: "Nitrification only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Nitrogen fixation is the process of converting inert atmospheric nitrogen gas (N2) into compounds like ammonia, which plants can absorb and use.",
      difficulty: "easy",
    },
    {
      concept_id: c11c._id,
      question_text: "Which bacterium is well known for forming a symbiotic nitrogen-fixing relationship with legume roots?",
      options: [
        { id: "a", text: "Rhizobium" },
        { id: "b", text: "E. coli" },
        { id: "c", text: "Lactobacillus" },
        { id: "d", text: "Nitrosomonas only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Rhizobium is a well-known nitrogen-fixing bacterium that forms a symbiotic relationship with the roots of leguminous plants, living inside root nodules.",
      difficulty: "medium",
    },
    {
      concept_id: c11c._id,
      question_text: "The enzyme complex responsible for catalyzing biological nitrogen fixation is:",
      options: [
        { id: "a", text: "Nitrogenase" },
        { id: "b", text: "Amylase" },
        { id: "c", text: "Pepsin" },
        { id: "d", text: "Lipase" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Nitrogenase is the key enzyme complex responsible for catalyzing the reduction of atmospheric nitrogen (N2) to ammonia during biological nitrogen fixation.",
      difficulty: "hard",
    },
    {
      concept_id: c11c._id,
      question_text: "Why does nitrogen fixation require anaerobic (oxygen-free) conditions in the root nodule?",
      options: [
        { id: "a", text: "The enzyme nitrogenase is inactivated by oxygen" },
        { id: "b", text: "Rhizobium cannot survive in soil" },
        { id: "c", text: "Nitrogen gas dissolves better without oxygen" },
        { id: "d", text: "It has no real reason; it's not actually anaerobic" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The nitrogenase enzyme is highly sensitive to oxygen and gets inactivated in its presence, so nitrogen fixation must occur under anaerobic (oxygen-protected) conditions inside root nodules.",
      difficulty: "hard",
    },
    {
      concept_id: c11c._id,
      question_text: "The pink/reddish pigment found in root nodules, which helps maintain low oxygen levels around nitrogenase, is called:",
      options: [
        { id: "a", text: "Leghaemoglobin" },
        { id: "b", text: "Chlorophyll" },
        { id: "c", text: "Anthocyanin" },
        { id: "d", text: "Carotenoid" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Leghaemoglobin is a pink, oxygen-scavenging pigment present in root nodules that helps maintain the low oxygen environment required for nitrogenase activity.",
      difficulty: "hard",
    },
    {
      concept_id: c11c._id,
      question_text: "Nitrate absorbed by plant roots is eventually reduced and assimilated into:",
      options: [
        { id: "a", text: "Amino acids" },
        { id: "b", text: "Fatty acids only" },
        { id: "c", text: "Glucose directly" },
        { id: "d", text: "Chlorophyll directly, without conversion" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Nitrate absorbed by roots is reduced (via nitrate and nitrite reductase) to ammonia, which is then assimilated into amino acids, the building blocks of proteins.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 11 (Mineral Nutrition) done");

  // ---------- CHAPTER 12: Photosynthesis in Higher Plants ----------
  const ch12 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Plant Physiology",
    title: "Photosynthesis in Higher Plants",
    order_index: 12,
  });

  const c12a = await Concept.create({
    chapter_id: ch12._id,
    title: "Light Reactions",
    explanation_text:
      "The light reactions occur in the thylakoid membranes of chloroplasts, converting light energy into chemical energy (ATP and NADPH), and splitting water to release oxygen.",
  });
  const c12b = await Concept.create({
    chapter_id: ch12._id,
    title: "The Calvin Cycle (Dark Reaction)",
    explanation_text:
      "The Calvin cycle occurs in the stroma of chloroplasts, using ATP and NADPH from light reactions to fix atmospheric CO2 into glucose through a series of enzyme-catalyzed steps.",
  });
  const c12c = await Concept.create({
    chapter_id: ch12._id,
    title: "C4 Pathway and Factors Affecting Photosynthesis",
    explanation_text:
      "C4 plants use an additional CO2-concentrating mechanism (Hatch-Slack pathway) for efficiency in hot climates; photosynthesis rate is affected by light, CO2 concentration, and temperature.",
  });

  await Question.insertMany([
    {
      concept_id: c12a._id,
      question_text: "The light reactions of photosynthesis occur in which part of the chloroplast?",
      options: [
        { id: "a", text: "Stroma" },
        { id: "b", text: "Thylakoid membrane" },
        { id: "c", text: "Outer membrane" },
        { id: "d", text: "Mitochondrial matrix" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The light reactions take place in the thylakoid membranes of the chloroplast, where pigments capture light energy and generate ATP and NADPH.",
      difficulty: "easy",
    },
    {
      concept_id: c12a._id,
      question_text: "The splitting of water molecules during light reactions, releasing oxygen, is called:",
      options: [
        { id: "a", text: "Photolysis" },
        { id: "b", text: "Glycolysis" },
        { id: "c", text: "Hydrolysis of starch" },
        { id: "d", text: "Fermentation" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Photolysis is the light-driven splitting of water molecules into oxygen, protons, and electrons, occurring within Photosystem II during the light reactions.",
      difficulty: "medium",
    },
    {
      concept_id: c12a._id,
      question_text: "The main products of the light reactions, used to power the Calvin cycle, are:",
      options: [
        { id: "a", text: "Glucose and oxygen" },
        { id: "b", text: "ATP and NADPH" },
        { id: "c", text: "Carbon dioxide and water" },
        { id: "d", text: "Chlorophyll and starch" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The light reactions produce ATP and NADPH, which provide the energy and reducing power needed to drive the carbon-fixing reactions of the Calvin cycle.",
      difficulty: "medium",
    },
    {
      concept_id: c12a._id,
      question_text: "The primary pigment involved in trapping light energy in photosynthesis is:",
      options: [
        { id: "a", text: "Chlorophyll a" },
        { id: "b", text: "Xanthophyll" },
        { id: "c", text: "Anthocyanin" },
        { id: "d", text: "Melanin" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Chlorophyll a is the primary photosynthetic pigment that directly participates in light absorption and the conversion of light energy into chemical energy.",
      difficulty: "easy",
    },
    {
      concept_id: c12a._id,
      question_text: "Cyclic photophosphorylation involves only which photosystem, producing ATP without NADPH?",
      options: [
        { id: "a", text: "Photosystem I (PS I)" },
        { id: "b", text: "Photosystem II (PS II)" },
        { id: "c", text: "Both photosystems equally" },
        { id: "d", text: "Neither photosystem" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Cyclic photophosphorylation involves only Photosystem I, where electrons cycle back to PS I itself, generating ATP but no NADPH and no oxygen evolution.",
      difficulty: "hard",
    },
    {
      concept_id: c12a._id,
      question_text: "In non-cyclic photophosphorylation, electron flow occurs sequentially through:",
      options: [
        { id: "a", text: "PS II then PS I" },
        { id: "b", text: "PS I then PS II" },
        { id: "c", text: "Only PS II" },
        { id: "d", text: "No photosystem is involved" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In non-cyclic photophosphorylation, electrons flow from Photosystem II to Photosystem I via an electron transport chain, producing both ATP and NADPH, along with oxygen evolution.",
      difficulty: "hard",
    },

    {
      concept_id: c12b._id,
      question_text: "The Calvin cycle (dark reaction) occurs in which part of the chloroplast?",
      options: [
        { id: "a", text: "Thylakoid lumen" },
        { id: "b", text: "Stroma" },
        { id: "c", text: "Outer membrane" },
        { id: "d", text: "Grana stack" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Calvin cycle takes place in the stroma, the fluid-filled space of the chloroplast surrounding the thylakoids, where CO2 fixation occurs.",
      difficulty: "medium",
    },
    {
      concept_id: c12b._id,
      question_text: "The enzyme responsible for the initial fixation of CO2 in the Calvin cycle is:",
      options: [
        { id: "a", text: "RuBisCO" },
        { id: "b", text: "Amylase" },
        { id: "c", text: "ATP synthase" },
        { id: "d", text: "Nitrogenase" },
      ],
      correct_option_id: "a",
      explanation_text:
        "RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) is the key enzyme that catalyzes the fixation of atmospheric CO2 onto RuBP, the first step of the Calvin cycle.",
      difficulty: "medium",
    },
    {
      concept_id: c12b._id,
      question_text: "The three phases of the Calvin cycle are carboxylation, reduction, and:",
      options: [
        { id: "a", text: "Regeneration of RuBP" },
        { id: "b", text: "Photolysis" },
        { id: "c", text: "Chlorophyll synthesis" },
        { id: "d", text: "Transpiration" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The Calvin cycle consists of three phases: carboxylation (CO2 fixation), reduction (using ATP/NADPH to form G3P), and regeneration of the CO2 acceptor, RuBP.",
      difficulty: "hard",
    },
    {
      concept_id: c12b._id,
      question_text: "The Calvin cycle is named after C3 plants because the first stable product of CO2 fixation is a:",
      options: [
        { id: "a", text: "3-carbon compound (3-PGA)" },
        { id: "b", text: "4-carbon compound" },
        { id: "c", text: "6-carbon compound" },
        { id: "d", text: "2-carbon compound" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In C3 plants, the first stable product formed after CO2 fixation by RuBisCO is 3-phosphoglyceric acid (3-PGA), a 3-carbon compound, hence the name C3 pathway.",
      difficulty: "medium",
    },
    {
      concept_id: c12b._id,
      question_text: "How many turns of the Calvin cycle are required to synthesize one molecule of glucose?",
      options: [
        { id: "a", text: "Six turns" },
        { id: "b", text: "One turn" },
        { id: "c", text: "Two turns" },
        { id: "d", text: "Twelve turns" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Six turns of the Calvin cycle, fixing six molecules of CO2, are required to synthesize one molecule of glucose (a 6-carbon sugar).",
      difficulty: "hard",
    },
    {
      concept_id: c12b._id,
      question_text: "The end product G3P (glyceraldehyde-3-phosphate) formed in the Calvin cycle is used to form:",
      options: [
        { id: "a", text: "Glucose and other carbohydrates" },
        { id: "b", text: "Oxygen gas" },
        { id: "c", text: "ATP directly" },
        { id: "d", text: "Water" },
      ],
      correct_option_id: "a",
      explanation_text:
        "G3P produced in the Calvin cycle is used both to regenerate RuBP (the CO2 acceptor) and to synthesize glucose and other carbohydrates.",
      difficulty: "medium",
    },

    {
      concept_id: c12c._id,
      question_text: "C4 plants are so named because the first stable product of CO2 fixation is a:",
      options: [
        { id: "a", text: "4-carbon compound (oxaloacetic acid)" },
        { id: "b", text: "3-carbon compound" },
        { id: "c", text: "5-carbon compound" },
        { id: "d", text: "6-carbon compound" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In C4 plants, CO2 is first fixed into a 4-carbon compound, oxaloacetic acid (OAA), via the enzyme PEP carboxylase, distinguishing them from C3 plants.",
      difficulty: "medium",
    },
    {
      concept_id: c12c._id,
      question_text: "C4 plants show a distinctive leaf anatomy called 'Kranz anatomy,' characterised by:",
      options: [
        { id: "a", text: "Bundle sheath cells arranged around vascular bundles, with chloroplasts" },
        { id: "b", text: "Absence of vascular bundles" },
        { id: "c", text: "Only spongy mesophyll cells" },
        { id: "d", text: "No leaf veins at all" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Kranz anatomy in C4 plants features large bundle sheath cells with chloroplasts arranged in a wreath-like pattern around the vascular bundles, aiding CO2 concentration.",
      difficulty: "hard",
    },
    {
      concept_id: c12c._id,
      question_text: "C4 plants are generally more efficient than C3 plants in:",
      options: [
        { id: "a", text: "Hot, dry climates with high light intensity" },
        { id: "b", text: "Cold, shaded environments" },
        { id: "c", text: "Aquatic environments only" },
        { id: "d", text: "Low CO2, low temperature conditions" },
      ],
      correct_option_id: "a",
      explanation_text:
        "C4 plants are more efficient in hot, dry climates with high light intensity because their CO2-concentrating mechanism reduces photorespiration and water loss.",
      difficulty: "hard",
    },
    {
      concept_id: c12c._id,
      question_text: "As light intensity increases (up to a certain point), the rate of photosynthesis generally:",
      options: [
        { id: "a", text: "Increases" },
        { id: "b", text: "Decreases" },
        { id: "c", text: "Stays constant regardless" },
        { id: "d", text: "Stops completely" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Within a certain range, increasing light intensity increases the rate of photosynthesis, since light drives the light reactions; beyond an optimum, other factors become limiting.",
      difficulty: "medium",
    },
    {
      concept_id: c12c._id,
      question_text: "Which environmental factor, according to the law of limiting factors, most directly determines the maximum rate of photosynthesis when in short supply?",
      options: [
        { id: "a", text: "Whichever factor is nearest to its minimum value" },
        { id: "b", text: "Only light intensity, always" },
        { id: "c", text: "Only temperature, always" },
        { id: "d", text: "Soil pH" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Blackman's law of limiting factors states that when a process depends on multiple factors, its rate is limited by whichever factor is nearest to its minimum value at that time.",
      difficulty: "hard",
    },
    {
      concept_id: c12c._id,
      question_text: "Increasing atmospheric CO2 concentration (within a certain range) tends to:",
      options: [
        { id: "a", text: "Increase the rate of photosynthesis" },
        { id: "b", text: "Always decrease the rate of photosynthesis" },
        { id: "c", text: "Have no effect at all" },
        { id: "d", text: "Stop photosynthesis entirely" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Since CO2 is a raw material for the Calvin cycle, increasing its concentration (within a physiological range) generally increases the rate of photosynthesis, especially in C3 plants.",
      difficulty: "medium",
    },
  ]);

  console.log(
    "Grade 11 Batch 4 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
