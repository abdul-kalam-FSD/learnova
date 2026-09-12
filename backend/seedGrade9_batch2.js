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
  // subject (see seedGrade9.js), tagged strand: "Biology".
  const subject = await Subject.findOne({ grade: 9, name: /biology|science/i });
  if (!subject) {
    console.error(
      "Grade 9 Science subject not found. Run seedGrade9.js (Batch 1) first.",
    );
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  // ---------- CHAPTER 4: Why Do We Fall Ill ----------
  const ch4 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Health and Disease",
    title: "Why Do We Fall Ill",
    order_index: 4,
    strand: "Biology",
  });

  const c4a = await Concept.create({
    chapter_id: ch4._id,
    title: "Health vs Disease",
    explanation_text:
      "Health is a state of physical, mental, and social well-being, not merely the absence of disease. Disease is a disturbance in the normal functioning of the body, which can be acute (short-term) or chronic (long-term).",
  });
  const c4b = await Concept.create({
    chapter_id: ch4._id,
    title: "Causes of Disease",
    explanation_text:
      "Diseases can be infectious (caused by pathogens like bacteria, viruses, fungi, and protozoa that spread from person to person) or non-infectious (caused by internal factors like genetics, deficiency, or lifestyle, not spread between people).",
  });
  const c4c = await Concept.create({
    chapter_id: ch4._id,
    title: "Prevention and Treatment",
    explanation_text:
      "Preventive measures such as vaccination, clean water, and hygiene reduce the chance of getting infectious diseases, while treatment uses medicines like antibiotics to target the specific cause of a disease.",
  });

  await Question.insertMany([
    {
      concept_id: c4a._id,
      question_text: "Health is best defined as:",
      options: [
        {
          id: "a",
          text: "A state of complete physical, mental, and social well-being",
        },
        { id: "b", text: "Simply the absence of disease" },
        { id: "c", text: "Having no visible injuries" },
        { id: "d", text: "Being able to eat normally" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Health is a broader state of well-being, not just the absence of disease.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text:
        "A disease that lasts for a long duration, sometimes lifelong, is called:",
      options: [
        { id: "a", text: "Acute disease" },
        { id: "b", text: "Chronic disease" },
        { id: "c", text: "Contagious disease" },
        { id: "d", text: "Genetic disorder" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Chronic diseases last for a long time, such as tuberculosis or arthritis.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text:
        "A disease that comes on suddenly and lasts a short time is called:",
      options: [
        { id: "a", text: "Acute disease" },
        { id: "b", text: "Chronic disease" },
        { id: "c", text: "Hereditary disease" },
        { id: "d", text: "Deficiency disease" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Acute diseases, like the common cold, appear suddenly and last only a short while.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text:
        "Chronic diseases generally have a greater impact on health than acute diseases because they:",
      options: [
        {
          id: "a",
          text: "Cause long-term effects on nutrition and overall well-being",
        },
        { id: "b", text: "Are always more painful" },
        { id: "c", text: "Are always infectious" },
        { id: "d", text: "Cannot be treated at all" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Since chronic diseases persist, they affect a person's overall health and nutrition for a long time.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text:
        "Social well-being, as part of the definition of health, refers to:",
      options: [
        { id: "a", text: "Living in peace and harmony with others in society" },
        { id: "b", text: "Having many friends only" },
        { id: "c", text: "Earning a high income" },
        { id: "d", text: "Owning property" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Social well-being means an individual's harmony with society, part of the broader definition of health.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text:
        "Which factor does NOT directly affect an individual's health?",
      options: [
        { id: "a", text: "Personal genetics and nutrition only" },
        { id: "b", text: "Community and public sanitation" },
        { id: "c", text: "Economic and social conditions" },
        { id: "d", text: "All of these affect health" },
      ],
      correct_option_id: "d",
      explanation_text:
        "Health depends on individual factors as well as community, economic, and social conditions together.",
      difficulty: "hard",
    },

    {
      concept_id: c4b._id,
      question_text:
        "Diseases caused by organisms like bacteria and viruses that can spread from one person to another are called:",
      options: [
        { id: "a", text: "Infectious diseases" },
        { id: "b", text: "Non-infectious diseases" },
        { id: "c", text: "Genetic diseases" },
        { id: "d", text: "Deficiency diseases" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Infectious diseases are caused by pathogens and can spread between individuals.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text: "Which of the following is a non-infectious disease?",
      options: [
        { id: "a", text: "Common cold" },
        { id: "b", text: "Cancer" },
        { id: "c", text: "Tuberculosis" },
        { id: "d", text: "Typhoid" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Cancer is a non-infectious disease, as it does not spread from person to person.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text:
        "Which of these is a disease-causing microorganism (pathogen)?",
      options: [
        { id: "a", text: "Bacteria" },
        { id: "b", text: "Red blood cell" },
        { id: "c", text: "Enzyme" },
        { id: "d", text: "Hormone" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Bacteria are microorganisms that can act as pathogens, causing infectious disease.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text:
        "Infectious agents can spread through the air, water, physical contact, or:",
      options: [
        { id: "a", text: "Vectors like mosquitoes" },
        { id: "b", text: "Sunlight exposure" },
        { id: "c", text: "Body temperature alone" },
        { id: "d", text: "None of these" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Vectors such as mosquitoes carry and transmit infectious agents like the malarial parasite.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text: "Malaria is caused by which type of pathogen?",
      options: [
        { id: "a", text: "Protozoan" },
        { id: "b", text: "Bacterium" },
        { id: "c", text: "Fungus" },
        { id: "d", text: "Virus" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Malaria is caused by the protozoan Plasmodium, transmitted by mosquito bites.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text:
        "A disease caused by lack of a nutrient in the diet is an example of a:",
      options: [
        { id: "a", text: "Deficiency disease" },
        { id: "b", text: "Infectious disease" },
        { id: "c", text: "Contagious disease" },
        { id: "d", text: "Vector-borne disease" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Deficiency diseases, like scurvy from lack of Vitamin C, result from nutrient shortages, not pathogens.",
      difficulty: "medium",
    },

    {
      concept_id: c4c._id,
      question_text: "Vaccination works by:",
      options: [
        {
          id: "a",
          text: "Preparing the immune system to recognize a specific pathogen",
        },
        { id: "b", text: "Killing all bacteria in the body permanently" },
        { id: "c", text: "Removing the need for hygiene" },
        { id: "d", text: "Curing diseases after infection" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Vaccination primes the immune system to respond quickly if the real pathogen is encountered later.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text: "Antibiotics are effective against:",
      options: [
        { id: "a", text: "Bacteria" },
        { id: "b", text: "Viruses" },
        { id: "c", text: "All pathogens equally" },
        { id: "d", text: "Genetic disorders" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Antibiotics target bacterial processes and are not effective against viruses.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text: "Access to clean drinking water primarily helps prevent:",
      options: [
        { id: "a", text: "Waterborne infectious diseases" },
        { id: "b", text: "Genetic disorders" },
        { id: "c", text: "Chronic non-infectious diseases" },
        { id: "d", text: "Deficiency diseases only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Clean water reduces the spread of pathogens that cause waterborne diseases like cholera and typhoid.",
      difficulty: "easy",
    },
    {
      concept_id: c4c._id,
      question_text:
        "Which is a general preventive measure against infectious disease?",
      options: [
        { id: "a", text: "Good personal and public hygiene" },
        { id: "b", text: "Avoiding all social contact permanently" },
        { id: "c", text: "Taking antibiotics without any illness" },
        { id: "d", text: "Ignoring symptoms" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Hygiene reduces exposure to pathogens, lowering the risk of infectious disease.",
      difficulty: "easy",
    },
    {
      concept_id: c4c._id,
      question_text:
        "Why is it important to complete a full course of antibiotics as prescribed?",
      options: [
        {
          id: "a",
          text: "To fully eliminate the bacteria and prevent resistance",
        },
        { id: "b", text: "To make the medicine taste better" },
        { id: "c", text: "Antibiotics have no risk if stopped early" },
        { id: "d", text: "It has no real importance" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Stopping antibiotics early can leave surviving bacteria that may develop resistance.",
      difficulty: "hard",
    },
    {
      concept_id: c4c._id,
      question_text:
        "Public health measures like sanitation and vaccination programs mainly aim to:",
      options: [
        { id: "a", text: "Reduce disease at a community level" },
        { id: "b", text: "Treat individual patients only" },
        { id: "c", text: "Replace the need for personal hygiene" },
        { id: "d", text: "Cure chronic diseases" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Public health interventions target disease prevention across the whole community, not just individuals.",
      difficulty: "medium",
    },
  ]);

  // ---------- CHAPTER 5: Natural Resources ----------
  const ch5 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Natural Resources",
    title: "Natural Resources",
    order_index: 5,
  });

  const c5a = await Concept.create({
    chapter_id: ch5._id,
    title: "The Biosphere and Its Components",
    explanation_text:
      "The biosphere is the zone of the Earth where life exists, sustained by the interaction of the atmosphere (air), hydrosphere (water), and lithosphere (land/soil).",
  });
  const c5b = await Concept.create({
    chapter_id: ch5._id,
    title: "Biogeochemical Cycles",
    explanation_text:
      "Elements essential for life, like water, carbon, nitrogen, and oxygen, move through the environment in continuous cycles between living organisms and the non-living environment.",
  });
  const c5c = await Concept.create({
    chapter_id: ch5._id,
    title: "Ozone Layer and Pollution",
    explanation_text:
      "The ozone layer in the upper atmosphere protects life from harmful ultraviolet (UV) radiation, but human activities and pollutants like CFCs can deplete it, while other pollutants degrade air, water, and soil quality.",
  });

  await Question.insertMany([
    {
      concept_id: c5a._id,
      question_text: "The zone of the Earth where life exists is called the:",
      options: [
        { id: "a", text: "Biosphere" },
        { id: "b", text: "Lithosphere" },
        { id: "c", text: "Stratosphere" },
        { id: "d", text: "Exosphere" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The biosphere is the thin zone of Earth that supports living organisms.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text:
        "The gaseous envelope surrounding the Earth is called the:",
      options: [
        { id: "a", text: "Atmosphere" },
        { id: "b", text: "Hydrosphere" },
        { id: "c", text: "Lithosphere" },
        { id: "d", text: "Biosphere" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The atmosphere is the layer of gases surrounding the Earth.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text: "All the water present on Earth's surface makes up the:",
      options: [
        { id: "a", text: "Hydrosphere" },
        { id: "b", text: "Atmosphere" },
        { id: "c", text: "Biosphere" },
        { id: "d", text: "Lithosphere" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The hydrosphere refers to all water bodies on Earth, including oceans, rivers, and lakes.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text:
        "The solid outer layer of the Earth, including soil and rocks, is called the:",
      options: [
        { id: "a", text: "Lithosphere" },
        { id: "b", text: "Atmosphere" },
        { id: "c", text: "Hydrosphere" },
        { id: "d", text: "Stratosphere" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The lithosphere is the solid, rocky outer layer of the Earth.",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text: "Life on Earth depends on the interaction between:",
      options: [
        { id: "a", text: "Air, water, and land" },
        { id: "b", text: "Only sunlight" },
        { id: "c", text: "Only soil nutrients" },
        { id: "d", text: "Only ocean currents" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The atmosphere, hydrosphere, and lithosphere together sustain life in the biosphere.",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text:
        "Which gas in the atmosphere is essential for respiration in most living organisms?",
      options: [
        { id: "a", text: "Oxygen" },
        { id: "b", text: "Nitrogen" },
        { id: "c", text: "Argon" },
        { id: "d", text: "Neon" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Oxygen, though a smaller fraction of the atmosphere than nitrogen, is essential for cellular respiration.",
      difficulty: "medium",
    },

    {
      concept_id: c5b._id,
      question_text:
        "The continuous movement of water between the atmosphere, land, and oceans is called the:",
      options: [
        { id: "a", text: "Water cycle" },
        { id: "b", text: "Carbon cycle" },
        { id: "c", text: "Nitrogen cycle" },
        { id: "d", text: "Rock cycle" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The water cycle describes the continuous movement of water through evaporation, condensation, and precipitation.",
      difficulty: "easy",
    },
    {
      concept_id: c5b._id,
      question_text:
        "Plants absorb which gas from the atmosphere during photosynthesis, forming part of the carbon cycle?",
      options: [
        { id: "a", text: "Carbon dioxide" },
        { id: "b", text: "Oxygen" },
        { id: "c", text: "Nitrogen" },
        { id: "d", text: "Hydrogen" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Plants absorb carbon dioxide during photosynthesis, a key step in the carbon cycle.",
      difficulty: "easy",
    },
    {
      concept_id: c5b._id,
      question_text:
        "Nitrogen gas is converted into a usable form for plants mainly through:",
      options: [
        { id: "a", text: "Nitrogen-fixing bacteria" },
        { id: "b", text: "Direct absorption from air by roots" },
        { id: "c", text: "Photosynthesis" },
        { id: "d", text: "Evaporation" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Nitrogen-fixing bacteria convert atmospheric nitrogen into forms plants can absorb and use.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text: "Why are biogeochemical cycles important for ecosystems?",
      options: [
        {
          id: "a",
          text: "They recycle essential elements between living and non-living components",
        },
        { id: "b", text: "They only affect ocean life" },
        { id: "c", text: "They stop all decomposition" },
        { id: "d", text: "They have no ecological role" },
      ],
      correct_option_id: "a",
      explanation_text:
        "These cycles ensure essential elements are continuously recycled and made available to living organisms.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text: "Decomposers play a key role in the carbon cycle by:",
      options: [
        {
          id: "a",
          text: "Breaking down dead matter and releasing carbon back to the environment",
        },
        { id: "b", text: "Absorbing sunlight directly" },
        { id: "c", text: "Fixing nitrogen in soil" },
        { id: "d", text: "Producing oxygen only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Decomposers break down dead organisms, returning carbon compounds to the soil and atmosphere.",
      difficulty: "hard",
    },
    {
      concept_id: c5b._id,
      question_text: "Evaporation and condensation are key processes in the:",
      options: [
        { id: "a", text: "Water cycle" },
        { id: "b", text: "Nitrogen cycle" },
        { id: "c", text: "Carbon cycle" },
        { id: "d", text: "Rock cycle" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Evaporation of water and its condensation into clouds are central processes of the water cycle.",
      difficulty: "easy",
    },

    {
      concept_id: c5c._id,
      question_text: "The ozone layer primarily protects Earth from:",
      options: [
        { id: "a", text: "Harmful ultraviolet (UV) radiation" },
        { id: "b", text: "Visible light" },
        { id: "c", text: "Meteor impacts" },
        { id: "d", text: "Excess oxygen" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The ozone layer absorbs most of the sun's harmful UV radiation, protecting life on Earth.",
      difficulty: "easy",
    },
    {
      concept_id: c5c._id,
      question_text:
        "Which group of chemicals is well-known for depleting the ozone layer?",
      options: [
        { id: "a", text: "CFCs (chlorofluorocarbons)" },
        { id: "b", text: "Carbon dioxide only" },
        { id: "c", text: "Oxygen compounds" },
        { id: "d", text: "Water vapor" },
      ],
      correct_option_id: "a",
      explanation_text:
        "CFCs, once widely used in refrigerants and aerosols, break down ozone molecules in the atmosphere.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text:
        "The ozone layer is located in which part of the atmosphere?",
      options: [
        { id: "a", text: "Stratosphere" },
        { id: "b", text: "Troposphere" },
        { id: "c", text: "Mesosphere" },
        { id: "d", text: "Thermosphere" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The ozone layer is found in the stratosphere, a higher layer of the atmosphere.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text:
        "Excess UV radiation reaching Earth due to ozone depletion can cause:",
      options: [
        { id: "a", text: "Increased risk of skin cancer and eye damage" },
        { id: "b", text: "Improved plant growth only" },
        { id: "c", text: "Cooler global temperatures" },
        { id: "d", text: "No effect on living organisms" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Excess UV exposure is linked to skin cancer, cataracts, and harm to ecosystems.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text: "Water pollution can be caused by the discharge of:",
      options: [
        { id: "a", text: "Untreated industrial waste and sewage" },
        { id: "b", text: "Only rainwater" },
        { id: "c", text: "Oxygen" },
        { id: "d", text: "Sunlight" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Industrial waste and untreated sewage are major sources of water pollution.",
      difficulty: "easy",
    },
    {
      concept_id: c5c._id,
      question_text:
        "Reducing the use of ozone-depleting substances is an example of:",
      options: [
        { id: "a", text: "Conserving a shared natural resource" },
        { id: "b", text: "Increasing pollution" },
        { id: "c", text: "Depleting the biosphere" },
        { id: "d", text: "Accelerating the water cycle" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Limiting harmful chemicals like CFCs helps conserve the ozone layer, a shared natural resource.",
      difficulty: "hard",
    },
  ]);

  // ---------- CHAPTER 6: Improvement in Food Resources ----------
  const ch6 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Improvement in Food Resources",
    title: "Improvement in Food Resources",
    order_index: 6,
  });

  const c6a = await Concept.create({
    chapter_id: ch6._id,
    title: "Crop Improvement",
    explanation_text:
      "Crop yields can be improved through better varieties (crop variety improvement), proper nutrient management (manures and fertilizers), and effective protection from weeds, insects, and diseases.",
  });
  const c6b = await Concept.create({
    chapter_id: ch6._id,
    title: "Animal Husbandry",
    explanation_text:
      "Animal husbandry is the scientific management of livestock, including cattle farming for milk (dairy) and draught labor, and poultry farming for eggs and meat, to improve production.",
  });
  const c6c = await Concept.create({
    chapter_id: ch6._id,
    title: "Fisheries and Beekeeping",
    explanation_text:
      "Fisheries involve the breeding, rearing, and harvesting of fish for food, while beekeeping (apiculture) is practiced for honey production, both contributing to improved food resources.",
  });

  await Question.insertMany([
    {
      concept_id: c6a._id,
      question_text:
        "Which of the following directly improves crop yield through genetics?",
      options: [
        { id: "a", text: "Crop variety improvement" },
        { id: "b", text: "Irrigation alone" },
        { id: "c", text: "Storage methods" },
        { id: "d", text: "Marketing" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Developing improved crop varieties through breeding increases yield and resistance to disease.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text: "Manure improves soil primarily by:",
      options: [
        { id: "a", text: "Adding organic matter and nutrients" },
        { id: "b", text: "Killing all soil organisms" },
        { id: "c", text: "Removing water from soil" },
        { id: "d", text: "Making soil more acidic only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Manure is an organic fertilizer that enriches soil with nutrients and organic matter.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text: "Chemical fertilizers, compared to manure, generally:",
      options: [
        {
          id: "a",
          text: "Provide nutrients more quickly but add less organic matter",
        },
        { id: "b", text: "Always harm crops" },
        { id: "c", text: "Cannot be used on any crop" },
        { id: "d", text: "Have identical effects to manure" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Fertilizers act faster than manure but do not improve soil texture and organic content the way manure does.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text: "Weeds compete with crop plants mainly for:",
      options: [
        { id: "a", text: "Water, nutrients, and light" },
        { id: "b", text: "Oxygen only" },
        { id: "c", text: "Space above ground only" },
        { id: "d", text: "Nothing significant" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Weeds compete with crops for essential resources like water, nutrients, and sunlight, reducing yield.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text:
        "Crop protection management includes safeguarding crops from:",
      options: [
        { id: "a", text: "Weeds, insect pests, and diseases" },
        { id: "b", text: "Only excess sunlight" },
        { id: "c", text: "Only excess water" },
        { id: "d", text: "Only cold weather" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Crop protection focuses on minimizing losses from weeds, pests, and diseases.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text:
        "Mixed cropping (growing two or more crops together) is done mainly to:",
      options: [
        { id: "a", text: "Minimize the risk of total crop failure" },
        { id: "b", text: "Increase weed growth" },
        { id: "c", text: "Reduce soil fertility" },
        { id: "d", text: "Eliminate the need for water" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mixed cropping reduces the risk of total failure since different crops respond differently to conditions.",
      difficulty: "hard",
    },

    {
      concept_id: c6b._id,
      question_text:
        "Animal husbandry mainly involves the scientific management of:",
      options: [
        { id: "a", text: "Livestock" },
        { id: "b", text: "Crops" },
        { id: "c", text: "Forests" },
        { id: "d", text: "Soil" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Animal husbandry is the branch of agriculture concerned with the care and breeding of livestock.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text:
        "Dairy farming is primarily focused on improving the production of:",
      options: [
        { id: "a", text: "Milk" },
        { id: "b", text: "Eggs" },
        { id: "c", text: "Honey" },
        { id: "d", text: "Fish" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Dairy farming is management of milk-producing animals to improve milk yield and quality.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text:
        "Cattle used mainly for pulling ploughs and carts are called:",
      options: [
        { id: "a", text: "Draught animals" },
        { id: "b", text: "Dairy animals" },
        { id: "c", text: "Poultry" },
        { id: "d", text: "Aquatic animals" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Draught animals are used for labor, such as pulling ploughs, carts, and other farm equipment.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text: "Poultry farming is mainly carried out to produce:",
      options: [
        { id: "a", text: "Eggs and meat" },
        { id: "b", text: "Milk" },
        { id: "c", text: "Honey" },
        { id: "d", text: "Wool" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Poultry farming focuses on raising birds like chickens for egg and meat production.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text:
        "Crossbreeding in cattle is done mainly to combine desirable traits such as:",
      options: [
        { id: "a", text: "High milk yield and disease resistance" },
        { id: "b", text: "Slower growth" },
        { id: "c", text: "Lower nutrient needs only" },
        { id: "d", text: "Reduced lifespan" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Crossbreeding combines high-yielding and disease-resistant traits from different breeds.",
      difficulty: "hard",
    },
    {
      concept_id: c6b._id,
      question_text:
        "Proper animal husbandry practices generally include attention to:",
      options: [
        { id: "a", text: "Shelter, feeding, and disease prevention" },
        { id: "b", text: "Only feeding" },
        { id: "c", text: "Only breeding" },
        { id: "d", text: "None of these" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Good animal husbandry covers shelter, proper feeding, and healthcare to improve productivity.",
      difficulty: "medium",
    },

    {
      concept_id: c6c._id,
      question_text:
        "The scientific breeding, rearing, and harvesting of fish is called:",
      options: [
        { id: "a", text: "Fisheries" },
        { id: "b", text: "Apiculture" },
        { id: "c", text: "Sericulture" },
        { id: "d", text: "Horticulture" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Fisheries refers to the industry of catching, processing, and selling fish and other aquatic organisms.",
      difficulty: "easy",
    },
    {
      concept_id: c6c._id,
      question_text: "Beekeeping is also known as:",
      options: [
        { id: "a", text: "Apiculture" },
        { id: "b", text: "Pisciculture" },
        { id: "c", text: "Sericulture" },
        { id: "d", text: "Aquaculture" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Apiculture is the technical term for the practice of beekeeping.",
      difficulty: "easy",
    },
    {
      concept_id: c6c._id,
      question_text: "Beekeeping is primarily practiced for the production of:",
      options: [
        { id: "a", text: "Honey" },
        { id: "b", text: "Milk" },
        { id: "c", text: "Eggs" },
        { id: "d", text: "Wool" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Beekeeping is mainly done to harvest honey, along with beeswax.",
      difficulty: "easy",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Fish farming that takes place in freshwater bodies like ponds and tanks is termed:",
      options: [
        { id: "a", text: "Inland fisheries" },
        { id: "b", text: "Marine fisheries" },
        { id: "c", text: "Apiculture" },
        { id: "d", text: "Poultry farming" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Inland fisheries refer to fish farming in freshwater sources like ponds, tanks, and rivers.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Marine fisheries deal with fish and aquatic resources found in:",
      options: [
        { id: "a", text: "Seas and oceans" },
        { id: "b", text: "Ponds only" },
        { id: "c", text: "Rivers only" },
        { id: "d", text: "Underground water only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Marine fisheries focus on the harvest of fish and other resources from seas and oceans.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Choosing the right bee variety for beekeeping is important mainly because it affects:",
      options: [
        { id: "a", text: "Honey yield and the bees' sting behavior" },
        { id: "b", text: "Weather patterns" },
        { id: "c", text: "Soil fertility" },
        { id: "d", text: "Crop protection" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Different bee varieties differ in honey collection capacity and sting behavior, affecting beekeeping success.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 9 Batch 2 seed complete: 3 chapters, 9 concepts, 54 questions added.",
  );
  console.log(
    "Grade 9 syllabus now fully covers all 6 NCERT Class 9 Science biology-focused chapters.",
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
