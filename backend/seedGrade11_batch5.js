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

  // ---------- CHAPTER 13: Respiration in Plants ----------
  const ch13 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Plant Physiology",
    title: "Respiration in Plants",
    order_index: 13,
  });

  const c13a = await Concept.create({
    chapter_id: ch13._id,
    title: "Glycolysis and Fermentation",
    explanation_text:
      "Glycolysis is the partial oxidation of glucose to two molecules of pyruvic acid in the cytoplasm; under anaerobic conditions, pyruvate is converted to ethanol or lactic acid via fermentation, yielding a net gain of 2 ATP.",
  });
  const c13b = await Concept.create({
    chapter_id: ch13._id,
    title: "Aerobic Respiration: Krebs Cycle and Electron Transport System",
    explanation_text:
      "Aerobic respiration completely oxidizes pyruvate to CO2 and water inside the mitochondria via the Krebs cycle and electron transport system (ETS), generating the majority of ATP through oxidative phosphorylation.",
  });
  const c13c = await Concept.create({
    chapter_id: ch13._id,
    title: "Respiratory Quotient and the Amphibolic Pathway",
    explanation_text:
      "Respiratory quotient (RQ) is the ratio of CO2 released to O2 consumed during respiration and varies with the respiratory substrate; respiration is described as an amphibolic pathway because it involves both catabolic breakdown and anabolic synthesis of intermediates.",
  });

  await Question.insertMany([
    {
      concept_id: c13a._id,
      question_text: "Glycolysis occurs in which part of the cell?",
      options: [
        { id: "a", text: "Mitochondria" },
        { id: "b", text: "Cytoplasm" },
        { id: "c", text: "Nucleus" },
        { id: "d", text: "Chloroplast" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Glycolysis, the breakdown of glucose to pyruvic acid, takes place in the cytoplasm and does not require oxygen.",
      difficulty: "easy",
    },
    {
      concept_id: c13a._id,
      question_text: "The end product of glycolysis is:",
      options: [
        { id: "a", text: "Pyruvic acid" },
        { id: "b", text: "Ethanol" },
        { id: "c", text: "Lactic acid" },
        { id: "d", text: "Acetyl CoA" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Glycolysis breaks down one molecule of glucose into two molecules of pyruvic acid (pyruvate).",
      difficulty: "easy",
    },
    {
      concept_id: c13a._id,
      question_text: "The net ATP gain from glycolysis (per glucose molecule) is:",
      options: [
        { id: "a", text: "2 ATP" },
        { id: "b", text: "4 ATP" },
        { id: "c", text: "36 ATP" },
        { id: "d", text: "8 ATP" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Glycolysis produces 4 ATP molecules but consumes 2 ATP for activation, giving a net gain of 2 ATP per glucose molecule.",
      difficulty: "medium",
    },
    {
      concept_id: c13a._id,
      question_text: "Under anaerobic conditions in yeast, pyruvate is converted into:",
      options: [
        { id: "a", text: "Lactic acid" },
        { id: "b", text: "Ethanol and CO2" },
        { id: "c", text: "Acetyl CoA" },
        { id: "d", text: "Citric acid" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In yeast, anaerobic fermentation converts pyruvic acid into ethanol and carbon dioxide, a process called alcoholic fermentation.",
      difficulty: "medium",
    },
    {
      concept_id: c13a._id,
      question_text: "In muscle cells under oxygen-deficient conditions, pyruvate is reduced to:",
      options: [
        { id: "a", text: "Ethanol" },
        { id: "b", text: "Lactic acid" },
        { id: "c", text: "Citric acid" },
        { id: "d", text: "Oxaloacetic acid" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In animal muscle cells, when oxygen is insufficient, pyruvate is reduced to lactic acid, allowing glycolysis to continue by regenerating NAD+.",
      difficulty: "medium",
    },
    {
      concept_id: c13a._id,
      question_text:
        "Compared to aerobic respiration, fermentation is a much less efficient process because:",
      options: [
        { id: "a", text: "It doesn't use glucose at all" },
        { id: "b", text: "It releases only a small fraction of the energy stored in glucose" },
        { id: "c", text: "It produces more ATP than aerobic respiration" },
        { id: "d", text: "It doesn't produce CO2" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fermentation only partially oxidizes glucose and yields just 2 ATP, releasing a small fraction of the energy compared to the complete oxidation in aerobic respiration.",
      difficulty: "hard",
    },

    {
      concept_id: c13b._id,
      question_text: "Aerobic respiration takes place mainly in which organelle?",
      options: [
        { id: "a", text: "Chloroplast" },
        { id: "b", text: "Mitochondria" },
        { id: "c", text: "Golgi apparatus" },
        { id: "d", text: "Ribosome" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Krebs cycle and electron transport system, the main stages of aerobic respiration, occur within the mitochondria.",
      difficulty: "easy",
    },
    {
      concept_id: c13b._id,
      question_text: "Before entering the Krebs cycle, pyruvate is converted into:",
      options: [
        { id: "a", text: "Citric acid" },
        { id: "b", text: "Acetyl CoA" },
        { id: "c", text: "Oxaloacetic acid" },
        { id: "d", text: "Succinic acid" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Pyruvate is oxidatively decarboxylated to acetyl CoA, which then combines with oxaloacetic acid to enter the Krebs cycle.",
      difficulty: "easy",
    },
    {
      concept_id: c13b._id,
      question_text: "The Krebs cycle takes place in the:",
      options: [
        { id: "a", text: "Outer mitochondrial membrane" },
        { id: "b", text: "Mitochondrial matrix" },
        { id: "c", text: "Cytoplasm" },
        { id: "d", text: "Inner membrane space" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Krebs cycle (citric acid cycle) reactions occur in the mitochondrial matrix, while the electron transport chain operates on the inner mitochondrial membrane.",
      difficulty: "medium",
    },
    {
      concept_id: c13b._id,
      question_text: "The final electron acceptor in the electron transport system is:",
      options: [
        { id: "a", text: "Oxygen" },
        { id: "b", text: "Carbon dioxide" },
        { id: "c", text: "NAD+" },
        { id: "d", text: "Water" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In the electron transport system, oxygen acts as the final electron acceptor, combining with electrons and protons to form water.",
      difficulty: "medium",
    },
    {
      concept_id: c13b._id,
      question_text:
        "Complete oxidation of one glucose molecule during aerobic respiration yields approximately how many ATP molecules?",
      options: [
        { id: "a", text: "2 ATP" },
        { id: "b", text: "8 ATP" },
        { id: "c", text: "Around 36-38 ATP" },
        { id: "d", text: "100 ATP" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Complete aerobic oxidation of one glucose molecule, through glycolysis, the Krebs cycle, and oxidative phosphorylation, yields approximately 36-38 ATP molecules.",
      difficulty: "hard",
    },
    {
      concept_id: c13b._id,
      question_text:
        "The process by which ATP is synthesized using the proton gradient generated by the electron transport chain is called:",
      options: [
        { id: "a", text: "Substrate-level phosphorylation" },
        { id: "b", text: "Oxidative phosphorylation" },
        { id: "c", text: "Photophosphorylation" },
        { id: "d", text: "Glycolytic phosphorylation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Oxidative phosphorylation uses the proton gradient built up across the inner mitochondrial membrane by the electron transport chain to drive ATP synthesis via ATP synthase.",
      difficulty: "hard",
    },

    {
      concept_id: c13c._id,
      question_text: "Respiratory Quotient (RQ) is defined as the ratio of:",
      options: [
        { id: "a", text: "O2 consumed to CO2 released" },
        { id: "b", text: "CO2 released to O2 consumed" },
        { id: "c", text: "ATP produced to glucose consumed" },
        { id: "d", text: "Glucose consumed to water produced" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Respiratory Quotient is calculated as the volume of CO2 evolved divided by the volume of O2 consumed during respiration.",
      difficulty: "easy",
    },
    {
      concept_id: c13c._id,
      question_text: "The RQ value when carbohydrates are used as the respiratory substrate is:",
      options: [
        { id: "a", text: "1" },
        { id: "b", text: "0.7" },
        { id: "c", text: "Greater than 1" },
        { id: "d", text: "0" },
      ],
      correct_option_id: "a",
      explanation_text:
        "When carbohydrates are respired, equal volumes of CO2 are released and O2 consumed, giving an RQ of 1.",
      difficulty: "easy",
    },
    {
      concept_id: c13c._id,
      question_text: "Fats as a respiratory substrate give an RQ value that is:",
      options: [
        { id: "a", text: "Greater than 1" },
        { id: "b", text: "Equal to 1" },
        { id: "c", text: "Less than 1 (around 0.7)" },
        { id: "d", text: "Undefined" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Fats contain relatively less oxygen than carbohydrates, so more O2 is needed for their oxidation, giving an RQ less than 1, typically around 0.7.",
      difficulty: "medium",
    },
    {
      concept_id: c13c._id,
      question_text: 'Respiration is called an "amphibolic pathway" because it:',
      options: [
        { id: "a", text: "Only breaks down molecules" },
        { id: "b", text: "Involves both breakdown (catabolism) and synthesis (anabolism) of intermediates" },
        { id: "c", text: "Occurs only in animals" },
        { id: "d", text: "Requires only oxygen, not glucose" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Respiration is termed amphibolic because its intermediates are used both to break down glucose for energy (catabolism) and as precursors for synthesizing fats, proteins, and other molecules (anabolism).",
      difficulty: "medium",
    },
    {
      concept_id: c13c._id,
      question_text: "Organic acids as respiratory substrates typically give an RQ value that is:",
      options: [
        { id: "a", text: "Less than 1" },
        { id: "b", text: "Equal to 1" },
        { id: "c", text: "Greater than 1" },
        { id: "d", text: "Zero" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Organic acids contain more oxygen relative to carbon than carbohydrates, so their oxidation releases more CO2 relative to O2 consumed, giving an RQ greater than 1.",
      difficulty: "hard",
    },
    {
      concept_id: c13c._id,
      question_text: "A key evidence supporting the amphibolic nature of respiration is that:",
      options: [
        { id: "a", text: "Respiration never uses fats or proteins" },
        {
          id: "b",
          text: "Intermediates like acetyl CoA and pyruvate also serve as starting points for fat and amino acid synthesis",
        },
        { id: "c", text: "Respiration occurs only at night" },
        { id: "d", text: "Glycolysis requires oxygen" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Intermediates of respiration, such as pyruvate and acetyl CoA, are also used as substrates for the biosynthesis of fatty acids, amino acids, and other biomolecules, demonstrating its amphibolic nature.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 13 (Respiration in Plants) done");

  // ---------- CHAPTER 14: Plant Growth and Development ----------
  const ch14 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Plant Physiology",
    title: "Plant Growth and Development",
    order_index: 14,
  });

  const c14a = await Concept.create({
    chapter_id: ch14._id,
    title: "Phases and Characteristics of Growth",
    explanation_text:
      "Plant growth is an irreversible, permanent increase in size and passes through three phases — meristematic, elongation, and maturation — and can be measured and expressed as arithmetic or geometric growth.",
  });
  const c14b = await Concept.create({
    chapter_id: ch14._id,
    title: "Plant Growth Regulators",
    explanation_text:
      "Plant growth regulators (hormones) such as auxins, gibberellins, cytokinins, ethylene, and abscisic acid coordinate growth, development, and responses to environmental stimuli, each with characteristic physiological effects.",
  });
  const c14c = await Concept.create({
    chapter_id: ch14._id,
    title: "Photoperiodism and Vernalisation",
    explanation_text:
      "Photoperiodism is the flowering response of plants to the relative length of day and night, classifying plants as short-day, long-day, or day-neutral; vernalisation is the promotion of flowering by prior exposure to low temperature.",
  });

  await Question.insertMany([
    {
      concept_id: c14a._id,
      question_text: "Growth in plants is defined as an irreversible increase in:",
      options: [
        { id: "a", text: "Number of species" },
        { id: "b", text: "Size, mass, or volume" },
        { id: "c", text: "Temperature" },
        { id: "d", text: "Color intensity" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Growth is a permanent and irreversible increase in size, mass, or volume of an organism or its parts.",
      difficulty: "easy",
    },
    {
      concept_id: c14a._id,
      question_text: "The region of a plant where cells actively divide to produce new cells is called the:",
      options: [
        { id: "a", text: "Elongation zone" },
        { id: "b", text: "Meristematic zone" },
        { id: "c", text: "Maturation zone" },
        { id: "d", text: "Vascular zone" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The meristematic region consists of actively dividing cells found near root and shoot tips, responsible for producing new cells.",
      difficulty: "easy",
    },
    {
      concept_id: c14a._id,
      question_text: "The three sequential phases of plant growth are:",
      options: [
        { id: "a", text: "Meristematic, elongation, maturation" },
        { id: "b", text: "Germination, flowering, fruiting" },
        { id: "c", text: "Vegetative, reproductive, senescent" },
        { id: "d", text: "Dormant, active, dead" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Growth in plants progresses through the meristematic phase (cell division), the elongation phase (cell enlargement), and the maturation phase (cell differentiation).",
      difficulty: "medium",
    },
    {
      concept_id: c14a._id,
      question_text:
        "In arithmetic growth, following mitotic cell division, only one daughter cell continues to divide while the other differentiates. This results in growth that is:",
      options: [
        { id: "a", text: "Exponential" },
        { id: "b", text: "Linear" },
        { id: "c", text: "Cyclic" },
        { id: "d", text: "Negative" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Arithmetic growth produces a linear increase over time, as seen in a root elongating at a constant rate, plotted as a straight line.",
      difficulty: "medium",
    },
    {
      concept_id: c14a._id,
      question_text: "Geometric growth is characterized by:",
      options: [
        { id: "a", text: "A slow lag phase followed by rapid exponential growth" },
        { id: "b", text: "A constant, unchanging rate throughout" },
        { id: "c", text: "Growth that only occurs in roots" },
        { id: "d", text: "No dependence on nutrient availability" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Geometric growth shows an initial lag phase, followed by a rapid, exponential log phase, as both daughter cells continue to divide, common in most growing organs and populations.",
      difficulty: "hard",
    },
    {
      concept_id: c14a._id,
      question_text:
        "The sigmoid (S-shaped) growth curve observed in most living organisms consists of which phases in order?",
      options: [
        { id: "a", text: "Log, lag, stationary" },
        { id: "b", text: "Lag, log, stationary" },
        { id: "c", text: "Stationary, lag, log" },
        { id: "d", text: "Log, stationary, lag" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The sigmoid growth curve has an initial slow lag phase, a rapid log/exponential phase, and finally a stationary phase where growth rate levels off due to limiting factors.",
      difficulty: "hard",
    },

    {
      concept_id: c14b._id,
      question_text: "Auxins are primarily responsible for:",
      options: [
        { id: "a", text: "Leaf senescence" },
        { id: "b", text: "Cell elongation and apical dominance" },
        { id: "c", text: "Seed dormancy only" },
        { id: "d", text: "Stomatal closure only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Auxins promote cell elongation, particularly in shoots, and are responsible for apical dominance, where the growing apical bud suppresses growth of lateral buds.",
      difficulty: "easy",
    },
    {
      concept_id: c14b._id,
      question_text: "Gibberellins are well known for causing:",
      options: [
        { id: "a", text: "Dwarfism in plants" },
        { id: "b", text: "Bolting and stem elongation in genetically dwarf plants" },
        { id: "c", text: "Fruit ripening" },
        { id: "d", text: "Stomatal closure during stress" },
      ],
      correct_option_id: "b",
      explanation_text:
        'Gibberellins promote stem elongation and can cause "bolting," the rapid elongation of the stem in genetically dwarf or rosette plants.',
      difficulty: "easy",
    },
    {
      concept_id: c14b._id,
      question_text: "Cytokinins are primarily known for promoting:",
      options: [
        { id: "a", text: "Cell division (cytokinesis) and delaying senescence" },
        { id: "b", text: "Fruit abscission only" },
        { id: "c", text: "Seed dormancy" },
        { id: "d", text: "Wilting" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Cytokinins promote cell division and are especially effective at delaying senescence (aging) of leaves, a phenomenon known as the Richmond-Lang effect.",
      difficulty: "medium",
    },
    {
      concept_id: c14b._id,
      question_text: "Ethylene, a gaseous plant hormone, is best known for its role in:",
      options: [
        { id: "a", text: "Cell elongation" },
        { id: "b", text: "Fruit ripening" },
        { id: "c", text: "Photosynthesis regulation only" },
        { id: "d", text: "Root hair formation only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ethylene is widely used commercially to promote fruit ripening, as well as playing roles in senescence, abscission, and stress responses.",
      difficulty: "medium",
    },
    {
      concept_id: c14b._id,
      question_text: 'Abscisic acid (ABA) is often referred to as a "stress hormone" because it:',
      options: [
        { id: "a", text: "Promotes rapid growth under stress" },
        { id: "b", text: "Induces dormancy and stomatal closure under water stress" },
        { id: "c", text: "Only functions in seed germination" },
        { id: "d", text: "Accelerates cell division" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Abscisic acid induces dormancy in seeds and buds and triggers stomatal closure during water stress, helping plants cope with adverse conditions, hence its designation as a stress hormone.",
      difficulty: "hard",
    },
    {
      concept_id: c14b._id,
      question_text:
        "Which plant growth regulator is primarily responsible for inducing parthenocarpy (seedless fruit development) in some plants?",
      options: [
        { id: "a", text: "Abscisic acid" },
        { id: "b", text: "Auxin" },
        { id: "c", text: "Ethylene" },
        { id: "d", text: "Cytokinin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Auxin application can induce parthenocarpy, the development of fruit without fertilization, resulting in seedless fruits in species like tomato.",
      difficulty: "hard",
    },

    {
      concept_id: c14c._id,
      question_text: "Photoperiodism refers to a plant's flowering response to:",
      options: [
        { id: "a", text: "Soil pH" },
        { id: "b", text: "Relative lengths of day and night" },
        { id: "c", text: "Wind speed" },
        { id: "d", text: "Altitude" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Photoperiodism is the physiological response of plants to the relative durations of light and dark periods, which influences the timing of flowering.",
      difficulty: "easy",
    },
    {
      concept_id: c14c._id,
      question_text:
        "Plants that flower only when exposed to light periods shorter than a critical duration are called:",
      options: [
        { id: "a", text: "Long-day plants" },
        { id: "b", text: "Short-day plants" },
        { id: "c", text: "Day-neutral plants" },
        { id: "d", text: "Vernalised plants" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Short-day plants flower when the day length is shorter than a critical photoperiod, and generally flower in early spring or autumn.",
      difficulty: "easy",
    },
    {
      concept_id: c14c._id,
      question_text:
        "Plants such as certain wheat varieties that require a period of low temperature exposure to flower are said to undergo:",
      options: [
        { id: "a", text: "Photoperiodism" },
        { id: "b", text: "Vernalisation" },
        { id: "c", text: "Senescence" },
        { id: "d", text: "Abscission" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Vernalisation is the process where exposure to low temperature promotes or accelerates flowering, commonly needed by certain winter wheat varieties.",
      difficulty: "medium",
    },
    {
      concept_id: c14c._id,
      question_text: "Day-neutral plants are those in which flowering is:",
      options: [
        { id: "a", text: "Strictly dependent on long days" },
        { id: "b", text: "Strictly dependent on short days" },
        { id: "c", text: "Not affected by relative day/night length" },
        { id: "d", text: "Only triggered by darkness" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Day-neutral plants flower regardless of the relative length of day and night, showing no dependence on photoperiod for flower induction.",
      difficulty: "medium",
    },
    {
      concept_id: c14c._id,
      question_text: "The site of perception of the photoperiodic stimulus in plants is the:",
      options: [
        { id: "a", text: "Root tip" },
        { id: "b", text: "Leaf" },
        { id: "c", text: "Stem apex only" },
        { id: "d", text: "Flower petal" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Leaves are the site where the photoperiodic stimulus is perceived; the resulting flowering signal is then transmitted to the shoot apex.",
      difficulty: "hard",
    },
    {
      concept_id: c14c._id,
      question_text:
        "The pigment primarily responsible for perceiving the photoperiodic light signal in plants is:",
      options: [
        { id: "a", text: "Chlorophyll" },
        { id: "b", text: "Phytochrome" },
        { id: "c", text: "Carotenoid" },
        { id: "d", text: "Anthocyanin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Phytochrome, a photoreceptor pigment that exists in two interconvertible forms, is primarily responsible for perceiving day length and mediating the photoperiodic response.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 14 (Plant Growth and Development) done");

  // ---------- CHAPTER 15: Digestion and Absorption ----------
  const ch15 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Human Physiology",
    title: "Digestion and Absorption",
    order_index: 15,
  });

  const c15a = await Concept.create({
    chapter_id: ch15._id,
    title: "Human Alimentary Canal and Digestive Glands",
    explanation_text:
      "The human digestive system consists of the alimentary canal — mouth, pharynx, oesophagus, stomach, small intestine, and large intestine — along with associated glands such as salivary glands, liver, and pancreas that secrete digestive juices.",
  });
  const c15b = await Concept.create({
    chapter_id: ch15._id,
    title: "Digestion of Food: Enzymes and Process",
    explanation_text:
      "Digestion involves the sequential breakdown of carbohydrates, proteins, and fats by specific enzymes secreted in saliva, gastric juice, pancreatic juice, and intestinal juice, converting complex food molecules into absorbable simple forms.",
  });
  const c15c = await Concept.create({
    chapter_id: ch15._id,
    title: "Absorption of Digested Products and Digestive Disorders",
    explanation_text:
      "Digested nutrients are absorbed mainly in the small intestine via passive, active, and facilitated transport mechanisms, and disruptions to normal digestion can lead to disorders such as jaundice, diarrhoea, and peptic ulcers.",
  });

  await Question.insertMany([
    {
      concept_id: c15a._id,
      question_text: "The longest part of the human alimentary canal is the:",
      options: [
        { id: "a", text: "Oesophagus" },
        { id: "b", text: "Stomach" },
        { id: "c", text: "Small intestine" },
        { id: "d", text: "Large intestine" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The small intestine is the longest part of the alimentary canal and is the primary site of digestion and absorption of nutrients.",
      difficulty: "easy",
    },
    {
      concept_id: c15a._id,
      question_text: "The largest gland associated with the human digestive system is the:",
      options: [
        { id: "a", text: "Pancreas" },
        { id: "b", text: "Liver" },
        { id: "c", text: "Salivary gland" },
        { id: "d", text: "Gall bladder" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The liver is the largest gland in the human body and secretes bile, which plays an important role in the emulsification and digestion of fats.",
      difficulty: "easy",
    },
    {
      concept_id: c15a._id,
      question_text:
        "Bile, essential for fat digestion, is produced by the liver and stored temporarily in the:",
      options: [
        { id: "a", text: "Pancreas" },
        { id: "b", text: "Gall bladder" },
        { id: "c", text: "Stomach" },
        { id: "d", text: "Duodenum" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bile is produced by the liver and stored and concentrated in the gall bladder before being released into the duodenum to aid in fat digestion.",
      difficulty: "medium",
    },
    {
      concept_id: c15a._id,
      question_text: "The pancreas is unique among digestive glands because it functions as:",
      options: [
        { id: "a", text: "Only an exocrine gland" },
        { id: "b", text: "Only an endocrine gland" },
        { id: "c", text: "Both an exocrine and endocrine gland" },
        { id: "d", text: "Neither exocrine nor endocrine" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The pancreas is a mixed gland — its exocrine part secretes pancreatic juice into the duodenum, while its endocrine part (islets of Langerhans) secretes hormones like insulin and glucagon.",
      difficulty: "medium",
    },
    {
      concept_id: c15a._id,
      question_text: "The stomach is divided into three main regions: cardiac, fundic, and:",
      options: [
        { id: "a", text: "Pyloric" },
        { id: "b", text: "Duodenal" },
        { id: "c", text: "Ileal" },
        { id: "d", text: "Caecal" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The stomach is anatomically divided into the cardiac region (near the oesophagus), the fundic region (main body), and the pyloric region (leading to the duodenum).",
      difficulty: "hard",
    },
    {
      concept_id: c15a._id,
      question_text: "The small intestine is differentiated into three regions: duodenum, jejunum, and:",
      options: [
        { id: "a", text: "Ileum" },
        { id: "b", text: "Caecum" },
        { id: "c", text: "Colon" },
        { id: "d", text: "Rectum" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The small intestine consists of three parts — the duodenum (shortest, C-shaped), the jejunum, and the ileum (longest part, opening into the large intestine).",
      difficulty: "hard",
    },

    {
      concept_id: c15b._id,
      question_text:
        "The enzyme present in saliva that begins the digestion of starch in the mouth is:",
      options: [
        { id: "a", text: "Pepsin" },
        { id: "b", text: "Salivary amylase (ptyalin)" },
        { id: "c", text: "Trypsin" },
        { id: "d", text: "Lipase" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Salivary amylase, also called ptyalin, breaks down starch into smaller polysaccharides and disaccharides within the mouth.",
      difficulty: "easy",
    },
    {
      concept_id: c15b._id,
      question_text: "Pepsin, secreted in gastric juice, primarily acts on:",
      options: [
        { id: "a", text: "Carbohydrates" },
        { id: "b", text: "Proteins" },
        { id: "c", text: "Fats" },
        { id: "d", text: "Nucleic acids" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Pepsin is a proteolytic enzyme secreted by gastric glands that breaks down proteins into smaller peptides in the acidic environment of the stomach.",
      difficulty: "easy",
    },
    {
      concept_id: c15b._id,
      question_text:
        "The highly acidic environment of the stomach, necessary for pepsin activity, is created by:",
      options: [
        { id: "a", text: "Bile" },
        { id: "b", text: "Hydrochloric acid (HCl)" },
        { id: "c", text: "Bicarbonate ions" },
        { id: "d", text: "Pancreatic juice" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Hydrochloric acid secreted by gastric glands creates the highly acidic environment of the stomach, which is optimal for pepsin activity and also kills many ingested pathogens.",
      difficulty: "medium",
    },
    {
      concept_id: c15b._id,
      question_text: "Trypsin and chymotrypsin, secreted by the pancreas, are enzymes that digest:",
      options: [
        { id: "a", text: "Fats" },
        { id: "b", text: "Proteins" },
        { id: "c", text: "Carbohydrates" },
        { id: "d", text: "Vitamins" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Trypsin and chymotrypsin are proteolytic enzymes secreted by the pancreas that further break down proteins and peptides into smaller peptide fragments in the small intestine.",
      difficulty: "medium",
    },
    {
      concept_id: c15b._id,
      question_text: "Emulsification of fats by bile salts is important because it:",
      options: [
        { id: "a", text: "Chemically breaks down fat into fatty acids directly" },
        { id: "b", text: "Increases the surface area of fat for lipase action" },
        { id: "c", text: "Converts fat into protein" },
        { id: "d", text: "Has no role in fat digestion" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bile salts emulsify large fat globules into smaller droplets, increasing the surface area available for pancreatic lipase to act on, thereby speeding up fat digestion.",
      difficulty: "hard",
    },
    {
      concept_id: c15b._id,
      question_text:
        "The final digestion of carbohydrates and proteins into absorbable units (monosaccharides and amino acids) is completed mainly by enzymes present in:",
      options: [
        { id: "a", text: "Saliva" },
        { id: "b", text: "Gastric juice" },
        { id: "c", text: "Intestinal juice (succus entericus)" },
        { id: "d", text: "Bile" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Intestinal juice (succus entericus) contains enzymes like maltase, lactase, and dipeptidases that complete the digestion of carbohydrates and proteins into their simplest absorbable forms.",
      difficulty: "hard",
    },

    {
      concept_id: c15c._id,
      question_text:
        "The primary site of absorption of digested food in the human digestive system is the:",
      options: [
        { id: "a", text: "Stomach" },
        { id: "b", text: "Small intestine" },
        { id: "c", text: "Large intestine" },
        { id: "d", text: "Oesophagus" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The small intestine, with its highly folded surface and villi, is the primary site where digested nutrients are absorbed into the bloodstream and lymph.",
      difficulty: "easy",
    },
    {
      concept_id: c15c._id,
      question_text:
        "Finger-like projections in the small intestine that increase surface area for absorption are called:",
      options: [
        { id: "a", text: "Villi" },
        { id: "b", text: "Rugae" },
        { id: "c", text: "Papillae" },
        { id: "d", text: "Cilia" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Villi are tiny finger-like projections lining the small intestine's inner wall that greatly increase the surface area available for nutrient absorption.",
      difficulty: "easy",
    },
    {
      concept_id: c15c._id,
      question_text: "Glucose and amino acids are absorbed from the intestine mainly via:",
      options: [
        { id: "a", text: "Simple diffusion only" },
        { id: "b", text: "Active transport, coupled with sodium ion movement" },
        { id: "c", text: "No transport occurs" },
        { id: "d", text: "Osmosis only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Glucose and amino acids are largely absorbed through active transport mechanisms that are coupled with the transport of sodium ions across the intestinal epithelium.",
      difficulty: "medium",
    },
    {
      concept_id: c15c._id,
      question_text: "Digested fats (fatty acids and glycerol) are primarily absorbed into the:",
      options: [
        { id: "a", text: "Blood capillaries directly" },
        { id: "b", text: "Lymphatic vessels (lacteals)" },
        { id: "c", text: "Large intestine" },
        { id: "d", text: "Stomach lining" },
      ],
      correct_option_id: "b",
      explanation_text:
        "After absorption into intestinal epithelial cells, fatty acids and glycerol are reassembled into triglycerides and packaged for transport mainly via the lymphatic vessels called lacteals.",
      difficulty: "medium",
    },
    {
      concept_id: c15c._id,
      question_text:
        "Jaundice, a condition causing yellowing of the skin and eyes, is primarily caused by:",
      options: [
        { id: "a", text: "Excess bilirubin deposition due to liver dysfunction" },
        { id: "b", text: "Excess absorption of glucose" },
        { id: "c", text: "Deficiency of gastric acid" },
        { id: "d", text: "Excess protein digestion" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Jaundice occurs when the liver is affected and bile pigments, especially bilirubin, accumulate in body tissues, causing a yellowish discoloration of the skin and eyes.",
      difficulty: "hard",
    },
    {
      concept_id: c15c._id,
      question_text: "Peptic ulcers are commonly caused by:",
      options: [
        { id: "a", text: "Excess dietary fiber" },
        {
          id: "b",
          text: "Erosion of the stomach or duodenal lining, often linked to Helicobacter pylori infection and excess acid",
        },
        { id: "c", text: "Lack of digestive enzymes" },
        { id: "d", text: "Overproduction of bile" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Peptic ulcers develop from erosion of the mucosal lining of the stomach or duodenum, often caused by infection with Helicobacter pylori bacteria combined with excess gastric acid secretion.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 11 Batch 5 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
