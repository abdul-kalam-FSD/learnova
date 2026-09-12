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

  // ---------- CHAPTER 4: Animal Kingdom ----------
  const ch4 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Diversity in Living World",
    title: "Animal Kingdom",
    order_index: 4,
  });

  const c4a = await Concept.create({
    chapter_id: ch4._id,
    title: "Basis of Classification",
    explanation_text:
      "Animals are classified based on levels of organisation, symmetry, germ layers, coelom, segmentation, and notochord — features that reveal evolutionary relationships between groups.",
  });
  const c4b = await Concept.create({
    chapter_id: ch4._id,
    title: "Non-Chordates (Porifera to Echinodermata)",
    explanation_text:
      "Non-chordate phyla range from simple pore-bearing Porifera to spiny-skinned Echinodermata, showing increasing complexity in body organisation, symmetry, and organ systems.",
  });
  const c4c = await Concept.create({
    chapter_id: ch4._id,
    title: "Chordates",
    explanation_text:
      "Chordates possess a notochord, dorsal hollow nerve cord, and pharyngeal gill slits at some stage of life, and are divided into Protochordates and Vertebrata.",
  });

  await Question.insertMany([
    {
      concept_id: c4a._id,
      question_text: "Animals with radial symmetry have body parts arranged:",
      options: [
        { id: "a", text: "Around a central axis, like spokes of a wheel" },
        { id: "b", text: "In two identical mirror halves" },
        { id: "c", text: "Without any pattern" },
        { id: "d", text: "Only along a single line" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In radial symmetry, body parts are arranged around a central axis, so any plane passing through the centre divides the body into similar halves, as seen in Coelenterates.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text: "Animals with bilateral symmetry can be divided into equal left and right halves by:",
      options: [
        { id: "a", text: "Any plane through the centre" },
        { id: "b", text: "Only one plane, passing through the centre" },
        { id: "c", text: "No plane at all" },
        { id: "d", text: "Multiple horizontal planes" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bilaterally symmetrical animals can be divided into identical left and right halves by only a single plane passing through the centre, as seen in most higher animals.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text: "Triploblastic animals develop from how many primary germ layers?",
      options: [
        { id: "a", text: "One" },
        { id: "b", text: "Two" },
        { id: "c", text: "Three" },
        { id: "d", text: "Four" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Triploblastic animals develop from three germ layers — ectoderm, mesoderm, and endoderm — giving rise to all the tissues and organs of the body.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text: "Animals whose body cavity is lined by mesoderm on both sides are called:",
      options: [
        { id: "a", text: "Acoelomates" },
        { id: "b", text: "Pseudocoelomates" },
        { id: "c", text: "Coelomates" },
        { id: "d", text: "Diploblastic" },
      ],
      correct_option_id: "c",
      explanation_text:
        "In coelomates, the body cavity (coelom) is completely lined by mesoderm on both the outer and inner sides, as seen in annelids and higher animals.",
      difficulty: "hard",
    },
    {
      concept_id: c4a._id,
      question_text: "Repetition of body segments, seen in earthworms, is called:",
      options: [
        { id: "a", text: "Symmetry" },
        { id: "b", text: "Metamerism (segmentation)" },
        { id: "c", text: "Coelom formation" },
        { id: "d", text: "Notochord formation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Metamerism refers to the serial repetition of at least some organs and body segments along the length of the body, seen clearly in annelids like earthworms.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text: "The presence of a notochord at some stage of life is a defining feature of which group?",
      options: [
        { id: "a", text: "Non-chordates" },
        { id: "b", text: "Chordates" },
        { id: "c", text: "Coelenterates" },
        { id: "d", text: "Porifera" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The notochord, a flexible rod-like structure, is present at some stage of life in all Chordates and provides a key structural distinction from non-chordates.",
      difficulty: "easy",
    },

    {
      concept_id: c4b._id,
      question_text: "Members of Porifera are commonly known as:",
      options: [
        { id: "a", text: "Sponges" },
        { id: "b", text: "Corals" },
        { id: "c", text: "Flatworms" },
        { id: "d", text: "Roundworms" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Porifera, meaning 'pore-bearing,' are commonly known as sponges, characterised by a water canal system used for filter feeding.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text: "The presence of stinging cells (cnidoblasts) is characteristic of which phylum?",
      options: [
        { id: "a", text: "Porifera" },
        { id: "b", text: "Cnidaria (Coelenterata)" },
        { id: "c", text: "Platyhelminthes" },
        { id: "d", text: "Annelida" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Cnidarians possess specialized stinging cells called cnidoblasts (or cnidocytes) on their tentacles, used for defence and capturing prey.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text: "Flatworms (Platyhelminthes) are commonly:",
      options: [
        { id: "a", text: "Free-living only" },
        { id: "b", text: "Parasitic, such as tapeworms and liver flukes" },
        { id: "c", text: "Never triploblastic" },
        { id: "d", text: "Radially symmetrical" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Many Platyhelminthes, such as tapeworms and liver flukes, are parasitic, living inside the bodies of other animals and absorbing nutrients from the host.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text: "Which phylum is characterised by a true coelom and metameric segmentation, exemplified by the earthworm?",
      options: [
        { id: "a", text: "Annelida" },
        { id: "b", text: "Mollusca" },
        { id: "c", text: "Arthropoda" },
        { id: "d", text: "Echinodermata" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Annelida is characterised by a true coelom, metameric segmentation of the body, and a closed circulatory system, with the earthworm as a classic example.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text: "Arthropoda, the largest animal phylum, is defined by the presence of:",
      options: [
        { id: "a", text: "Jointed appendages and a chitinous exoskeleton" },
        { id: "b", text: "Radial symmetry only" },
        { id: "c", text: "Absence of a coelom" },
        { id: "d", text: "A soft, unsegmented body" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Arthropods have jointed appendages and a hard exoskeleton made of chitin, making them the largest and most diverse animal phylum.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text: "Echinoderms show which unique water-based locomotory system?",
      options: [
        { id: "a", text: "Water vascular system" },
        { id: "b", text: "Closed circulatory system" },
        { id: "c", text: "Tracheal system" },
        { id: "d", text: "Book lungs" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Echinoderms possess a unique water vascular system, which functions in locomotion, feeding, and respiration using hydraulic pressure through tube feet.",
      difficulty: "hard",
    },

    {
      concept_id: c4c._id,
      question_text: "All chordates possess which three features at some stage of life?",
      options: [
        { id: "a", text: "Notochord, dorsal hollow nerve cord, and pharyngeal gill slits" },
        { id: "b", text: "Water vascular system and radial symmetry" },
        { id: "c", text: "Exoskeleton and jointed legs" },
        { id: "d", text: "Cnidoblasts and tentacles" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The defining chordate features are a notochord, a dorsal hollow nerve cord, and paired pharyngeal gill slits, present at some stage of the life cycle.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text: "Protochordates differ from vertebrates mainly because protochordates:",
      options: [
        { id: "a", text: "Lack a true vertebral column" },
        { id: "b", text: "Have a bony skeleton" },
        { id: "c", text: "Are always terrestrial" },
        { id: "d", text: "Lack a notochord entirely" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Protochordates possess a notochord but lack a true vertebral column, distinguishing them from vertebrates which have a well-developed backbone.",
      difficulty: "hard",
    },
    {
      concept_id: c4c._id,
      question_text: "Vertebrates are further classified based on the presence or absence of a:",
      options: [
        { id: "a", text: "Jaw (Agnatha vs Gnathostomata)" },
        { id: "b", text: "Water vascular system" },
        { id: "c", text: "Cnidoblasts" },
        { id: "d", text: "Exoskeleton" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Vertebrates are divided into Agnatha (jawless, e.g. lampreys) and Gnathostomata (jawed vertebrates), based on the presence or absence of jaws.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text: "Which class of vertebrates is characterised by a moist, glandular skin and dual (aquatic/terrestrial) life stages?",
      options: [
        { id: "a", text: "Pisces" },
        { id: "b", text: "Amphibia" },
        { id: "c", text: "Reptilia" },
        { id: "d", text: "Aves" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Amphibians have moist, glandular skin and typically show a dual life cycle — an aquatic larval stage (like a tadpole) and a more terrestrial adult stage.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text: "Mammals are distinguished from other vertebrate classes primarily by the presence of:",
      options: [
        { id: "a", text: "Mammary glands and hair" },
        { id: "b", text: "Feathers" },
        { id: "c", text: "Scales and cold-bloodedness" },
        { id: "d", text: "Gills throughout life" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mammals are uniquely characterised by mammary glands, which produce milk to nourish their young, along with the presence of hair on the body.",
      difficulty: "easy",
    },
    {
      concept_id: c4c._id,
      question_text: "Birds (Class Aves) are distinguished by the presence of:",
      options: [
        { id: "a", text: "Feathers and a beak" },
        { id: "b", text: "Fins and gills" },
        { id: "c", text: "Mammary glands" },
        { id: "d", text: "Moist, scaleless skin" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Birds are the only vertebrate class with feathers, along with a beak, forelimbs modified into wings, and typically adaptations for flight.",
      difficulty: "easy",
    },
  ]);

  console.log("Chapter 4 (Animal Kingdom) done");

  // ---------- CHAPTER 5: Morphology of Flowering Plants ----------
  const ch5 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Structural Organisation in Plants and Animals",
    title: "Morphology of Flowering Plants",
    order_index: 5,
  });

  const c5a = await Concept.create({
    chapter_id: ch5._id,
    title: "The Root and The Stem",
    explanation_text:
      "The root system anchors the plant and absorbs water/minerals, typically underground; the stem supports leaves, flowers, and fruits, and conducts water and nutrients through the plant body.",
  });
  const c5b = await Concept.create({
    chapter_id: ch5._id,
    title: "The Leaf and Phyllotaxy",
    explanation_text:
      "The leaf is the primary site of photosynthesis, consisting of leaf base, petiole, and lamina; phyllotaxy describes the arrangement pattern of leaves on the stem or branch.",
  });
  const c5c = await Concept.create({
    chapter_id: ch5._id,
    title: "The Flower, Fruit, and Seed",
    explanation_text:
      "The flower is the reproductive unit of angiosperms, with four whorls (calyx, corolla, androecium, gynoecium); after fertilization, the ovary becomes the fruit and ovules become seeds.",
  });

  await Question.insertMany([
    {
      concept_id: c5a._id,
      question_text: "The root system that develops from the radicle and remains the main root is called:",
      options: [
        { id: "a", text: "Tap root system" },
        { id: "b", text: "Fibrous root system" },
        { id: "c", text: "Adventitious root system" },
        { id: "d", text: "Prop root system" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The tap root system develops directly from the radicle of the germinating seed and typically forms a single main root with smaller lateral branches, common in dicots.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text: "Roots that arise from parts of the plant other than the radicle are called:",
      options: [
        { id: "a", text: "Tap roots" },
        { id: "b", text: "Adventitious roots" },
        { id: "c", text: "Lateral roots only" },
        { id: "d", text: "Primary roots" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Adventitious roots develop from parts of the plant other than the radicle, such as stems or leaves, and are common in monocots (e.g. grasses).",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text: "Root hairs are primarily responsible for:",
      options: [
        { id: "a", text: "Photosynthesis" },
        { id: "b", text: "Absorption of water and minerals" },
        { id: "c", text: "Reproduction" },
        { id: "d", text: "Storage of food only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Root hairs are unicellular structures that increase the surface area of the root, greatly enhancing the absorption of water and dissolved minerals from soil.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text: "The stem grows from which structure of the embryo?",
      options: [
        { id: "a", text: "Radicle" },
        { id: "b", text: "Plumule" },
        { id: "c", text: "Cotyledon" },
        { id: "d", text: "Endosperm" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The stem develops from the plumule of the embryo, growing upward (positively phototropic), and bears nodes, internodes, leaves, and flowers.",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text: "The regions on a stem where leaves are attached are called:",
      options: [
        { id: "a", text: "Internodes" },
        { id: "b", text: "Nodes" },
        { id: "c", text: "Petioles" },
        { id: "d", text: "Stipules" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Nodes are the points on the stem where leaves, branches, or flowers are attached, while the region between two nodes is called the internode.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text: "Underground modified stems, like the potato tuber, primarily function to:",
      options: [
        { id: "a", text: "Store food" },
        { id: "b", text: "Perform photosynthesis" },
        { id: "c", text: "Absorb sunlight" },
        { id: "d", text: "Attract pollinators" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Underground stem modifications such as the potato tuber primarily store food (starch), helping the plant survive unfavourable conditions and enabling vegetative propagation.",
      difficulty: "medium",
    },

    {
      concept_id: c5b._id,
      question_text: "The flat, expanded, green part of a typical leaf is called the:",
      options: [
        { id: "a", text: "Petiole" },
        { id: "b", text: "Lamina" },
        { id: "c", text: "Leaf base" },
        { id: "d", text: "Stipule" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The lamina, or leaf blade, is the flat, expanded, typically green part of the leaf where most photosynthesis occurs, containing veins and veinlets.",
      difficulty: "easy",
    },
    {
      concept_id: c5b._id,
      question_text: "The stalk that attaches the leaf blade to the stem is called the:",
      options: [
        { id: "a", text: "Petiole" },
        { id: "b", text: "Lamina" },
        { id: "c", text: "Midrib" },
        { id: "d", text: "Stipule" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The petiole is the stalk that connects the leaf blade (lamina) to the stem, helping position the leaf to receive optimal sunlight.",
      difficulty: "easy",
    },
    {
      concept_id: c5b._id,
      question_text: "When leaves are arranged singly, one per node, alternating on either side, the phyllotaxy is called:",
      options: [
        { id: "a", text: "Opposite" },
        { id: "b", text: "Alternate" },
        { id: "c", text: "Whorled" },
        { id: "d", text: "Spiral only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In alternate phyllotaxy, a single leaf arises at each node, alternating on either side of the stem, as seen in the China rose and mustard plants.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text: "When a pair of leaves arises at each node, opposite to each other, the phyllotaxy is called:",
      options: [
        { id: "a", text: "Alternate" },
        { id: "b", text: "Opposite" },
        { id: "c", text: "Whorled" },
        { id: "d", text: "Radical" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In opposite phyllotaxy, a pair of leaves arises at each node and lies opposite each other, as seen in the Calotropis and guava plants.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text: "When leaf venation shows veins arranged in a network pattern, it is called:",
      options: [
        { id: "a", text: "Parallel venation" },
        { id: "b", text: "Reticulate venation" },
        { id: "c", text: "Radial venation" },
        { id: "d", text: "Linear venation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Reticulate venation shows veins and veinlets forming a net-like pattern within the lamina, typically found in dicotyledonous plant leaves.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text: "A leaf with a single, undivided lamina is termed:",
      options: [
        { id: "a", text: "Compound" },
        { id: "b", text: "Simple" },
        { id: "c", text: "Pinnate" },
        { id: "d", text: "Palmate" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A simple leaf has a single, undivided lamina, or if incised, the incisions do not reach up to the midrib, unlike compound leaves which are divided into leaflets.",
      difficulty: "hard",
    },

    {
      concept_id: c5c._id,
      question_text: "The outermost whorl of a typical flower, usually green and protective, is called the:",
      options: [
        { id: "a", text: "Corolla" },
        { id: "b", text: "Calyx" },
        { id: "c", text: "Androecium" },
        { id: "d", text: "Gynoecium" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The calyx is the outermost whorl of the flower, made up of sepals, which are typically green and protect the flower in the bud stage.",
      difficulty: "easy",
    },
    {
      concept_id: c5c._id,
      question_text: "The male reproductive whorl of a flower is called the:",
      options: [
        { id: "a", text: "Corolla" },
        { id: "b", text: "Calyx" },
        { id: "c", text: "Androecium" },
        { id: "d", text: "Gynoecium" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The androecium is the male reproductive whorl of the flower, composed of stamens, each consisting of a filament and an anther that produces pollen.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text: "The female reproductive whorl of a flower, made up of one or more carpels/pistils, is the:",
      options: [
        { id: "a", text: "Androecium" },
        { id: "b", text: "Gynoecium" },
        { id: "c", text: "Corolla" },
        { id: "d", text: "Calyx" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The gynoecium is the female reproductive whorl, consisting of one or more carpels, each with a stigma, style, and ovary containing ovules.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text: "After fertilization, the ovary wall typically develops into the:",
      options: [
        { id: "a", text: "Seed coat" },
        { id: "b", text: "Pericarp (fruit wall)" },
        { id: "c", text: "Endosperm" },
        { id: "d", text: "Embryo" },
      ],
      correct_option_id: "b",
      explanation_text:
        "After fertilization, the wall of the ovary develops into the pericarp, or fruit wall, which may become fleshy or dry depending on the fruit type.",
      difficulty: "hard",
    },
    {
      concept_id: c5c._id,
      question_text: "The outer protective covering of a seed, developed from the integument(s) of the ovule, is called the:",
      options: [
        { id: "a", text: "Testa (seed coat)" },
        { id: "b", text: "Pericarp" },
        { id: "c", text: "Endosperm" },
        { id: "d", text: "Hilum only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The seed coat, or testa, develops from the integuments of the ovule and forms a hard, protective outer covering around the seed.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text: "A fruit that develops from the ovary without fertilization is called a:",
      options: [
        { id: "a", text: "True fruit" },
        { id: "b", text: "Parthenocarpic fruit" },
        { id: "c", text: "False fruit" },
        { id: "d", text: "Aggregate fruit" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A parthenocarpic fruit develops from the ovary without fertilization taking place, and such fruits are typically seedless, e.g. seedless bananas.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 5 (Morphology of Flowering Plants) done");

  // ---------- CHAPTER 6: Anatomy of Flowering Plants ----------
  const ch6 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Structural Organisation in Plants and Animals",
    title: "Anatomy of Flowering Plants",
    order_index: 6,
  });

  const c6a = await Concept.create({
    chapter_id: ch6._id,
    title: "Plant Tissues",
    explanation_text:
      "Plant tissues are broadly grouped into meristematic (dividing) and permanent (differentiated) tissues, which together build up the internal structure of roots, stems, and leaves.",
  });
  const c6b = await Concept.create({
    chapter_id: ch6._id,
    title: "Tissue Systems (Epidermal, Ground, Vascular)",
    explanation_text:
      "Plant organs are organised into three tissue systems: epidermal (outer protective covering), ground (fills the bulk of the plant body), and vascular (xylem and phloem for transport).",
  });
  const c6c = await Concept.create({
    chapter_id: ch6._id,
    title: "Secondary Growth",
    explanation_text:
      "Secondary growth is the increase in girth of stems and roots in dicots and gymnosperms, brought about by the activity of lateral meristems — the vascular cambium and cork cambium.",
  });

  await Question.insertMany([
    {
      concept_id: c6a._id,
      question_text: "Tissues that consist of actively dividing cells are called:",
      options: [
        { id: "a", text: "Permanent tissues" },
        { id: "b", text: "Meristematic tissues" },
        { id: "c", text: "Vascular tissues" },
        { id: "d", text: "Epidermal tissues" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Meristematic tissues consist of cells that retain the capacity to divide continuously, responsible for growth in length and girth of the plant.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text: "Meristems located at the tips of roots and shoots, responsible for growth in length, are called:",
      options: [
        { id: "a", text: "Lateral meristems" },
        { id: "b", text: "Apical meristems" },
        { id: "c", text: "Intercalary meristems" },
        { id: "d", text: "Secondary meristems" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Apical meristems are present at the tips of roots and shoots and are responsible for the increase in length of the plant, also called primary growth.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text: "Tissues that lose the ability to divide and become specialized for specific functions are:",
      options: [
        { id: "a", text: "Meristematic tissues" },
        { id: "b", text: "Permanent (differentiated) tissues" },
        { id: "c", text: "Cambium tissues only" },
        { id: "d", text: "Undifferentiated tissue" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Permanent tissues are formed from meristematic tissue that has lost the capacity to divide, and instead becomes structurally and functionally specialized.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text: "Parenchyma, collenchyma, and sclerenchyma are examples of:",
      options: [
        { id: "a", text: "Meristematic tissues" },
        { id: "b", text: "Simple permanent tissues" },
        { id: "c", text: "Complex permanent tissues" },
        { id: "d", text: "Vascular cambium" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Parenchyma, collenchyma, and sclerenchyma are called simple permanent tissues because they are made up of only one type of cell, unlike complex tissues like xylem/phloem.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text: "Sclerenchyma cells provide mechanical support to the plant mainly due to:",
      options: [
        { id: "a", text: "Thin cellulose walls" },
        { id: "b", text: "Thick, lignified cell walls" },
        { id: "c", text: "Presence of chlorophyll" },
        { id: "d", text: "Living protoplasm" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Sclerenchyma cells have thick, lignified cell walls with few or no intercellular spaces, making them dead at maturity but providing strong mechanical support.",
      difficulty: "hard",
    },
    {
      concept_id: c6a._id,
      question_text: "Which simple permanent tissue provides flexibility to young, growing parts of the plant, such as petioles?",
      options: [
        { id: "a", text: "Parenchyma" },
        { id: "b", text: "Collenchyma" },
        { id: "c", text: "Sclerenchyma" },
        { id: "d", text: "Xylem" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Collenchyma tissue has unevenly thickened corners and provides mechanical support along with flexibility, allowing young stems and petioles to bend without breaking.",
      difficulty: "hard",
    },

    {
      concept_id: c6b._id,
      question_text: "The outermost protective layer covering the entire plant body is the:",
      options: [
        { id: "a", text: "Vascular tissue system" },
        { id: "b", text: "Ground tissue system" },
        { id: "c", text: "Epidermal tissue system" },
        { id: "d", text: "Cambium" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The epidermal tissue system forms the outermost covering of the whole plant body, protecting it from water loss, mechanical injury, and pathogen invasion.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text: "Small pores on the leaf epidermis that regulate gas exchange and water loss are called:",
      options: [
        { id: "a", text: "Lenticels" },
        { id: "b", text: "Stomata" },
        { id: "c", text: "Trichomes" },
        { id: "d", text: "Root hairs" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Stomata are small pores present mainly on the leaf epidermis, each guarded by two kidney-shaped guard cells that regulate gas exchange and transpiration.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text: "The tissue system that fills the bulk of the plant body, excluding epidermis and vascular bundles, is the:",
      options: [
        { id: "a", text: "Epidermal tissue system" },
        { id: "b", text: "Ground tissue system" },
        { id: "c", text: "Vascular tissue system" },
        { id: "d", text: "Cork tissue" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The ground tissue system comprises all tissues except the epidermis and vascular bundles, and includes parenchyma, collenchyma, and sclerenchyma, filling the bulk of the plant body.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text: "Xylem and phloem together make up which tissue system, responsible for conduction?",
      options: [
        { id: "a", text: "Epidermal" },
        { id: "b", text: "Ground" },
        { id: "c", text: "Vascular" },
        { id: "d", text: "Meristematic" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The vascular tissue system consists of xylem and phloem, arranged together as vascular bundles, responsible for conducting water, minerals, and food throughout the plant.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text: "Xylem primarily functions in the conduction of:",
      options: [
        { id: "a", text: "Water and minerals" },
        { id: "b", text: "Food (organic nutrients)" },
        { id: "c", text: "Oxygen only" },
        { id: "d", text: "Hormones only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Xylem is a complex tissue that primarily conducts water and dissolved minerals from the roots to different parts of the plant, and also provides mechanical strength.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text: "Phloem primarily functions in the transport of:",
      options: [
        { id: "a", text: "Water" },
        { id: "b", text: "Food materials, mainly sugars, from leaves to other parts" },
        { id: "c", text: "Minerals only" },
        { id: "d", text: "Oxygen" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Phloem is responsible for translocation, transporting food materials, mainly sugars produced during photosynthesis, from leaves to other parts of the plant.",
      difficulty: "medium",
    },

    {
      concept_id: c6c._id,
      question_text: "Secondary growth in dicot stems and roots leads to an increase in:",
      options: [
        { id: "a", text: "Length only" },
        { id: "b", text: "Girth (diameter)" },
        { id: "c", text: "Number of leaves" },
        { id: "d", text: "Root hair number" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Secondary growth refers to the increase in girth (diameter/thickness) of stems and roots in dicots and gymnosperms, distinct from the primary growth in length.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text: "Secondary growth in stems is mainly brought about by the activity of:",
      options: [
        { id: "a", text: "Apical meristem" },
        { id: "b", text: "Vascular cambium and cork cambium" },
        { id: "c", text: "Intercalary meristem" },
        { id: "d", text: "Root hairs" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Secondary growth is caused by two lateral meristems — the vascular cambium (produces secondary xylem and phloem) and the cork cambium (produces the periderm).",
      difficulty: "hard",
    },
    {
      concept_id: c6c._id,
      question_text: "The vascular cambium produces secondary xylem towards the inside and secondary phloem towards the:",
      options: [
        { id: "a", text: "Outside" },
        { id: "b", text: "Inside as well" },
        { id: "c", text: "Neither direction" },
        { id: "d", text: "Centre of the pith" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The vascular cambium is bidirectional, cutting off secondary xylem towards the inner side and secondary phloem towards the outer side of the stem.",
      difficulty: "hard",
    },
    {
      concept_id: c6c._id,
      question_text: "The cork cambium (phellogen) produces cork tissue on its outer side and __ on its inner side.",
      options: [
        { id: "a", text: "Secondary xylem" },
        { id: "b", text: "Secondary cortex (phelloderm)" },
        { id: "c", text: "Pith" },
        { id: "d", text: "Epidermis" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The cork cambium (phellogen) cuts off cork (phellem) towards the outside and secondary cortex (phelloderm) towards the inside, together forming the periderm.",
      difficulty: "hard",
    },
    {
      concept_id: c6c._id,
      question_text: "Growth rings (annual rings) seen in tree trunks are formed due to:",
      options: [
        { id: "a", text: "Seasonal variation in cambium activity" },
        { id: "b", text: "Root hair growth" },
        { id: "c", text: "Stomatal opening/closing" },
        { id: "d", text: "Leaf fall alone" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Growth rings, visible as concentric circles in a tree's cross-section, form due to seasonal variation in vascular cambium activity — faster growth in spring, slower in winter.",
      difficulty: "hard",
    },
    {
      concept_id: c6c._id,
      question_text: "Lenticels, found on the bark of older stems, mainly function for:",
      options: [
        { id: "a", text: "Gas exchange" },
        { id: "b", text: "Water absorption" },
        { id: "c", text: "Food storage" },
        { id: "d", text: "Reproduction" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Lenticels are small openings in the bark/cork layer of older stems that allow for gas exchange between the internal tissues and the outside atmosphere.",
      difficulty: "medium",
    },
  ]);

  console.log(
    "Grade 11 Batch 2 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
