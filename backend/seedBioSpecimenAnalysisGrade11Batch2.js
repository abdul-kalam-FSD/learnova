require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 11 Biology expansion (Batch 1 of the approved Grade 11 plan
// — see GRADE_11_BIOLOGY_BATCH_1_PLAN.md): adds BIO_SPECIMEN_ANALYSIS
// coverage for three concepts that were still content-only.
//
// "Animal Kingdom" already has BIO_SPECIMEN_ANALYSIS coverage via its
// "Basis of Classification" concept (seedBioSpecimenAnalysisGrade11.js)
// — this file does NOT touch that concept or its GameContent. Instead
// it covers that chapter's sibling concept, "Non-Chordates (Porifera
// to Echinodermata)", plus one flagship concept each from "Biological
// Classification" and "Plant Kingdom".
//
// Links to concepts created by seedGrade11.js / seedGrade11_batch2.js
// — run those first. Same payload shape (specimenName + context +
// features + classificationOptions + correct_hotspot_id + explanation
// + hint) and scoring path (single-hotspot check on
// attempt.selectedHotspotId vs payload.correct_hotspot_id — see
// gameControllers.js checkAttempt) as every other Specimen Analysis
// grade, including the existing seedBioSpecimenAnalysisGrade11.js.
// Additive only. Safe to re-run (GameContent.findOne guard before
// every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Science/Biology subject not found — run seedGrade11.js / seedGrade11_batch2.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptChapters = {
    "Kingdom Monera and Kingdom Protista": "Biological Classification",
    "Pteridophytes and Gymnosperms": "Plant Kingdom",
    "Non-Chordates (Porifera to Echinodermata)": "Animal Kingdom",
  };
  const concepts = {};
  for (const [title, chapterTitle] of Object.entries(conceptChapters)) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.error(`Chapter "${chapterTitle}" not found — run seedGrade11.js / seedGrade11_batch2.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade11.js / seedGrade11_batch2.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const moneraProtistaChallenges = [
    {
      title: "Specimen A: The Pond-Water Rod",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen A: The Pond-Water Rod",
        context: "A rod-shaped microorganism is isolated from pond water. It absorbs dissolved organic matter from its surroundings for nutrition.",
        features: [
          { id: "f1", label: "No nuclear membrane", detail: "Genetic material lies free in the cytoplasm, not enclosed in a nucleus." },
          { id: "f2", label: "Cell wall present (peptidoglycan)", detail: "A rigid wall made of peptidoglycan surrounds the cell." },
          { id: "f3", label: "Heterotrophic nutrition", detail: "Absorbs organic matter from its surroundings rather than making its own food." },
          { id: "f4", label: "Found in pond water", detail: "Describes the habitat, not the organism's cell-level organisation." },
        ],
        classificationOptions: [
          { id: "monera", label: "Kingdom Monera (Bacteria)" },
          { id: "protista", label: "Kingdom Protista" },
          { id: "fungi", label: "Kingdom Fungi" },
          { id: "plantae", label: "Kingdom Plantae" },
        ],
        correct_hotspot_id: "monera",
        explanation:
          "The absence of a nuclear membrane is the single defining feature of Kingdom Monera — every other kingdom listed here is eukaryotic, with genetic material enclosed in a true nucleus. The peptidoglycan cell wall confirms it further (protists, fungi, and plants have different wall chemistry or none at all). Habitat doesn't decide kingdom membership.",
        hint: "Start with whether the genetic material is enclosed in a nucleus — that single feature separates one kingdom from all the others on this list.",
      },
    },
    {
      title: "Specimen B: The Green Swimmer",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen B: The Green Swimmer",
        context: "A single-celled, green organism swims through lake water using a whip-like tail. It contains chlorophyll and makes its own food using sunlight.",
        features: [
          { id: "f1", label: "Nuclear membrane present", detail: "Genetic material is enclosed in a true nucleus." },
          { id: "f2", label: "Contains chlorophyll", detail: "Green pigment capable of capturing light energy is present in the cell." },
          { id: "f3", label: "Motile via a flagellum", detail: "Moves using a single whip-like structure." },
          { id: "f4", label: "Single-celled", detail: "The entire organism is one cell." },
        ],
        classificationOptions: [
          { id: "monera", label: "Kingdom Monera (Bacteria)" },
          { id: "protista", label: "Kingdom Protista" },
          { id: "fungi", label: "Kingdom Fungi" },
          { id: "animalia", label: "Kingdom Animalia" },
        ],
        correct_hotspot_id: "protista",
        explanation:
          "A eukaryotic, single-celled, photosynthetic, motile organism (like Euglena) is a textbook photosynthetic protist — Kingdom Protista is defined by exactly this eukaryotic-but-not-plant/animal/fungus grouping. The nuclear membrane rules out Monera; chlorophyll and self-feeding rule out Animalia; the single-celled, motile, non-absorptive lifestyle rules out Fungi.",
        hint: "It has a nucleus (ruling out one kingdom) and makes its own food while still swimming freely (ruling out two more) — only one kingdom fits every feature at once.",
      },
    },
    {
      title: "Specimen C: The Forest-Floor Mixotroph",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen C: The Forest-Floor Mixotroph",
        context: "A eukaryotic, single-celled organism found in damp forest-floor leaf litter can photosynthesize when light is available, but engulfs bacteria as food when kept in darkness.",
        features: [
          { id: "f1", label: "Nuclear membrane present", detail: "Genetic material is enclosed in a true nucleus." },
          { id: "f2", label: "Photosynthesizes in light", detail: "Produces its own food using chlorophyll when light is available." },
          { id: "f3", label: "Engulfs bacteria in darkness", detail: "Switches to consuming other organisms as food when light is unavailable." },
          { id: "f4", label: "Lives in damp leaf litter", detail: "Describes the habitat, not the organism's mode of nutrition." },
        ],
        classificationOptions: [
          { id: "monera", label: "Kingdom Monera (Bacteria)" },
          { id: "protista", label: "Kingdom Protista" },
          { id: "fungi", label: "Kingdom Fungi" },
          { id: "plantae", label: "Kingdom Plantae" },
        ],
        correct_hotspot_id: "protista",
        explanation:
          "Switching between photosynthesis and engulfing food (mixotrophy) in a eukaryotic single cell is a hallmark of certain protists — Protista is the one kingdom whose members aren't required to pick a single mode of nutrition the way true plants (photosynthetic only) or fungi (absorptive only) are. The nuclear membrane confirms it's eukaryotic, ruling out Monera.",
        hint: "This organism doesn't commit to one feeding strategy — think about which kingdom is defined by not fitting neatly into the plant/animal/fungus nutrition split.",
      },
    },
  ];

  const pteridophytesGymnospermsChallenges = [
    {
      title: "Specimen D: The Shaded Fern",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen D: The Shaded Fern",
        context: "A leafy plant growing in a shaded, moist forest understorey has well-developed vascular tissue but produces no seeds — it reproduces via tiny spore capsules on the underside of its leaves.",
        features: [
          { id: "f1", label: "Vascular tissue present", detail: "Has xylem and phloem for internal water and nutrient transport." },
          { id: "f2", label: "No seeds produced", detail: "Reproduction does not involve seed formation." },
          { id: "f3", label: "Spore capsules on leaf undersides", detail: "Reproductive structures release spores rather than seeds." },
          { id: "f4", label: "Grows in shaded, moist soil", detail: "Describes the habitat, not the reproductive strategy." },
        ],
        classificationOptions: [
          { id: "pteridophyte", label: "Pteridophyte (e.g. ferns)" },
          { id: "gymnosperm", label: "Gymnosperm" },
          { id: "bryophyte", label: "Bryophyte" },
          { id: "angiosperm", label: "Angiosperm" },
        ],
        correct_hotspot_id: "pteridophyte",
        explanation:
          "Vascular tissue combined with spore-based (not seed-based) reproduction is the defining pteridophyte combination — bryophytes lack vascular tissue entirely, while gymnosperms and angiosperms both reproduce via seeds. The shaded, moist habitat fits many plant groups and isn't itself diagnostic.",
        hint: "It has proper internal transport tissue like a seed plant, but check what its reproductive structures actually release — spores or seeds.",
      },
    },
    {
      title: "Specimen E: The Cone-Bearing Evergreen",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen E: The Cone-Bearing Evergreen",
        context: "A tall, needle-leaved evergreen tree produces woody cones. The seeds inside develop exposed on the surface of the cone scales, with no fruit ever forming around them.",
        features: [
          { id: "f1", label: "Produces seeds", detail: "Reproduces via seeds rather than spores." },
          { id: "f2", label: "Seeds develop on exposed cone scales", detail: "The seeds are not enclosed within an ovary or fruit at any stage." },
          { id: "f3", label: "Needle-shaped leaves", detail: "Leaves are narrow and needle-like." },
          { id: "f4", label: "Evergreen, keeps leaves year-round", detail: "Does not lose all its leaves in a single season." },
        ],
        classificationOptions: [
          { id: "pteridophyte", label: "Pteridophyte (e.g. ferns)" },
          { id: "gymnosperm", label: "Gymnosperm" },
          { id: "bryophyte", label: "Bryophyte" },
          { id: "angiosperm", label: "Angiosperm" },
        ],
        correct_hotspot_id: "gymnosperm",
        explanation:
          "Seeds that develop exposed on a cone scale, with no enclosing fruit, is exactly what \"gymnosperm\" means (Greek for \"naked seed\") — angiosperms enclose their seeds inside an ovary that develops into fruit, while pteridophytes and bryophytes don't produce seeds at all. Needle leaves and being evergreen are common gymnosperm traits but aren't themselves the deciding feature.",
        hint: "The key detail is what surrounds the seed at maturity — compare an exposed cone scale to a fruit that wraps around a seed.",
      },
    },
    {
      title: "Specimen F: The Ambiguous Seedling",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen F: The Ambiguous Seedling",
        context: "A woody plant has true vascular tissue and produces seeds, like the specimen from the previous case. But its seeds are found fully enclosed inside a fleshy fruit that develops from a flower's ovary.",
        features: [
          { id: "f1", label: "Vascular tissue present", detail: "Has xylem and phloem for internal transport." },
          { id: "f2", label: "Produces seeds", detail: "Reproduces via seeds, not spores." },
          { id: "f3", label: "Seeds enclosed in a fleshy fruit", detail: "The seed is fully surrounded by fruit tissue that developed from an ovary." },
          { id: "f4", label: "Develops from a flower", detail: "The fruit-forming structure originates from a flower's ovary." },
        ],
        classificationOptions: [
          { id: "pteridophyte", label: "Pteridophyte (e.g. ferns)" },
          { id: "gymnosperm", label: "Gymnosperm" },
          { id: "bryophyte", label: "Bryophyte" },
          { id: "angiosperm", label: "Angiosperm" },
        ],
        correct_hotspot_id: "angiosperm",
        explanation:
          "Vascular tissue and seed production alone (features 1 and 2) fit both gymnosperms and angiosperms equally — the deciding feature is whether the seed is enclosed in a fruit that developed from a flower's ovary. That enclosure is unique to angiosperms; gymnosperm seeds always develop exposed, with no ovary or fruit involved.",
        hint: "The first two features alone don't settle it — this specimen shares those with the cone-bearing tree from the previous case. Look for what's different about where the seed actually sits at maturity.",
      },
    },
  ];

  const nonChordatesChallenges = [
    {
      title: "Specimen G: The Radial Drifter",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen G: The Radial Drifter",
        context: "A soft-bodied marine organism drifts through open water, its body organized in a wheel-like pattern around a central mouth, with stinging tentacles trailing below.",
        features: [
          { id: "f1", label: "Radial symmetry", detail: "Body parts are arranged evenly around a central axis, like spokes on a wheel." },
          { id: "f2", label: "True tissues present", detail: "Has distinct tissue layers, unlike the simplest animal phylum." },
          { id: "f3", label: "Stinging tentacles", detail: "Tentacles armed with stinging cells surround the mouth." },
          { id: "f4", label: "Drifts in open water", detail: "Describes habitat and lifestyle, not body-plan features." },
        ],
        classificationOptions: [
          { id: "porifera", label: "Phylum Porifera" },
          { id: "cnidaria", label: "Phylum Cnidaria" },
          { id: "annelida", label: "Phylum Annelida" },
          { id: "echinodermata", label: "Phylum Echinodermata" },
        ],
        correct_hotspot_id: "cnidaria",
        explanation:
          "Radial symmetry, true tissues, and stinging cells on the tentacles are the defining combination for Cnidaria (e.g. jellyfish) — Porifera has no true tissues or symmetry at all, Annelida is bilaterally symmetric and segmented, and Echinodermata's radial symmetry appears only in the adult body plan and lacks stinging cells entirely.",
        hint: "True tissues rule out the simplest phylum, and stinging cells point to exactly one of the remaining options.",
      },
    },
    {
      title: "Specimen H: The Ringed Crawler",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen H: The Ringed Crawler",
        context: "A long, cylindrical organism crawls through damp soil, its body clearly divided into dozens of identical ring-shaped segments from head to tail.",
        features: [
          { id: "f1", label: "Body divided into repeating segments", detail: "The body is made up of many similar, ring-like segments in a row." },
          { id: "f2", label: "Bilateral symmetry", detail: "The body has a distinct left and right half that mirror each other." },
          { id: "f3", label: "True coelom", detail: "A fluid-filled body cavity, fully lined by mesoderm, separates the gut from the body wall." },
          { id: "f4", label: "Crawls through soil", detail: "Describes habitat and movement, not body-plan organisation." },
        ],
        classificationOptions: [
          { id: "platyhelminthes", label: "Phylum Platyhelminthes" },
          { id: "aschelminthes", label: "Phylum Aschelminthes (roundworms)" },
          { id: "annelida", label: "Phylum Annelida" },
          { id: "arthropoda", label: "Phylum Arthropoda" },
        ],
        correct_hotspot_id: "annelida",
        explanation:
          "True segmentation combined with bilateral symmetry and a true coelom is the defining Annelida combination. Platyhelminthes (flatworms) are bilateral but unsegmented with no true coelom; Aschelminthes (roundworms) have a false coelom and no true segmentation; Arthropoda is segmented too, but has a hard jointed exoskeleton and jointed appendages, which aren't described here.",
        hint: "Segmentation alone isn't enough to decide — check whether the body cavity is a true, mesoderm-lined coelom, and whether jointed appendages are mentioned at all.",
      },
    },
    {
      title: "Specimen I: The False-Cavity Roundworm",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen I: The False-Cavity Roundworm",
        context: "A slender, unsegmented worm with bilateral symmetry is found in soil. Dissection shows a fluid-filled body cavity between the gut and body wall — but unlike the previous soil-dwelling specimen, this cavity is not fully lined by mesoderm on both sides.",
        features: [
          { id: "f1", label: "Bilateral symmetry", detail: "The body has a distinct left and right half." },
          { id: "f2", label: "Body unsegmented", detail: "No repeating ring-like segments are present anywhere along the body." },
          { id: "f3", label: "Body cavity present but not fully mesoderm-lined", detail: "A pseudocoelom — a body cavity not completely lined by mesodermal tissue." },
          { id: "f4", label: "Slender, cylindrical body", detail: "Describes general body shape, not the cavity type that distinguishes it." },
        ],
        classificationOptions: [
          { id: "platyhelminthes", label: "Phylum Platyhelminthes" },
          { id: "aschelminthes", label: "Phylum Aschelminthes (roundworms)" },
          { id: "annelida", label: "Phylum Annelida" },
          { id: "echinodermata", label: "Phylum Echinodermata" },
        ],
        correct_hotspot_id: "aschelminthes",
        explanation:
          "A pseudocoelom — present but not fully mesoderm-lined — combined with an unsegmented, bilaterally symmetric body is exactly what separates Aschelminthes (roundworms) from Annelida. Annelida also has a body cavity, but it's a true coelom, fully mesoderm-lined, and the body is segmented; Platyhelminthes has no body cavity at all (acoelomate); Echinodermata is radially symmetric as an adult.",
        hint: "The previous soil-dwelling specimen had a body cavity too — the deciding difference here is whether that cavity is fully lined by mesoderm, and whether the body is segmented.",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Kingdom Monera and Kingdom Protista"], levels: moneraProtistaChallenges },
    { concept: concepts["Pteridophytes and Gymnosperms"], levels: pteridophytesGymnospermsChallenges },
    { concept: concepts["Non-Chordates (Porifera to Echinodermata)"], levels: nonChordatesChallenges },
  ];

  for (const { concept, levels } of allChallenges) {
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
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
