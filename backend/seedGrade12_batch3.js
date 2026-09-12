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

  // ---------- CHAPTER 7: Human Health and Disease ----------
  const ch7 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Biology and Human Welfare",
    title: "Human Health and Disease",
    order_index: 7,
  });

  const c7a = await Concept.create({
    chapter_id: ch7._id,
    title: "Common Diseases in Humans",
    explanation_text:
      "Human diseases are broadly classified as infectious (caused by pathogens like bacteria, viruses, protozoa, fungi, helminths) and non-infectious; common examples include typhoid, pneumonia, common cold, malaria, and amoebiasis, each with characteristic pathogens and modes of transmission.",
  });
  const c7b = await Concept.create({
    chapter_id: ch7._id,
    title: "Immunity and the Immune System",
    explanation_text:
      "Immunity is the overall ability of the body to fight disease-causing organisms, classified into innate immunity (non-specific, present from birth) and acquired immunity (specific, developed after exposure to a pathogen), involving cells like lymphocytes and molecules like antibodies.",
  });
  const c7c = await Concept.create({
    chapter_id: ch7._id,
    title: "AIDS, Cancer, and Drug/Alcohol Abuse",
    explanation_text:
      "AIDS (Acquired Immunodeficiency Syndrome) is caused by HIV, which attacks the immune system; cancer results from uncontrolled cell division due to mutations in genes regulating cell growth; drug and alcohol abuse involves harmful use of psychoactive substances affecting physical and mental health.",
  });

  await Question.insertMany([
    {
      concept_id: c7a._id,
      question_text: "Typhoid fever is primarily caused by which type of pathogen?",
      options: [
        { id: "a", text: "Virus" },
        { id: "b", text: "Bacterium (Salmonella typhi)" },
        { id: "c", text: "Protozoan" },
        { id: "d", text: "Fungus" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Typhoid fever is caused by the bacterium Salmonella typhi, which infects the small intestine and can spread through contaminated food or water.",
      difficulty: "easy",
    },
    {
      concept_id: c7a._id,
      question_text: "The common cold, one of the most frequent human illnesses, is primarily caused by:",
      options: [
        { id: "a", text: "Bacteria" },
        { id: "b", text: "Viruses (commonly rhinoviruses)" },
        { id: "c", text: "Protozoa" },
        { id: "d", text: "Fungi" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The common cold is primarily caused by a group of viruses, most commonly rhinoviruses, which infect the upper respiratory tract.",
      difficulty: "easy",
    },
    {
      concept_id: c7a._id,
      question_text:
        "Malaria, a disease transmitted by the female Anopheles mosquito, is caused by which type of pathogen?",
      options: [
        { id: "a", text: "Bacterium" },
        { id: "b", text: "Virus" },
        { id: "c", text: "Protozoan parasite (Plasmodium)" },
        { id: "d", text: "Fungus" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Malaria is caused by protozoan parasites of the genus Plasmodium, which are transmitted to humans through the bite of an infected female Anopheles mosquito.",
      difficulty: "medium",
    },
    {
      concept_id: c7a._id,
      question_text: "Amoebiasis, an intestinal disease, is caused by the protozoan parasite:",
      options: [
        { id: "a", text: "Plasmodium vivax" },
        { id: "b", text: "Entamoeba histolytica" },
        { id: "c", text: "Ascaris lumbricoides" },
        { id: "d", text: "Wuchereria bancrofti" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Amoebiasis is caused by the protozoan parasite Entamoeba histolytica, which infects the large intestine and is commonly spread through contaminated food and water.",
      difficulty: "medium",
    },
    {
      concept_id: c7a._id,
      question_text: "Ringworm, a common fungal skin infection, is typically characterized by:",
      options: [
        { id: "a", text: "High fever and body aches only" },
        {
          id: "b",
          text: "Dry, scaly lesions on various parts of the body, often accompanied by itching",
        },
        { id: "c", text: "Immediate paralysis" },
        { id: "d", text: "Blood clotting disorders" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ringworm is a fungal infection of the skin characterized by dry, scaly lesions, often ring-shaped, accompanied by itching, and is spread through contact with infected individuals, animals, or contaminated objects.",
      difficulty: "hard",
    },
    {
      concept_id: c7a._id,
      question_text:
        "Ascariasis, a helminthic disease affecting the intestine, is caused by infection with:",
      options: [
        { id: "a", text: "Entamoeba histolytica" },
        { id: "b", text: "Ascaris lumbricoides (roundworm)" },
        { id: "c", text: "Plasmodium falciparum" },
        { id: "d", text: "Salmonella typhi" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ascariasis is caused by infection with the intestinal roundworm Ascaris lumbricoides, typically transmitted through ingestion of contaminated food or water containing the parasite's eggs.",
      difficulty: "hard",
    },

    {
      concept_id: c7b._id,
      question_text: "Innate immunity, present in an individual from birth, is characterized by:",
      options: [
        { id: "a", text: "Highly specific responses developed over time" },
        {
          id: "b",
          text: "Non-specific defense mechanisms that provide the first line of defense",
        },
        { id: "c", text: "Only antibody-mediated responses" },
        { id: "d", text: "Absence of any physical barriers" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Innate immunity is the non-specific defense mechanism present in an individual from birth, providing a general, immediate first line of defense against pathogens through barriers, cells, and physiological processes.",
      difficulty: "easy",
    },
    {
      concept_id: c7b._id,
      question_text: "Acquired (adaptive) immunity is characterized mainly by:",
      options: [
        { id: "a", text: "Being present from birth with no memory" },
        { id: "b", text: "Being pathogen-specific and possessing immunological memory" },
        { id: "c", text: "Only physical barriers like skin" },
        { id: "d", text: "Complete absence of specificity" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Acquired immunity is pathogen-specific and characterized by immunological memory, meaning the body can respond more rapidly and effectively upon subsequent exposure to the same pathogen.",
      difficulty: "easy",
    },
    {
      concept_id: c7b._id,
      question_text: "Antibodies, key molecules in the immune response, are produced by:",
      options: [
        { id: "a", text: "T-lymphocytes directly" },
        { id: "b", text: "B-lymphocytes (plasma cells)" },
        { id: "c", text: "Red blood cells" },
        { id: "d", text: "Platelets" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Antibodies are produced by B-lymphocytes, which differentiate into plasma cells upon activation and secrete large quantities of specific antibodies against a particular antigen.",
      difficulty: "medium",
    },
    {
      concept_id: c7b._id,
      question_text: "Active immunity, as opposed to passive immunity, is acquired when:",
      options: [
        {
          id: "a",
          text: "An individual's own immune system produces antibodies in response to an antigen or infection",
        },
        { id: "b", text: "Ready-made antibodies are directly injected into an individual" },
        { id: "c", text: "No immune response occurs at all" },
        { id: "d", text: "Only physical barriers are involved" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Active immunity develops when an individual's own immune system is stimulated to produce antibodies, either through natural infection or vaccination, providing long-lasting protection.",
      difficulty: "medium",
    },
    {
      concept_id: c7b._id,
      question_text:
        "Vaccination works primarily by exposing the body to a weakened, inactivated, or partial form of a pathogen, in order to:",
      options: [
        { id: "a", text: "Cause the actual disease intentionally" },
        {
          id: "b",
          text: "Stimulate the immune system to develop memory and future protection without causing full-blown disease",
        },
        { id: "c", text: "Prevent all future exposure to that pathogen entirely" },
        { id: "d", text: "Directly destroy the pathogen using antibiotics" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Vaccination introduces a weakened, inactivated, or partial form of a pathogen to stimulate the immune system into producing memory cells, providing future protection without causing the full disease.",
      difficulty: "hard",
    },
    {
      concept_id: c7b._id,
      question_text:
        "The thymus gland plays an important role in the immune system primarily because it is the site where:",
      options: [
        { id: "a", text: "B-lymphocytes mature" },
        { id: "b", text: "T-lymphocytes mature" },
        { id: "c", text: "Antibodies are permanently stored" },
        { id: "d", text: "Red blood cells are produced" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The thymus gland is the primary site where T-lymphocytes mature and develop the ability to recognize specific antigens, playing a crucial role in cell-mediated immunity.",
      difficulty: "hard",
    },

    {
      concept_id: c7c._id,
      question_text: "AIDS is caused by infection with which virus?",
      options: [
        { id: "a", text: "Influenza virus" },
        { id: "b", text: "Human Immunodeficiency Virus (HIV)" },
        { id: "c", text: "Hepatitis B virus" },
        { id: "d", text: "Rhinovirus" },
      ],
      correct_option_id: "b",
      explanation_text:
        "AIDS (Acquired Immunodeficiency Syndrome) is caused by infection with the Human Immunodeficiency Virus (HIV), which progressively damages the immune system.",
      difficulty: "easy",
    },
    {
      concept_id: c7c._id,
      question_text:
        "HIV primarily infects and destroys which type of immune cell, weakening the body's defenses?",
      options: [
        { id: "a", text: "Red blood cells" },
        { id: "b", text: "Helper T-lymphocytes (CD4+ cells)" },
        { id: "c", text: "Platelets" },
        { id: "d", text: "Skin cells" },
      ],
      correct_option_id: "b",
      explanation_text:
        "HIV primarily infects and destroys helper T-lymphocytes (CD4+ cells), which play a central role in coordinating the immune response, severely weakening the body's ability to fight infections.",
      difficulty: "easy",
    },
    {
      concept_id: c7c._id,
      question_text: "Cancer is fundamentally characterized by:",
      options: [
        { id: "a", text: "Programmed, controlled cell death" },
        {
          id: "b",
          text: "Uncontrolled and abnormal cell division, often invading surrounding tissue",
        },
        { id: "c", text: "Complete absence of cell division" },
        { id: "d", text: "Only affecting the skin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Cancer is characterized by uncontrolled and abnormal proliferation of cells, which can invade and damage surrounding tissues and, in some cases, spread (metastasize) to other parts of the body.",
      difficulty: "medium",
    },
    {
      concept_id: c7c._id,
      question_text:
        "Genes that, when mutated, can contribute to cancer by promoting uncontrolled cell division are called:",
      options: [
        { id: "a", text: "Tumor suppressor genes only" },
        { id: "b", text: "Oncogenes" },
        { id: "c", text: "Housekeeping genes" },
        { id: "d", text: "Structural genes only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Oncogenes are genes that, when activated or mutated, can drive cells toward uncontrolled division, contributing to the development of cancer.",
      difficulty: "medium",
    },
    {
      concept_id: c7c._id,
      question_text:
        "The regular and excessive use of substances like alcohol or drugs, leading to harmful physical and psychological effects, is generally termed:",
      options: [
        { id: "a", text: "Substance/drug abuse" },
        { id: "b", text: "Normal social behavior with no risk" },
        { id: "c", text: "A guaranteed cure for stress" },
        { id: "d", text: "A form of vaccination" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Substance or drug abuse refers to the regular and often excessive use of psychoactive substances like alcohol or drugs, leading to harmful physical, psychological, and social consequences.",
      difficulty: "hard",
    },
    {
      concept_id: c7c._id,
      question_text:
        'Prolonged use of certain addictive drugs can lead to "dependence," meaning that the user:',
      options: [
        { id: "a", text: "Experiences no physical or psychological effects" },
        {
          id: "b",
          text: "Develops a compulsive need to continue using the substance, often with withdrawal symptoms if stopped",
        },
        { id: "c", text: "Becomes completely immune to all diseases" },
        { id: "d", text: "Gains permanent health benefits" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Dependence refers to a state in which a person develops a compulsive need to continue using a substance, often experiencing withdrawal symptoms when its use is stopped, reflecting both physical and psychological reliance.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 7 (Human Health and Disease) done");

  // ---------- CHAPTER 8: Microbes in Human Welfare ----------
  const ch8 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Biology and Human Welfare",
    title: "Microbes in Human Welfare",
    order_index: 8,
  });

  const c8a = await Concept.create({
    chapter_id: ch8._id,
    title: "Microbes in Household Products and Industrial Production",
    explanation_text:
      "Microbes are widely used in the production of common household products such as curd and cheese, as well as in large-scale industrial fermentation processes to produce beverages, antibiotics, and organic acids.",
  });
  const c8b = await Concept.create({
    chapter_id: ch8._id,
    title: "Microbes in Sewage Treatment and Biogas Production",
    explanation_text:
      "Microbes play a vital role in treating municipal sewage by breaking down organic waste through aerobic and anaerobic processes, and in producing biogas (mainly methane) through the anaerobic digestion of organic matter by methanogenic bacteria.",
  });
  const c8c = await Concept.create({
    chapter_id: ch8._id,
    title: "Microbes as Biocontrol Agents and Biofertilizers",
    explanation_text:
      "Microbes can serve as biocontrol agents, offering environmentally friendly alternatives to chemical pesticides for controlling pests and plant diseases, and as biofertilizers, enriching soil nutrients through processes like nitrogen fixation.",
  });

  await Question.insertMany([
    {
      concept_id: c8a._id,
      question_text: "The bacterium commonly used to convert milk into curd is:",
      options: [
        { id: "a", text: "Escherichia coli" },
        { id: "b", text: "Lactobacillus" },
        { id: "c", text: "Saccharomyces cerevisiae" },
        { id: "d", text: "Penicillium notatum" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Lactobacillus, a lactic acid bacterium, is commonly used to convert milk into curd by fermenting lactose into lactic acid, which causes milk proteins to coagulate.",
      difficulty: "easy",
    },
    {
      concept_id: c8a._id,
      question_text:
        "The microorganism widely used in the fermentation process to produce bread and alcoholic beverages is:",
      options: [
        { id: "a", text: "Saccharomyces cerevisiae (yeast)" },
        { id: "b", text: "Lactobacillus" },
        { id: "c", text: "Streptococcus" },
        { id: "d", text: "Aspergillus niger only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Saccharomyces cerevisiae, commonly known as baker's or brewer's yeast, is widely used in fermentation to produce bread (causing dough to rise via CO2 production) and alcoholic beverages.",
      difficulty: "easy",
    },
    {
      concept_id: c8a._id,
      question_text:
        "Penicillin, one of the first and most important antibiotics, is produced from which microorganism?",
      options: [
        { id: "a", text: "Penicillium notatum (a fungus)" },
        { id: "b", text: "Escherichia coli (a bacterium)" },
        { id: "c", text: "Saccharomyces cerevisiae" },
        { id: "d", text: "Plasmodium" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Penicillin, one of the earliest discovered antibiotics, is produced from the fungus Penicillium notatum (and related species), which was first noted by Alexander Fleming for its antibacterial properties.",
      difficulty: "medium",
    },
    {
      concept_id: c8a._id,
      question_text:
        "Citric acid, widely used in the food industry, can be commercially produced through fermentation using which fungus?",
      options: [
        { id: "a", text: "Aspergillus niger" },
        { id: "b", text: "Saccharomyces cerevisiae" },
        { id: "c", text: "Lactobacillus" },
        { id: "d", text: "Penicillium chrysogenum" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Citric acid, an important organic acid used in the food and beverage industry, is commercially produced through microbial fermentation using the fungus Aspergillus niger.",
      difficulty: "medium",
    },
    {
      concept_id: c8a._id,
      question_text:
        '"Swiss cheese," known for its characteristic large holes, gets these holes due to gas produced by:',
      options: [
        { id: "a", text: "Yeast fermentation only" },
        {
          id: "b",
          text: "Bacteria such as Propionibacterium sharmanii producing large amounts of CO2",
        },
        { id: "c", text: "Viral contamination" },
        { id: "d", text: "Only physical processing, with no microbial role" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The large holes in Swiss cheese are formed due to large amounts of carbon dioxide gas produced by the bacterium Propionibacterium sharmanii during the fermentation process.",
      difficulty: "hard",
    },
    {
      concept_id: c8a._id,
      question_text:
        "Statins, drugs commonly used to lower blood cholesterol levels, are produced using microorganisms such as:",
      options: [
        { id: "a", text: "Monascus purpureus (a yeast)" },
        { id: "b", text: "Escherichia coli only" },
        { id: "c", text: "Plasmodium species" },
        { id: "d", text: "Entamoeba histolytica" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Statins, used clinically to lower blood cholesterol, are produced using certain yeasts such as Monascus purpureus, which naturally synthesize these compounds that inhibit cholesterol-synthesizing enzymes.",
      difficulty: "hard",
    },

    {
      concept_id: c8b._id,
      question_text:
        "In sewage treatment plants, the primary role of microbes during secondary treatment is to:",
      options: [
        { id: "a", text: "Add color to the water" },
        {
          id: "b",
          text: "Break down organic matter present in sewage, reducing its biochemical oxygen demand (BOD)",
        },
        { id: "c", text: "Increase salt content" },
        { id: "d", text: "Add heavy metals" },
      ],
      correct_option_id: "b",
      explanation_text:
        "During secondary (biological) treatment of sewage, microbes break down the organic matter present, significantly reducing the biochemical oxygen demand (BOD) of the wastewater.",
      difficulty: "easy",
    },
    {
      concept_id: c8b._id,
      question_text: "Biochemical Oxygen Demand (BOD) is a measure of:",
      options: [
        {
          id: "a",
          text: "The amount of oxygen required by microorganisms to break down organic matter in water",
        },
        { id: "b", text: "The total volume of water in a sewage plant" },
        { id: "c", text: "The pH of sewage water" },
        { id: "d", text: "The amount of solid waste only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "BOD (Biochemical Oxygen Demand) measures the amount of oxygen that would be consumed by microorganisms while decomposing organic matter present in a given volume of water, indicating the level of organic pollution.",
      difficulty: "easy",
    },
    {
      concept_id: c8b._id,
      question_text:
        "The sludge formed after primary treatment of sewage is further processed anaerobically, and this process results in the production of a gas mixture called:",
      options: [
        { id: "a", text: "Biogas (containing methane)" },
        { id: "b", text: "Oxygen gas" },
        { id: "c", text: "Pure carbon dioxide only" },
        { id: "d", text: "Nitrogen gas only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Anaerobic digestion of activated sludge in sewage treatment produces biogas, a mixture rich in methane, which can be used as a fuel source.",
      difficulty: "medium",
    },
    {
      concept_id: c8b._id,
      question_text:
        "The bacteria primarily responsible for producing methane gas during anaerobic digestion of organic waste are called:",
      options: [
        { id: "a", text: "Nitrifying bacteria" },
        { id: "b", text: "Methanogens (e.g., Methanobacterium)" },
        { id: "c", text: "Lactic acid bacteria" },
        { id: "d", text: "Denitrifying bacteria" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Methanogens, such as Methanobacterium, are a group of anaerobic bacteria/archaea that produce methane gas as a byproduct of breaking down organic matter in the absence of oxygen.",
      difficulty: "medium",
    },
    {
      concept_id: c8b._id,
      question_text:
        "The main components of biogas, produced through microbial breakdown of organic matter, are primarily:",
      options: [
        { id: "a", text: "Methane and carbon dioxide" },
        { id: "b", text: "Only pure oxygen" },
        { id: "c", text: "Only nitrogen" },
        { id: "d", text: "Only hydrogen sulfide" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Biogas mainly consists of methane, along with carbon dioxide and small amounts of other gases, produced through the anaerobic breakdown of organic matter by microbial communities.",
      difficulty: "hard",
    },
    {
      concept_id: c8b._id,
      question_text:
        "A key advantage of using activated sludge in sewage treatment is that it contains a diverse community of microbes that:",
      options: [
        { id: "a", text: "Have no effect on organic matter" },
        {
          id: "b",
          text: "Effectively help break down organic pollutants, reducing pollution before water is released",
        },
        { id: "c", text: "Add toxic chemicals to the effluent" },
        { id: "d", text: "Only increase the biochemical oxygen demand" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Activated sludge contains a diverse and effective community of microbes that break down organic pollutants in sewage, significantly reducing the biochemical oxygen demand before the treated water is released into water bodies.",
      difficulty: "hard",
    },

    {
      concept_id: c8c._id,
      question_text: "Biocontrol agents are used in agriculture primarily to:",
      options: [
        { id: "a", text: "Increase the use of chemical pesticides" },
        {
          id: "b",
          text: "Control pests and diseases using biological methods, reducing dependence on chemical pesticides",
        },
        { id: "c", text: "Destroy all beneficial insects intentionally" },
        { id: "d", text: "Have no impact on pest populations" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Biocontrol agents use natural, biological methods — such as beneficial organisms — to control pests and diseases, reducing the need for and environmental impact of chemical pesticides.",
      difficulty: "easy",
    },
    {
      concept_id: c8c._id,
      question_text:
        "Bacillus thuringiensis (Bt), a widely used biocontrol agent, produces toxins effective against certain:",
      options: [
        { id: "a", text: "Bacteria only" },
        { id: "b", text: "Insect larvae (such as caterpillars)" },
        { id: "c", text: "Viruses only" },
        { id: "d", text: "Fungi only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bacillus thuringiensis (Bt) produces crystal proteins (toxins) that are specifically toxic to certain insect larvae, such as caterpillars, making it a widely used biological pesticide.",
      difficulty: "easy",
    },
    {
      concept_id: c8c._id,
      question_text: "Biofertilizers are organisms that primarily help to:",
      options: [
        {
          id: "a",
          text: "Enrich the nutrient quality of soil, often through processes like nitrogen fixation",
        },
        { id: "b", text: "Destroy soil nutrients" },
        { id: "c", text: "Cause soil erosion" },
        { id: "d", text: "Replace all forms of irrigation" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Biofertilizers are living organisms, such as certain bacteria and fungi, that help enrich soil nutrient content, often through processes like biological nitrogen fixation, promoting plant growth naturally.",
      difficulty: "medium",
    },
    {
      concept_id: c8c._id,
      question_text:
        "Rhizobium, a well-known biofertilizer bacterium, forms a symbiotic relationship with the roots of which type of plants?",
      options: [
        { id: "a", text: "Cereal crops only" },
        { id: "b", text: "Leguminous plants" },
        { id: "c", text: "Fungi only" },
        { id: "d", text: "Aquatic plants only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Rhizobium bacteria form a symbiotic relationship with the roots of leguminous plants, residing in root nodules where they fix atmospheric nitrogen into a usable form for the plant.",
      difficulty: "medium",
    },
    {
      concept_id: c8c._id,
      question_text:
        "Mycorrhiza, a symbiotic association between fungi and plant roots, primarily benefits the plant by:",
      options: [
        { id: "a", text: "Increasing uptake of water and essential minerals like phosphorus" },
        { id: "b", text: "Completely blocking water absorption" },
        { id: "c", text: "Producing toxins harmful to the plant" },
        { id: "d", text: "Preventing all root growth" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mycorrhiza is a symbiotic association between certain fungi and plant roots that enhances the plant's ability to absorb water and essential nutrients, particularly phosphorus, from the soil.",
      difficulty: "hard",
    },
    {
      concept_id: c8c._id,
      question_text:
        "Trichoderma species, used as effective biocontrol agents in agriculture, are notable for their ability to control certain:",
      options: [
        { id: "a", text: "Insect pests only" },
        { id: "b", text: "Plant pathogenic fungi" },
        { id: "c", text: "Bacterial diseases only" },
        { id: "d", text: "Viral diseases only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Trichoderma species are free-living fungi commonly used as biocontrol agents, effective in controlling various plant pathogenic fungi that cause diseases in crops.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 8 (Microbes in Human Welfare) done");

  // ---------- CHAPTER 9: Biotechnology: Principles and Processes ----------
  const ch9 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Biotechnology and its Applications",
    title: "Biotechnology: Principles and Processes",
    order_index: 9,
  });

  const c9a = await Concept.create({
    chapter_id: ch9._id,
    title: "Genetic Engineering and Recombinant DNA Technology",
    explanation_text:
      "Genetic engineering, or recombinant DNA technology, involves altering the genetic material of an organism by inserting foreign DNA, allowing production of desired proteins or traits; it relies on techniques for cutting, joining, and introducing DNA into host cells.",
  });
  const c9b = await Concept.create({
    chapter_id: ch9._id,
    title: "Tools of Recombinant DNA Technology",
    explanation_text:
      "Key tools of recombinant DNA technology include restriction enzymes that cut DNA at specific sequences, vectors (like plasmids) that carry foreign DNA into host cells, and host organisms in which the recombinant DNA is introduced and expressed.",
  });
  const c9c = await Concept.create({
    chapter_id: ch9._id,
    title: "Processes of Recombinant DNA Technology",
    explanation_text:
      "The processes of recombinant DNA technology include isolation and amplification of DNA (using techniques like PCR), cutting and joining DNA fragments, insertion into host cells, and large-scale culturing in bioreactors to obtain the desired product.",
  });

  await Question.insertMany([
    {
      concept_id: c9a._id,
      question_text: "Genetic engineering, or recombinant DNA technology, primarily involves:",
      options: [
        { id: "a", text: "Random breeding of organisms" },
        {
          id: "b",
          text: "Deliberately altering the genetic material (DNA) of an organism using biotechnological techniques",
        },
        { id: "c", text: "Only observing organisms without any modification" },
        { id: "d", text: "Removing all genetic material from a cell" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Genetic engineering, or recombinant DNA technology, involves deliberately altering an organism's genetic material by introducing foreign DNA using specific biotechnological tools and techniques.",
      difficulty: "easy",
    },
    {
      concept_id: c9a._id,
      question_text:
        "The first recombinant DNA molecules were constructed using plasmids from which bacterium?",
      options: [
        { id: "a", text: "Escherichia coli" },
        { id: "b", text: "Salmonella typhi" },
        { id: "c", text: "Bacillus thuringiensis" },
        { id: "d", text: "Mycobacterium tuberculosis" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The earliest recombinant DNA molecules were constructed using plasmids (small circular DNA) isolated from the bacterium Escherichia coli, which served as important tools for gene cloning.",
      difficulty: "easy",
    },
    {
      concept_id: c9a._id,
      question_text:
        "The production of human insulin using recombinant DNA technology involves inserting the human insulin gene into which type of host organism?",
      options: [
        { id: "a", text: "Only plant cells" },
        { id: "b", text: "Bacteria (such as E. coli)" },
        { id: "c", text: "Only human cells directly" },
        { id: "d", text: "Viruses exclusively, with no host cells needed" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Human insulin is commercially produced using recombinant DNA technology by inserting the human insulin gene into bacteria such as E. coli, which then express and produce the insulin protein.",
      difficulty: "medium",
    },
    {
      concept_id: c9a._id,
      question_text:
        'A key requirement for successful genetic engineering is the availability of a suitable "vector" that can:',
      options: [
        { id: "a", text: "Destroy foreign DNA entirely" },
        {
          id: "b",
          text: "Carry and deliver foreign DNA into a host cell, and often replicate within it",
        },
        { id: "c", text: "Prevent any DNA from entering a cell" },
        { id: "d", text: "Only function outside living cells" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A vector, such as a plasmid, is essential in genetic engineering as it carries and delivers the foreign DNA into a host cell and is capable of replicating within it, ensuring the foreign gene is maintained and expressed.",
      difficulty: "medium",
    },
    {
      concept_id: c9a._id,
      question_text:
        "Recombinant DNA technology raises certain biosafety and ethical concerns, which is why regulatory bodies, such as the Genetic Engineering Appraisal Committee (GEAC) in India, are established to:",
      options: [
        { id: "a", text: "Promote unrestricted, unregulated use of genetic engineering" },
        {
          id: "b",
          text: "Assess and regulate the safety and ethical aspects of research and applications involving genetically modified organisms",
        },
        { id: "c", text: "Ban all forms of biotechnology entirely" },
        { id: "d", text: "Have no role in overseeing genetic engineering" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Regulatory bodies like India's Genetic Engineering Appraisal Committee (GEAC) are established to assess the safety, environmental impact, and ethical considerations of research and products involving genetically modified organisms.",
      difficulty: "hard",
    },
    {
      concept_id: c9a._id,
      question_text:
        "A significant challenge in early recombinant DNA technology efforts was ensuring that a foreign gene, once inserted into a host, would:",
      options: [
        { id: "a", text: "Never express itself under any conditions" },
        {
          id: "b",
          text: "Be maintained and expressed appropriately, generation after generation, in a stable manner",
        },
        { id: "c", text: "Be immediately destroyed by host defenses in every case" },
        { id: "d", text: "Cause no changes whatsoever to the host" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A significant technical challenge in recombinant DNA technology is ensuring that the introduced foreign gene is stably maintained in the host and consistently expressed to produce the desired protein across generations.",
      difficulty: "hard",
    },

    {
      concept_id: c9b._id,
      question_text: "Restriction enzymes, essential tools in genetic engineering, function primarily to:",
      options: [
        { id: "a", text: "Join DNA fragments together" },
        { id: "b", text: "Cut DNA molecules at specific recognition sequences" },
        { id: "c", text: "Replicate DNA rapidly" },
        { id: "d", text: "Convert DNA into RNA" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Restriction enzymes are molecular tools that recognize specific DNA sequences and cut the DNA at or near those sites, allowing precise manipulation of DNA fragments.",
      difficulty: "easy",
    },
    {
      concept_id: c9b._id,
      question_text:
        "The enzyme used to join DNA fragments together, sealing gaps in the DNA backbone during recombinant DNA construction, is:",
      options: [
        { id: "a", text: "DNA polymerase" },
        { id: "b", text: "DNA ligase" },
        { id: "c", text: "Restriction endonuclease" },
        { id: "d", text: "RNA polymerase" },
      ],
      correct_option_id: "b",
      explanation_text:
        "DNA ligase is the enzyme used to join DNA fragments together by forming phosphodiester bonds, effectively sealing gaps in the DNA backbone during the construction of recombinant DNA molecules.",
      difficulty: "easy",
    },
    {
      concept_id: c9b._id,
      question_text: "Plasmids, commonly used as vectors in genetic engineering, are best described as:",
      options: [
        { id: "a", text: "Large linear chromosomes found only in eukaryotes" },
        {
          id: "b",
          text: "Small, circular, extrachromosomal DNA molecules found in bacteria, capable of independent replication",
        },
        { id: "c", text: "RNA molecules found only in viruses" },
        { id: "d", text: "Proteins involved in DNA repair" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Plasmids are small, circular, extrachromosomal DNA molecules commonly found in bacteria, capable of replicating independently of the main bacterial chromosome, making them useful as vectors in genetic engineering.",
      difficulty: "medium",
    },
    {
      concept_id: c9b._id,
      question_text:
        "A common host organism used in recombinant DNA technology, particularly for cloning and expressing bacterial genes, is:",
      options: [
        { id: "a", text: "Homo sapiens directly" },
        { id: "b", text: "Escherichia coli" },
        { id: "c", text: "Domestic cats" },
        { id: "d", text: "Wheat plants exclusively" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Escherichia coli (E. coli), a well-studied bacterium, is a commonly used host organism in recombinant DNA technology due to its rapid growth, well-understood genetics, and ease of genetic manipulation.",
      difficulty: "medium",
    },
    {
      concept_id: c9b._id,
      question_text:
        "Selectable markers, often included on plasmid vectors, are used to help identify:",
      options: [
        { id: "a", text: "Only untransformed host cells" },
        {
          id: "b",
          text: "Host cells that have successfully taken up the recombinant vector (transformed cells)",
        },
        { id: "c", text: "Only dead cells" },
        { id: "d", text: "Cells with no DNA at all" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Selectable markers, such as antibiotic resistance genes on plasmid vectors, help scientists identify and select host cells that have successfully taken up the recombinant vector (transformed cells) from those that have not.",
      difficulty: "hard",
    },
    {
      concept_id: c9b._id,
      question_text:
        '"Molecular scissors" is a common informal name given to which class of enzymes used in genetic engineering?',
      options: [
        { id: "a", text: "DNA ligases" },
        { id: "b", text: "Restriction endonucleases" },
        { id: "c", text: "DNA polymerases" },
        { id: "d", text: "RNA polymerases" },
      ],
      correct_option_id: "b",
      explanation_text:
        'Restriction endonucleases are often referred to informally as "molecular scissors" because they precisely cut DNA molecules at specific recognition sequences, a fundamental tool in genetic engineering.',
      difficulty: "hard",
    },

    {
      concept_id: c9c._id,
      question_text: "The Polymerase Chain Reaction (PCR) is a technique primarily used to:",
      options: [
        { id: "a", text: "Destroy DNA samples" },
        { id: "b", text: "Amplify (make multiple copies of) a specific DNA segment" },
        { id: "c", text: "Convert DNA into protein directly" },
        { id: "d", text: "Only sequence RNA" },
      ],
      correct_option_id: "b",
      explanation_text:
        "PCR (Polymerase Chain Reaction) is a technique used to amplify a specific segment of DNA, producing millions of copies from even a very small initial sample, useful in numerous molecular biology applications.",
      difficulty: "easy",
    },
    {
      concept_id: c9c._id,
      question_text: "Gel electrophoresis, a common technique in biotechnology, is primarily used to:",
      options: [
        { id: "a", text: "Amplify DNA" },
        { id: "b", text: "Separate DNA fragments based on their size" },
        { id: "c", text: "Directly sequence proteins" },
        { id: "d", text: "Destroy all nucleic acids" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Gel electrophoresis is a technique used to separate DNA (or RNA/protein) fragments based on their size, as smaller fragments migrate faster through the gel matrix under an electric field.",
      difficulty: "easy",
    },
    {
      concept_id: c9c._id,
      question_text:
        "A bioreactor, used in large-scale industrial biotechnology processes, primarily provides a controlled environment for:",
      options: [
        {
          id: "a",
          text: "Growing large volumes of cells/microbes to produce a desired biological product",
        },
        { id: "b", text: "Only storing chemicals without any biological activity" },
        { id: "c", text: "Sequencing DNA directly" },
        { id: "d", text: "Purely physical separation of molecules" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A bioreactor is a vessel that provides optimal, controlled conditions (such as temperature, pH, and oxygen supply) for growing large volumes of cells or microbes to efficiently produce a desired biological product.",
      difficulty: "medium",
    },
    {
      concept_id: c9c._id,
      question_text: "Downstream processing in biotechnology refers to the series of steps involved in:",
      options: [
        { id: "a", text: "Growing the initial cell culture only" },
        {
          id: "b",
          text: "Purifying and formulating the desired product after it has been synthesized by cells",
        },
        { id: "c", text: "Isolating DNA from the environment only" },
        { id: "d", text: "Destroying the final product" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Downstream processing refers to the series of steps taken after fermentation or cell culture to separate, purify, and formulate the desired biological product into a usable form.",
      difficulty: "medium",
    },
    {
      concept_id: c9c._id,
      question_text:
        "In recombinant DNA technology, after cutting the vector and the gene of interest with the same restriction enzyme, they can be joined together because both DNA fragments have complementary:",
      options: [
        { id: "a", text: "Blunt ends only, with no other features" },
        { id: "b", text: "Sticky ends generated by the restriction enzyme" },
        { id: "c", text: "Identical nucleotide sequences throughout" },
        { id: "d", text: "No compatible features at all" },
      ],
      correct_option_id: "b",
      explanation_text:
        'Cutting the vector and the foreign gene with the same restriction enzyme generates complementary "sticky ends" on both DNA fragments, allowing them to base-pair and be joined together using DNA ligase.',
      difficulty: "hard",
    },
    {
      concept_id: c9c._id,
      question_text:
        "A key challenge in scaling up recombinant DNA technology from laboratory to industrial-scale production is:",
      options: [
        { id: "a", text: "There are no challenges once a gene is cloned in the lab" },
        {
          id: "b",
          text: "Maintaining consistent, large-scale, cost-effective, and sterile conditions for cell growth and product recovery",
        },
        { id: "c", text: "Only the initial cloning step matters, with no further processing needed" },
        { id: "d", text: "Industrial scale-up requires no bioreactors at all" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Scaling up recombinant DNA technology from the laboratory to industrial production involves significant challenges in maintaining consistent, cost-effective, and sterile large-scale culture conditions, along with efficient downstream processing to recover the product.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 12 Batch 3 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
