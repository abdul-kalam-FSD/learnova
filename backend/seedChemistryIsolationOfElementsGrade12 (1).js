require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 12 Chemistry currently has
// "Electrochemistry" (order_index 1) and "Chemical Kinetics" (order_index
// 2). This adds a genuine third NCERT Class 12 Chemistry chapter,
// "General Principles and Processes of Isolation of Elements".
//
// Reuses CHEMISTRY_MATCH exactly as-is (same slot/component
// correct_mapping check already used at Grade 10 for "Metals and
// Non-Metals" and at Grade 11 for "The p-Block Elements" — see
// seedChemistryPBlockGrade11.js). This is intentionally NOT a duplicate
// of the Grade 10 "Extraction of Metals" concept: Grade 10 covers only
// the reactivity-series rule of thumb (electrolysis / carbon reduction /
// native occurrence). This Grade 12 chapter covers the genuinely
// advanced ideas the exam actually tests — ore concentration methods,
// Ellingham-diagram-based reduction choices, and named refining
// techniques — none of which exist anywhere else on the platform.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: /chemistry/i });
  if (!subject) {
    subject = await Subject.create({ name: "Chemistry", grade: 12 });
    console.log("Created new Grade 12 Chemistry subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "General Principles and Processes of Isolation of Elements" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Isolation of Elements",
      title: "General Principles and Processes of Isolation of Elements",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Concentration and Enrichment of Ores ----
  let concentrationConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Concentration and Enrichment of Ores" });
  if (!concentrationConcept) {
    concentrationConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Concentration and Enrichment of Ores",
      explanation_text:
        "Before a metal can be extracted, its ore must be concentrated — the unwanted rocky material (gangue) removed. The right method depends on the ore's physical/chemical properties: froth flotation exploits differences in wettability, magnetic separation exploits magnetic properties, and leaching dissolves the desired compound selectively with a chemical reagent.",
    });
    console.log("Created concept:", concentrationConcept._id);
  } else {
    console.log("Using existing concept:", concentrationConcept._id);
  }

  const concentrationChallenges = [
    {
      title: "Matching Ore to Concentration Method",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each ore/situation to the concentration method actually used.",
        slots: [
          { id: "s1", label: "Sulphide ores like galena (PbS) or copper pyrites" },
          { id: "s2", label: "Ores where the ore is magnetic but gangue is not (e.g. magnetite)" },
          { id: "s3", label: "Bauxite (impure aluminium ore), which contains iron oxide impurity" },
        ],
        components: [
          { id: "c1", label: "Froth flotation — the sulphide particles stick to soap-like froth and float, gangue sinks" },
          { id: "c2", label: "Magnetic separation — a magnetic roller pulls the magnetic ore away from non-magnetic gangue" },
          { id: "c3", label: "Chemical leaching (Bayer's process) — the ore dissolves selectively in hot NaOH, impurities do not" },
          { id: "c4", label: "Simple hand-picking, since the ore looks visibly different from the gangue" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The method always exploits a real physical or chemical DIFFERENCE between the wanted mineral and the gangue.",
      },
    },
    {
      title: "Why Froth Flotation Works",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each froth flotation term/step to its correct role.",
        slots: [
          { id: "s1", label: "Collectors (e.g. pine oil, xanthates)" },
          { id: "s2", label: "Froth stabilizers" },
          { id: "s3", label: "Depressants" },
        ],
        components: [
          { id: "c1", label: "Coat the sulphide ore particles so they become water-repellent and stick to air bubbles" },
          { id: "c2", label: "Keep the froth stable long enough for the mineral-laden bubbles to be skimmed off" },
          { id: "c3", label: "Selectively prevent one sulphide mineral from floating, letting two similar ores be separated from each other" },
          { id: "c4", label: "Increase the density of the gangue so it dissolves faster" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each additive in froth flotation has one job: making the right particles float, keeping the froth stable, or selectively stopping a similar mineral from floating too.",
      },
    },
    {
      title: "Leaching: Bauxite and Silver",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each leaching scenario to its correct chemistry.",
        slots: [
          { id: "s1", label: "Purifying bauxite (Bayer's process)" },
          { id: "s2", label: "Extracting silver from its ore (cyanide process)" },
          { id: "s3", label: "Why leaching counts as 'concentration', not final extraction" },
        ],
        components: [
          { id: "c1", label: "Al\u2082O\u2083 dissolves in hot concentrated NaOH as soluble sodium aluminate, leaving Fe\u2082O\u2083 undissolved" },
          { id: "c2", label: "Ag\u2082S dissolves in dilute NaCN solution as a soluble complex ion, [Ag(CN)\u2082]\u207b" },
          { id: "c3", label: "The metal is still chemically combined afterward — a separate reduction step is still needed to get the free metal" },
          { id: "c4", label: "Leaching directly produces the pure free metal with no further steps" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Leaching only SEPARATES the wanted compound from the gangue by dissolving it selectively — the metal is still combined and needs a later reduction step.",
      },
    },
  ];

  for (const challenge of concentrationChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: concentrationConcept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---- Concept 2: Thermodynamic Principles: Reduction via the Ellingham Diagram ----
  let ellinghamConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Thermodynamic Principles: Reduction via the Ellingham Diagram" });
  if (!ellinghamConcept) {
    ellinghamConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Thermodynamic Principles: Reduction via the Ellingham Diagram",
      explanation_text:
        "An Ellingham diagram plots \u0394G\u00b0 of oxide formation against temperature for different metals. A reducing agent can only reduce a metal oxide if its own oxide-formation line lies BELOW that metal's line at the chosen temperature — because then the reducing agent's oxidation is more thermodynamically favourable, driving the overall coupled reaction forward.",
    });
    console.log("Created concept:", ellinghamConcept._id);
  } else {
    console.log("Using existing concept:", ellinghamConcept._id);
  }

  const ellinghamChallenges = [
    {
      title: "Reading the Ellingham Diagram",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each Ellingham diagram feature to its correct meaning.",
        slots: [
          { id: "s1", label: "A line lower on the diagram (more negative \u0394G\u00b0)" },
          { id: "s2", label: "The slope of most metal-oxide lines" },
          { id: "s3", label: "The point where two metal lines cross" },
        ],
        components: [
          { id: "c1", label: "That metal's oxide is more stable — harder to reduce" },
          { id: "c2", label: "Positive, because gaseous O\u2082 (high entropy) is consumed to form a solid oxide (low entropy)" },
          { id: "c3", label: "The temperature above/below which one metal can reduce the other's oxide" },
          { id: "c4", label: "The exact melting point of the pure metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Lower on the graph means more negative \u0394G\u00b0, meaning that oxide is more stable and thermodynamically harder to break apart.",
      },
    },
    {
      title: "Choosing the Right Reducing Agent",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each metal oxide to the reduction method the Ellingham diagram actually favours.",
        slots: [
          { id: "s1", label: "Iron oxide (Fe\u2082O\u2083)" },
          { id: "s2", label: "Chromium oxide (Cr\u2082O\u2083)" },
          { id: "s3", label: "Sodium or magnesium oxide (very stable)" },
        ],
        components: [
          { id: "c1", label: "Reduced by carbon (coke) in a blast furnace — carbon's line crosses below iron's at furnace temperatures" },
          { id: "c2", label: "Reduced by aluminium (the thermite process) — aluminium's line lies below chromium's" },
          { id: "c3", label: "Reduced by electrolysis of the molten compound, since no ordinary chemical reducing agent's line is low enough" },
          { id: "c4", label: "Reduced simply by heating in air, since no reducing agent is needed" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The stronger/more stable the oxide, the further down its line sits — and the more extreme the reduction method needed (carbon < aluminium thermite < electrolysis).",
      },
    },
    {
      title: "The Thermite Reaction",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each fact about the thermite reaction to its correct explanation.",
        slots: [
          { id: "s1", label: "Why aluminium can reduce Fe\u2082O\u2083 (thermite reaction)" },
          { id: "s2", label: "Why the thermite reaction is highly exothermic" },
          { id: "s3", label: "A practical use of the thermite reaction" },
        ],
        components: [
          { id: "c1", label: "Al\u2082O\u2083's line on the Ellingham diagram lies below Fe\u2082O\u2083's line across a wide temperature range" },
          { id: "c2", label: "Forming the much more stable Al\u2082O\u2083 releases far more energy than was needed to break down Fe\u2082O\u2083" },
          { id: "c3", label: "Welding railway tracks together using the molten iron produced" },
          { id: "c4", label: "It is used to purify drinking water" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Because aluminium's oxide-formation line sits below iron's, aluminium 'wins' the oxygen — and the large \u0394G\u00b0 gap is released as heat, enough to melt the iron produced.",
      },
    },
  ];

  for (const challenge of ellinghamChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: ellinghamConcept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  // ---- Concept 3: Refining Methods for Extracted Metals ----
  let refiningConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Refining Methods for Extracted Metals" });
  if (!refiningConcept) {
    refiningConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Refining Methods for Extracted Metals",
      explanation_text:
        "The crude metal produced by reduction is rarely pure enough to use directly. The final refining technique depends on the metal and the nature of its impurities: electrolytic refining for metals like copper, distillation for low-boiling metals like zinc and mercury, zone refining for ultra-pure semiconductors, and vapour-phase refining (like the Mond process) for metals that form volatile compounds.",
    });
    console.log("Created concept:", refiningConcept._id);
  } else {
    console.log("Using existing concept:", refiningConcept._id);
  }

  const refiningChallenges = [
    {
      title: "Matching Metal to Refining Method",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each metal to the refining method actually used on it.",
        slots: [
          { id: "s1", label: "Copper" },
          { id: "s2", label: "Zinc" },
          { id: "s3", label: "Silicon or germanium (for semiconductors)" },
        ],
        components: [
          { id: "c1", label: "Electrolytic refining — impure copper is the anode, pure copper deposits at the cathode" },
          { id: "c2", label: "Distillation — zinc has a low boiling point and vaporizes away from less volatile impurities" },
          { id: "c3", label: "Zone refining — a molten zone is moved along a rod, sweeping impurities to one end" },
          { id: "c4", label: "Simple filtration of the molten metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each refining method exploits a different physical property: electrical deposition, boiling point, or how impurities distribute between solid and liquid phases.",
      },
    },
    {
      title: "Electrolytic Refining of Copper",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each part of the electrolytic refining cell to its correct role.",
        slots: [
          { id: "s1", label: "Impure copper block" },
          { id: "s2", label: "Thin sheet of pure copper" },
          { id: "s3", label: "The sludge that collects below the anode" },
        ],
        components: [
          { id: "c1", label: "Acts as the anode — it dissolves into the electrolyte as Cu\u00b2\u207a ions" },
          { id: "c2", label: "Acts as the cathode — pure copper deposits onto it from the electrolyte" },
          { id: "c3", label: "The 'anode mud' — contains valuable less-reactive impurities like silver and gold that don't dissolve" },
          { id: "c4", label: "A layer of rust that must be scraped off before use" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The anode always dissolves, the cathode always gains pure metal, and any impurity less reactive than copper simply falls out as sludge instead of dissolving.",
      },
    },
    {
      title: "Mond Process and Van Arkel Method",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each vapour-phase refining fact to its correct explanation.",
        slots: [
          { id: "s1", label: "Mond process (nickel refining)" },
          { id: "s2", label: "Van Arkel method (titanium/zirconium refining)" },
          { id: "s3", label: "Why vapour-phase methods give very high purity" },
        ],
        components: [
          { id: "c1", label: "Impure nickel reacts with CO to form volatile Ni(CO)\u2084, which is later decomposed by heating to deposit pure nickel" },
          { id: "c2", label: "The impure metal is converted to a volatile compound (e.g. Til\u2084) which decomposes on a hot filament, depositing pure metal" },
          { id: "c3", label: "Only the metal itself forms the volatile compound; solid impurities are left behind and never enter the vapour" },
          { id: "c4", label: "The metal is simply melted and poured through a fine cloth filter" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Both methods work the same way: convert the metal (not the impurities) into a volatile compound, then decompose that compound to leave pure metal behind.",
      },
    },
  ];

  for (const challenge of refiningChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: refiningConcept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
