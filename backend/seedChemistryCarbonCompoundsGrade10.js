require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 3 (Grade 10 Science expansion). Grade 10 Chemistry previously
// only covered "Chemical Reactions & Stoichiometry" and "Types of
// Chemical Reactions" (both CHEMISTRY_EQUATION_BALANCER /
// CHEMISTRY_REACTION_LAB). "Carbon and its Compounds" (NCERT Class 10
// Ch. 4) is a real, substantial chapter of its own with no existing
// coverage at all.
//
// Reuses CHEMISTRY_MOLECULE_BUILDER — already registered, already
// scored (see checkAttempt's shared MATH_FRACTION_BUILDER /
// CHEMISTRY_MOLECULE_BUILDER subset-match branch), already used at
// Grade 4 (water/salt), Grade 5 (oxygen), Grade 9 (water/CO2/methane)
// and Grade 11 (ammonia/HCl/ethene) — but never at Grade 10. "Tap the
// right atom tiles to assemble the target molecule" is a genuine fit
// for organic-molecule construction, not a forced reuse.
//
// Duplicate-avoidance note: CHEMISTRY_MOLECULE_BUILDER's dedupe check
// (`GameContent.findOne({ game_type, title })`, see below) matches on
// title only, with no grade/concept scoping. Ethene (C2H4) is already
// built at Grade 11 ("Build: Ethene (C₂H₄)", seedChemistryGrade11Batch2.js)
// and Methane/Water/CO2 at Grade 9 (seedChemistryMoleculeBuilder.js) —
// so this file deliberately picks DIFFERENT molecules Grade 10 doesn't
// already share with those grades (ethane, carbon tetrachloride,
// ethyne, methanol, ethanoic acid, ethanol, propane, butane, propene),
// rather than reusing the same molecule under a reworded title, to
// avoid re-teaching an already-covered construction under a new label.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 10 });
    console.log("Created new Grade 10 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Carbon and its Compounds" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Carbon and its Compounds",
      title: "Carbon and its Compounds",
      // Grade 10 Science is one integrated Subject, so Chapter.order_index
      // is a shared namespace across strands (chapters sorted via
      // Chapter.find({subject_id}).sort({order_index:1})). Existing
      // chapters occupy 1-6 (Biology core), 101/101/102 (later Biology
      // GameContent chapters), and this batch's own "Metals and
      // Non-Metals" chapter at 103 (seedChemistryMatchGrade10.js) — so
      // this continues at 104.
      order_index: 104,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Covalent Bonding and Carbon's Tetravalency ----
  let bondingConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Covalent Bonding and Carbon's Tetravalency" });
  if (!bondingConcept) {
    bondingConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Covalent Bonding and Carbon's Tetravalency",
      explanation_text:
        "Carbon has 4 electrons in its outer shell, so it forms exactly 4 covalent bonds by sharing electrons rather than gaining or losing them — this is called tetravalency. Those 4 bonds can all go to single atoms (like the 4 hydrogens in methane), be split between different elements (like the 4 chlorines in carbon tetrachloride), or include double bonds (2 shared pairs, as in ethene) or triple bonds (3 shared pairs, as in ethyne) between two carbon atoms. Molecules built entirely from single bonds are called saturated; molecules containing at least one double or triple bond are called unsaturated.",
    });
    console.log("Created concept:", bondingConcept._id);
  } else {
    console.log("Using existing concept:", bondingConcept._id);
  }

  const bondingChallenges = [
    {
      title: "Build: Ethane — A Single-Bond Chain (C₂H₆)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "C2H6",
        target_name: "Ethane",
        atom_pool: [
          { id: "e1", element: "C", symbol: "C" },
          { id: "e2", element: "C", symbol: "C" },
          { id: "e3", element: "H", symbol: "H" },
          { id: "e4", element: "H", symbol: "H" },
          { id: "e5", element: "H", symbol: "H" },
          { id: "e6", element: "H", symbol: "H" },
          { id: "e7", element: "H", symbol: "H" },
          { id: "e8", element: "H", symbol: "H" },
          { id: "e9", element: "O", symbol: "O" },
          { id: "e10", element: "Cl", symbol: "Cl" },
        ],
        correct_piece_ids: ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"],
        hint: "Ethane is a saturated hydrocarbon — 2 carbon atoms joined by a single bond, with the remaining bonds all filled by hydrogen: C₂H₆.",
      },
    },
    {
      title: "Build: Carbon Tetrachloride — Four Bonds to One Element (CCl₄)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "CCl4",
        target_name: "Carbon Tetrachloride",
        atom_pool: [
          { id: "f1", element: "C", symbol: "C" },
          { id: "f2", element: "Cl", symbol: "Cl" },
          { id: "f3", element: "Cl", symbol: "Cl" },
          { id: "f4", element: "Cl", symbol: "Cl" },
          { id: "f5", element: "Cl", symbol: "Cl" },
          { id: "f6", element: "H", symbol: "H" },
          { id: "f7", element: "Cl", symbol: "Cl" },
        ],
        correct_piece_ids: ["f1", "f2", "f3", "f4", "f5"],
        hint: "Carbon's tetravalency doesn't require hydrogen at all — here all 4 of carbon's bonds go to chlorine atoms instead, formed by chlorination of methane in sunlight.",
      },
    },
    {
      title: "Build: Ethyne — A Triple Bond (C₂H₂)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "C2H2",
        target_name: "Ethyne",
        atom_pool: [
          { id: "g1", element: "C", symbol: "C" },
          { id: "g2", element: "C", symbol: "C" },
          { id: "g3", element: "H", symbol: "H" },
          { id: "g4", element: "H", symbol: "H" },
          { id: "g5", element: "H", symbol: "H" },
          { id: "g6", element: "H", symbol: "H" },
          { id: "g7", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["g1", "g2", "g3", "g4"],
        hint: "Ethyne (acetylene) is unsaturated — its two carbons share a triple bond, which only leaves one bonding position free on each carbon for a single hydrogen atom: C₂H₂, not C₂H₄ or C₂H₆.",
      },
    },
  ];

  for (const challenge of bondingChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MOLECULE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MOLECULE_BUILDER",
        concept_id: bondingConcept._id,
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

  // ---- Concept 2: Functional Groups — Alcohols and Carboxylic Acids ----
  let functionalConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Functional Groups: Alcohols and Carboxylic Acids" });
  if (!functionalConcept) {
    functionalConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Functional Groups: Alcohols and Carboxylic Acids",
      explanation_text:
        "A functional group is a specific atom or group of atoms attached to a carbon chain that determines how the compound behaves chemically. The -OH (hydroxyl) group makes a compound an alcohol, as in methanol and ethanol. The -COOH (carboxyl) group makes a compound a carboxylic acid, as in ethanoic acid (acetic acid, the acid in vinegar). Compounds with the same functional group show similar chemical properties regardless of how long their carbon chain is.",
    });
    console.log("Created concept:", functionalConcept._id);
  } else {
    console.log("Using existing concept:", functionalConcept._id);
  }

  const functionalChallenges = [
    {
      title: "Build: Methanol — An Alcohol (CH₃OH)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "CH4O",
        target_name: "Methanol",
        atom_pool: [
          { id: "h1", element: "C", symbol: "C" },
          { id: "h2", element: "H", symbol: "H" },
          { id: "h3", element: "H", symbol: "H" },
          { id: "h4", element: "H", symbol: "H" },
          { id: "h5", element: "H", symbol: "H" },
          { id: "h6", element: "O", symbol: "O" },
          { id: "h7", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["h1", "h2", "h3", "h4", "h6"],
        hint: "Methanol is one carbon carrying 4 hydrogens' worth of bonds, but one of them is replaced by an -OH group: CH₃OH, written as CH₄O overall.",
      },
    },
    {
      title: "Build: Ethanoic Acid — A Carboxylic Acid (CH₃COOH)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "C2H4O2",
        target_name: "Ethanoic Acid",
        atom_pool: [
          { id: "i1", element: "C", symbol: "C" },
          { id: "i2", element: "C", symbol: "C" },
          { id: "i3", element: "H", symbol: "H" },
          { id: "i4", element: "H", symbol: "H" },
          { id: "i5", element: "H", symbol: "H" },
          { id: "i6", element: "H", symbol: "H" },
          { id: "i7", element: "O", symbol: "O" },
          { id: "i8", element: "O", symbol: "O" },
          { id: "i9", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8"],
        hint: "Ethanoic acid (vinegar's acid) has the -COOH carboxyl group on one carbon and 3 hydrogens on the other: CH₃COOH, or C₂H₄O₂ overall.",
      },
    },
    {
      title: "Build: Ethanol — The Alcohol in Sanitizers (C₂H₅OH)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "C2H6O",
        target_name: "Ethanol",
        atom_pool: [
          { id: "j1", element: "C", symbol: "C" },
          { id: "j2", element: "C", symbol: "C" },
          { id: "j3", element: "H", symbol: "H" },
          { id: "j4", element: "H", symbol: "H" },
          { id: "j5", element: "H", symbol: "H" },
          { id: "j6", element: "H", symbol: "H" },
          { id: "j7", element: "H", symbol: "H" },
          { id: "j8", element: "H", symbol: "H" },
          { id: "j9", element: "O", symbol: "O" },
          { id: "j10", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["j1", "j2", "j3", "j4", "j5", "j6", "j7", "j8", "j9"],
        hint: "Ethanol is ethane's carbon chain with one hydrogen swapped for an -OH group: C₂H₅OH — count carefully, it's 2 carbons, 6 hydrogens, and just 1 oxygen.",
      },
    },
  ];

  for (const challenge of functionalChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MOLECULE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MOLECULE_BUILDER",
        concept_id: functionalConcept._id,
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

  // ---- Concept 3: Catenation — Carbon's Chain-Forming Ability ----
  let catenationConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Catenation: Carbon's Chain-Forming Ability" });
  if (!catenationConcept) {
    catenationConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Catenation: Carbon's Chain-Forming Ability",
      explanation_text:
        "Catenation is carbon's unique ability to form long, stable chains by bonding to other carbon atoms — a property no other element shares to nearly the same extent. This is why there are millions of known carbon compounds: the same handful of elements (mostly C and H) can be arranged into chains of many different lengths, and those chains can also contain a double or triple bond instead of being fully saturated.",
    });
    console.log("Created concept:", catenationConcept._id);
  } else {
    console.log("Using existing concept:", catenationConcept._id);
  }

  const catenationChallenges = [
    {
      title: "Build: Propane — A Three-Carbon Chain (C₃H₈)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "C3H8",
        target_name: "Propane",
        atom_pool: [
          { id: "k1", element: "C", symbol: "C" },
          { id: "k2", element: "C", symbol: "C" },
          { id: "k3", element: "C", symbol: "C" },
          { id: "k4", element: "H", symbol: "H" },
          { id: "k5", element: "H", symbol: "H" },
          { id: "k6", element: "H", symbol: "H" },
          { id: "k7", element: "H", symbol: "H" },
          { id: "k8", element: "H", symbol: "H" },
          { id: "k9", element: "H", symbol: "H" },
          { id: "k10", element: "H", symbol: "H" },
          { id: "k11", element: "H", symbol: "H" },
          { id: "k12", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9", "k10", "k11"],
        hint: "Propane chains 3 carbons together with single bonds — count 3 carbons and exactly 8 hydrogens to fill every remaining bond: C₃H₈.",
      },
    },
    {
      title: "Build: Butane — A Four-Carbon Chain (C₄H₁₀)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "C4H10",
        target_name: "Butane",
        atom_pool: [
          { id: "l1", element: "C", symbol: "C" },
          { id: "l2", element: "C", symbol: "C" },
          { id: "l3", element: "C", symbol: "C" },
          { id: "l4", element: "C", symbol: "C" },
          { id: "l5", element: "H", symbol: "H" },
          { id: "l6", element: "H", symbol: "H" },
          { id: "l7", element: "H", symbol: "H" },
          { id: "l8", element: "H", symbol: "H" },
          { id: "l9", element: "H", symbol: "H" },
          { id: "l10", element: "H", symbol: "H" },
          { id: "l11", element: "H", symbol: "H" },
          { id: "l12", element: "H", symbol: "H" },
          { id: "l13", element: "H", symbol: "H" },
          { id: "l14", element: "H", symbol: "H" },
          { id: "l15", element: "Cl", symbol: "Cl" },
        ],
        correct_piece_ids: ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l9", "l10", "l11", "l12", "l13", "l14"],
        hint: "One more carbon than propane means the chain needs one more CH₂ unit's worth of hydrogens too — 4 carbons, 10 hydrogens: C₄H₁₀.",
      },
    },
    {
      title: "Build: Propene — A Chain With a Double Bond (C₃H₆)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "C3H6",
        target_name: "Propene",
        atom_pool: [
          { id: "m1", element: "C", symbol: "C" },
          { id: "m2", element: "C", symbol: "C" },
          { id: "m3", element: "C", symbol: "C" },
          { id: "m4", element: "H", symbol: "H" },
          { id: "m5", element: "H", symbol: "H" },
          { id: "m6", element: "H", symbol: "H" },
          { id: "m7", element: "H", symbol: "H" },
          { id: "m8", element: "H", symbol: "H" },
          { id: "m9", element: "H", symbol: "H" },
          { id: "m10", element: "H", symbol: "H" },
          { id: "m11", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9"],
        hint: "Propene has the same 3-carbon chain as propane, but one double bond between two of the carbons uses up a bonding position — so it takes only 6 hydrogens, not 8: C₃H₆.",
      },
    },
  ];

  for (const challenge of catenationChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MOLECULE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MOLECULE_BUILDER",
        concept_id: catenationConcept._id,
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
