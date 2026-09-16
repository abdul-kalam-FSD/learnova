require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const Question = require("./src/models/Question");

// Adds NCERT Class 11 Chapter 7 "Structural Organisation in Animals",
// the one chapter of the current 19-chapter rationalised syllabus that
// the seedGrade11_batch*.js series never created. Unit II otherwise
// exists (Morphology + Anatomy of Flowering Plants in batch 2).
// Idempotent so it can be re-run alongside the other batches.
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

  // ---------- CHAPTER 7: Structural Organisation in Animals ----------
  let ch7 = await Chapter.findOne({
    subject_id: subject._id,
    title: "Structural Organisation in Animals",
  });
  if (!ch7) {
    ch7 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Structural Organisation in Animals and Plants",
      title: "Structural Organisation in Animals",
      order_index: 7,
    });
    console.log("Created chapter:", ch7._id);
  }

  let cA = await Concept.findOne({
    chapter_id: ch7._id,
    title: "Animal Tissues: Epithelial and Connective",
  });
  if (!cA) {
    cA = await Concept.create({
      chapter_id: ch7._id,
      title: "Animal Tissues: Epithelial and Connective",
      explanation_text:
        "Epithelial tissue forms protective and absorptive linings and is classified by cell shape and layering, while connective tissue — loose, dense, and specialised forms such as cartilage, bone, and blood — links and supports other tissues through an abundant extracellular matrix.",
    });
  }

  let cB = await Concept.findOne({
    chapter_id: ch7._id,
    title: "Animal Tissues: Muscular and Neural",
  });
  if (!cB) {
    cB = await Concept.create({
      chapter_id: ch7._id,
      title: "Animal Tissues: Muscular and Neural",
      explanation_text:
        "Muscular tissue occurs as skeletal, smooth, and cardiac types that differ in striation, control, and location, and neural tissue consists of neurons and neuroglia that generate and conduct electrical impulses for rapid coordination.",
    });
  }

  let cC = await Concept.findOne({
    chapter_id: ch7._id,
    title: "Morphology and Anatomy of the Cockroach",
  });
  if (!cC) {
    cC = await Concept.create({
      chapter_id: ch7._id,
      title: "Morphology and Anatomy of the Cockroach",
      explanation_text:
        "The cockroach shows the segmented insect body plan of head, thorax, and abdomen with a chitinous exoskeleton, and its digestive, circulatory, excretory, and nervous systems illustrate organ-system-level organisation in an invertebrate.",
    });
  }

  const existingQuestions = await Question.countDocuments({
    concept_id: { $in: [cA._id, cB._id, cC._id] },
  });
  if (existingQuestions > 0) {
    console.log("Questions already seeded for this chapter — skipping.");
    await mongoose.disconnect();
    return;
  }

  await Question.insertMany([
    {
      concept_id: cA._id,
      question_text: "Epithelial tissue that is a single layer of tall, column-shaped cells is called:",
      options: [
        { id: "a", text: "Simple squamous epithelium" },
        { id: "b", text: "Simple columnar epithelium" },
        { id: "c", text: "Stratified squamous epithelium" },
        { id: "d", text: "Simple cuboidal epithelium" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Simple columnar epithelium is one cell layer thick and made of tall, pillar-like cells; it lines the stomach and intestine where absorption and secretion occur.",
      difficulty: "easy",
    },
    {
      concept_id: cA._id,
      question_text: "Which junction prevents substances from leaking across a tissue?",
      options: [
        { id: "a", text: "Tight junction" },
        { id: "b", text: "Adhering junction" },
        { id: "c", text: "Gap junction" },
        { id: "d", text: "Desmosome" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Tight junctions seal neighbouring cells together so tightly that materials cannot pass through the space between them, stopping leakage across the epithelium.",
      difficulty: "medium",
    },
    {
      concept_id: cA._id,
      question_text: "Blood is classified as a connective tissue because it:",
      options: [
        { id: "a", text: "Contracts to produce movement" },
        { id: "b", text: "Conducts electrical impulses" },
        { id: "c", text: "Has cells suspended in an extensive fluid matrix" },
        { id: "d", text: "Forms a continuous protective lining" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Connective tissues are defined by cells scattered within an abundant extracellular matrix; in blood that matrix is the fluid plasma carrying the blood cells.",
      difficulty: "medium",
    },
    {
      concept_id: cA._id,
      question_text: "Which connective tissue joins a muscle to a bone?",
      options: [
        { id: "a", text: "Ligament" },
        { id: "b", text: "Tendon" },
        { id: "c", text: "Areolar tissue" },
        { id: "d", text: "Adipose tissue" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Tendons are dense regular connective tissue attaching muscle to bone, whereas ligaments attach bone to bone.",
      difficulty: "easy",
    },
    {
      concept_id: cA._id,
      question_text: "Adipose tissue is specialised mainly for:",
      options: [
        { id: "a", text: "Storage of fat" },
        { id: "b", text: "Transport of oxygen" },
        { id: "c", text: "Impulse conduction" },
        { id: "d", text: "Secretion of enzymes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Adipose tissue is a loose connective tissue whose cells are filled with stored fat, providing an energy reserve and insulation beneath the skin.",
      difficulty: "easy",
    },
    {
      concept_id: cB._id,
      question_text: "Which muscle type is striated, branched, and involuntary?",
      options: [
        { id: "a", text: "Skeletal muscle" },
        { id: "b", text: "Smooth muscle" },
        { id: "c", text: "Cardiac muscle" },
        { id: "d", text: "Visceral muscle" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Cardiac muscle is unique in combining striations with branching fibres and involuntary control; skeletal muscle is striated but voluntary, and smooth muscle is unstriated.",
      difficulty: "medium",
    },
    {
      concept_id: cB._id,
      question_text: "Smooth muscle is also called visceral muscle because it:",
      options: [
        { id: "a", text: "Attaches to the skeleton" },
        { id: "b", text: "Occurs in the walls of internal hollow organs" },
        { id: "c", text: "Is found only in the heart" },
        { id: "d", text: "Is under conscious control" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Smooth muscle lines the walls of internal (visceral) organs such as the stomach, intestine, and blood vessels, where it contracts involuntarily.",
      difficulty: "easy",
    },
    {
      concept_id: cB._id,
      question_text: "The part of a neuron that carries impulses away from the cell body is the:",
      options: [
        { id: "a", text: "Dendrite" },
        { id: "b", text: "Axon" },
        { id: "c", text: "Nissl granule" },
        { id: "d", text: "Cell body" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The axon conducts the nerve impulse away from the cell body toward the next cell, while dendrites receive incoming impulses and carry them toward the cell body.",
      difficulty: "easy",
    },
    {
      concept_id: cB._id,
      question_text: "Neuroglial cells in neural tissue mainly:",
      options: [
        { id: "a", text: "Generate and transmit nerve impulses" },
        { id: "b", text: "Protect and support the neurons" },
        { id: "c", text: "Contract to move the body" },
        { id: "d", text: "Store fat around nerves" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Neuroglia make up more than half of neural tissue and protect, support, and maintain the neurons; the neurons themselves do the signalling.",
      difficulty: "medium",
    },
    {
      concept_id: cB._id,
      question_text: "Skeletal muscle fibres are described as syncytial because each fibre:",
      options: [
        { id: "a", text: "Has no nucleus at all" },
        { id: "b", text: "Contains many nuclei" },
        { id: "c", text: "Divides continuously" },
        { id: "d", text: "Lacks a plasma membrane" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A skeletal muscle fibre forms by the fusion of many cells, so the mature fibre is multinucleate (syncytial), with nuclei lying just beneath the sarcolemma.",
      difficulty: "hard",
    },
    {
      concept_id: cC._id,
      question_text: "The body of a cockroach is divided into which three regions?",
      options: [
        { id: "a", text: "Head, thorax, and abdomen" },
        { id: "b", text: "Head, trunk, and tail" },
        { id: "c", text: "Cephalothorax and abdomen" },
        { id: "d", text: "Prothorax, mesothorax, and metathorax" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Like other insects, the cockroach body is segmented into a distinct head, a three-segmented thorax bearing legs and wings, and a ten-segmented abdomen.",
      difficulty: "easy",
    },
    {
      concept_id: cC._id,
      question_text: "Excretion in the cockroach is carried out mainly by:",
      options: [
        { id: "a", text: "Nephridia" },
        { id: "b", text: "Malpighian tubules" },
        { id: "c", text: "Flame cells" },
        { id: "d", text: "Kidneys" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Malpighian tubules at the junction of the midgut and hindgut absorb nitrogenous waste from the haemolymph and excrete it as uric acid.",
      difficulty: "medium",
    },
    {
      concept_id: cC._id,
      question_text: "The circulatory system of the cockroach is described as open because:",
      options: [
        { id: "a", text: "Blood flows only inside closed vessels" },
        { id: "b", text: "Blood bathes the organs directly in body sinuses" },
        { id: "c", text: "It has no heart" },
        { id: "d", text: "It carries oxygen bound to haemoglobin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In an open circulatory system the haemolymph leaves the heart into body cavities (sinuses) and bathes the organs directly before returning, rather than staying within vessels.",
      difficulty: "medium",
    },
    {
      concept_id: cC._id,
      question_text: "Oxygen is delivered to the cockroach's tissues by:",
      options: [
        { id: "a", text: "Haemolymph pigments" },
        { id: "b", text: "A network of tracheal tubes opening at spiracles" },
        { id: "c", text: "Gills on the abdomen" },
        { id: "d", text: "Diffusion through the exoskeleton" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Insect respiration is independent of the blood: air enters through spiracles and travels along branching tracheae and tracheoles directly to the tissues.",
      difficulty: "hard",
    },
    {
      concept_id: cC._id,
      question_text: "The gizzard (proventriculus) of the cockroach functions to:",
      options: [
        { id: "a", text: "Store food before digestion" },
        { id: "b", text: "Grind food with its chitinous teeth" },
        { id: "c", text: "Absorb digested nutrients" },
        { id: "d", text: "Secrete digestive enzymes" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The gizzard has thick muscular walls lined with six chitinous teeth that grind the food; the crop stores it and the hepatic caecae secrete enzymes.",
      difficulty: "medium",
    },
  ]);

  console.log("Grade 11 Batch 8 seed complete: 1 chapter, 3 concepts, 15 questions added.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
