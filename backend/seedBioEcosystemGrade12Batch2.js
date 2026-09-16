require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Ecosystem Balance coverage for "Biodiversity and Conservation"
// (seedGrade12_batch5.js — run that first), the chapter added to close
// the last missing cell of the current 13-chapter Class 12 syllabus.
// The cause-effect ordering mechanic suits this chapter directly: each
// driver of biodiversity loss is a chain running from a human action
// to species extinction. Same ordered-sequence payload and scoring
// path as every other Ecosystem Balance file.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 12 Biology subject not found — run seedGrade12_batch5.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({
    subject_id: subject._id,
    title: "Biodiversity and Conservation",
  });
  if (!chapter) {
    console.error("Chapter 'Biodiversity and Conservation' not found — run seedGrade12_batch5.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptTitles = ["Loss of Biodiversity and Its Causes", "Conservation Strategies"];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade12_batch5.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Loss of Biodiversity and Its Causes"],
      levels: [
        {
          title: "The Fragmented Forest",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "A highway and farmland cut a large continuous rainforest into several small, isolated patches.",
            scrambled_effects: [
              { id: "f3", label: "Small isolated populations lose genetic diversity through inbreeding" },
              { id: "f1", label: "Total forest area shrinks and edge habitat increases" },
              { id: "f4", label: "Species requiring large territories decline and are lost from the patches" },
              { id: "f2", label: "Populations become cut off from one another, stopping migration between patches" },
            ],
            correct_order: ["f1", "f2", "f3", "f4"],
            hint: "The habitat has to shrink and break apart before populations become isolated, before their gene pools suffer, before species disappear.",
          },
        },
        {
          title: "The Introduced Predator",
          difficulty: "hard",
          order_index: 2,
          payload: {
            trigger: "The Nile perch, a large predatory fish, is introduced into Lake Victoria.",
            scrambled_effects: [
              { id: "n2", label: "It preys heavily on the lake's native cichlid fish" },
              { id: "n4", label: "Over 200 native cichlid species are driven to extinction" },
              { id: "n1", label: "The alien predator establishes itself with no natural enemies in the lake" },
              { id: "n3", label: "Cichlid populations crash faster than they can reproduce" },
            ],
            correct_order: ["n1", "n2", "n3", "n4"],
            hint: "An invader must first establish itself before it can feed, before prey numbers crash, before extinction follows.",
          },
        },
        {
          title: "The Vanishing Pollinator",
          difficulty: "hard",
          order_index: 3,
          payload: {
            trigger: "A plant species that depends on one specific insect pollinator is wiped out by land clearing.",
            scrambled_effects: [
              { id: "p2", label: "Its obligate pollinator loses the only nectar source it can use" },
              { id: "p1", label: "The plant species becomes extinct in the wild" },
              { id: "p3", label: "The pollinator population declines sharply" },
              { id: "p4", label: "The pollinator also goes extinct — a co-extinction" },
            ],
            correct_order: ["p1", "p2", "p3", "p4"],
            hint: "This is the co-extinction chain: the host goes first, and everything obligately tied to it follows.",
          },
        },
      ],
    },
    {
      concept: concepts["Conservation Strategies"],
      levels: [
        {
          title: "Protecting a Hotspot",
          difficulty: "medium",
          order_index: 1,
          payload: {
            trigger: "A government designates a threatened, endemism-rich region as a protected biosphere reserve.",
            scrambled_effects: [
              { id: "c2", label: "Habitat destruction within the reserve slows and then stops" },
              { id: "c4", label: "A very large number of endemic species are saved from extinction at relatively low cost" },
              { id: "c1", label: "Logging, clearing, and hunting are legally restricted inside the boundary" },
              { id: "c3", label: "Populations of endemic species stabilise and begin to recover" },
            ],
            correct_order: ["c1", "c2", "c3", "c4"],
            hint: "Legal protection comes first, then habitat loss halts, then populations recover — the payoff at the end is why hotspots are prioritised.",
          },
        },
        {
          title: "The Last Wild Population",
          difficulty: "hard",
          order_index: 2,
          payload: {
            trigger: "A species is reduced to a handful of wild individuals, too few to survive in its degraded habitat.",
            scrambled_effects: [
              { id: "e3", label: "Captive breeding raises numbers under controlled conditions" },
              { id: "e1", label: "Remaining individuals are moved to a zoo or botanical garden for special care" },
              { id: "e4", label: "Offspring are reintroduced into a restored natural habitat" },
              { id: "e2", label: "Gametes are preserved in seed banks and by cryopreservation as a genetic backup" },
            ],
            correct_order: ["e1", "e2", "e3", "e4"],
            hint: "This is the ex situ sequence: secure the animals, bank the genetic material, breed them up, then return them to the wild.",
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
