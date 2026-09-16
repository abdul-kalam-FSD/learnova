require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 11
// Chemistry previously had only one chapter ("Redox Reactions", one
// concept, seedChemistryGrade11.js). Adds a second, genuinely
// distinct NCERT Class 11 Chemistry chapter — "Chemical Bonding and
// Molecular Structure" — with three concepts.
//
// Reuses two existing mechanics as-is, no backend/frontend changes:
//  - CHEMISTRY_REACTION_LAB (generic slot/component mapping-equality
//    check, same one Grade 12's Electrochemistry chapter uses) for
//    the two classification concepts below. Its on-screen copy
//    ("Reaction Lab" / "Run the Reactions") is already
//    mechanic-generic rather than tied to reaction classification,
//    so it fits bonding/shape classification without needing a
//    theme override (unlike CircuitBuilder, ReactionLab.jsx doesn't
//    read a `theme` field at all).
//  - CHEMISTRY_MOLECULE_BUILDER (same unordered-subset atom-tile
//    check as the Grade 9 Atoms & Molecules version) for the
//    build-a-molecule concept, using different target molecules than
//    the Grade 9 set (H2O/CO2/CH4) so there's no content overlap.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /chemistry/i });
  if (!subject) {
    subject = await Subject.create({ name: "Chemistry", grade: 11 });
    console.log("Created new Grade 11 Chemistry subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Chemical Bonding and Molecular Structure" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Structure of Matter",
      title: "Chemical Bonding and Molecular Structure",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: bond types (Reaction Lab mapping) ----
  let bondConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Ionic, Covalent and Coordinate Bonds" });
  if (!bondConcept) {
    bondConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Ionic, Covalent and Coordinate Bonds",
      explanation_text:
        "An ionic bond forms when one atom transfers electrons to another, creating oppositely charged ions that attract each other. A covalent bond forms when two atoms share a pair of electrons. A coordinate (dative) covalent bond is a special case of covalent bonding where both shared electrons come from the same atom, as in NH4+ or H3O+.",
    });
    console.log("Created concept:", bondConcept._id);
  } else {
    console.log("Using existing concept:", bondConcept._id);
  }

  const bondChallenges = [
    {
      title: "Classify the Bond Type",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each compound to the type of bonding that holds it together.",
        slots: [
          { id: "s1", label: "NaCl (sodium chloride)" },
          { id: "s2", label: "Cl2 (chlorine gas)" },
          { id: "s3", label: "NH4+ (ammonium ion)" },
        ],
        components: [
          { id: "c1", label: "Ionic — sodium transfers an electron to chlorine, forming Na+ and Cl-" },
          { id: "c2", label: "Covalent — two chlorine atoms share a pair of electrons equally" },
          { id: "c3", label: "Coordinate covalent — the lone pair on NH3's nitrogen is donated to H+" },
          { id: "c4", label: "Ionic — both atoms are non-metals" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ionic bonds form between a metal and a non-metal; covalent bonds share electrons between non-metals; coordinate bonds share electrons that both came from just one atom.",
      },
    },
    {
      title: "Why Does This Bond Form This Way?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each bonding scenario to the reason it happens.",
        slots: [
          { id: "s1", label: "A metal atom with 1 valence electron meets a non-metal needing 1 more" },
          { id: "s2", label: "Two identical non-metal atoms bond together" },
          { id: "s3", label: "BF3 (incomplete octet on B) reacts with NH3 (has a lone pair)" },
        ],
        components: [
          { id: "c1", label: "Ionic bond — full electron transfer is far more favorable than sharing" },
          { id: "c2", label: "Covalent bond — neither atom can pull electrons away from the other" },
          { id: "c3", label: "Coordinate bond — NH3's whole lone pair fills boron's empty orbital" },
          { id: "c4", label: "No bond forms since both atoms already have full outer shells" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Look at what each atom has available: a spare electron to give away, an equal need to share, or an atom with a gap and one with a spare pair.",
      },
    },
    {
      title: "Predict Bond Type from Electronegativity",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each electronegativity-difference scenario to the bond type it produces.",
        slots: [
          { id: "s1", label: "Large electronegativity difference (e.g. Na and Cl)" },
          { id: "s2", label: "Zero or very small electronegativity difference (e.g. two O atoms)" },
          { id: "s3", label: "Moderate electronegativity difference (e.g. H and Cl)" },
        ],
        components: [
          { id: "c1", label: "Ionic bond — one atom essentially takes the electron(s) fully" },
          { id: "c2", label: "Non-polar covalent bond — electrons are shared equally" },
          { id: "c3", label: "Polar covalent bond — electrons are shared unequally, creating partial charges" },
          { id: "c4", label: "No bond can form between these two atoms" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The bigger the electronegativity gap, the more one-sided the electron sharing becomes — from equal sharing, to unequal sharing, to a full transfer.",
      },
    },
  ];

  for (const challenge of bondChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_REACTION_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
        concept_id: bondConcept._id,
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

  // ---- Concept 2: VSEPR shapes (Reaction Lab mapping) ----
  let shapeConcept = await Concept.findOne({ chapter_id: chapter._id, title: "VSEPR Molecular Shapes" });
  if (!shapeConcept) {
    shapeConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "VSEPR Molecular Shapes",
      explanation_text:
        "Valence Shell Electron Pair Repulsion (VSEPR) theory predicts a molecule's shape from how many electron domains (bonding pairs and lone pairs) surround the central atom — since electron pairs repel each other, they arrange themselves as far apart as possible. Lone pairs take up more space than bonding pairs, which is why a molecule with lone pairs is bent or pyramidal rather than perfectly symmetric.",
    });
    console.log("Created concept:", shapeConcept._id);
  } else {
    console.log("Using existing concept:", shapeConcept._id);
  }

  const shapeChallenges = [
    {
      title: "Match the Molecule to Its Shape",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each molecule to its correct VSEPR shape.",
        slots: [
          { id: "s1", label: "CH4 (4 bonding pairs, 0 lone pairs)" },
          { id: "s2", label: "NH3 (3 bonding pairs, 1 lone pair)" },
          { id: "s3", label: "H2O (2 bonding pairs, 2 lone pairs)" },
        ],
        components: [
          { id: "c1", label: "Tetrahedral (109.5°)" },
          { id: "c2", label: "Trigonal pyramidal (~107°)" },
          { id: "c3", label: "Bent / V-shaped (~104.5°)" },
          { id: "c4", label: "Linear (180°)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "More lone pairs on the central atom push the bonding pairs closer together, shrinking the bond angle and changing the shape.",
      },
    },
    {
      title: "Why Do Bond Angles Shrink?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each fact about electron pairs to what it explains.",
        slots: [
          { id: "s1", label: "Lone pairs occupy more space than bonding pairs" },
          { id: "s2", label: "CH4's bond angle is 109.5° but NH3's is only ~107°" },
          { id: "s3", label: "H2O's bond angle (~104.5°) is smaller than NH3's" },
        ],
        components: [
          { id: "c1", label: "Because a lone pair is only attracted to one nucleus, it spreads out more and repels neighboring pairs harder" },
          { id: "c2", label: "NH3 has one lone pair pushing the three N-H bonds slightly closer together" },
          { id: "c3", label: "H2O has two lone pairs, pushing the two O-H bonds even closer together than one lone pair would" },
          { id: "c4", label: "Lone pairs and bonding pairs repel each other equally, so angles never change" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each extra lone pair adds more repulsion than a bonding pair would, squeezing the remaining bond angles smaller.",
      },
    },
    {
      title: "Predict Shape from Electron Domains",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Given the total electron domains and lone pairs around the central atom, match each case to its molecular shape.",
        slots: [
          { id: "s1", label: "2 electron domains, 0 lone pairs (e.g. BeCl2)" },
          { id: "s2", label: "3 electron domains, 0 lone pairs (e.g. BF3)" },
          { id: "s3", label: "4 electron domains, 1 lone pair (e.g. NH3)" },
        ],
        components: [
          { id: "c1", label: "Linear" },
          { id: "c2", label: "Trigonal planar" },
          { id: "c3", label: "Trigonal pyramidal" },
          { id: "c4", label: "Octahedral" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Count all electron domains first to get the base geometry, then check how many are lone pairs to see how the shape gets described.",
      },
    },
  ];

  for (const challenge of shapeChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_REACTION_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
        concept_id: shapeConcept._id,
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

  // ---- Concept 3: building covalent molecules (Molecule Builder) ----
  let buildConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Building Simple Covalent Molecules" });
  if (!buildConcept) {
    buildConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building Simple Covalent Molecules",
      explanation_text:
        "A covalent molecule's formula tells you exactly how many atoms of each element it contains, decided by each atom completing its octet (or duet, for hydrogen) through shared electron pairs. Building the correct molecule means picking exactly the right number of each atom — no more, no fewer.",
    });
    console.log("Created concept:", buildConcept._id);
  } else {
    console.log("Using existing concept:", buildConcept._id);
  }

  const buildChallenges = [
    {
      title: "Build: Ammonia (NH₃)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_formula: "NH3",
        target_name: "Ammonia",
        atom_pool: [
          { id: "a1", element: "N", symbol: "N" },
          { id: "a2", element: "H", symbol: "H" },
          { id: "a3", element: "H", symbol: "H" },
          { id: "a4", element: "H", symbol: "H" },
          { id: "a5", element: "H", symbol: "H" },
        ],
        correct_piece_ids: ["a1", "a2", "a3", "a4"],
        hint: "Nitrogen needs exactly three shared electron pairs to complete its octet — that means three hydrogen atoms, not four.",
      },
    },
    {
      title: "Build: Hydrogen Chloride (HCl)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_formula: "HCl",
        target_name: "Hydrogen Chloride",
        atom_pool: [
          { id: "b1", element: "H", symbol: "H" },
          { id: "b2", element: "Cl", symbol: "Cl" },
          { id: "b3", element: "Cl", symbol: "Cl" },
          { id: "b4", element: "H", symbol: "H" },
          { id: "b5", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["b1", "b2"],
        hint: "Hydrogen only needs one shared pair to fill its duet, and chlorine only needs one more electron to complete its octet — one of each is enough.",
      },
    },
    {
      title: "Build: Ethene (C₂H₄)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_formula: "C2H4",
        target_name: "Ethene",
        atom_pool: [
          { id: "c1", element: "C", symbol: "C" },
          { id: "c2", element: "C", symbol: "C" },
          { id: "c3", element: "H", symbol: "H" },
          { id: "c4", element: "H", symbol: "H" },
          { id: "c5", element: "H", symbol: "H" },
          { id: "c6", element: "H", symbol: "H" },
          { id: "c7", element: "H", symbol: "H" },
          { id: "c8", element: "O", symbol: "O" },
        ],
        correct_piece_ids: ["c1", "c2", "c3", "c4", "c5", "c6"],
        hint: "Ethene has two carbons double-bonded to each other, each carbon also bonded to two hydrogens — that's two carbons and four hydrogens total, no oxygen involved.",
      },
    },
  ];

  for (const challenge of buildChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MOLECULE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MOLECULE_BUILDER",
        concept_id: buildConcept._id,
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
