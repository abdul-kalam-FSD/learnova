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

  // Gap 1 fix: this chapter lives inside the integrated "Science"
  // subject (see seedGrade10.js), tagged strand: "Biology".
  const subject = await Subject.findOne({
    grade: 10,
    name: /biology|science/i,
  });
  if (!subject) {
    console.error(
      "Grade 10 Science subject not found. Run seedGrade10.js (Batch 1) first.",
    );
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  // ---------- CHAPTER 4: Heredity and Evolution ----------
  const ch4 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Heredity and Evolution",
    title: "Heredity and Evolution",
    order_index: 4,
    strand: "Biology",
  });

  const c4a = await Concept.create({
    chapter_id: ch4._id,
    title: "Mendel's Laws of Inheritance",
    explanation_text:
      "Gregor Mendel's experiments with pea plants established the basic laws of inheritance, showing how traits are passed from parents to offspring through dominant and recessive alleles.",
  });
  const c4b = await Concept.create({
    chapter_id: ch4._id,
    title: "Sex Determination",
    explanation_text:
      "In humans, sex is determined by the combination of sex chromosomes inherited from parents — XX results in a female, XY results in a male, with the father's contribution determining the offspring's sex.",
  });
  const c4c = await Concept.create({
    chapter_id: ch4._id,
    title: "Evolution Basics",
    explanation_text:
      "Evolution is the gradual change in inherited traits of a population over generations, driven by mechanisms like natural selection, where organisms better suited to their environment survive and reproduce.",
  });

  await Question.insertMany([
    {
      concept_id: c4a._id,
      question_text:
        "Gregor Mendel conducted his famous inheritance experiments using:",
      options: [
        { id: "a", text: "Pea plants" },
        { id: "b", text: "Fruit flies" },
        { id: "c", text: "Mice" },
        { id: "d", text: "Corn plants" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mendel used pea plants to study patterns of inheritance across generations.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text:
        "A trait that is expressed even when only one copy of the allele is present is called:",
      options: [
        { id: "a", text: "Dominant" },
        { id: "b", text: "Recessive" },
        { id: "c", text: "Neutral" },
        { id: "d", text: "Hybrid" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Dominant traits are expressed in the offspring even if only one dominant allele is inherited.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text:
        "A trait that is only expressed when two copies of the allele are present is called:",
      options: [
        { id: "a", text: "Recessive" },
        { id: "b", text: "Dominant" },
        { id: "c", text: "Codominant" },
        { id: "d", text: "Linked" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Recessive traits require two copies of the recessive allele to be visibly expressed.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text:
        "The physical appearance of an organism resulting from its genes is called its:",
      options: [
        { id: "a", text: "Phenotype" },
        { id: "b", text: "Genotype" },
        { id: "c", text: "Allele" },
        { id: "d", text: "Chromosome" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Phenotype refers to the observable physical traits of an organism, resulting from its genotype.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text:
        "The genetic makeup of an organism, in terms of alleles present, is called its:",
      options: [
        { id: "a", text: "Genotype" },
        { id: "b", text: "Phenotype" },
        { id: "c", text: "Species" },
        { id: "d", text: "Trait" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Genotype refers to the specific combination of alleles an organism carries for a trait.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text:
        "In a monohybrid cross between two heterozygous parents, the expected phenotypic ratio is:",
      options: [
        { id: "a", text: "3:1" },
        { id: "b", text: "1:1" },
        { id: "c", text: "9:3:3:1" },
        { id: "d", text: "1:2:1 only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Crossing two heterozygous parents (Aa x Aa) typically produces a 3:1 phenotypic ratio in offspring.",
      difficulty: "hard",
    },

    {
      concept_id: c4b._id,
      question_text:
        "In humans, sex determination is based on which pair of chromosomes?",
      options: [
        { id: "a", text: "The 23rd pair (X and Y)" },
        { id: "b", text: "Any autosome pair" },
        { id: "c", text: "The first pair only" },
        { id: "d", text: "There is no chromosomal basis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The 23rd chromosome pair, X and Y, determines biological sex in humans.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text:
        "A human offspring with XX sex chromosomes will develop as:",
      options: [
        { id: "a", text: "Female" },
        { id: "b", text: "Male" },
        { id: "c", text: "Neither" },
        { id: "d", text: "Determined by environment only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The XX combination of sex chromosomes results in a female offspring.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text:
        "The sex chromosome contributed by the father determines the offspring's sex because:",
      options: [
        {
          id: "a",
          text: "The mother always contributes an X chromosome, while the father contributes X or Y",
        },
        { id: "b", text: "The father always contributes a Y chromosome" },
        { id: "c", text: "The mother contributes both chromosomes" },
        { id: "d", text: "Sex is randomly assigned" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Since the mother contributes only X chromosomes, the father's X or Y contribution determines the child's sex.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text:
        "A human offspring with XY sex chromosomes will develop as:",
      options: [
        { id: "a", text: "Male" },
        { id: "b", text: "Female" },
        { id: "c", text: "Neither" },
        { id: "d", text: "Cannot be determined" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The XY combination of sex chromosomes results in a male offspring.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text:
        "In humans, the probability of having a male or female child at each pregnancy is approximately:",
      options: [
        { id: "a", text: "50:50" },
        { id: "b", text: "75:25" },
        { id: "c", text: "90:10" },
        { id: "d", text: "100:0" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Since sperm carry either X or Y chromosomes in roughly equal numbers, the probability is approximately equal for each sex.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text: "Chromosomes other than the sex chromosomes are called:",
      options: [
        { id: "a", text: "Autosomes" },
        { id: "b", text: "Alleles" },
        { id: "c", text: "Gametes" },
        { id: "d", text: "Zygotes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Autosomes are all chromosomes in an organism except the sex chromosomes.",
      difficulty: "hard",
    },

    {
      concept_id: c4c._id,
      question_text:
        "The process by which organisms better suited to their environment survive and reproduce more is called:",
      options: [
        { id: "a", text: "Natural selection" },
        { id: "b", text: "Artificial selection" },
        { id: "c", text: "Genetic drift only" },
        { id: "d", text: "Mutation only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Natural selection favors organisms with traits that improve survival and reproduction in a given environment.",
      difficulty: "easy",
    },
    {
      concept_id: c4c._id,
      question_text:
        "Evolution refers to the gradual change in a population's inherited traits over:",
      options: [
        { id: "a", text: "Many generations" },
        { id: "b", text: "A single generation" },
        { id: "c", text: "One individual's lifetime" },
        { id: "d", text: "A single day" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Evolution is a long-term process, occurring gradually across many generations of a population.",
      difficulty: "easy",
    },
    {
      concept_id: c4c._id,
      question_text:
        "Structures in different species that have a common evolutionary origin but may serve different functions are called:",
      options: [
        { id: "a", text: "Homologous structures" },
        { id: "b", text: "Analogous structures" },
        { id: "c", text: "Vestigial structures only" },
        { id: "d", text: "Identical structures" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Homologous structures, like the forelimbs of mammals, share a common ancestor despite different functions.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text:
        "Structures that are reduced and functionless remnants of organs that were useful in ancestors are called:",
      options: [
        { id: "a", text: "Vestigial organs" },
        { id: "b", text: "Homologous organs" },
        { id: "c", text: "Analogous organs" },
        { id: "d", text: "Functional organs" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Vestigial organs, like the human appendix, are remnants of structures that had a function in ancestral species.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text:
        "A key raw material for evolution, providing new genetic variations, is:",
      options: [
        { id: "a", text: "Mutation" },
        { id: "b", text: "Habitat destruction" },
        { id: "c", text: "Reproduction rate alone" },
        { id: "d", text: "Climate alone" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mutations introduce new genetic variations, which natural selection can then act upon.",
      difficulty: "hard",
    },
    {
      concept_id: c4c._id,
      question_text:
        "Organs that perform similar functions but have different evolutionary origins are called:",
      options: [
        { id: "a", text: "Analogous structures" },
        { id: "b", text: "Homologous structures" },
        { id: "c", text: "Vestigial structures" },
        { id: "d", text: "Mutated structures" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Analogous structures, like the wings of insects and birds, evolved independently to serve similar functions.",
      difficulty: "hard",
    },
  ]);

  // ---------- CHAPTER 5: Our Environment ----------
  const ch5 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Our Environment",
    title: "Our Environment",
    order_index: 5,
  });

  const c5a = await Concept.create({
    chapter_id: ch5._id,
    title: "Ecosystem Basics",
    explanation_text:
      "An ecosystem consists of all living organisms (biotic components) interacting with each other and with the non-living environment (abiotic components) in a particular area.",
  });
  const c5b = await Concept.create({
    chapter_id: ch5._id,
    title: "Food Chains and Food Webs",
    explanation_text:
      "A food chain shows the linear transfer of energy from producers to various levels of consumers, while a food web represents the interconnected network of multiple food chains in an ecosystem.",
  });
  const c5c = await Concept.create({
    chapter_id: ch5._id,
    title: "Environmental Issues",
    explanation_text:
      "Human activities like deforestation, pollution, and improper waste disposal disrupt ecosystems, leading to issues such as biomagnification, habitat loss, and depletion of natural resources.",
  });

  await Question.insertMany([
    {
      concept_id: c5a._id,
      question_text:
        "The living components of an ecosystem, such as plants and animals, are called:",
      options: [
        { id: "a", text: "Biotic components" },
        { id: "b", text: "Abiotic components" },
        { id: "c", text: "Decomposer components only" },
        { id: "d", text: "Producer components only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Biotic components refer to all living organisms within an ecosystem.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text:
        "Non-living components of an ecosystem, such as air, water, and soil, are called:",
      options: [
        { id: "a", text: "Abiotic components" },
        { id: "b", text: "Biotic components" },
        { id: "c", text: "Producers" },
        { id: "d", text: "Consumers" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Abiotic components are the non-living physical and chemical factors in an ecosystem.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text:
        "Organisms that break down dead organic matter and recycle nutrients are called:",
      options: [
        { id: "a", text: "Decomposers" },
        { id: "b", text: "Producers" },
        { id: "c", text: "Primary consumers" },
        { id: "d", text: "Predators" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Decomposers, like bacteria and fungi, break down dead matter, returning nutrients to the ecosystem.",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text:
        "Organisms that produce their own food, forming the base of most ecosystems, are called:",
      options: [
        { id: "a", text: "Producers" },
        { id: "b", text: "Consumers" },
        { id: "c", text: "Decomposers" },
        { id: "d", text: "Scavengers" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Producers, like green plants, form the base of the ecosystem by making their own food via photosynthesis.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text:
        "Organisms that depend on other organisms for food, such as herbivores and carnivores, are called:",
      options: [
        { id: "a", text: "Consumers" },
        { id: "b", text: "Producers" },
        { id: "c", text: "Decomposers only" },
        { id: "d", text: "Autotrophs" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Consumers obtain energy by feeding on other organisms rather than producing their own food.",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text: "A forest ecosystem includes interactions between:",
      options: [
        {
          id: "a",
          text: "Plants, animals, and the physical environment together",
        },
        { id: "b", text: "Only plants" },
        { id: "c", text: "Only animals" },
        { id: "d", text: "Only soil and rocks" },
      ],
      correct_option_id: "a",
      explanation_text:
        "An ecosystem includes the dynamic interaction of living organisms with each other and their physical surroundings.",
      difficulty: "medium",
    },

    {
      concept_id: c5b._id,
      question_text: "A food chain represents the:",
      options: [
        {
          id: "a",
          text: "Linear transfer of energy from producers to consumers",
        },
        { id: "b", text: "Total mass of an ecosystem" },
        { id: "c", text: "Number of species present only" },
        { id: "d", text: "Water cycle in an area" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A food chain shows how energy flows in one direction, from producers through various levels of consumers.",
      difficulty: "easy",
    },
    {
      concept_id: c5b._id,
      question_text:
        "In a food chain, the organisms that eat producers directly are called:",
      options: [
        { id: "a", text: "Primary consumers" },
        { id: "b", text: "Secondary consumers" },
        { id: "c", text: "Decomposers" },
        { id: "d", text: "Tertiary consumers" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Primary consumers, typically herbivores, feed directly on producers like plants.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text: "A food web is best described as:",
      options: [
        { id: "a", text: "An interconnected network of multiple food chains" },
        { id: "b", text: "A single straight-line food chain" },
        { id: "c", text: "Only the producers in an area" },
        { id: "d", text: "A cycle involving only decomposers" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A food web represents multiple interconnected food chains, showing more realistic feeding relationships.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text:
        "As energy moves up a food chain from one trophic level to the next, the amount of usable energy:",
      options: [
        { id: "a", text: "Decreases significantly" },
        { id: "b", text: "Increases significantly" },
        { id: "c", text: "Stays exactly the same" },
        { id: "d", text: "Doubles at each level" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Only about 10% of energy is transferred to the next trophic level, with the rest lost mainly as heat.",
      difficulty: "hard",
    },
    {
      concept_id: c5b._id,
      question_text:
        "Organisms at the top of a food chain, with no natural predators, are called:",
      options: [
        { id: "a", text: "Apex predators" },
        { id: "b", text: "Producers" },
        { id: "c", text: "Primary consumers" },
        { id: "d", text: "Decomposers" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Apex predators sit at the top of the food chain and are not preyed upon by other organisms.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text:
        "The accumulation of harmful substances at increasing concentrations at higher trophic levels is called:",
      options: [
        { id: "a", text: "Biomagnification" },
        { id: "b", text: "Photosynthesis" },
        { id: "c", text: "Pollination" },
        { id: "d", text: "Decomposition" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Biomagnification occurs when toxic substances become more concentrated as they move up the food chain.",
      difficulty: "hard",
    },

    {
      concept_id: c5c._id,
      question_text:
        "The large-scale clearing of forests for other land uses is called:",
      options: [
        { id: "a", text: "Deforestation" },
        { id: "b", text: "Afforestation" },
        { id: "c", text: "Reforestation" },
        { id: "d", text: "Conservation" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Deforestation is the clearing of forested land, often disrupting ecosystems and biodiversity.",
      difficulty: "easy",
    },
    {
      concept_id: c5c._id,
      question_text:
        "Chemicals like DDT are harmful mainly because they can undergo:",
      options: [
        { id: "a", text: "Biomagnification in food chains" },
        { id: "b", text: "Rapid decomposition" },
        { id: "c", text: "Immediate breakdown in soil" },
        { id: "d", text: "No environmental persistence" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Persistent chemicals like DDT accumulate and magnify in concentration as they move up food chains.",
      difficulty: "hard",
    },
    {
      concept_id: c5c._id,
      question_text:
        "Substances that do not break down easily and persist in the environment are called:",
      options: [
        { id: "a", text: "Non-biodegradable substances" },
        { id: "b", text: "Biodegradable substances" },
        { id: "c", text: "Organic substances only" },
        { id: "d", text: "Nutrient substances" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Non-biodegradable substances, like plastics, persist in the environment for long periods without breaking down.",
      difficulty: "easy",
    },
    {
      concept_id: c5c._id,
      question_text:
        "Depletion of the ozone layer due to certain pollutants primarily results in increased:",
      options: [
        { id: "a", text: "Harmful UV radiation reaching the Earth's surface" },
        { id: "b", text: "Rainfall" },
        { id: "c", text: "Oxygen levels" },
        { id: "d", text: "Soil fertility" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A depleted ozone layer allows more harmful UV radiation to reach Earth, posing health and environmental risks.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text: "Habitat loss due to human activities primarily leads to:",
      options: [
        { id: "a", text: "Reduced biodiversity" },
        { id: "b", text: "Increased biodiversity" },
        { id: "c", text: "No ecological effect" },
        { id: "d", text: "Faster species reproduction" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Loss of habitat threatens species survival, generally leading to reduced biodiversity in an area.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text: "Proper waste disposal and recycling primarily help to:",
      options: [
        { id: "a", text: "Reduce pollution and conserve resources" },
        { id: "b", text: "Increase deforestation" },
        { id: "c", text: "Deplete the ozone layer faster" },
        { id: "d", text: "Have no environmental benefit" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Proper waste management reduces pollution and helps conserve natural resources for future use.",
      difficulty: "easy",
    },
  ]);

  // ---------- CHAPTER 6: Management of Natural Resources ----------
  const ch6 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Management of Natural Resources",
    title: "Management of Natural Resources",
    order_index: 6,
  });

  const c6a = await Concept.create({
    chapter_id: ch6._id,
    title: "Conservation of Resources",
    explanation_text:
      "Conservation involves the sustainable use and protection of natural resources like forests, water, and wildlife, to ensure their availability for future generations while balancing current needs.",
  });
  const c6b = await Concept.create({
    chapter_id: ch6._id,
    title: "The 3 R's — Reduce, Reuse, Recycle",
    explanation_text:
      "The 3 R's principle promotes sustainable resource use: reducing consumption, reusing items instead of discarding them, and recycling materials to minimize waste and conserve natural resources.",
  });
  const c6c = await Concept.create({
    chapter_id: ch6._id,
    title: "Sustainable Management",
    explanation_text:
      "Sustainable management balances the use of natural resources for current human needs with the preservation of those resources for future generations, involving community participation and long-term planning.",
  });

  await Question.insertMany([
    {
      concept_id: c6a._id,
      question_text: "The main goal of resource conservation is to:",
      options: [
        {
          id: "a",
          text: "Ensure resources remain available for future generations",
        },
        { id: "b", text: "Use up resources as quickly as possible" },
        { id: "c", text: "Stop all resource use entirely" },
        { id: "d", text: "Benefit only the current generation" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Conservation aims to balance present needs with preserving resources for the future.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text:
        "Forests are considered valuable natural resources mainly because they provide:",
      options: [
        { id: "a", text: "Biodiversity, oxygen, and raw materials" },
        { id: "b", text: "Only timber" },
        { id: "c", text: "Only tourism value" },
        { id: "d", text: "No ecological benefit" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Forests support biodiversity, produce oxygen, and provide many raw materials essential to life.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text:
        "Community participation in resource management is important mainly because local people:",
      options: [
        {
          id: "a",
          text: "Often have traditional knowledge and a direct stake in sustainable use",
        },
        { id: "b", text: "Have no interest in conservation" },
        { id: "c", text: "Should be excluded from decision-making" },
        { id: "d", text: "Always deplete resources faster" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Local communities often have valuable traditional knowledge and a vested interest in sustainably managing nearby resources.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text:
        "Water conservation methods, such as rainwater harvesting, primarily help to:",
      options: [
        { id: "a", text: "Recharge groundwater and reduce water scarcity" },
        { id: "b", text: "Increase pollution" },
        { id: "c", text: "Deplete water resources faster" },
        { id: "d", text: "Have no impact on water availability" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Rainwater harvesting captures and stores rainwater, helping recharge groundwater and reduce scarcity.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text:
        "Protected areas like wildlife sanctuaries and national parks primarily aim to:",
      options: [
        { id: "a", text: "Conserve biodiversity and natural habitats" },
        { id: "b", text: "Promote industrial development" },
        { id: "c", text: "Increase deforestation" },
        { id: "d", text: "Eliminate all human activity everywhere" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Protected areas safeguard biodiversity and natural habitats from human exploitation and destruction.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text:
        "Overexploitation of a natural resource generally leads to:",
      options: [
        { id: "a", text: "Depletion and long-term scarcity of that resource" },
        { id: "b", text: "Unlimited resource availability" },
        { id: "c", text: "Improved resource quality" },
        { id: "d", text: "No long-term effect" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Overexploitation uses resources faster than they can be replenished, leading to depletion.",
      difficulty: "hard",
    },

    {
      concept_id: c6b._id,
      question_text:
        "The 3 R's principle for sustainable resource use stands for:",
      options: [
        { id: "a", text: "Reduce, Reuse, Recycle" },
        { id: "b", text: "Remove, Repair, Replace" },
        { id: "c", text: "Reduce, Repeat, Renew" },
        { id: "d", text: "Refuse, Refresh, Repeat" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The 3 R's — Reduce, Reuse, Recycle — form a widely used framework for sustainable resource management.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text: "'Reduce' in the 3 R's principle primarily means:",
      options: [
        {
          id: "a",
          text: "Minimizing consumption of resources and generation of waste",
        },
        { id: "b", text: "Buying more products" },
        { id: "c", text: "Increasing manufacturing" },
        { id: "d", text: "Ignoring waste production" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Reducing consumption directly lowers the amount of resources used and waste generated.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text: "'Reuse' in the 3 R's principle means:",
      options: [
        { id: "a", text: "Using an item again instead of discarding it" },
        { id: "b", text: "Melting materials down for new products" },
        { id: "c", text: "Buying new products frequently" },
        { id: "d", text: "Discarding items after single use" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Reuse extends the life of an item by using it again rather than throwing it away.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text: "'Recycle' in the 3 R's principle involves:",
      options: [
        { id: "a", text: "Processing used materials to make new products" },
        { id: "b", text: "Simply throwing waste away" },
        { id: "c", text: "Using an item only once" },
        { id: "d", text: "Burning all waste" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Recycling converts waste materials into new products, reducing the need for raw resource extraction.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text: "Following the 3 R's principle generally helps to:",
      options: [
        {
          id: "a",
          text: "Conserve natural resources and reduce environmental impact",
        },
        { id: "b", text: "Increase resource extraction" },
        { id: "c", text: "Have no effect on the environment" },
        { id: "d", text: "Speed up resource depletion" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Practicing the 3 R's collectively reduces resource consumption and minimizes environmental harm.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text:
        "Among the 3 R's, which is generally considered the most effective for conserving resources?",
      options: [
        { id: "a", text: "Reduce" },
        { id: "b", text: "Recycle" },
        { id: "c", text: "Reuse only" },
        { id: "d", text: "All are equally ineffective" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Reducing consumption prevents resource use and waste from being generated in the first place, making it the most effective of the three.",
      difficulty: "hard",
    },

    {
      concept_id: c6c._id,
      question_text: "Sustainable management of resources aims to balance:",
      options: [
        {
          id: "a",
          text: "Current human needs with future resource availability",
        },
        { id: "b", text: "Only industrial profit" },
        { id: "c", text: "Only short-term consumption" },
        { id: "d", text: "Complete elimination of resource use" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Sustainable management seeks to meet present needs without compromising resources for future generations.",
      difficulty: "easy",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Long-term planning in resource management is important because it:",
      options: [
        { id: "a", text: "Helps prevent resource depletion over time" },
        { id: "b", text: "Focuses only on immediate profit" },
        { id: "c", text: "Ignores future generations' needs" },
        { id: "d", text: "Has no real benefit" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Long-term planning ensures resources are used at a sustainable rate, preventing future scarcity.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text: "The Chipko movement in India is a well-known example of:",
      options: [
        { id: "a", text: "Community-led forest conservation" },
        { id: "b", text: "Industrial deforestation" },
        { id: "c", text: "Government-only resource management" },
        { id: "d", text: "Water pollution control" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The Chipko movement involved local communities protecting forests from being cut down, embodying grassroots conservation.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Sustainable agriculture practices aim to maintain soil fertility while:",
      options: [
        { id: "a", text: "Meeting current food production needs" },
        { id: "b", text: "Depleting soil nutrients rapidly" },
        { id: "c", text: "Ignoring long-term productivity" },
        { id: "d", text: "Eliminating all farming" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Sustainable agriculture balances meeting present food needs with preserving soil health for future use.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Sustainable management of natural resources ultimately supports:",
      options: [
        { id: "a", text: "Long-term ecological and human well-being" },
        { id: "b", text: "Only short-term economic gain" },
        { id: "c", text: "Rapid resource exhaustion" },
        { id: "d", text: "Isolated, one-time resource use" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Sustainable resource management supports the well-being of both ecosystems and human communities over the long term.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 10 Batch 2 seed complete: 3 chapters, 9 concepts, 54 questions added.",
  );
  console.log(
    "Grade 10 syllabus now fully covers all 6 NCERT Class 10 Science biology-focused chapters.",
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
