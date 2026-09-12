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

  // ---------- CHAPTER 1: The Living World ----------
  const ch1 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Diversity in Living World",
    title: "The Living World",
    order_index: 1,
  });

  const c1a = await Concept.create({
    chapter_id: ch1._id,
    title: "What is Living?",
    explanation_text:
      "Living organisms show growth, reproduction, metabolism, cellular organisation, consciousness, and self-replication, unlike non-living matter which lacks these coordinated life processes.",
  });
  const c1b = await Concept.create({
    chapter_id: ch1._id,
    title: "Taxonomic Categories",
    explanation_text:
      "Taxonomic categories form a hierarchy — Kingdom, Phylum/Division, Class, Order, Family, Genus, Species — each representing a rank used to classify organisms based on shared characteristics.",
  });
  const c1c = await Concept.create({
    chapter_id: ch1._id,
    title: "Concept of a Species and Taxonomical Aids",
    explanation_text:
      "A species is a group of organisms capable of interbreeding; taxonomical aids like herbaria, botanical gardens, museums, zoological parks, and keys help in identifying and classifying organisms.",
  });

  await Question.insertMany([
    {
      concept_id: c1a._id,
      question_text: "Which of the following is considered the defining property of life?",
      options: [
        { id: "a", text: "Growth" },
        { id: "b", text: "Metabolism" },
        { id: "c", text: "Consciousness" },
        { id: "d", text: "Reproduction" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Consciousness (ability to sense and respond to the environment) is regarded as the defining, unambiguous property of living organisms.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "Growth in unicellular organisms is measured by an increase in:",
      options: [
        { id: "a", text: "Number of cells" },
        { id: "b", text: "Cell size" },
        { id: "c", text: "Body length" },
        { id: "d", text: "Body weight only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In unicellular organisms, growth is seen as an increase in cell size, not cell number, since division would create a new individual.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "Which process allows a species to continue over generations, though it is not essential for individual survival?",
      options: [
        { id: "a", text: "Metabolism" },
        { id: "b", text: "Reproduction" },
        { id: "c", text: "Digestion" },
        { id: "d", text: "Respiration" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Reproduction ensures continuity of a species across generations, but an individual organism can survive without reproducing.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text: "The sum total of all biochemical reactions occurring in an organism's body is called:",
      options: [
        { id: "a", text: "Growth" },
        { id: "b", text: "Reproduction" },
        { id: "c", text: "Metabolism" },
        { id: "d", text: "Adaptation" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Metabolism refers to the sum of all chemical reactions occurring in the body of a living organism, both anabolic and catabolic.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text: "Which of these is an example of a non-living object showing growth by accumulation of material on its surface?",
      options: [
        { id: "a", text: "Mountain" },
        { id: "b", text: "Crystal" },
        { id: "c", text: "River" },
        { id: "d", text: "Rock salt formation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A crystal kept in a saturated solution of its own salt grows by accumulating material on the surface, but this is not the same as biological growth.",
      difficulty: "hard",
    },
    {
      concept_id: c1a._id,
      question_text: "Self-consciousness in the strict sense is best tested for by asking whether an organism can:",
      options: [
        { id: "a", text: "Move" },
        { id: "b", text: "Recognise itself, e.g. in a mirror" },
        { id: "c", text: "Photosynthesize" },
        { id: "d", text: "Reproduce sexually" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Self-consciousness is tested by an organism's ability to recognise itself, such as in front of a mirror, which most organisms cannot demonstrate.",
      difficulty: "hard",
    },

    {
      concept_id: c1b._id,
      question_text: "Which is the basic unit of classification?",
      options: [
        { id: "a", text: "Genus" },
        { id: "b", text: "Species" },
        { id: "c", text: "Family" },
        { id: "d", text: "Order" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Species is the lowest and most fundamental taxonomic category, referring to a group of organisms capable of interbreeding.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text: "The taxonomic category above Family is:",
      options: [
        { id: "a", text: "Order" },
        { id: "b", text: "Genus" },
        { id: "c", text: "Class" },
        { id: "d", text: "Phylum" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The hierarchy runs Species → Genus → Family → Order → Class → Phylum → Kingdom, so Order lies directly above Family.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "Which taxonomic category is used specifically for plants instead of Phylum?",
      options: [
        { id: "a", text: "Class" },
        { id: "b", text: "Division" },
        { id: "c", text: "Order" },
        { id: "d", text: "Family" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In plant classification, 'Division' is used at the rank equivalent to 'Phylum' in animal classification.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "A Genus comprises a group of related:",
      options: [
        { id: "a", text: "Species" },
        { id: "b", text: "Families" },
        { id: "c", text: "Orders" },
        { id: "d", text: "Classes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Genus is a taxonomic category that includes a group of closely related species sharing similar characteristics.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text: "Which category includes multiple related genera?",
      options: [
        { id: "a", text: "Species" },
        { id: "b", text: "Family" },
        { id: "c", text: "Kingdom" },
        { id: "d", text: "Phylum" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Family is the taxonomic rank that groups related genera together, based on shared structural or evolutionary similarities.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "As we move from Species to Kingdom in the taxonomic hierarchy, the number of common characteristics:",
      options: [
        { id: "a", text: "Increases" },
        { id: "b", text: "Decreases" },
        { id: "c", text: "Stays the same" },
        { id: "d", text: "Becomes zero" },
      ],
      correct_option_id: "b",
      explanation_text:
        "As categories move higher (Species to Kingdom), the number of shared characteristics between member organisms decreases, since the group becomes more broad and diverse.",
      difficulty: "hard",
    },

    {
      concept_id: c1c._id,
      question_text: "A herbarium is best described as:",
      options: [
        { id: "a", text: "A living plant collection" },
        { id: "b", text: "A collection of dried, pressed plant specimens" },
        { id: "c", text: "A zoo for animals" },
        { id: "d", text: "A key for identification" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A herbarium is a storehouse of collected plant specimens that are dried, pressed, and preserved on sheets for future reference and identification.",
      difficulty: "easy",
    },
    {
      concept_id: c1c._id,
      question_text: "Which taxonomic aid maintains living plants for identification and research?",
      options: [
        { id: "a", text: "Museum" },
        { id: "b", text: "Botanical garden" },
        { id: "c", text: "Zoological park" },
        { id: "d", text: "Key" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Botanical gardens maintain living plants for reference, and many also have herbaria associated with them for research purposes.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text: "A taxonomic key is primarily used for:",
      options: [
        { id: "a", text: "Storing specimens" },
        { id: "b", text: "Identification of organisms based on similarities and differences" },
        { id: "c", text: "Breeding animals" },
        { id: "d", text: "Growing plants" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A taxonomic key is a tool based on contrasting characters, usually paired (couplet), used to identify plants and animals.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text: "Which of the following preserves plant and animal specimens in preservative solutions for study?",
      options: [
        { id: "a", text: "Herbarium" },
        { id: "b", text: "Museum" },
        { id: "c", text: "Botanical garden" },
        { id: "d", text: "Zoological park" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Museums typically have collections of preserved plant and animal specimens, often kept in preservative solutions like formalin, for study purposes.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text: "The concept of species based on reproductive isolation means members of a species:",
      options: [
        { id: "a", text: "Can interbreed with any organism" },
        { id: "b", text: "Can interbreed and produce fertile offspring among themselves" },
        { id: "c", text: "Never reproduce" },
        { id: "d", text: "Belong to different genera" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A species is a group of individuals that can actually or potentially interbreed with each other to produce fertile offspring, and are reproductively isolated from other such groups.",
      difficulty: "hard",
    },
    {
      concept_id: c1c._id,
      question_text: "Zoological parks primarily serve the purpose of:",
      options: [
        { id: "a", text: "Growing crops" },
        { id: "b", text: "Maintaining live animals for public viewing and study of their behaviour" },
        { id: "c", text: "Storing dried plant specimens" },
        { id: "d", text: "Housing preserved fossils only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Zoological parks (zoos) are places where live animals are kept in protected environments, allowing the public and researchers to observe their behaviour and characteristics.",
      difficulty: "easy",
    },
  ]);

  console.log("Chapter 1 (The Living World) done");

  // ---------- CHAPTER 2: Biological Classification ----------
  const ch2 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Diversity in Living World",
    title: "Biological Classification",
    order_index: 2,
  });

  const c2a = await Concept.create({
    chapter_id: ch2._id,
    title: "Kingdom Monera and Kingdom Protista",
    explanation_text:
      "Monera includes prokaryotic bacteria, while Protista covers unicellular eukaryotes like protozoans, algae, and slime moulds — both foundational to the five-kingdom classification.",
  });
  const c2b = await Concept.create({
    chapter_id: ch2._id,
    title: "Kingdom Fungi",
    explanation_text:
      "Fungi are heterotrophic eukaryotes with cell walls made of chitin, obtaining nutrition through saprophytism, parasitism, or symbiosis, and reproducing via spores.",
  });
  const c2c = await Concept.create({
    chapter_id: ch2._id,
    title: "Viruses, Viroids, and Lichens",
    explanation_text:
      "Viruses are non-cellular obligate parasites made of genetic material and a protein coat; viroids lack a protein coat and consist only of RNA; lichens are symbiotic partnerships between fungi and algae.",
  });

  await Question.insertMany([
    {
      concept_id: c2a._id,
      question_text: "Bacteria are classified under which kingdom?",
      options: [
        { id: "a", text: "Protista" },
        { id: "b", text: "Monera" },
        { id: "c", text: "Fungi" },
        { id: "d", text: "Plantae" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Kingdom Monera includes all prokaryotic organisms, i.e., bacteria, which lack a defined nucleus and membrane-bound organelles.",
      difficulty: "easy",
    },
    {
      concept_id: c2a._id,
      question_text: "Which of these is NOT a characteristic of Kingdom Protista?",
      options: [
        { id: "a", text: "Unicellular" },
        { id: "b", text: "Eukaryotic" },
        { id: "c", text: "Multicellular tissue-level organisation" },
        { id: "d", text: "Presence of cilia or flagella in some members" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Protista are unicellular eukaryotes and do not show true multicellular tissue-level organisation, which distinguishes them from Plantae, Fungi, and Animalia.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Which group of Protista is commonly known as 'golden algae'?",
      options: [
        { id: "a", text: "Dinoflagellates" },
        { id: "b", text: "Chrysophytes" },
        { id: "c", text: "Euglenoids" },
        { id: "d", text: "Slime moulds" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Chrysophytes, which include diatoms and desmids, are commonly referred to as golden algae due to the yellowish/golden pigmentation from carotenoids.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Euglenoids differ from other Protista mainly because they:",
      options: [
        { id: "a", text: "Have a rigid pellicle instead of a cell wall" },
        { id: "b", text: "Are always multicellular" },
        { id: "c", text: "Lack a nucleus" },
        { id: "d", text: "Cannot photosynthesize" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Euglenoids have a protein-rich layer called the pellicle instead of a cell wall, making their body flexible, and many can photosynthesize when light is available.",
      difficulty: "hard",
    },
    {
      concept_id: c2a._id,
      question_text: "Which organisms are known as 'red tide' producers due to toxin release?",
      options: [
        { id: "a", text: "Dinoflagellates" },
        { id: "b", text: "Chrysophytes" },
        { id: "c", text: "Slime moulds" },
        { id: "d", text: "Bacteria" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Dinoflagellates release toxins that can rapidly multiply, causing water to appear red — known as the 'red tide' phenomenon, which can kill marine life.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Slime moulds are grouped under Protista mainly because during their life cycle they:",
      options: [
        { id: "a", text: "Have a permanent cell wall" },
        { id: "b", text: "Show both amoeboid and fungal-like reproductive phases" },
        { id: "c", text: "Are always photosynthetic" },
        { id: "d", text: "Lack any motile phase" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Slime moulds engulf food like amoeba but form fruiting bodies bearing spores with true walls (like fungi) during reproduction, showing a mixed lifestyle.",
      difficulty: "hard",
    },

    {
      concept_id: c2b._id,
      question_text: "The cell wall of fungi is primarily composed of:",
      options: [
        { id: "a", text: "Cellulose" },
        { id: "b", text: "Chitin" },
        { id: "c", text: "Peptidoglycan" },
        { id: "d", text: "Pectin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Unlike plant cell walls made of cellulose, fungal cell walls are composed of chitin, a polysaccharide.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text: "Which mode of nutrition is characteristic of all fungi?",
      options: [
        { id: "a", text: "Autotrophic" },
        { id: "b", text: "Heterotrophic" },
        { id: "c", text: "Photosynthetic" },
        { id: "d", text: "Chemosynthetic" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fungi are heterotrophic organisms, obtaining nutrients by absorption after external digestion, either as saprophytes, parasites, or symbionts.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text: "The symbiotic association between fungi and algae is called:",
      options: [
        { id: "a", text: "Mycorrhiza" },
        { id: "b", text: "Lichen" },
        { id: "c", text: "Mutualism only" },
        { id: "d", text: "Saprophytism" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A lichen is a symbiotic association between a fungus (mycobiont) and a photosynthetic alga or cyanobacterium (phycobiont).",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text: "Mycorrhiza refers to a symbiotic association between fungi and:",
      options: [
        { id: "a", text: "Algae" },
        { id: "b", text: "Bacteria" },
        { id: "c", text: "Roots of higher plants" },
        { id: "d", text: "Insects" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Mycorrhiza is a mutually beneficial association between fungi and the roots of higher plants, aiding water and nutrient absorption.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text: "Sexual reproduction in fungi typically involves fusion of two haploid cells followed by which two steps?",
      options: [
        { id: "a", text: "Plasmogamy then karyogamy" },
        { id: "b", text: "Karyogamy then plasmogamy" },
        { id: "c", text: "Mitosis then meiosis only" },
        { id: "d", text: "Budding then fission" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In fungal sexual reproduction, plasmogamy (fusion of protoplasms) occurs first, followed by karyogamy (fusion of nuclei), and then meiosis in the zygote.",
      difficulty: "hard",
    },
    {
      concept_id: c2b._id,
      question_text: "Which class of fungi is commonly called 'sac fungi'?",
      options: [
        { id: "a", text: "Phycomycetes" },
        { id: "b", text: "Ascomycetes" },
        { id: "c", text: "Basidiomycetes" },
        { id: "d", text: "Deuteromycetes" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ascomycetes are called sac fungi because their sexual spores (ascospores) are produced inside a sac-like structure called the ascus.",
      difficulty: "medium",
    },

    {
      concept_id: c2c._id,
      question_text: "Viruses are considered non-living outside a host cell mainly because they:",
      options: [
        { id: "a", text: "Cannot crystallize" },
        { id: "b", text: "Lack their own metabolic machinery" },
        { id: "c", text: "Are too small to see" },
        { id: "d", text: "Contain DNA only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Viruses lack independent metabolic machinery and cannot replicate on their own; they need a host cell's machinery to multiply, making them inert outside a host.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text: "The protein coat that covers the genetic material of a virus is called:",
      options: [
        { id: "a", text: "Capsid" },
        { id: "b", text: "Envelope" },
        { id: "c", text: "Pellicle" },
        { id: "d", text: "Cell wall" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The protein coat surrounding a virus's genetic material (DNA or RNA) is called the capsid, made up of small subunits called capsomeres.",
      difficulty: "easy",
    },
    {
      concept_id: c2c._id,
      question_text: "Viroids differ from viruses in that viroids:",
      options: [
        { id: "a", text: "Have a larger genome" },
        { id: "b", text: "Lack a protein coat and consist only of free RNA" },
        { id: "c", text: "Are entirely made of DNA" },
        { id: "d", text: "Have a capsid but no genetic material" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Viroids are smaller than viruses and consist only of free RNA without a protein coat, unlike viruses which have both genetic material and a capsid.",
      difficulty: "hard",
    },
    {
      concept_id: c2c._id,
      question_text: "Viroids were first discovered as the cause of which disease?",
      options: [
        { id: "a", text: "Tobacco mosaic disease" },
        { id: "b", text: "Potato spindle tuber disease" },
        { id: "c", text: "AIDS" },
        { id: "d", text: "Rabies" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Viroids were discovered by T.O. Diener as the cause of potato spindle tuber disease, which was found to be smaller than any known virus.",
      difficulty: "hard",
    },
    {
      concept_id: c2c._id,
      question_text: "In a lichen, the algal partner is responsible for:",
      options: [
        { id: "a", text: "Absorbing water and minerals" },
        { id: "b", text: "Providing shelter" },
        { id: "c", text: "Preparing food through photosynthesis" },
        { id: "d", text: "Producing spores" },
      ],
      correct_option_id: "c",
      explanation_text:
        "In a lichen symbiosis, the algal component (phycobiont) is photosynthetic and prepares food, while the fungal component (mycobiont) provides shelter and absorbs water/minerals.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text: "Lichens are considered good indicators of which environmental factor?",
      options: [
        { id: "a", text: "Soil pH" },
        { id: "b", text: "Air pollution" },
        { id: "c", text: "Water salinity" },
        { id: "d", text: "Temperature only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Lichens are highly sensitive to air pollution, especially sulfur dioxide, and do not grow in polluted areas, making them useful bioindicators of air quality.",
      difficulty: "medium",
    },
  ]);

  console.log("Chapter 2 (Biological Classification) done");

  // ---------- CHAPTER 3: Plant Kingdom ----------
  const ch3 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Diversity in Living World",
    title: "Plant Kingdom",
    order_index: 3,
  });

  const c3a = await Concept.create({
    chapter_id: ch3._id,
    title: "Algae and Bryophytes",
    explanation_text:
      "Algae are simple, chlorophyll-bearing, mainly aquatic organisms; Bryophytes are the first land plants (amphibians of the plant kingdom) that lack true vascular tissue and reproduce via spores.",
  });
  const c3b = await Concept.create({
    chapter_id: ch3._id,
    title: "Pteridophytes and Gymnosperms",
    explanation_text:
      "Pteridophytes are the first plants with true vascular tissue and independent sporophytes; Gymnosperms are seed-bearing plants with 'naked' seeds not enclosed in a fruit.",
  });
  const c3c = await Concept.create({
    chapter_id: ch3._id,
    title: "Angiosperms",
    explanation_text:
      "Angiosperms are flowering plants with seeds enclosed inside a fruit, and are the most evolved and dominant plant group, divided into monocotyledons and dicotyledons.",
  });

  await Question.insertMany([
    {
      concept_id: c3a._id,
      question_text: "Algae are classified into three main classes based mainly on:",
      options: [
        { id: "a", text: "Habitat" },
        { id: "b", text: "Type of pigment, stored food, and flagella" },
        { id: "c", text: "Size only" },
        { id: "d", text: "Reproductive method only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Algae are classified into Chlorophyceae, Phaeophyceae, and Rhodophyceae based on the type of pigments, chief stored food, and the type/number of flagella on motile cells.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text: "Which class of algae is commonly known as 'brown algae'?",
      options: [
        { id: "a", text: "Chlorophyceae" },
        { id: "b", text: "Phaeophyceae" },
        { id: "c", text: "Rhodophyceae" },
        { id: "d", text: "Cyanophyceae" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Phaeophyceae, or brown algae, contain the pigment fucoxanthin, which gives them their characteristic brown colour, found mostly in marine habitats.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text: "Bryophytes are called the 'amphibians of the plant kingdom' because they:",
      options: [
        { id: "a", text: "Can live in salt water" },
        { id: "b", text: "Need water for fertilization though they can live on land" },
        { id: "c", text: "Lack chlorophyll" },
        { id: "d", text: "Have true roots" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bryophytes are called amphibians of the plant kingdom because although they can live in soil, they require water for sexual reproduction (fertilization).",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text: "The dominant, photosynthetic phase in the bryophyte life cycle is the:",
      options: [
        { id: "a", text: "Sporophyte" },
        { id: "b", text: "Gametophyte" },
        { id: "c", text: "Zygote" },
        { id: "d", text: "Spore only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In bryophytes, the gametophyte is the dominant, free-living, photosynthetic phase, while the sporophyte remains attached to and dependent on it.",
      difficulty: "hard",
    },
    {
      concept_id: c3a._id,
      question_text: "Which of the following is an example of a bryophyte?",
      options: [
        { id: "a", text: "Spirogyra" },
        { id: "b", text: "Funaria (moss)" },
        { id: "c", text: "Fern" },
        { id: "d", text: "Pinus" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Funaria is a moss, which belongs to the bryophyte group along with liverworts and hornworts, characterized by absence of true vascular tissue.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text: "Bryophytes lack which structures found in vascular plants?",
      options: [
        { id: "a", text: "Chlorophyll" },
        { id: "b", text: "True roots, stem, and leaves with vascular tissue" },
        { id: "c", text: "Spores" },
        { id: "d", text: "Cell walls" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bryophytes have root-like, stem-like, and leaf-like structures but lack true vascular (xylem and phloem) tissue found in higher, tracheophyte plants.",
      difficulty: "medium",
    },

    {
      concept_id: c3b._id,
      question_text: "Pteridophytes are considered the first plants with:",
      options: [
        { id: "a", text: "Flowers" },
        { id: "b", text: "True vascular tissue (xylem and phloem)" },
        { id: "c", text: "Naked seeds" },
        { id: "d", text: "Fruit" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Pteridophytes are the first group of land plants to possess specialized vascular tissue for conduction of water and nutrients, hence called Tracheophyta.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text: "In pteridophytes, which generation is the dominant, independent phase?",
      options: [
        { id: "a", text: "Gametophyte" },
        { id: "b", text: "Sporophyte" },
        { id: "c", text: "Zygote" },
        { id: "d", text: "Spore mother cell" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Unlike bryophytes, in pteridophytes the sporophyte is the dominant, independent, and conspicuous phase, while the gametophyte is small and short-lived.",
      difficulty: "hard",
    },
    {
      concept_id: c3b._id,
      question_text: "Gymnosperm literally means plants with:",
      options: [
        { id: "a", text: "Hidden flowers" },
        { id: "b", text: "Naked seeds" },
        { id: "c", text: "No roots" },
        { id: "d", text: "Green seeds" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The term gymnosperm comes from Greek, meaning 'naked seeds,' referring to seeds not enclosed within a fruit/ovary wall, unlike angiosperms.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text: "Which of the following is a well-known example of a gymnosperm?",
      options: [
        { id: "a", text: "Mango" },
        { id: "b", text: "Pinus" },
        { id: "c", text: "Wheat" },
        { id: "d", text: "Fern" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Pinus (pine) is a widely cited example of a gymnosperm, characterised by needle-like leaves and cones that bear naked seeds.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text: "Gymnosperms are typically:",
      options: [
        { id: "a", text: "Herbaceous and annual" },
        { id: "b", text: "Perennial, woody, and heterosporous" },
        { id: "c", text: "Aquatic and unicellular" },
        { id: "d", text: "Non-vascular" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Gymnosperms are perennial, woody plants that are heterosporous, producing microspores (male) and megaspores (female).",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text: "In gymnosperms, pollination is mainly carried out by:",
      options: [
        { id: "a", text: "Insects" },
        { id: "b", text: "Wind" },
        { id: "c", text: "Water" },
        { id: "d", text: "Birds" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Gymnosperms are typically wind-pollinated (anemophilous), relying on air currents to transfer pollen grains from male to female cones.",
      difficulty: "medium",
    },

    {
      concept_id: c3c._id,
      question_text: "Angiosperms differ from gymnosperms mainly because angiosperm seeds are:",
      options: [
        { id: "a", text: "Naked" },
        { id: "b", text: "Enclosed inside a fruit" },
        { id: "c", text: "Absent" },
        { id: "d", text: "Formed without fertilization" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In angiosperms, ovules are enclosed within an ovary, which develops into a fruit after fertilization, enclosing the seeds — unlike naked gymnosperm seeds.",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text: "Angiosperms are classified into two classes based on the number of cotyledons:",
      options: [
        { id: "a", text: "Monocots and Dicots" },
        { id: "b", text: "Herbs and Shrubs" },
        { id: "c", text: "Annuals and Perennials" },
        { id: "d", text: "Terrestrial and Aquatic" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Angiosperms are divided into monocotyledons (one cotyledon) and dicotyledons (two cotyledons).",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text: "Double fertilization, unique to angiosperms, results in the formation of:",
      options: [
        { id: "a", text: "Only the zygote" },
        { id: "b", text: "Zygote and primary endosperm nucleus (PEN)" },
        { id: "c", text: "Only pollen tubes" },
        { id: "d", text: "Only the fruit wall" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In double fertilization, one male gamete fuses with the egg to form the zygote, and the other fuses with the two polar nuclei to form the PEN, which develops into endosperm.",
      difficulty: "hard",
    },
    {
      concept_id: c3c._id,
      question_text: "Which of these is a characteristic of monocot leaves?",
      options: [
        { id: "a", text: "Reticulate venation" },
        { id: "b", text: "Parallel venation" },
        { id: "c", text: "Absence of veins" },
        { id: "d", text: "Compound only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Monocot leaves typically show parallel venation, unlike dicot leaves which show reticulate (net-like) venation.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text: "The life cycle of angiosperms shows an alternation of generations where the dominant phase is the:",
      options: [
        { id: "a", text: "Gametophyte" },
        { id: "b", text: "Sporophyte" },
        { id: "c", text: "Zygote only" },
        { id: "d", text: "Spore" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In angiosperms, the sporophyte (the plant body we see) is the dominant, diploid phase, while the gametophyte is highly reduced.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text: "Which structure in a flowering plant develops into the fruit after fertilization?",
      options: [
        { id: "a", text: "Sepal" },
        { id: "b", text: "Petal" },
        { id: "c", text: "Ovary" },
        { id: "d", text: "Anther" },
      ],
      correct_option_id: "c",
      explanation_text:
        "After fertilization, the ovary of the flower develops into the fruit, while the ovules within it develop into seeds.",
      difficulty: "easy",
    },
  ]);

  console.log(
    "Grade 11 Batch 1 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
