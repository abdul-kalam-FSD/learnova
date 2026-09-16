require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 3 (Grade 10 Science expansion). Grade 10 Chemistry previously
// had exactly two chapters, both under Reaction-related mechanics:
// "Chemical Reactions & Stoichiometry" (CHEMISTRY_EQUATION_BALANCER,
// seedChemistryEquationBalancerGrade10.js + seedChemistryGrade10.js)
// and "Types of Chemical Reactions" (CHEMISTRY_REACTION_LAB,
// seedChemistryReactionLab.js). CHEMISTRY_MATCH — registered as
// "Metals & Non-Metals Match" — had never been used at Grade 10 at
// all, despite "Metals and Non-metals" being a real, substantial
// NCERT Class 10 chapter (Ch.3) in its own right, distinct from both
// existing chapters.
//
// This is a genuine mechanic-to-topic fit, not a forced reuse:
// ChemistryMatch.jsx hardcodes its on-screen copy to "Metals &
// Non-Metals Match" / "Match Metal or Non-Metal" with no theme
// override (same as PhysicsMatch.jsx), so it can only sensibly host
// content that is actually about metals vs non-metals — which this
// is. CHEMISTRY_MATCH was previously only used at Grade 8
// (seedChemistryMatchGrade8.js, "Materials: Metals and Non-Metals" —
// basic properties: lustre, malleability, conductivity). This new
// Grade 10 chapter is titled differently and goes to genuine Grade 10
// depth instead (reactivity series, displacement, extraction methods,
// ionic bonding) — same broad topic, correctly deeper treatment for
// the higher grade, no duplicate chapter or concept titles with the
// Grade 8 file.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Metals and Non-Metals" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Metals and Non-Metals",
      title: "Metals and Non-Metals",
      // Grade 10 Science is one integrated Subject, so Chapter.order_index
      // is a shared namespace across Biology/Physics/Chemistry strands
      // (chapters sorted via Chapter.find({subject_id}).sort({order_index:1})).
      // Existing chapters occupy 1-6 (Biology core) plus 101/101/102
      // (later Biology GameContent-mechanic chapters: Human Health,
      // Genetics and Heredity, Classification). This new batch continues
      // that numbering at 103 to avoid colliding with any of them.
      order_index: 103,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Reactivity of Metals ----
  let reactivityConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Reactivity of Metals" });
  if (!reactivityConcept) {
    reactivityConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reactivity of Metals",
      explanation_text:
        "Different metals react with oxygen, water, and dilute acids at different rates — this order is captured in the reactivity series, from very reactive metals like sodium and potassium down to very unreactive ones like gold and platinum. A more reactive metal can displace a less reactive metal from its salt solution (a displacement reaction), and only metals ABOVE hydrogen in the series can displace it from a dilute acid to release hydrogen gas.",
    });
    console.log("Created concept:", reactivityConcept._id);
  } else {
    console.log("Using existing concept:", reactivityConcept._id);
  }

  const reactivityChallenges = [
    {
      title: "Reaction with Water",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Three different metals are placed in cold water. Match each metal to what happens.",
        slots: [
          { id: "s1", label: "Sodium is dropped into cold water" },
          { id: "s2", label: "Iron is placed in cold water" },
          { id: "s3", label: "Gold is placed in cold water" },
        ],
        components: [
          { id: "c1", label: "Reacts violently, releasing hydrogen gas and enough heat to ignite it" },
          { id: "c2", label: "Reacts only very slowly, and needs steam rather than cold water to react noticeably" },
          { id: "c3", label: "No reaction at all — gold is far too unreactive to react with water" },
          { id: "c4", label: "Dissolves completely without releasing any gas" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Reactivity with water follows the reactivity series — sodium reacts violently even with cold water, iron barely reacts even with steam, and gold doesn't react at all.",
      },
    },
    {
      title: "Displacement Reactions",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each metal-in-solution combination to what actually happens.",
        slots: [
          { id: "s1", label: "An iron nail is dipped in copper sulphate solution" },
          { id: "s2", label: "A copper wire is dipped in iron sulphate solution" },
          { id: "s3", label: "A silver spoon is dipped in copper sulphate solution" },
        ],
        components: [
          { id: "c1", label: "Iron displaces copper — the blue solution fades and reddish-brown copper deposits form on the nail" },
          { id: "c2", label: "No reaction — copper is less reactive than iron and cannot displace it" },
          { id: "c3", label: "No reaction — silver is less reactive than copper and cannot displace it" },
          { id: "c4", label: "Both metals react and dissolve completely" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A metal can only displace another metal that sits BELOW it in the reactivity series — copper is less reactive than iron, and silver is less reactive than copper.",
      },
    },
    {
      title: "Reaction with Dilute Acids",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each metal-acid combination to what happens.",
        slots: [
          { id: "s1", label: "Magnesium is added to dilute hydrochloric acid" },
          { id: "s2", label: "Copper is added to dilute hydrochloric acid" },
          { id: "s3", label: "Zinc is added to dilute sulphuric acid" },
        ],
        components: [
          { id: "c1", label: "Vigorous reaction — hydrogen gas bubbles off rapidly, forming magnesium chloride" },
          { id: "c2", label: "No visible reaction — copper sits below hydrogen in the reactivity series and can't displace it from the acid" },
          { id: "c3", label: "Steady reaction — hydrogen gas is released, forming zinc sulphate" },
          { id: "c4", label: "The acid instantly neutralizes with no gas produced" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Only metals ABOVE hydrogen in the reactivity series can displace it from a dilute acid to release hydrogen gas — copper sits below hydrogen, so nothing happens.",
      },
    },
  ];

  for (const challenge of reactivityChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: reactivityConcept._id,
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

  // ---- Concept 2: Extraction of Metals ----
  let extractionConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Extraction of Metals" });
  if (!extractionConcept) {
    extractionConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Extraction of Metals",
      explanation_text:
        "The method used to extract a metal from its ore depends on where it sits in the reactivity series. Highly reactive metals (like sodium and potassium) are extracted by electrolysis of their molten compounds, since no ordinary reducing agent is strong enough. Moderately reactive metals (like iron and zinc) are extracted by reduction with carbon. Highly unreactive metals (like gold and silver) often occur in nature in their free, uncombined state and need little to no chemical extraction.",
    });
    console.log("Created concept:", extractionConcept._id);
  } else {
    console.log("Using existing concept:", extractionConcept._id);
  }

  const extractionChallenges = [
    {
      title: "Matching Metal to Extraction Method",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each metal to the method typically used to extract it from its ore.",
        slots: [
          { id: "s1", label: "Sodium (highly reactive)" },
          { id: "s2", label: "Iron (moderately reactive)" },
          { id: "s3", label: "Gold (highly unreactive)" },
        ],
        components: [
          { id: "c1", label: "Extracted by electrolysis of its molten compound — carbon reduction isn't a strong enough method" },
          { id: "c2", label: "Extracted by reduction with carbon (heating the ore with carbon/coke in a furnace)" },
          { id: "c3", label: "Found in nature as the free metal — needs little to no chemical extraction" },
          { id: "c4", label: "Extracted by simply heating the ore in open air" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The more reactive the metal, the harder it is to separate from its compound — that's exactly why the extraction method depends on reactivity.",
      },
    },
    {
      title: "Why Electrolysis for Sodium but Carbon for Iron?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each extraction attempt to what actually happens.",
        slots: [
          { id: "s1", label: "Trying to extract sodium using carbon reduction" },
          { id: "s2", label: "Trying to extract iron using carbon reduction" },
          { id: "s3", label: "Trying to extract iron using electrolysis instead of carbon reduction" },
        ],
        components: [
          { id: "c1", label: "Fails — carbon isn't a strong enough reducing agent to pull sodium away from its compound" },
          { id: "c2", label: "Works well — carbon is a strong enough reducing agent for iron's reactivity level" },
          { id: "c3", label: "Technically works, but is far more expensive and impractical than carbon reduction for a metal like iron" },
          { id: "c4", label: "Both methods fail equally for every metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Carbon reduction only works on metals less reactive than carbon itself — sodium is far more reactive than carbon, but iron is less reactive, so carbon can displace it.",
      },
    },
    {
      title: "Refining and Corrosion Prevention",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each situation involving a metal after extraction to what happens to it.",
        slots: [
          { id: "s1", label: "Impure copper obtained from a furnace needs to be purified" },
          { id: "s2", label: "An iron gate is left exposed to moist air for months" },
          { id: "s3", label: "The same iron gate is instead coated with a thin layer of zinc (galvanized)" },
        ],
        components: [
          { id: "c1", label: "Purified using electrolytic refining — impure copper as anode, pure copper deposits at the cathode" },
          { id: "c2", label: "Rusts — iron reacts with oxygen and moisture to form iron oxide, weakening the metal over time" },
          { id: "c3", label: "Resists rusting — zinc corrodes preferentially and also acts as a barrier, protecting the iron underneath" },
          { id: "c4", label: "Nothing changes in any of these cases" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Electrolytic refining purifies metals like copper. Galvanizing protects iron by coating it with a more reactive metal (zinc) that corrodes first, sacrificially protecting the iron underneath.",
      },
    },
  ];

  for (const challenge of extractionChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: extractionConcept._id,
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

  // ---- Concept 3: Ionic Bonding in Metals and Non-Metals ----
  let ionicConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Ionic Bonding in Metals and Non-Metals" });
  if (!ionicConcept) {
    ionicConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Ionic Bonding in Metals and Non-Metals",
      explanation_text:
        "Metals react with non-metals by transferring electrons — metal atoms lose electrons to form positive ions (cations), and non-metal atoms gain those electrons to form negative ions (anions). The oppositely charged ions attract each other strongly, forming an ionic compound. Ionic compounds are typically hard but brittle, have high melting points, and conduct electricity only when molten or dissolved in water — not in their solid state, where the ions are locked in a fixed lattice.",
    });
    console.log("Created concept:", ionicConcept._id);
  } else {
    console.log("Using existing concept:", ionicConcept._id);
  }

  const ionicChallenges = [
    {
      title: "Electron Transfer: Who Gives, Who Takes?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each pair of reacting elements to what happens to their electrons.",
        slots: [
          { id: "s1", label: "A sodium atom reacting with a chlorine atom" },
          { id: "s2", label: "A magnesium atom reacting with an oxygen atom" },
          { id: "s3", label: "Two chlorine atoms reacting with each other" },
        ],
        components: [
          { id: "c1", label: "Sodium loses one electron to chlorine, forming Na⁺ and Cl⁻" },
          { id: "c2", label: "Magnesium loses two electrons to oxygen, forming Mg²⁺ and O²⁻" },
          { id: "c3", label: "This isn't ionic bonding at all — two non-metals share electrons instead of transferring them (covalent bonding)" },
          { id: "c4", label: "Neither atom loses or gains any electrons" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ionic bonding is a METAL-to-NON-METAL electron transfer — two non-metals bonding together share electrons instead (covalent bonding), they don't transfer them.",
      },
    },
    {
      title: "Properties of Ionic Compounds",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each situation involving sodium chloride to what actually happens.",
        slots: [
          { id: "s1", label: "Trying to bend a crystal of sodium chloride" },
          { id: "s2", label: "Heating sodium chloride to a very high temperature" },
          { id: "s3", label: "Dissolving sodium chloride in water" },
        ],
        components: [
          { id: "c1", label: "The crystal shatters instead of bending — ionic compounds are hard but brittle" },
          { id: "c2", label: "It eventually melts — ionic compounds have high melting points due to strong electrostatic attraction between ions" },
          { id: "c3", label: "The solution conducts electricity — the freed ions can now move and carry charge" },
          { id: "c4", label: "Nothing happens in any of these cases" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ionic bonds are strong in every direction, which is exactly why ionic solids are hard and have high melting points, but shatter — rather than bend — under stress.",
      },
    },
    {
      title: "Why Doesn't Solid NaCl Conduct Electricity?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each state of sodium chloride to whether it conducts electricity, and why.",
        slots: [
          { id: "s1", label: "Solid sodium chloride crystal at room temperature" },
          { id: "s2", label: "Molten sodium chloride (heated past its melting point)" },
          { id: "s3", label: "Sodium chloride dissolved in water" },
        ],
        components: [
          { id: "c1", label: "Does not conduct — ions are locked in a fixed lattice and can't move to carry charge" },
          { id: "c2", label: "Conducts electricity — ions are now free to move through the liquid" },
          { id: "c3", label: "Conducts electricity — the dissolved ions are free to move through the solution" },
          { id: "c4", label: "Conducts electricity in all three states equally" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Conductivity in ionic compounds needs mobile, freely-moving ions — in the solid lattice, ions are locked in place, but melting or dissolving frees them to move and carry current.",
      },
    },
  ];

  for (const challenge of ionicChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: ionicConcept._id,
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
