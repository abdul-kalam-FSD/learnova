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

  let subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Biology", grade: 12 });
    console.log("Created new Grade 12 Biology subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- CHAPTER 10: Biotechnology and its Applications ----------
  const ch10 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Biotechnology and its Applications",
    title: "Biotechnology and its Applications",
    order_index: 10,
  });

  const c10a = await Concept.create({
    chapter_id: ch10._id,
    title: "Biotechnological Applications in Agriculture",
    explanation_text:
      "Biotechnology has been applied in agriculture to develop genetically modified (GM) crops with improved traits such as pest resistance, herbicide tolerance, and enhanced nutritional value, exemplified by Bt cotton and Golden Rice.",
  });
  const c10b = await Concept.create({
    chapter_id: ch10._id,
    title: "Biotechnological Applications in Medicine",
    explanation_text:
      "Biotechnology has significant medical applications, including the production of recombinant therapeutic proteins like insulin, gene therapy to treat genetic disorders, and molecular diagnostic techniques such as PCR and ELISA for early disease detection.",
  });
  const c10c = await Concept.create({
    chapter_id: ch10._id,
    title: "Transgenic Animals and Biosafety/Ethical Issues",
    explanation_text:
      "Transgenic animals, which carry foreign genes introduced through genetic engineering, are used in research and product development; the use of biotechnology also raises important biosafety, ethical, and legal issues, including concerns about GMOs, biopiracy, and patent rights.",
  });

  await Question.insertMany([
    {
      concept_id: c10a._id,
      question_text:
        "Bt cotton, a widely cultivated genetically modified crop, is engineered to be resistant to:",
      options: [
        { id: "a", text: "Drought conditions only" },
        { id: "b", text: "Certain insect pests (bollworms)" },
        { id: "c", text: "All plant diseases" },
        { id: "d", text: "Frost damage only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bt cotton is genetically engineered to express a toxin gene from Bacillus thuringiensis, making it resistant to certain insect pests, particularly bollworms, reducing the need for chemical pesticides.",
      difficulty: "easy",
    },
    {
      concept_id: c10a._id,
      question_text: "The toxin genes used in Bt crops are originally derived from which organism?",
      options: [
        { id: "a", text: "Escherichia coli" },
        { id: "b", text: "Bacillus thuringiensis (a bacterium)" },
        { id: "c", text: "Saccharomyces cerevisiae" },
        { id: "d", text: "Plasmodium falciparum" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The insecticidal toxin genes used in Bt crops are derived from the soil bacterium Bacillus thuringiensis, which naturally produces proteins toxic to specific insect larvae.",
      difficulty: "easy",
    },
    {
      concept_id: c10a._id,
      question_text:
        "Golden Rice, a genetically modified crop developed to address nutritional deficiencies, is engineered to have enhanced levels of:",
      options: [
        { id: "a", text: "Iron only" },
        { id: "b", text: "Vitamin A (beta-carotene)" },
        { id: "c", text: "Vitamin C" },
        { id: "d", text: "Protein content only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Golden Rice was genetically engineered to biosynthesize and accumulate beta-carotene (a precursor of vitamin A) in the edible parts of the rice grain, aiming to address vitamin A deficiency in populations reliant on rice as a staple food.",
      difficulty: "medium",
    },
    {
      concept_id: c10a._id,
      question_text: "Herbicide-tolerant genetically modified crops are engineered so that farmers can:",
      options: [
        { id: "a", text: "Never use any herbicides" },
        {
          id: "b",
          text: "Apply herbicides to control weeds without harming the crop itself",
        },
        { id: "c", text: "Increase weed growth intentionally" },
        { id: "d", text: "Avoid planting seeds altogether" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Herbicide-tolerant GM crops are engineered to resist the effects of specific herbicides, allowing farmers to apply these herbicides to control weeds without damaging the crop itself.",
      difficulty: "medium",
    },
    {
      concept_id: c10a._id,
      question_text:
        "Bt toxin proteins are generally considered safe for use against target insect pests while being less harmful to other organisms because they:",
      options: [
        { id: "a", text: "Are toxic to all forms of life equally" },
        {
          id: "b",
          text: "Require specific conditions (like an alkaline gut environment) found mainly in target insects to become active",
        },
        { id: "c", text: "Are always inactive under any conditions" },
        { id: "d", text: "Only work in aquatic organisms" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bt toxin proteins are produced as inactive protoxins that require specific alkaline conditions, typically found in the gut of target insects, to be converted into their active, toxic form, making them relatively selective and less harmful to non-target organisms.",
      difficulty: "hard",
    },
    {
      concept_id: c10a._id,
      question_text:
        "A significant debate surrounding GM crops involves concerns about their potential impact on:",
      options: [
        { id: "a", text: "Only crop yield, with no other considerations" },
        {
          id: "b",
          text: "Biodiversity, ecological balance, and long-term environmental and health effects",
        },
        { id: "c", text: "Only the taste of food, with no other implications" },
        { id: "d", text: "No debate exists regarding GM crops" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The use of GM crops has generated ongoing debate and concern regarding their potential long-term effects on biodiversity, ecological balance, and human health, prompting careful regulatory assessment before widespread adoption.",
      difficulty: "hard",
    },

    {
      concept_id: c10b._id,
      question_text:
        "Human insulin, produced using recombinant DNA technology, was one of the first therapeutic products of biotechnology, marketed under the trade name:",
      options: [
        { id: "a", text: "Penicillin" },
        { id: "b", text: "Humulin" },
        { id: "c", text: "Aspirin" },
        { id: "d", text: "Streptomycin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Humulin, human insulin produced using recombinant DNA technology by inserting the human insulin gene into bacteria, was one of the first biotechnology-derived therapeutic products to be approved for medical use.",
      difficulty: "easy",
    },
    {
      concept_id: c10b._id,
      question_text: "Gene therapy is a medical approach that attempts to treat genetic disorders by:",
      options: [
        { id: "a", text: "Removing all genes from affected cells" },
        {
          id: "b",
          text: "Introducing a normal, functional gene to compensate for a defective or missing gene",
        },
        { id: "c", text: "Only treating symptoms with medication, with no genetic component" },
        { id: "d", text: "Eliminating the immune system entirely" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Gene therapy involves introducing a normal, functional copy of a gene into an individual's cells to compensate for a defective or missing gene, aiming to correct the underlying cause of a genetic disorder.",
      difficulty: "easy",
    },
    {
      concept_id: c10b._id,
      question_text:
        "One of the earliest recorded successful applications of gene therapy was used to treat a child suffering from a deficiency of which enzyme?",
      options: [
        { id: "a", text: "Insulin" },
        { id: "b", text: "Adenosine deaminase (ADA)" },
        { id: "c", text: "Amylase" },
        { id: "d", text: "Pepsin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "One of the earliest successful gene therapy cases involved treating a child with adenosine deaminase (ADA) deficiency, a genetic disorder affecting the immune system, by introducing a functional copy of the ADA gene.",
      difficulty: "medium",
    },
    {
      concept_id: c10b._id,
      question_text:
        "ELISA (Enzyme-Linked Immunosorbent Assay), a widely used diagnostic technique, primarily works based on the principle of:",
      options: [
        { id: "a", text: "DNA amplification only" },
        {
          id: "b",
          text: "Antigen-antibody interaction, detected through an enzyme-linked color reaction",
        },
        { id: "c", text: "Restriction enzyme digestion" },
        { id: "d", text: "Gel electrophoresis alone" },
      ],
      correct_option_id: "b",
      explanation_text:
        "ELISA is based on the specific interaction between antigens and antibodies, using an enzyme-linked reaction to produce a detectable signal (often a color change), commonly used to diagnose infections and other conditions.",
      difficulty: "medium",
    },
    {
      concept_id: c10b._id,
      question_text:
        "PCR-based diagnostic techniques are particularly valuable in medicine because they allow detection of pathogens:",
      options: [
        { id: "a", text: "Only after the disease has caused irreversible damage" },
        {
          id: "b",
          text: "Even when present in very low, otherwise undetectable quantities, enabling early diagnosis",
        },
        { id: "c", text: "Only in extremely large quantities" },
        { id: "d", text: "Only in dead, non-infectious samples" },
      ],
      correct_option_id: "b",
      explanation_text:
        "PCR-based diagnostic techniques are highly valuable because they can amplify and detect even minute quantities of a pathogen's genetic material, allowing for early and highly sensitive diagnosis of infections.",
      difficulty: "hard",
    },
    {
      concept_id: c10b._id,
      question_text:
        "Recombinant DNA technology has also enabled the production of monoclonal antibodies, which are valuable in medicine because they:",
      options: [
        {
          id: "a",
          text: "Are always identical to naturally-occurring antibodies produced without any biotechnology",
        },
        {
          id: "b",
          text: "Are highly specific antibodies produced from a single clone of cells, useful in diagnostics and targeted therapies",
        },
        { id: "c", text: "Cannot be used for any diagnostic purposes" },
        { id: "d", text: "Only work against bacterial infections" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Monoclonal antibodies, produced from a single clone of antibody-producing cells using biotechnological techniques, are highly specific and widely used in diagnostic tests and targeted therapies, including certain cancer treatments.",
      difficulty: "hard",
    },

    {
      concept_id: c10c._id,
      question_text: "Transgenic animals are animals that:",
      options: [
        {
          id: "a",
          text: "Have had a portion of their genome deliberately modified/manipulated by introducing foreign genetic material",
        },
        { id: "b", text: "Have never been genetically studied" },
        { id: "c", text: "Are exact clones of another species" },
        { id: "d", text: "Have no functional genes at all" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Transgenic animals are those in which a foreign gene has been deliberately introduced and integrated into their genome, often to study gene function or to produce specific biological products.",
      difficulty: "easy",
    },
    {
      concept_id: c10c._id,
      question_text: "Transgenic mice have been extensively used in biomedical research primarily to:",
      options: [
        { id: "a", text: "Replace all other laboratory animals immediately" },
        { id: "b", text: "Study the function of specific genes and model human diseases" },
        { id: "c", text: "Avoid any form of genetic experimentation" },
        { id: "d", text: "Produce food products only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Transgenic mice, engineered to carry specific genetic modifications, are widely used in biomedical research to study gene function, understand disease mechanisms, and test potential therapies by modeling human diseases.",
      difficulty: "easy",
    },
    {
      concept_id: c10c._id,
      question_text:
        "Biosafety concerns related to genetically modified organisms (GMOs) primarily focus on assessing their potential impact on:",
      options: [
        { id: "a", text: "Only economic factors, with no biological considerations" },
        { id: "b", text: "Human health and the environment" },
        { id: "c", text: "Only aesthetic qualities of food" },
        { id: "d", text: "No concerns exist regarding GMOs" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Biosafety assessments of GMOs primarily focus on evaluating their potential risks and impacts on human health and the surrounding environment before they are approved for widespread use.",
      difficulty: "medium",
    },
    {
      concept_id: c10c._id,
      question_text: '"Biopiracy" refers to the concern that:',
      options: [
        { id: "a", text: "Organisms are being illegally captured for zoos" },
        {
          id: "b",
          text: "Bio-resources and traditional knowledge from a country/community may be used and patented by others without fair compensation or consent",
        },
        { id: "c", text: "Biotechnology companies always share profits fairly" },
        { id: "d", text: "No legal issues arise from bioresource use" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Biopiracy refers to the exploitation of biological resources and traditional knowledge, often from developing countries or indigenous communities, by other entities who may patent products derived from them without adequate compensation or consent.",
      difficulty: "medium",
    },
    {
      concept_id: c10c._id,
      question_text:
        "Patents related to biotechnological inventions, such as a specific genetically modified organism or process, are intended to:",
      options: [
        { id: "a", text: "Prevent the inventor from having any rights over their invention" },
        {
          id: "b",
          text: "Grant the inventor exclusive rights to their invention for a specified period, protecting their intellectual property",
        },
        { id: "c", text: "Make all inventions immediately public domain with no protection" },
        { id: "d", text: "Only apply to non-biological inventions" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Patents grant inventors exclusive rights over their inventions, including biotechnological innovations, for a specified period, providing legal protection and incentive for innovation while defining terms for use by others.",
      difficulty: "hard",
    },
    {
      concept_id: c10c._id,
      question_text:
        "The debate over the ethical use of transgenic technology in animals often centers on concerns about:",
      options: [
        { id: "a", text: "Complete absence of any impact on animal welfare" },
        {
          id: "b",
          text: "Animal welfare, unintended consequences, and the broader ethical implications of genetic manipulation",
        },
        { id: "c", text: "Only financial cost, with no ethical dimension" },
        { id: "d", text: "No debate exists on this topic" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The use of transgenic technology in animals raises important ethical questions related to animal welfare, the potential for unintended biological consequences, and broader societal concerns about the extent and implications of genetic manipulation.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 10 (Biotechnology and its Applications) done");

  // ---------- CHAPTER 11: Organisms and Populations ----------
  const ch11 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Ecology",
    title: "Organisms and Populations",
    order_index: 11,
  });

  const c11a = await Concept.create({
    chapter_id: ch11._id,
    title: "Organisms and Their Environment",
    explanation_text:
      "Organisms interact with their environment and are influenced by abiotic factors like temperature, water, and light; they exhibit adaptations such as morphological, physiological, and behavioral traits that enable survival in specific habitats.",
  });
  const c11b = await Concept.create({
    chapter_id: ch11._id,
    title: "Population Attributes and Growth Models",
    explanation_text:
      "A population, a group of interbreeding individuals of a species in a given area, is characterized by attributes like population density, birth and death rates, and age distribution; population growth follows models such as exponential and logistic growth.",
  });
  const c11c = await Concept.create({
    chapter_id: ch11._id,
    title: "Population Interactions",
    explanation_text:
      "Populations of different species interact in various ways, including predation, competition, mutualism, commensalism, and parasitism, each shaping community structure and the survival and evolution of interacting species.",
  });

  await Question.insertMany([
    {
      concept_id: c11a._id,
      question_text: "Abiotic factors in an environment refer to:",
      options: [
        { id: "a", text: "Only living organisms present" },
        {
          id: "b",
          text: "Non-living physical and chemical factors such as temperature, water, and light",
        },
        { id: "c", text: "Only human-made structures" },
        { id: "d", text: "Only microorganisms" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Abiotic factors are the non-living physical and chemical components of an environment, such as temperature, water availability, light, and soil composition, which significantly influence the distribution and survival of organisms.",
      difficulty: "easy",
    },
    {
      concept_id: c11a._id,
      question_text: "Organisms that can tolerate and survive a wide range of temperatures are termed:",
      options: [
        { id: "a", text: "Stenothermal" },
        { id: "b", text: "Eurythermal" },
        { id: "c", text: "Halophilic" },
        { id: "d", text: "Xerophytic" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Eurythermal organisms are those capable of tolerating and surviving a wide range of temperature fluctuations in their environment, unlike stenothermal organisms which can only survive within a narrow temperature range.",
      difficulty: "easy",
    },
    {
      concept_id: c11a._id,
      question_text:
        "Organisms adapted to survive in low-water, arid environments, such as cacti, are termed:",
      options: [
        { id: "a", text: "Hydrophytes" },
        { id: "b", text: "Xerophytes" },
        { id: "c", text: "Mesophytes" },
        { id: "d", text: "Halophytes" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Xerophytes are plants specifically adapted to survive in arid, water-scarce environments, often showing features like reduced leaf surface area, thick cuticles, and water-storing tissues to minimize water loss.",
      difficulty: "medium",
    },
    {
      concept_id: c11a._id,
      question_text:
        "The physiological adaptation observed in some desert mammals, allowing them to concentrate urine and minimize water loss, primarily helps them cope with:",
      options: [
        { id: "a", text: "Excess water in their environment" },
        { id: "b", text: "Water scarcity in their habitat" },
        { id: "c", text: "Extremely low temperatures only" },
        { id: "d", text: "High predation pressure only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Many desert mammals have evolved physiological adaptations, such as producing highly concentrated urine, to minimize water loss and cope effectively with the water scarcity characteristic of desert environments.",
      difficulty: "medium",
    },
    {
      concept_id: c11a._id,
      question_text:
        "Kangaroo rats, native to North American deserts, are notable for their ability to survive without ever drinking water, relying instead on:",
      options: [
        { id: "a", text: "Water obtained through internal metabolic processes (metabolic water)" },
        { id: "b", text: "Constant rainfall in their habitat" },
        { id: "c", text: "Water stored in nearby lakes only" },
        { id: "d", text: "No water requirement at all" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Kangaroo rats can survive without drinking water by relying on metabolic water produced internally during the breakdown of food, along with highly efficient kidneys that minimize water loss.",
      difficulty: "hard",
    },
    {
      concept_id: c11a._id,
      question_text:
        "Migration, a behavioral adaptation seen in many animal species, primarily helps organisms cope with:",
      options: [
        { id: "a", text: "Permanent, unchanging environmental conditions" },
        {
          id: "b",
          text: "Unfavorable seasonal changes, by moving to more favorable habitats temporarily",
        },
        { id: "c", text: "Excessive food abundance only" },
        { id: "d", text: "No environmental challenges at all" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Migration is a behavioral adaptation in which animals move, often seasonally, to more favorable environments in response to unfavorable conditions such as extreme cold, drought, or scarcity of food, and often return once conditions improve.",
      difficulty: "hard",
    },

    {
      concept_id: c11b._id,
      question_text: "Population density refers to the:",
      options: [
        { id: "a", text: "Total number of species in an area" },
        { id: "b", text: "Number of individuals of a species per unit area or volume" },
        { id: "c", text: "Rate of migration only" },
        { id: "d", text: "Age distribution of a population" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Population density refers to the number of individuals of a particular species present per unit area or volume at a given time, an important attribute for studying population dynamics.",
      difficulty: "easy",
    },
    {
      concept_id: c11b._id,
      question_text:
        "The birth rate and death rate of a population, along with immigration and emigration, are key factors that determine:",
      options: [
        { id: "a", text: "The genetic code of a species" },
        { id: "b", text: "Changes in population size over time" },
        { id: "c", text: "The habitat type only" },
        { id: "d", text: "The taxonomic classification of the species" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Population size changes over time are primarily driven by birth rate, death rate, immigration, and emigration, which together determine whether a population grows, shrinks, or remains stable.",
      difficulty: "easy",
    },
    {
      concept_id: c11b._id,
      question_text: "In exponential growth, a population grows:",
      options: [
        { id: "a", text: "At a constant, unchanging absolute rate" },
        {
          id: "b",
          text: "Rapidly, with the growth rate increasing as population size increases, given unlimited resources",
        },
        { id: "c", text: "Only when resources become scarce" },
        { id: "d", text: "Never, under any circumstances" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Exponential growth occurs when a population has access to unlimited resources, resulting in a J-shaped growth curve where the population grows increasingly rapidly over time.",
      difficulty: "medium",
    },
    {
      concept_id: c11b._id,
      question_text:
        "The logistic growth model differs from exponential growth mainly because it incorporates the concept of:",
      options: [
        { id: "a", text: "Unlimited resources indefinitely" },
        { id: "b", text: "Carrying capacity, the maximum population size an environment can sustain" },
        { id: "c", text: "Zero population growth at all times" },
        { id: "d", text: "Complete absence of any limiting factors" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The logistic growth model incorporates the carrying capacity (K) of the environment, the maximum population size that available resources can sustainably support, resulting in an S-shaped (sigmoid) growth curve as growth slows near this limit.",
      difficulty: "medium",
    },
    {
      concept_id: c11b._id,
      question_text:
        "The age pyramid of a population, showing the proportion of individuals in different age groups, can indicate whether a population is:",
      options: [
        { id: "a", text: "Growing, stable, or declining" },
        { id: "b", text: "Only affected by temperature" },
        { id: "c", text: "Composed entirely of one age group always" },
        { id: "d", text: "Unrelated to reproductive patterns" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The shape of a population's age pyramid, reflecting the relative proportions of pre-reproductive, reproductive, and post-reproductive individuals, can indicate whether the population is growing, stable, or declining over time.",
      difficulty: "hard",
    },
    {
      concept_id: c11b._id,
      question_text:
        "When a population's growth rate slows down as it approaches the carrying capacity of its environment, this pattern is best represented by:",
      options: [
        { id: "a", text: "A straight, linear growth line" },
        { id: "b", text: "A J-shaped exponential growth curve" },
        { id: "c", text: "An S-shaped (sigmoid) logistic growth curve" },
        { id: "d", text: "A completely random, unpredictable pattern" },
      ],
      correct_option_id: "c",
      explanation_text:
        "As a population approaches the carrying capacity of its environment, resource limitations cause its growth rate to slow, producing a characteristic S-shaped (sigmoid) logistic growth curve rather than continuing exponential growth.",
      difficulty: "hard",
    },

    {
      concept_id: c11c._id,
      question_text: "Predation is an interaction in which:",
      options: [
        { id: "a", text: "Two species compete for the same limited resource" },
        {
          id: "b",
          text: "One organism (the predator) captures and feeds on another organism (the prey)",
        },
        { id: "c", text: "Both organisms benefit equally" },
        { id: "d", text: "Neither organism is affected" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Predation is an ecological interaction in which one organism, the predator, hunts, captures, and feeds on another organism, the prey, influencing population dynamics of both species.",
      difficulty: "easy",
    },
    {
      concept_id: c11c._id,
      question_text:
        "Competition, as an ecological interaction, occurs when two or more species (or individuals):",
      options: [
        { id: "a", text: "Cooperate to share resources evenly with no conflict" },
        {
          id: "b",
          text: "Vie for the same limited resource, such as food or space, often resulting in a negative impact on one or both",
        },
        { id: "c", text: "Have no interaction with each other whatsoever" },
        { id: "d", text: "Always benefit mutually with no drawbacks" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Competition occurs when two or more species or individuals require the same limited resource, such as food, water, or space, often resulting in a negative impact on the growth, survival, or reproduction of the competing parties.",
      difficulty: "easy",
    },
    {
      concept_id: c11c._id,
      question_text: "Mutualism is a type of symbiotic interaction in which:",
      options: [
        { id: "a", text: "Both interacting species benefit from the relationship" },
        { id: "b", text: "One species benefits while the other is harmed" },
        { id: "c", text: "One species benefits while the other is unaffected" },
        { id: "d", text: "Both species are harmed" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mutualism is a symbiotic relationship in which both interacting species derive some benefit, such as the relationship between certain plants and their pollinators, or between mycorrhizal fungi and plant roots.",
      difficulty: "medium",
    },
    {
      concept_id: c11c._id,
      question_text:
        "Commensalism, another type of ecological interaction, is characterized by a relationship in which:",
      options: [
        { id: "a", text: "Both species are harmed equally" },
        { id: "b", text: "One species benefits while the other is neither helped nor harmed" },
        { id: "c", text: "Both species always benefit equally" },
        { id: "d", text: "One species is destroyed by the other completely" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Commensalism is an interaction in which one species benefits from the relationship, while the other species is neither significantly helped nor harmed, such as certain epiphytic plants growing on trees for physical support.",
      difficulty: "medium",
    },
    {
      concept_id: c11c._id,
      question_text:
        "Parasitism is an interaction in which one organism, the parasite, benefits at the expense of:",
      options: [
        { id: "a", text: "No other organism at all" },
        { id: "b", text: "Another organism, the host, which is harmed by the relationship" },
        { id: "c", text: "Only non-living matter" },
        { id: "d", text: "Only its own offspring" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Parasitism is an interaction in which the parasite derives nutrients and benefits from a host organism, often causing harm to the host in the process, as seen with tapeworms living in a host's intestine.",
      difficulty: "hard",
    },
    {
      concept_id: c11c._id,
      question_text:
        'According to the "Competitive Exclusion Principle," two species competing intensely for exactly the same limited resource in the same habitat generally cannot:',
      options: [
        { id: "a", text: "Ever interact with each other" },
        {
          id: "b",
          text: "Coexist indefinitely, as one species will typically outcompete and displace the other over time",
        },
        { id: "c", text: "Both survive with no consequences at all" },
        { id: "d", text: "Occupy different habitats" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Competitive Exclusion Principle states that two species competing intensely for the exact same limited resource within the same habitat generally cannot coexist indefinitely, as one species will typically outcompete and eventually displace the other.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 11 (Organisms and Populations) done");

  // ---------- CHAPTER 12: Ecosystem ----------
  const ch12 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Ecology",
    title: "Ecosystem",
    order_index: 12,
  });

  const c12a = await Concept.create({
    chapter_id: ch12._id,
    title: "Ecosystem Structure and Productivity",
    explanation_text:
      "An ecosystem consists of biotic (living) and abiotic (non-living) components interacting within a defined area; productivity refers to the rate of biomass production, categorized as gross primary productivity and net primary productivity.",
  });
  const c12b = await Concept.create({
    chapter_id: ch12._id,
    title: "Decomposition and Energy Flow",
    explanation_text:
      "Decomposition is the process by which decomposers break down dead organic matter, releasing nutrients back into the ecosystem; energy flow in ecosystems is unidirectional, moving from producers through various trophic levels, with significant energy loss at each transfer.",
  });
  const c12c = await Concept.create({
    chapter_id: ch12._id,
    title: "Ecological Pyramids and Nutrient Cycling",
    explanation_text:
      "Ecological pyramids graphically represent the trophic structure of an ecosystem in terms of numbers, biomass, or energy at each trophic level; nutrient cycling describes the continuous movement of essential nutrients, such as carbon and nitrogen, between organisms and their environment.",
  });

  await Question.insertMany([
    {
      concept_id: c12a._id,
      question_text: "An ecosystem is best defined as a functional unit consisting of:",
      options: [
        { id: "a", text: "Only living organisms in a region" },
        {
          id: "b",
          text: "Biotic communities interacting with their abiotic (non-living) environment",
        },
        { id: "c", text: "Only abiotic factors like rocks and water" },
        { id: "d", text: "Only a single species population" },
      ],
      correct_option_id: "b",
      explanation_text:
        "An ecosystem is a functional ecological unit consisting of a community of living organisms (biotic components) interacting with each other and with their non-living, physical environment (abiotic components).",
      difficulty: "easy",
    },
    {
      concept_id: c12a._id,
      question_text: "Producers in an ecosystem, primarily green plants and certain bacteria, are important because they:",
      options: [
        { id: "a", text: "Consume other organisms for energy" },
        {
          id: "b",
          text: "Convert solar energy into chemical energy through photosynthesis, forming the base of the food chain",
        },
        { id: "c", text: "Decompose dead organic matter only" },
        { id: "d", text: "Have no role in energy flow" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Producers, mainly green plants and photosynthetic bacteria, are autotrophic organisms that capture solar energy and convert it into chemical energy through photosynthesis, forming the foundational energy source for the rest of the ecosystem.",
      difficulty: "easy",
    },
    {
      concept_id: c12a._id,
      question_text: "Gross Primary Productivity (GPP) refers to:",
      options: [
        { id: "a", text: "The total rate of organic matter production by producers through photosynthesis" },
        { id: "b", text: "Only the energy consumed by decomposers" },
        { id: "c", text: "The energy lost through respiration alone" },
        { id: "d", text: "The energy transferred only to secondary consumers" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Gross Primary Productivity (GPP) is the total rate at which producers in an ecosystem produce organic matter (biomass) through photosynthesis, before accounting for respiratory losses.",
      difficulty: "medium",
    },
    {
      concept_id: c12a._id,
      question_text: "Net Primary Productivity (NPP) is calculated as:",
      options: [
        { id: "a", text: "GPP plus respiratory losses" },
        { id: "b", text: "GPP minus respiratory losses (energy used by producers for their own respiration)" },
        { id: "c", text: "Only the energy consumed by herbivores" },
        { id: "d", text: "Completely unrelated to GPP" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Net Primary Productivity (NPP) is calculated by subtracting the energy lost through the respiration of producers from the Gross Primary Productivity (GPP), representing the energy actually available for consumption by heterotrophs.",
      difficulty: "medium",
    },
    {
      concept_id: c12a._id,
      question_text:
        "Ecosystems with the highest net primary productivity per unit area, among terrestrial ecosystems, are generally:",
      options: [
        { id: "a", text: "Deserts" },
        { id: "b", text: "Tropical rainforests" },
        { id: "c", text: "Polar tundra" },
        { id: "d", text: "Grasslands with sparse vegetation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Tropical rainforests generally have among the highest net primary productivity per unit area among terrestrial ecosystems, due to abundant sunlight, warm temperatures, and high rainfall favoring vigorous plant growth.",
      difficulty: "hard",
    },
    {
      concept_id: c12a._id,
      question_text: "Standing crop, in the context of ecosystem structure, refers to:",
      options: [
        { id: "a", text: "Only crops grown by farmers" },
        { id: "b", text: "The amount of biomass present in a particular trophic level at any given time" },
        { id: "c", text: "The rate of energy loss only" },
        { id: "d", text: "The number of species present, with no reference to biomass" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Standing crop refers to the total mass of living organisms (biomass) present within a particular trophic level of an ecosystem at a given point in time, an important measure of ecosystem structure.",
      difficulty: "hard",
    },

    {
      concept_id: c12b._id,
      question_text: "Decomposers, such as fungi and bacteria, primarily function in an ecosystem to:",
      options: [
        { id: "a", text: "Produce food through photosynthesis" },
        {
          id: "b",
          text: "Break down dead organic matter and release nutrients back into the environment",
        },
        { id: "c", text: "Directly consume living plants only" },
        { id: "d", text: "Prevent any nutrient cycling" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Decomposers, mainly fungi and bacteria, break down dead organic matter (detritus) through decomposition, releasing essential nutrients back into the soil and environment for reuse by producers.",
      difficulty: "easy",
    },
    {
      concept_id: c12b._id,
      question_text:
        "The energy flow within an ecosystem, moving from producers to various levels of consumers, is generally described as:",
      options: [
        { id: "a", text: "Bidirectional and cyclical" },
        { id: "b", text: "Unidirectional, moving in one direction from producers upward through trophic levels" },
        { id: "c", text: "Completely random with no defined pathway" },
        { id: "d", text: "Only occurring among decomposers" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Energy flow in an ecosystem is fundamentally unidirectional, flowing from producers through successive trophic levels (herbivores, carnivores, etc.), unlike nutrients which are cycled and reused.",
      difficulty: "easy",
    },
    {
      concept_id: c12b._id,
      question_text:
        "According to the ten percent law of energy transfer, when energy moves from one trophic level to the next, approximately what percentage of energy is typically transferred?",
      options: [
        { id: "a", text: "100%" },
        { id: "b", text: "50%" },
        { id: "c", text: "10%" },
        { id: "d", text: "90%" },
      ],
      correct_option_id: "c",
      explanation_text:
        "According to the ten percent law, only about 10% of the energy present at one trophic level is typically transferred to and stored as biomass in the next trophic level, with the rest lost primarily as heat through respiration.",
      difficulty: "medium",
    },
    {
      concept_id: c12b._id,
      question_text:
        "The first step in the process of decomposition, in which large organic particles are broken down into smaller ones, is called:",
      options: [
        { id: "a", text: "Humification" },
        { id: "b", text: "Fragmentation" },
        { id: "c", text: "Mineralization" },
        { id: "d", text: "Catabolism only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fragmentation is the initial step of decomposition, in which detritivores break down large pieces of dead organic matter into smaller fragments, increasing the surface area available for further microbial decomposition.",
      difficulty: "medium",
    },
    {
      concept_id: c12b._id,
      question_text:
        "Humus, a dark-colored, amorphous substance formed during decomposition, is significant because it:",
      options: [
        { id: "a", text: "Is highly susceptible to further microbial attack and decomposes quickly" },
        {
          id: "b",
          text: "Is resistant to rapid microbial decomposition, acting as a reservoir of nutrients over time",
        },
        { id: "c", text: "Has no role in nutrient cycling" },
        { id: "d", text: "Consists purely of inorganic minerals" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Humus is a dark, amorphous substance formed during decomposition that is relatively resistant to further rapid microbial breakdown, acting as an important long-term reservoir of nutrients within the soil.",
      difficulty: "hard",
    },
    {
      concept_id: c12b._id,
      question_text:
        "The rate of decomposition in an ecosystem is significantly influenced by environmental factors such as:",
      options: [
        { id: "a", text: "Only the color of the soil" },
        { id: "b", text: "Temperature and moisture availability" },
        { id: "c", text: "The number of predators present only" },
        { id: "d", text: "The amount of sunlight reaching decomposers, with no other factors" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The rate of decomposition is strongly influenced by environmental conditions, particularly temperature and moisture, as warm and moist conditions generally favor faster microbial activity and decomposition compared to cold or dry conditions.",
      difficulty: "hard",
    },

    {
      concept_id: c12c._id,
      question_text: "A pyramid of numbers in an ecosystem represents the:",
      options: [
        { id: "a", text: "Total biomass at each trophic level only" },
        { id: "b", text: "Number of individual organisms present at each trophic level" },
        { id: "c", text: "Only the energy flow, not organism counts" },
        { id: "d", text: "Amount of oxygen produced at each level" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A pyramid of numbers represents the total number of individual organisms present at each successive trophic level within a given ecosystem.",
      difficulty: "easy",
    },
    {
      concept_id: c12c._id,
      question_text: "A pyramid of energy in an ecosystem is always:",
      options: [
        { id: "a", text: "Inverted, with more energy at higher trophic levels" },
        {
          id: "b",
          text: "Upright, since energy decreases at each successive trophic level due to energy loss",
        },
        { id: "c", text: "Impossible to construct" },
        { id: "d", text: "Completely flat, with equal energy at all levels" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A pyramid of energy is always upright, since energy is progressively lost (mainly as heat through respiration) at each successive trophic level, meaning lower trophic levels always contain more energy than higher ones.",
      difficulty: "easy",
    },
    {
      concept_id: c12c._id,
      question_text:
        'In certain aquatic ecosystems, the pyramid of biomass can appear "inverted" because:',
      options: [
        { id: "a", text: "Producers always have far greater biomass than consumers" },
        {
          id: "b",
          text: "The biomass of primary producers (like phytoplankton) at any instant may be less than the biomass of consumers, due to their rapid turnover",
        },
        { id: "c", text: "Energy never flows in aquatic ecosystems" },
        { id: "d", text: "There are no decomposers in aquatic systems" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In certain aquatic ecosystems, the standing biomass of rapidly reproducing primary producers, such as phytoplankton, may be lower than that of consumers at any given moment, despite high productivity, resulting in an inverted pyramid of biomass.",
      difficulty: "medium",
    },
    {
      concept_id: c12c._id,
      question_text:
        "The carbon cycle, an important biogeochemical cycle, primarily involves the movement of carbon between the atmosphere and living organisms through processes such as:",
      options: [
        { id: "a", text: "Only volcanic eruptions" },
        { id: "b", text: "Photosynthesis and respiration" },
        { id: "c", text: "Only industrial processes" },
        { id: "d", text: "Only decomposition, with no other processes involved" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The carbon cycle involves the continuous movement of carbon between the atmosphere, living organisms, and the environment, primarily through processes like photosynthesis (which removes atmospheric CO2) and respiration/decomposition (which release CO2 back into the atmosphere).",
      difficulty: "medium",
    },
    {
      concept_id: c12c._id,
      question_text:
        "Nitrogen fixation, an essential step in the nitrogen cycle, involves converting atmospheric nitrogen gas (N2) into a form usable by plants, primarily carried out by:",
      options: [
        { id: "a", text: "Green plants directly, without any microbial assistance" },
        {
          id: "b",
          text: "Certain bacteria (such as Rhizobium) and some abiotic processes like lightning",
        },
        { id: "c", text: "Only fungi" },
        { id: "d", text: "Only animals through respiration" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Nitrogen fixation, the conversion of inert atmospheric nitrogen gas into usable forms like ammonia, is primarily carried out by certain nitrogen-fixing bacteria (such as Rhizobium), along with some abiotic processes like lightning and industrial fixation.",
      difficulty: "hard",
    },
    {
      concept_id: c12c._id,
      question_text:
        "Denitrification, a key process in the nitrogen cycle, involves converting nitrates back into:",
      options: [
        { id: "a", text: "Ammonia only" },
        { id: "b", text: "Atmospheric nitrogen gas (N2), returning it to the atmosphere" },
        { id: "c", text: "Organic nitrogen compounds only, remaining in soil" },
        { id: "d", text: "Oxygen gas" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Denitrification is the process by which certain bacteria convert nitrates present in the soil back into atmospheric nitrogen gas (N2), completing the nitrogen cycle by returning nitrogen to the atmosphere.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 12 Batch 4 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
