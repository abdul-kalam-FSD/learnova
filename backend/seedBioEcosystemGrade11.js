require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Ecosystem Balance (order-sensitive chain building) coverage for the
// three Grade 11 chapters taught as ordered processes: plant growth
// phases, urine formation along the nephron, and the reflex arc /
// impulse pathway. Same mechanic the Grade 12 ecology chapters use —
// the pieces are process steps here rather than cause-effect links.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Biology subject not found — run the Grade 11 batch seeds first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptChapters = {
    "Phases and Characteristics of Growth": "Plant Growth and Development",
    "Plant Growth Regulators": "Plant Growth and Development",
    "Urine Formation": "Excretory Products and their Elimination",
    "Regulation of Kidney Function and Excretory Disorders": "Excretory Products and their Elimination",
    "Neuron Structure and Generation of Nerve Impulse": "Neural Control and Coordination",
    "Central Nervous System: Brain and Spinal Cord": "Neural Control and Coordination",
  };

  const concepts = {};
  for (const [title, chapterTitle] of Object.entries(conceptChapters)) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.error(`Chapter "${chapterTitle}" not found — run the Grade 11 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run the Grade 11 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Phases and Characteristics of Growth"],
      levels: [
        {
          title: "The Growth Curve of a Root",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "A seed germinates and its root tip is observed over several days. Arrange the phases of growth in the order the root passes through them.",
            scrambled_effects: [
              { id: "g3", label: "Maturation phase — cells differentiate and thicken their walls" },
              { id: "g1", label: "Meristematic phase — cells at the tip divide repeatedly" },
              { id: "g2", label: "Elongation phase — cells just behind the tip enlarge and vacuolate" },
            ],
            correct_order: ["g1", "g2", "g3"],
            hint: "A cell must first be produced by division, then grow larger, before it can take on its final specialised form.",
          },
        },
        {
          title: "Sigmoid Growth in a Population of Cells",
          difficulty: "hard",
          order_index: 2,
          payload: {
            trigger: "A plant organ's growth is plotted against time, producing the characteristic S-shaped sigmoid curve. Arrange its phases in order.",
            scrambled_effects: [
              { id: "s2", label: "Exponential (log) phase — growth is rapid and accelerating" },
              { id: "s4", label: "Stationary phase — growth levels off and stops" },
              { id: "s1", label: "Lag phase — growth is slow as the organ becomes established" },
              { id: "s3", label: "Deceleration phase — growth slows as resources become limiting" },
            ],
            correct_order: ["s1", "s2", "s3", "s4"],
            hint: "The S-shape means a slow start, then the steep rise, then a gradual flattening at the top.",
          },
        },
      ],
    },
    {
      concept: concepts["Plant Growth Regulators"],
      levels: [
        {
          title: "Auxin and Phototropism",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "A shoot is lit from one side only, and within hours it bends toward the light. Arrange the steps that produce this bending.",
            scrambled_effects: [
              { id: "a3", label: "Cells on the shaded side elongate faster than those on the lit side" },
              { id: "a1", label: "Light striking one side causes auxin to move to the shaded side" },
              { id: "a4", label: "The unequal elongation bends the shoot toward the light" },
              { id: "a2", label: "Auxin accumulates in higher concentration on the shaded side" },
            ],
            correct_order: ["a1", "a2", "a3", "a4"],
            hint: "Follow the hormone: it must move, then build up, before it can make cells stretch and the shoot bend.",
          },
        },
      ],
    },
    {
      concept: concepts["Urine Formation"],
      levels: [
        {
          title: "The Journey Through the Nephron",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "Blood enters the glomerulus and urine eventually leaves the collecting duct. Arrange the three stages of urine formation in order.",
            scrambled_effects: [
              { id: "u2", label: "Reabsorption — useful substances such as glucose and most water return to the blood" },
              { id: "u1", label: "Glomerular filtration — blood is filtered under pressure into the Bowman's capsule" },
              { id: "u3", label: "Secretion — extra waste ions such as H+ and K+ are added into the tubule" },
            ],
            correct_order: ["u1", "u2", "u3"],
            hint: "Everything must first be filtered out of the blood before anything useful can be taken back or extra waste added.",
          },
        },
        {
          title: "Filtrate Through the Tubule",
          difficulty: "hard",
          order_index: 2,
          payload: {
            trigger: "Trace the filtrate along the nephron from where it is formed to where urine leaves. Arrange the regions in order.",
            scrambled_effects: [
              { id: "n3", label: "Loop of Henle — concentrates the filtrate by a counter-current mechanism" },
              { id: "n1", label: "Bowman's capsule — receives the glomerular filtrate" },
              { id: "n4", label: "Distal convoluted tubule — fine-tunes salt and water balance" },
              { id: "n2", label: "Proximal convoluted tubule — reabsorbs most water, glucose, and ions" },
              { id: "n5", label: "Collecting duct — carries the final urine toward the renal pelvis" },
            ],
            correct_order: ["n1", "n2", "n3", "n4", "n5"],
            hint: "Proximal means near the capsule and distal means far from it — the loop lies between the two.",
          },
        },
      ],
    },
    {
      concept: concepts["Regulation of Kidney Function and Excretory Disorders"],
      levels: [
        {
          title: "The Body Responds to Dehydration",
          difficulty: "hard",
          order_index: 1,
          payload: {
            trigger: "A person works outdoors for hours without drinking water. Arrange the steps by which the body conserves water.",
            scrambled_effects: [
              { id: "d3", label: "ADH increases water reabsorption from the distal tubule and collecting duct" },
              { id: "d1", label: "Blood volume falls and its solute concentration rises" },
              { id: "d4", label: "A smaller volume of more concentrated urine is produced" },
              { id: "d2", label: "Osmoreceptors trigger release of ADH from the posterior pituitary" },
            ],
            correct_order: ["d1", "d2", "d3", "d4"],
            hint: "The body must detect the change before it can release a hormone, and the hormone must act before urine output changes.",
          },
        },
      ],
    },
    {
      concept: concepts["Neuron Structure and Generation of Nerve Impulse"],
      levels: [
        {
          title: "Generating an Action Potential",
          difficulty: "hard",
          order_index: 1,
          payload: {
            trigger: "A stimulus reaches a resting neuron membrane. Arrange the events of the action potential in order.",
            scrambled_effects: [
              { id: "p2", label: "Sodium channels open and Na+ rushes in, depolarising the membrane" },
              { id: "p4", label: "The sodium-potassium pump restores the original resting potential" },
              { id: "p1", label: "Resting potential — the inside of the membrane is negative relative to the outside" },
              { id: "p3", label: "Potassium channels open and K+ moves out, repolarising the membrane" },
            ],
            correct_order: ["p1", "p2", "p3", "p4"],
            hint: "Sodium always moves first to depolarise; potassium follows to repolarise; the pump resets everything last.",
          },
        },
      ],
    },
    {
      concept: concepts["Central Nervous System: Brain and Spinal Cord"],
      levels: [
        {
          title: "The Reflex Arc",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "A person touches a hot plate and pulls their hand away before feeling the pain. Arrange the components of the reflex arc in order.",
            scrambled_effects: [
              { id: "r4", label: "Motor neuron carries the impulse out to the muscle" },
              { id: "r1", label: "Receptor in the skin detects the heat stimulus" },
              { id: "r5", label: "Effector muscle contracts and the hand is withdrawn" },
              { id: "r2", label: "Sensory neuron carries the impulse to the spinal cord" },
              { id: "r3", label: "Spinal cord processes the signal through a relay neuron" },
            ],
            correct_order: ["r1", "r2", "r3", "r4", "r5"],
            hint: "The signal travels in, gets processed, then travels out — the brain is not involved in the withdrawal itself.",
          },
        },
      ],
    },
  ];

  for (const { concept, levels } of allChallenges) {
    for (const level of levels) {
      const exists = await GameContent.findOne({
        game_type: "BIO_ECOSYSTEM_BALANCE",
        title: level.title,
      });
      if (!exists) {
        const created = await GameContent.create({
          game_type: "BIO_ECOSYSTEM_BALANCE",
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
  console.error("Seed failed:", err.message);
  process.exit(1);
});
