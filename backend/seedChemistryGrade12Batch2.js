require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 12
// Chemistry previously had only one chapter ("Electrochemistry", one
// concept, seedChemistryGrade12.js). Adds a second, genuinely
// distinct NCERT Class 12 Chemistry chapter — "Chemical Kinetics" —
// with three concepts.
//
// Reuses two existing mechanics as-is:
//  - CHEMISTRY_REACTION_LAB (same generic mapping check as
//    Electrochemistry) for the two classification concepts.
//  - CHEMISTRY_EQUATION_BALANCER (same atom-count-equality check as
//    Grade 11's Redox Reactions) for a genuinely harder set of
//    equations than the Grade 11 set — larger coefficients and a
//    disproportionation reaction.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Chemical Kinetics" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Physical Chemistry",
      title: "Chemical Kinetics",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: order and molecularity ----
  let orderConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Order and Molecularity of Reactions" });
  if (!orderConcept) {
    orderConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Order and Molecularity of Reactions",
      explanation_text:
        "Order of reaction is an experimentally determined number — the sum of the powers of concentration terms in the rate law — and can be zero, fractional, or a whole number. Molecularity is the number of reacting species that collide in an elementary step and is always a whole number, defined only for a single elementary reaction, never for a complex multi-step one.",
    });
    console.log("Created concept:", orderConcept._id);
  } else {
    console.log("Using existing concept:", orderConcept._id);
  }

  const orderChallenges = [
    {
      title: "Order vs Molecularity: Key Differences",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each property to whether it describes Order of Reaction or Molecularity.",
        slots: [
          { id: "s1", label: "Can be zero or a fraction" },
          { id: "s2", label: "Always a whole number" },
          { id: "s3", label: "Determined experimentally from the rate law" },
        ],
        components: [
          { id: "c1", label: "Order of reaction" },
          { id: "c2", label: "Molecularity" },
          { id: "c3", label: "Order of reaction (molecularity is theoretical, from the mechanism)" },
          { id: "c4", label: "Neither — this is true of rate constant instead" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Molecularity just counts colliding molecules in one step, so it can never be a fraction or zero — order is found by experiment and can be either.",
      },
    },
    {
      title: "Find the Order from the Rate Law",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each rate law to its overall order of reaction.",
        slots: [
          { id: "s1", label: "Rate = k[A]" },
          { id: "s2", label: "Rate = k[A]²[B]" },
          { id: "s3", label: "Rate = k (constant, no concentration terms)" },
        ],
        components: [
          { id: "c1", label: "First order" },
          { id: "c2", label: "Third order (2 + 1)" },
          { id: "c3", label: "Zero order" },
          { id: "c4", label: "Second order" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Add up all the exponents on the concentration terms in the rate law — that sum is the overall order.",
      },
    },
    {
      title: "Why Can't Molecularity Be a Fraction?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each statement to whether it's true of molecularity or is a common misconception.",
        slots: [
          { id: "s1", label: "A reaction can have a molecularity of 2.5" },
          { id: "s2", label: "Molecularity applies only to a single elementary step" },
          { id: "s3", label: "A complex multi-step reaction's overall molecularity is meaningless" },
        ],
        components: [
          { id: "c1", label: "False — molecularity counts actual colliding species, which can't be a fraction of a molecule" },
          { id: "c2", label: "True — for a multi-step mechanism, only each individual step has its own molecularity" },
          { id: "c3", label: "True — only the slowest (rate-determining) step's molecularity is meaningful to discuss" },
          { id: "c4", label: "False — overall molecularity always equals the sum of all steps' molecularities" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Molecularity is about how many real molecules physically collide at once in one step — you can't have half a molecule colliding.",
      },
    },
  ];

  for (const challenge of orderChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_REACTION_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
        concept_id: orderConcept._id,
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

  // ---- Concept 2: factors affecting rate ----
  let rateConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Effect of Concentration, Temperature and Catalysts on Rate" });
  if (!rateConcept) {
    rateConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Effect of Concentration, Temperature and Catalysts on Rate",
      explanation_text:
        "Reaction rate increases with concentration (more particles means more frequent collisions), increases sharply with temperature (particles gain enough kinetic energy to cross the activation energy barrier — this is what the Arrhenius equation captures), and increases with a catalyst (which provides an alternative pathway with lower activation energy, without being consumed itself).",
    });
    console.log("Created concept:", rateConcept._id);
  } else {
    console.log("Using existing concept:", rateConcept._id);
  }

  const rateChallenges = [
    {
      title: "Match the Factor to Its Effect",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each change to what it does to reaction rate and why.",
        slots: [
          { id: "s1", label: "Increasing reactant concentration" },
          { id: "s2", label: "Increasing temperature" },
          { id: "s3", label: "Adding a catalyst" },
        ],
        components: [
          { id: "c1", label: "Rate increases — more particles means more frequent collisions" },
          { id: "c2", label: "Rate increases sharply — more particles gain enough energy to cross the activation barrier" },
          { id: "c3", label: "Rate increases — provides a lower-activation-energy alternative pathway" },
          { id: "c4", label: "Rate decreases — particles move too fast to react" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Concentration is about collision frequency, temperature is about collision energy, and a catalyst changes the pathway itself.",
      },
    },
    {
      title: "Reading the Arrhenius Idea",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each Arrhenius-equation concept to its correct description.",
        slots: [
          { id: "s1", label: "Activation energy (Ea)" },
          { id: "s2", label: "Effect of raising temperature on the rate constant k" },
          { id: "s3", label: "Effect of a catalyst on Ea" },
        ],
        components: [
          { id: "c1", label: "The minimum energy colliding particles need for a reaction to occur" },
          { id: "c2", label: "k increases, since more molecules now have enough energy to react" },
          { id: "c3", label: "A catalyst lowers Ea, letting more collisions succeed at the same temperature" },
          { id: "c4", label: "Temperature has no effect on k, only on concentration" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The Arrhenius equation ties the rate constant to how many molecules have enough energy to clear the activation barrier.",
      },
    },
    {
      title: "Catalyst Myths vs Facts",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each claim about catalysts to whether it's true or a common myth.",
        slots: [
          { id: "s1", label: "A catalyst is consumed during the reaction" },
          { id: "s2", label: "A catalyst speeds up both the forward and reverse reactions equally" },
          { id: "s3", label: "A catalyst changes the equilibrium position of a reversible reaction" },
        ],
        components: [
          { id: "c1", label: "Myth — a catalyst is regenerated at the end and not used up" },
          { id: "c2", label: "Fact — it lowers Ea for both directions, so equilibrium is reached faster" },
          { id: "c3", label: "Myth — a catalyst only changes how fast equilibrium is reached, not where it sits" },
          { id: "c4", label: "Fact — catalysts always shift equilibrium toward the products" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A catalyst is a shortcut for both directions of a reaction, not a one-way boost — that's why it never shifts equilibrium.",
      },
    },
  ];

  for (const challenge of rateChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_REACTION_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
        concept_id: rateConcept._id,
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

  // ---- Concept 3: balancing harder equations ----
  let balanceConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Balancing Grade 12 Level Redox Equations" });
  if (!balanceConcept) {
    balanceConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Balancing Grade 12 Level Redox Equations",
      explanation_text:
        "Some redox equations involve disproportionation, where the same element is simultaneously oxidized and reduced (ending up in two different products). The balancing rule doesn't change — every element's atom count must match on both sides — but tracking an element that splits into two different products takes extra care.",
    });
    console.log("Created concept:", balanceConcept._id);
  } else {
    console.log("Using existing concept:", balanceConcept._id);
  }

  const balanceChallenges = [
    {
      title: "Balance: Cl₂ + NaOH → NaCl + NaOCl + H₂O",
      difficulty: "medium",
      order_index: 1,
      payload: {
        equation_display: "Cl2 + NaOH -> NaCl + NaOCl + H2O",
        max_coefficient: 4,
        species: [
          { id: "p1", formula: "Cl2", side: "reactant", atoms: { Cl: 2 } },
          { id: "p2", formula: "NaOH", side: "reactant", atoms: { Na: 1, O: 1, H: 1 } },
          { id: "p3", formula: "NaCl", side: "product", atoms: { Na: 1, Cl: 1 } },
          { id: "p4", formula: "NaOCl", side: "product", atoms: { Na: 1, O: 1, Cl: 1 } },
          { id: "p5", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
        hint: "Chlorine disproportionates here — one Cl atom ends up as chloride (NaCl), the other as hypochlorite (NaOCl). Track total chlorine on both sides first.",
      },
    },
    {
      title: "Balance: KClO₃ → KCl + KClO₄",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_display: "KClO3 -> KCl + KClO4",
        max_coefficient: 4,
        species: [
          { id: "r1", formula: "KClO3", side: "reactant", atoms: { K: 1, Cl: 1, O: 3 } },
          { id: "r2", formula: "KCl", side: "product", atoms: { K: 1, Cl: 1 } },
          { id: "r3", formula: "KClO4", side: "product", atoms: { K: 1, Cl: 1, O: 4 } },
        ],
        hint: "This is a disproportionation of chlorate — some Cl ends up reduced to chloride, some oxidized to perchlorate. Balance oxygen last since it only appears in two of the three species.",
      },
    },
    {
      title: "Balance: MnO₄⁻ + Fe²⁺ + H⁺ → Mn²⁺ + Fe³⁺ + H₂O",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_display: "MnO4 + Fe + H -> Mn + Fe + H2O",
        max_coefficient: 8,
        species: [
          { id: "n1", formula: "MnO4-", side: "reactant", atoms: { Mn: 1, O: 4 } },
          { id: "n2", formula: "Fe2+", side: "reactant", atoms: { Fe: 1 } },
          { id: "n3", formula: "H+", side: "reactant", atoms: { H: 1 } },
          { id: "n4", formula: "Mn2+", side: "product", atoms: { Mn: 1 } },
          { id: "n5", formula: "Fe3+", side: "product", atoms: { Fe: 1 } },
          { id: "n6", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
        hint: "Manganese goes from +7 to +2 (gains 5 electrons) while each iron goes from +2 to +3 (loses 1 electron) — that's why five Fe²⁺ are needed per MnO4⁻.",
      },
    },
  ];

  for (const challenge of balanceChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_EQUATION_BALANCER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_EQUATION_BALANCER",
        concept_id: balanceConcept._id,
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
