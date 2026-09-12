require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fifth Biology mechanic, and the last of Priority 7 (Genetics
// Simulator, then Diagnosis, then Specimen Analysis). Deliberately
// distinct from Diagnosis rather than a reskin of it: Diagnosis
// inspects cards then picks an unordered *subset* as supporting
// evidence; Specimen Analysis requires inspecting every feature first,
// then makes a single classification choice, scored via the same
// single-choice check as Virtual Lab/Debugging Lab/Civic Decision
// (attempt.selectedHotspotId vs payload.correct_hotspot_id — see
// gameControllers.js checkAttempt) — only the game_type needed adding
// to that check's list. The reasoning explanation is withheld from
// the client until a correct attempt (see sanitizePayloadForClient +
// submitGameAttempt's reveal-on-correct fields), matching the spec's
// "Classify -> Explain reasoning" payoff at the end of the
// inspect -> observe -> identify -> classify loop.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Biology now lives inside the integrated "Science"
  // subject (see seedGrade10.js) rather than its own top-level
  // Subject, so this must match "Science" too, not just "Biology".
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science subject not found — run seedGrade10.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Classification of Living Organisms" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Classification of Living Organisms",
      title: "Classification of Living Organisms",
      order_index: 102,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Identifying Organisms from Observable Features" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Identifying Organisms from Observable Features",
      explanation_text:
        "Classifying a specimen means observing its physical features methodically, separating the ones that are actually diagnostic of a group from ones that are coincidental, then matching the true feature pattern to the correct classification.",
    });
    console.log("Created concept:", concept._id);
  }

  const levels = [
    {
      title: "Specimen A: The Garden Visitor",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen A: The Garden Visitor",
        context:
          "A small creature is found resting on a rose bush in the school garden. Use its observable features to classify it.",
        features: [
          { id: "f1", label: "Six jointed legs", detail: "Legs are arranged in three pairs, one springing from each thoracic segment." },
          { id: "f2", label: "Hard exoskeleton", detail: "An external skeleton made of chitin covers the entire body." },
          { id: "f3", label: "Body divided into three regions", detail: "A clear head, thorax, and abdomen are visible." },
          { id: "f4", label: "One pair of antennae", detail: "A single pair of segmented antennae extends from the head." },
          { id: "f5", label: "Found on a leaf at sunrise", detail: "It was resting on the underside of a rose leaf at sunrise." },
        ],
        classificationOptions: [
          { id: "insect", label: "Insect (Class Insecta)" },
          { id: "arachnid", label: "Arachnid (Class Arachnida)" },
          { id: "crustacean", label: "Crustacean (Class Crustacea)" },
          { id: "myriapod", label: "Myriapod (Class Myriapoda)" },
        ],
        correct_hotspot_id: "insect",
        explanation:
          "Six legs arranged in three pairs, one pair of antennae, and a three-part body (head-thorax-abdomen) are the defining features of Class Insecta. Arachnids have eight legs and only two body regions, crustaceans typically carry two pairs of antennae, and myriapods have many more leg pairs than six. Where it was found on the plant says nothing about its classification.",
        hint: "Count the legs and antennae, and look at how many body regions there are — where it was found on the plant doesn't help you classify it.",
      },
    },
    {
      title: "Specimen B: The Unlabeled Seedling",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen B: The Unlabeled Seedling",
        context:
          "A greenhouse seedling has lost its plant tag. Classify it using its leaf, root, and flower structure.",
        features: [
          { id: "f1", label: "Leaf veins run parallel", detail: "Veins run side-by-side from base to tip without branching into a network." },
          { id: "f2", label: "Fibrous root system", detail: "Roots form a dense mat of similarly sized threads, with no single dominant root." },
          { id: "f3", label: "Flower parts in multiples of three", detail: "Each flower has petals arranged in groups of three." },
          { id: "f4", label: "Potted in a red plastic container", detail: "The seedling happens to be growing in a red nursery pot." },
          { id: "f5", label: "Leaves are narrow and elongated", detail: "Leaf blades are long, thin, and blade-like rather than broad." },
        ],
        classificationOptions: [
          { id: "monocot", label: "Monocot" },
          { id: "dicot", label: "Dicot" },
          { id: "gymnosperm", label: "Gymnosperm" },
          { id: "fern", label: "Fern" },
        ],
        correct_hotspot_id: "monocot",
        explanation:
          "Parallel leaf venation, a fibrous root system, and floral parts in multiples of three are hallmark monocot traits, seen in plants like grasses, lilies, and corn. Dicots instead show net-like venation, a taproot system, and flower parts in fours or fives. The color of the pot has no bearing on the plant's classification.",
        hint: "Focus on the vein pattern, the root system, and the flower-part count — the pot color is a distraction.",
      },
    },
    {
      title: "Specimen C: The Pond Water Sample",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen C: The Pond Water Sample",
        context:
          "A drop of pond water under the microscope reveals a growth on a decaying leaf fragment. Classify it based on its cell structure and how it feeds.",
        features: [
          { id: "f1", label: "Rigid cell wall made of chitin", detail: "The outer wall is stiff and composed of chitin, not cellulose." },
          { id: "f2", label: "No chlorophyll present", detail: "The organism appears colorless under the microscope — no green pigment is visible." },
          { id: "f3", label: "Thread-like branching body", detail: "Long branching filaments make up the body, forming a tangled mesh." },
          { id: "f4", label: "Absorbs nutrients from dead matter", detail: "It is growing directly on a decaying leaf fragment, absorbing nutrients from it." },
          { id: "f5", label: "Sample collected at midday", detail: "The water sample happened to be taken around noon." },
        ],
        classificationOptions: [
          { id: "bacteria", label: "Bacteria" },
          { id: "fungus", label: "Fungus" },
          { id: "protist", label: "Protist (Algae)" },
          { id: "virus", label: "Virus" },
        ],
        correct_hotspot_id: "fungus",
        explanation:
          "A chitin cell wall, absence of chlorophyll, and absorbing nutrients directly from decaying matter (rather than photosynthesizing or ingesting food) are defining fungal traits — this describes a mold-like fungus growing on the leaf fragment. Bacteria don't have chitin cell walls, algae/protists here would contain chlorophyll, and viruses aren't cellular at all. The time of day the sample was collected is irrelevant.",
        hint: "Look at what the cell wall is made of and how it gets its food — the collection time doesn't matter.",
      },
    },
  ];

  for (const level of levels) {
    const exists = await GameContent.findOne({ game_type: "BIO_SPECIMEN_ANALYSIS", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
