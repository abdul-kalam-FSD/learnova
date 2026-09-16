require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 11 Chemistry currently has
// "Redox Reactions" (order_index 1) and "Chemical Bonding and Molecular
// Structure" (order_index 2). This adds a genuine third NCERT Class 11
// Chemistry chapter, "The p-Block Elements" (Groups 13 and 14) — never
// covered at this grade before.
//
// Reuses CHEMISTRY_MATCH exactly as-is (same slot/component
// correct_mapping check as the Grade 10 "Metals and Non-Metals" chapter
// — see "seedChemistryMatchGrade10 .js"), applied here to classifying
// specific p-Block elements and compounds by property/character instead
// of the reactivity-series content Grade 10 covers. No new backend code.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The p-Block Elements (Groups 13 and 14)" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "The p-Block Elements",
      title: "The p-Block Elements (Groups 13 and 14)",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Group 13 Elements: The Boron Family ----
  let group13Concept = await Concept.findOne({ chapter_id: chapter._id, title: "Group 13 Elements: The Boron Family" });
  if (!group13Concept) {
    group13Concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Group 13 Elements: The Boron Family",
      explanation_text:
        "Group 13 (B, Al, Ga, In, Tl) shows a clear metallic-character trend down the group: boron itself behaves as a metalloid/non-metal, while aluminium and the elements below it are true metals. A distinctive feature lower in the group is the 'inert pair effect', where the heaviest members (like thallium) prefer a +1 oxidation state instead of the expected +3.",
    });
    console.log("Created concept:", group13Concept._id);
  } else {
    console.log("Using existing concept:", group13Concept._id);
  }

  const group13Challenges = [
    {
      title: "Boron vs Aluminium: Character",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each Group 13 element/compound to its correct character.",
        slots: [
          { id: "s1", label: "Boron (B)" },
          { id: "s2", label: "Aluminium (Al)" },
          { id: "s3", label: "Aluminium oxide (Al\u2082O\u2083)" },
        ],
        components: [
          { id: "c1", label: "A metalloid that behaves mostly like a non-metal" },
          { id: "c2", label: "A true metal, good conductor, reacts with both acids and bases" },
          { id: "c3", label: "An amphoteric oxide — reacts with both acids and alkalis" },
          { id: "c4", label: "A noble gas, completely unreactive" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Boron is the odd one out in its own group — it behaves like a metalloid/non-metal, unlike every element below it.",
      },
    },
    {
      title: "The Inert Pair Effect",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each Group 13 species to the oxidation state it favours and why.",
        slots: [
          { id: "s1", label: "Aluminium (Al)" },
          { id: "s2", label: "Thallium (Tl)" },
          { id: "s3", label: "Gallium (Ga)" },
        ],
        components: [
          { id: "c1", label: "Favours +3, using all three valence electrons in bonding" },
          { id: "c2", label: "Favours +1, the 6s\u00b2 pair resists being used in bonding (inert pair effect)" },
          { id: "c3", label: "Favours +3 like aluminium, still early enough in the group for the inert pair effect to be weak" },
          { id: "c4", label: "Favours \u22121, gaining an electron like a halogen" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The inert pair effect grows STRONGER going down the group — it's barely noticeable for aluminium but dominant for thallium.",
      },
    },
    {
      title: "Boric Acid and Borax",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each boron compound/behaviour to its correct description.",
        slots: [
          { id: "s1", label: "Boric acid, B(OH)\u2083, in water" },
          { id: "s2", label: "Borax, Na\u2082B\u2084O\u2087\u00b710H\u2082O" },
          { id: "s3", label: "Boron trifluoride, BF\u2083" },
        ],
        components: [
          { id: "c1", label: "A weak monobasic (Lewis) acid — it accepts OH\u207b rather than donating H\u207a directly" },
          { id: "c2", label: "A white crystalline salt used as a water softener and in the borax bead test" },
          { id: "c3", label: "An electron-deficient molecule that readily acts as a Lewis acid" },
          { id: "c4", label: "A strong Bronsted acid that fully ionizes in water" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Boron compounds are famous for being electron-deficient (only 6 electrons around B), which is why they act as Lewis acids rather than typical Bronsted acids.",
      },
    },
  ];

  for (const challenge of group13Challenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: group13Concept._id,
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

  // ---- Concept 2: Group 14 Elements: The Carbon Family ----
  let group14Concept = await Concept.findOne({ chapter_id: chapter._id, title: "Group 14 Elements: The Carbon Family" });
  if (!group14Concept) {
    group14Concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Group 14 Elements: The Carbon Family",
      explanation_text:
        "Group 14 (C, Si, Ge, Sn, Pb) shows metallic character increasing down the group: carbon is a non-metal, silicon and germanium are metalloids (the basis of semiconductors), and tin and lead are metals. Carbon is unique in the group for 'catenation' — its exceptional ability to form long chains and rings by bonding to itself.",
    });
    console.log("Created concept:", group14Concept._id);
  } else {
    console.log("Using existing concept:", group14Concept._id);
  }

  const group14Challenges = [
    {
      title: "Classifying the Carbon Family",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each Group 14 element to its correct classification.",
        slots: [
          { id: "s1", label: "Carbon (C)" },
          { id: "s2", label: "Silicon (Si)" },
          { id: "s3", label: "Lead (Pb)" },
        ],
        components: [
          { id: "c1", label: "Non-metal" },
          { id: "c2", label: "Metalloid — used as a semiconductor" },
          { id: "c3", label: "Metal — soft, dense, forms a +2 ion readily (inert pair effect)" },
          { id: "c4", label: "Noble gas" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Metallic character increases going down Group 14: non-metal, metalloid, metalloid, metal, metal.",
      },
    },
    {
      title: "Catenation and Allotropes of Carbon",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each carbon allotrope/property to its correct description.",
        slots: [
          { id: "s1", label: "Diamond" },
          { id: "s2", label: "Graphite" },
          { id: "s3", label: "Catenation" },
        ],
        components: [
          { id: "c1", label: "Every carbon is bonded to 4 others in a rigid 3D lattice — extremely hard, does not conduct electricity" },
          { id: "c2", label: "Carbon atoms in flat, stacked hexagonal sheets — soft, slippery, conducts electricity" },
          { id: "c3", label: "The ability of an atom to bond repeatedly to identical atoms of itself, forming long chains/rings" },
          { id: "c4", label: "A property only metals show, never non-metals" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Carbon shows catenation far more strongly than silicon because the C\u2013C bond is much stronger than the Si\u2013Si bond.",
      },
    },
    {
      title: "Why Silicon Powers Electronics",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each Group 14 fact to its correct explanation.",
        slots: [
          { id: "s1", label: "Silicon is used to make computer chips" },
          { id: "s2", label: "Tin shows two oxidation states, +2 and +4" },
          { id: "s3", label: "Lead(II) compounds are more stable than lead(IV) compounds" },
        ],
        components: [
          { id: "c1", label: "It is a semiconductor — its conductivity can be finely controlled by doping" },
          { id: "c2", label: "+4 is the more stable state for tin, but +2 also exists since the inert pair effect is moderate" },
          { id: "c3", label: "The inert pair effect is strongest for lead, the heaviest element in the group, favouring +2" },
          { id: "c4", label: "Lead is radioactive, so its compounds are inherently unstable" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The inert pair effect gets stronger going down Group 14 too — it's why +2 becomes the more stable state by the time you reach lead.",
      },
    },
  ];

  for (const challenge of group14Challenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: group14Concept._id,
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

  // ---- Concept 3: Metallic, Metalloid and Non-Metallic Character Across the p-Block ----
  let characterConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Metallic, Metalloid and Non-Metallic Character Across the p-Block" });
  if (!characterConcept) {
    characterConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Metallic, Metalloid and Non-Metallic Character Across the p-Block",
      explanation_text:
        "Across Groups 13 and 14, metallic character increases as you move DOWN a group and decreases as you move ACROSS a period (left to right). This is why boron and carbon (top of their groups) behave as non-metal/metalloid, while thallium and lead (bottom of their groups) are true metals.",
    });
    console.log("Created concept:", characterConcept._id);
  } else {
    console.log("Using existing concept:", characterConcept._id);
  }

  const characterChallenges = [
    {
      title: "Metal, Metalloid or Non-Metal?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each element to its correct character.",
        slots: [
          { id: "s1", label: "Boron (B)" },
          { id: "s2", label: "Silicon (Si)" },
          { id: "s3", label: "Tin (Sn)" },
        ],
        components: [
          { id: "c1", label: "Metalloid/non-metal — brittle, poor conductor" },
          { id: "c2", label: "Metalloid — semiconductor, intermediate properties" },
          { id: "c3", label: "Metal — malleable, good conductor" },
          { id: "c4", label: "Non-metal gas at room temperature" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Going down either group, character shifts from non-metal/metalloid toward true metal.",
      },
    },
    {
      title: "Comparing Across a Period",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each period-3 element to how its character compares to its Group 13/14 neighbour.",
        slots: [
          { id: "s1", label: "Aluminium (Group 13, Period 3)" },
          { id: "s2", label: "Silicon (Group 14, Period 3)" },
          { id: "s3", label: "Moving left to right across Period 3" },
        ],
        components: [
          { id: "c1", label: "A true metal — metallic character is higher on the left of the period" },
          { id: "c2", label: "A metalloid — less metallic than aluminium just to its left" },
          { id: "c3", label: "Metallic character decreases overall as you move across a period" },
          { id: "c4", label: "Metallic character increases overall as you move across a period" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Metallic character rises down a group but falls across a period (left to right) — the two trends work in different directions.",
      },
    },
    {
      title: "Oxide Character: Acidic, Basic or Amphoteric",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each oxide to its correct acid-base character.",
        slots: [
          { id: "s1", label: "Boron trioxide, B\u2082O\u2083" },
          { id: "s2", label: "Aluminium oxide, Al\u2082O\u2083" },
          { id: "s3", label: "Lead(II) oxide, PbO" },
        ],
        components: [
          { id: "c1", label: "Acidic — reacts with bases like a typical non-metal oxide" },
          { id: "c2", label: "Amphoteric — reacts with both acids and bases" },
          { id: "c3", label: "Basic — reacts with acids like a typical metal oxide" },
          { id: "c4", label: "Completely inert — reacts with neither acids nor bases" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Oxide character tracks metallic character: non-metal oxides tend acidic, metal oxides tend basic, and the borderline elements give amphoteric oxides.",
      },
    },
  ];

  for (const challenge of characterChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: characterConcept._id,
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
