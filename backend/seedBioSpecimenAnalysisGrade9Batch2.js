require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 9 Biology expansion (Section 6 of the approved expansion
// strategy): BIO_SPECIMEN_ANALYSIS previously only covered
// "Vertebrates and Invertebrates" (seedBioSpecimenAnalysisGrade9.js)
// at Grade 9. This closes five more dedicated-game gaps that all fit
// the same inspect-every-feature-then-classify shape:
//   - "Plant Cell vs Animal Cell" (Fundamental Unit of Life)
//   - "Plant Tissues" (Tissues) — meristematic vs permanent
//   - "Animal Tissues" (Tissues) — epithelial / connective / muscular / nervous
//   - "Classification Basics" (Diversity in Living Organisms) — prokaryote vs eukaryote
//   - "Kingdom Plantae and Animalia Overview" (Diversity in Living Organisms)
// Links to the existing concepts created by seedGrade9.js — run that
// first. Same payload shape (specimenName + context + features +
// classificationOptions + correct_hotspot_id) and scoring path
// (attempt.selectedHotspotId vs payload.correct_hotspot_id in
// gameControllers.js checkAttempt) as every other Specimen Analysis
// grade. Additive only — does not touch "Vertebrates and
// Invertebrates" or any existing GameContent. Safe to re-run
// (GameContent.findOne guard before every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const conceptTitles = [
    "Plant Cell vs Animal Cell",
    "Plant Tissues",
    "Animal Tissues",
    "Classification Basics",
    "Kingdom Plantae and Animalia Overview",
  ];

  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ title });
    if (!concept) {
      console.error(`Concept '${title}' not found — run seedGrade9.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const plantVsAnimalCellLevels = [
    {
      title: "Specimen A: The Rigid Boxy Cell",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen A: The Rigid Boxy Cell",
        context: "A cell viewed under the microscope has a fixed, rectangular shape.",
        features: [
          { id: "f1", label: "Rigid cell wall present", detail: "A thick outer layer surrounds the cell membrane, keeping its shape fixed." },
          { id: "f2", label: "Large central vacuole", detail: "One large fluid-filled sac takes up most of the cell's interior space." },
          { id: "f3", label: "Green chloroplasts visible", detail: "Small green disc-shaped structures are scattered through the cytoplasm." },
          { id: "f4", label: "Nucleus present", detail: "A membrane-bound nucleus is visible, pushed to one side by the vacuole." },
        ],
        classificationOptions: [
          { id: "plant", label: "Plant Cell" },
          { id: "animal", label: "Animal Cell" },
        ],
        correct_hotspot_id: "plant",
        explanation:
          "A rigid cell wall and chloroplasts are found only in plant cells — animal cells have neither. The large central vacuole is also typical of plant cells, which use it for structural support and storage.",
        hint: "Look for the one structure only plant cells build around themselves for support.",
      },
    },
    {
      title: "Specimen B: The Flexible Round Cell",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen B: The Flexible Round Cell",
        context: "A cell viewed under the microscope has an irregular, rounded shape that changes slightly as it moves.",
        features: [
          { id: "f1", label: "No cell wall", detail: "Only a thin, flexible cell membrane surrounds the cell — no rigid outer layer." },
          { id: "f2", label: "Small, scattered vacuoles", detail: "Several tiny fluid-filled sacs are visible, none of them dominating the cell." },
          { id: "f3", label: "No chloroplasts", detail: "No green pigmented structures are present anywhere in the cytoplasm." },
          { id: "f4", label: "Centrioles visible near the nucleus", detail: "A pair of small structures sits just outside the nuclear membrane." },
        ],
        classificationOptions: [
          { id: "plant", label: "Plant Cell" },
          { id: "animal", label: "Animal Cell" },
        ],
        correct_hotspot_id: "animal",
        explanation:
          "The absence of a cell wall and chloroplasts, combined with centrioles (which plant cells typically lack), identifies this as an animal cell. Its irregular shape is possible precisely because there's no rigid wall constraining it.",
        hint: "Without a rigid wall, a cell is free to be an irregular shape — check what's missing here, not just what's present.",
      },
    },
    {
      title: "Specimen C: The Ambiguous Sample",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen C: The Ambiguous Sample",
        context: "A cell from an unfamiliar organism shows a mix of features that don't immediately point one way.",
        features: [
          { id: "f1", label: "Cell wall present, but thin", detail: "A wall surrounds the membrane, though thinner than a typical plant cell wall." },
          { id: "f2", label: "No chloroplasts", detail: "No green pigmented structures are visible in the cytoplasm." },
          { id: "f3", label: "One small vacuole", detail: "A single, modestly sized fluid-filled sac is present, far smaller than a typical plant cell's central vacuole." },
          { id: "f4", label: "Nucleus centrally located", detail: "The nucleus sits in the middle of the cell rather than pushed to one side." },
        ],
        classificationOptions: [
          { id: "plant", label: "Plant Cell" },
          { id: "animal", label: "Animal Cell" },
        ],
        correct_hotspot_id: "plant",
        explanation:
          "The presence of a cell wall — even a thin one, and even without chloroplasts — is still the deciding feature: animal cells never build a cell wall at all. Not every plant cell is photosynthetic (root cells, for example, have no chloroplasts), so the missing chloroplasts don't override the wall.",
        hint: "One of these features animal cells can never have, no matter how unusual the rest of the sample looks. Find it.",
      },
    },
  ];

  const plantTissueLevels = [
    {
      title: "Tissue Sample A: The Growing Tip",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Tissue Sample A: The Growing Tip",
        context: "A thin slice is taken from the very tip of a growing plant root.",
        features: [
          { id: "f1", label: "Cells dividing rapidly", detail: "Many cells are captured mid-division under the microscope." },
          { id: "f2", label: "Small, densely packed cells", detail: "Cells are small with little space between them and a thin cell wall." },
          { id: "f3", label: "No large vacuoles yet", detail: "The cells lack the large fluid-filled vacuoles seen in older plant tissue." },
          { id: "f4", label: "Found only at growing points", detail: "This tissue is located only at root tips, shoot tips, and buds." },
        ],
        classificationOptions: [
          { id: "meristematic", label: "Meristematic Tissue" },
          { id: "permanent", label: "Permanent Tissue" },
        ],
        correct_hotspot_id: "meristematic",
        explanation:
          "Actively dividing, small, densely packed cells found only at growing points is the definition of meristematic tissue — it's the tissue responsible for the plant's growth in length and width.",
        hint: "Ask where in the plant this sample was taken from — some tissue only exists at growing points.",
      },
    },
    {
      title: "Tissue Sample B: The Mature Stem Layer",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Tissue Sample B: The Mature Stem Layer",
        context: "A thin slice is taken from the outer layer of a fully grown stem, well away from any growing tip.",
        features: [
          { id: "f1", label: "Cells have stopped dividing", detail: "No cells are captured mid-division; all appear to be in a fixed, mature state." },
          { id: "f2", label: "Fixed shape and size", detail: "Cells are uniform in shape and size, larger than dividing cells." },
          { id: "f3", label: "Large vacuoles present", detail: "Each cell contains a large, well-developed fluid-filled vacuole." },
          { id: "f4", label: "Found away from growing points", detail: "This tissue makes up the bulk of the mature plant body." },
        ],
        classificationOptions: [
          { id: "meristematic", label: "Meristematic Tissue" },
          { id: "permanent", label: "Permanent Tissue" },
        ],
        correct_hotspot_id: "permanent",
        explanation:
          "Cells that have stopped dividing and taken on a fixed, mature shape make up permanent tissue — it's what meristematic tissue becomes once it has finished actively growing.",
        hint: "This tissue is the 'after' picture of the growing-tip sample — what does actively dividing tissue turn into once it stops dividing?",
      },
    },
    {
      title: "Tissue Sample C: The Lateral Growth Layer",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Tissue Sample C: The Lateral Growth Layer",
        context: "A thin slice is taken from a ring-shaped layer running along the length of a woody stem, between the outer bark and the inner wood.",
        features: [
          { id: "f1", label: "Cells actively dividing", detail: "Cell division is visible along the entire ring, not just at one tip." },
          { id: "f2", label: "Runs the length of the stem", detail: "Unlike a root or shoot tip, this tissue forms a continuous ring along the stem's whole length." },
          { id: "f3", label: "Responsible for stem widening", detail: "This layer is what allows the stem to grow thicker year after year." },
          { id: "f4", label: "Thin-walled, small cells", detail: "Cells are small and thin-walled, similar to those at a growing tip." },
        ],
        classificationOptions: [
          { id: "meristematic", label: "Meristematic Tissue" },
          { id: "permanent", label: "Permanent Tissue" },
        ],
        correct_hotspot_id: "meristematic",
        explanation:
          "Active division is the deciding feature, regardless of location — this is lateral meristem (the cambium), which divides along the stem's length rather than only at a tip, producing the stem's increase in width. Location differs from a root/shoot tip, but the defining trait of meristematic tissue — active cell division — is still present.",
        hint: "Don't classify by location alone this time — meristematic tissue exists in more than one place in the plant. Check whether the cells are still dividing.",
      },
    },
  ];

  const animalTissueLevels = [
    {
      title: "Tissue Sample A: The Protective Sheet",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Tissue Sample A: The Protective Sheet",
        context: "A thin sheet of tightly packed cells is sampled from the outer surface of the skin.",
        features: [
          { id: "f1", label: "Cells tightly packed, no gaps", detail: "Cells sit directly against one another with almost no intercellular space." },
          { id: "f2", label: "Forms a continuous covering layer", detail: "The tissue forms an unbroken sheet over the surface it covers." },
          { id: "f3", label: "Little to no non-living material between cells", detail: "There is almost no matrix material visible between the cells." },
          { id: "f4", label: "Found lining surfaces and cavities", detail: "This same tissue type also lines internal cavities like the mouth and blood vessels, not just the outer skin." },
        ],
        classificationOptions: [
          { id: "epithelial", label: "Epithelial Tissue" },
          { id: "connective", label: "Connective Tissue" },
          { id: "muscular", label: "Muscular Tissue" },
          { id: "nervous", label: "Nervous Tissue" },
        ],
        correct_hotspot_id: "epithelial",
        explanation:
          "Tightly packed cells forming a protective, continuous covering with almost no matrix between them is the hallmark of epithelial tissue — it covers and lines surfaces throughout the body.",
        hint: "This tissue's whole job is to cover and protect — look at how the cells are packed.",
      },
    },
    {
      title: "Tissue Sample B: The Cushioning Layer",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Tissue Sample B: The Cushioning Layer",
        context: "A sample is taken from beneath the skin, where cells are loosely scattered in a jelly-like background material.",
        features: [
          { id: "f1", label: "Cells widely spaced", detail: "Cells are sparse, with large gaps between them." },
          { id: "f2", label: "Abundant non-living matrix", detail: "Most of the tissue's volume is a non-living, jelly-like or fibrous matrix, not cells." },
          { id: "f3", label: "Fat droplets visible in some cells", detail: "Several cells contain large fat storage droplets." },
          { id: "f4", label: "Provides structural support and cushioning", detail: "This tissue binds other tissues together and cushions organs." },
        ],
        classificationOptions: [
          { id: "epithelial", label: "Epithelial Tissue" },
          { id: "connective", label: "Connective Tissue" },
          { id: "muscular", label: "Muscular Tissue" },
          { id: "nervous", label: "Nervous Tissue" },
        ],
        correct_hotspot_id: "connective",
        explanation:
          "Widely spaced cells embedded in an abundant non-living matrix is the defining feature of connective tissue — the opposite of epithelial tissue's tightly packed, matrix-free cells. This particular sample (fat droplets, cushioning role) is adipose tissue, a type of connective tissue.",
        hint: "Compare how much space is between the cells here to the previous sample — it's almost the opposite pattern.",
      },
    },
    {
      title: "Tissue Sample C: The Signal Carrier",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Tissue Sample C: The Signal Carrier",
        context: "A sample is taken from along the length of a nerve. Cells have unusually long, thread-like extensions running far beyond the main cell body.",
        features: [
          { id: "f1", label: "Long thread-like extensions", detail: "Each cell has extensions many times longer than the cell body itself." },
          { id: "f2", label: "Cells do not contract", detail: "No shortening or contraction is observed in these cells." },
          { id: "f3", label: "Specialized for carrying electrical impulses", detail: "The extensions are structured to rapidly transmit electrical signals over long distances." },
          { id: "f4", label: "Found throughout the brain, spinal cord, and nerves", detail: "This tissue makes up the entire nervous system." },
        ],
        classificationOptions: [
          { id: "epithelial", label: "Epithelial Tissue" },
          { id: "connective", label: "Connective Tissue" },
          { id: "muscular", label: "Muscular Tissue" },
          { id: "nervous", label: "Nervous Tissue" },
        ],
        correct_hotspot_id: "nervous",
        explanation:
          "Long thread-like extensions specialized for carrying electrical impulses, rather than contracting, distinguishes nervous tissue from muscular tissue (which does contract) — this sample is neurons, the basic unit of the nervous system.",
        hint: "This tissue doesn't contract to do its job — it sends signals instead. Compare that to what muscle tissue does.",
      },
    },
  ];

  const classificationBasicsLevels = [
    {
      title: "Specimen A: The Single-Celled Sample Without a Nucleus",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen A: The Single-Celled Sample Without a Nucleus",
        context: "A single-celled organism is examined under a high-powered microscope.",
        features: [
          { id: "f1", label: "No nuclear membrane", detail: "The genetic material is loose in the cytoplasm, not enclosed in a membrane-bound nucleus." },
          { id: "f2", label: "No membrane-bound organelles", detail: "No mitochondria, chloroplasts, or other membrane-bound organelles are visible." },
          { id: "f3", label: "Very small cell size", detail: "The cell is far smaller than a typical plant or animal cell." },
          { id: "f4", label: "Cell wall present", detail: "A rigid outer wall surrounds the cell membrane." },
        ],
        classificationOptions: [
          { id: "prokaryote", label: "Prokaryote" },
          { id: "eukaryote", label: "Eukaryote" },
        ],
        correct_hotspot_id: "prokaryote",
        explanation:
          "The single deciding feature in classifying any cell this way is whether its genetic material is enclosed in a nuclear membrane. No nuclear membrane and no membrane-bound organelles means this is a prokaryote (e.g. a bacterium) — cell wall and small size are consistent with that but aren't the deciding factor on their own.",
        hint: "One feature alone decides prokaryote vs. eukaryote — check whether the genetic material has a membrane around it.",
      },
    },
    {
      title: "Specimen B: The Single-Celled Sample With a Nucleus",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen B: The Single-Celled Sample With a Nucleus",
        context: "Another single-celled organism is examined under the same microscope.",
        features: [
          { id: "f1", label: "Distinct nuclear membrane visible", detail: "The genetic material is clearly enclosed within its own membrane, separate from the cytoplasm." },
          { id: "f2", label: "Mitochondria present", detail: "Small membrane-bound structures for energy production are visible in the cytoplasm." },
          { id: "f3", label: "Larger than the previous sample", detail: "This cell is noticeably larger than Specimen A." },
          { id: "f4", label: "Single-celled", detail: "The organism consists of only one cell, same as Specimen A." },
        ],
        classificationOptions: [
          { id: "prokaryote", label: "Prokaryote" },
          { id: "eukaryote", label: "Eukaryote" },
        ],
        correct_hotspot_id: "eukaryote",
        explanation:
          "Being single-celled does not by itself determine prokaryote vs. eukaryote — many eukaryotes (like amoeba or yeast) are single-celled too. The presence of a true nuclear membrane and membrane-bound organelles like mitochondria is what makes this a eukaryote.",
        hint: "Being single-celled doesn't settle this one — plenty of eukaryotes are single-celled too. Look at the nucleus again.",
      },
    },
    {
      title: "Specimen C: The Colony Sample",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen C: The Colony Sample",
        context: "A colony of many identical, tiny cells is found growing together in a mat, but each individual cell is examined separately.",
        features: [
          { id: "f1", label: "No nuclear membrane in any individual cell", detail: "Even examined individually, none of the cells show a membrane-bound nucleus." },
          { id: "f2", label: "Cells grow in large colonies", detail: "Thousands of identical cells form a visible mat or film." },
          { id: "f3", label: "No membrane-bound organelles", detail: "No mitochondria or other membrane-bound structures are found in any cell." },
          { id: "f4", label: "Extremely fast reproduction", detail: "The colony visibly grows within hours." },
        ],
        classificationOptions: [
          { id: "prokaryote", label: "Prokaryote" },
          { id: "eukaryote", label: "Eukaryote" },
        ],
        correct_hotspot_id: "prokaryote",
        explanation:
          "Growing in a large colony doesn't change the classification of the individual cells that make it up — each cell still lacks a nuclear membrane and membrane-bound organelles, so this is a prokaryote colony (like a bacterial mat), not a multicellular eukaryote.",
        hint: "Classify what a single cell looks like on its own — the fact that many of them are growing together doesn't change what each individual cell is.",
      },
    },
  ];

  const kingdomOverviewLevels = [
    {
      title: "Organism A: The Rooted Green Sample",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Organism A: The Rooted Green Sample",
        context: "An organism is found fixed in place in soil, with green coloring throughout its visible structure.",
        features: [
          { id: "f1", label: "Makes its own food using sunlight", detail: "The organism shows no evidence of consuming other organisms for energy." },
          { id: "f2", label: "Cannot move from place to place", detail: "It remains rooted in the same spot throughout observation." },
          { id: "f3", label: "Cell walls present", detail: "Its cells are enclosed in rigid walls." },
          { id: "f4", label: "Green pigment throughout", detail: "Green coloring is visible across most of its surface." },
        ],
        classificationOptions: [
          { id: "plantae", label: "Kingdom Plantae" },
          { id: "animalia", label: "Kingdom Animalia" },
        ],
        correct_hotspot_id: "plantae",
        explanation:
          "Making its own food (autotrophic nutrition) via sunlight, having cell walls, and being unable to move from place to place together define Kingdom Plantae — no animal has all three of these traits.",
        hint: "Ask how this organism gets its energy — does it make its own food, or does it have to find and consume it?",
      },
    },
    {
      title: "Organism B: The Mobile Feeding Sample",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Organism B: The Mobile Feeding Sample",
        context: "An organism is observed actively moving around and consuming smaller organisms for food.",
        features: [
          { id: "f1", label: "Consumes other organisms for energy", detail: "It was observed capturing and eating smaller organisms." },
          { id: "f2", label: "Moves freely from place to place", detail: "It relocated multiple times during observation." },
          { id: "f3", label: "No cell wall", detail: "Its cells are bounded only by a flexible membrane, no rigid wall." },
          { id: "f4", label: "No green pigment anywhere", detail: "No coloring associated with photosynthesis is present." },
        ],
        classificationOptions: [
          { id: "plantae", label: "Kingdom Plantae" },
          { id: "animalia", label: "Kingdom Animalia" },
        ],
        correct_hotspot_id: "animalia",
        explanation:
          "Consuming other organisms for energy (heterotrophic nutrition), the ability to move freely, and the absence of a cell wall together define Kingdom Animalia — the opposite pattern from Organism A.",
        hint: "This organism has to go find its energy rather than make it — that alone points to one kingdom over the other.",
      },
    },
    {
      title: "Organism C: The Non-Moving Consumer",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Organism C: The Non-Moving Consumer",
        context: "An organism is found permanently attached to an underwater rock. It does not move from that spot, yet it feeds by filtering small food particles from the water rather than making its own food.",
        features: [
          { id: "f1", label: "Cannot move from place to place", detail: "It remains fixed to the same rock throughout its life." },
          { id: "f2", label: "Filters food particles from water", detail: "It does not photosynthesize; it feeds on particles it filters from the surrounding water." },
          { id: "f3", label: "No cell wall", detail: "Its cells lack a rigid outer wall." },
          { id: "f4", label: "No green pigment", detail: "No coloring associated with photosynthesis is present anywhere on the organism." },
        ],
        classificationOptions: [
          { id: "plantae", label: "Kingdom Plantae" },
          { id: "animalia", label: "Kingdom Animalia" },
        ],
        correct_hotspot_id: "animalia",
        explanation:
          "Being unable to move doesn't automatically mean Plantae — mode of nutrition is the more reliable feature. This organism (like a sponge) doesn't make its own food and has no cell wall, both animal traits, even though it's fixed in place like a plant.",
        hint: "Not being able to move isn't decisive on its own — some animals are fixed in place too. Check how it actually gets its food instead.",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Plant Cell vs Animal Cell"], levels: plantVsAnimalCellLevels },
    { concept: concepts["Plant Tissues"], levels: plantTissueLevels },
    { concept: concepts["Animal Tissues"], levels: animalTissueLevels },
    { concept: concepts["Classification Basics"], levels: classificationBasicsLevels },
    { concept: concepts["Kingdom Plantae and Animalia Overview"], levels: kingdomOverviewLevels },
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
