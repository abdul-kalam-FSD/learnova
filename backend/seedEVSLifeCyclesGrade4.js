require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session). Adds the second
// concept the real "Growing up with Nature" chapter needs (life
// cycles/growth), alongside the existing "Sorting Animals by
// Features" concept (kept from the old "Animal Groups" chapter —
// see seedBiologyGrade4.js for the rename). Errors out if that
// chapter hasn't been seeded/renamed yet.
//
// Reuses SOCIAL_SCIENCE_PROCESS_BUILDER's generic "arrange these
// steps in order" mechanic for sequencing life-cycle stages — a
// genuine fit (a life cycle IS an ordered sequence), no new
// mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: "Science" });
  if (!subject) {
    throw new Error("Grade 4 Science subject not found — run seedBiologyGrade4.js first.");
  }

  const chapter =
    (await Chapter.findOne({ subject_id: subject._id, title: "Growing up with Nature" })) ||
    (await Chapter.findOne({ subject_id: subject._id, title: "Animal Groups" }));
  if (!chapter) {
    throw new Error("Chapter 'Growing up with Nature' not found — run seedBiologyGrade4.js first.");
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "How Living Things Grow and Change" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "How Living Things Grow and Change",
      explanation_text:
        "Living things don't appear fully grown — they pass through stages. A seed sprouts into a seedling, grows into a young plant, and matures into an adult plant that can flower and make new seeds. Many animals follow a similar pattern: a hen's egg hatches into a chick that grows into an adult hen, and a baby animal grows bigger and changes shape as it matures. Putting these stages in the right order shows how growth happens step by step, not all at once.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: A Seed Becomes a Plant",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these stages in the order a plant grows.",
        scrambled_steps: [
          { id: "st3", label: "The young plant grows taller and grows more leaves" },
          { id: "st2", label: "A tiny seedling with its first leaves pushes out of the soil" },
          { id: "st4", label: "The grown plant flowers and makes new seeds" },
          { id: "st1", label: "A seed is planted in the soil and takes in water" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Nothing can sprout before it has taken in water, and a plant can't make seeds before it has grown and flowered.",
      },
    },
    {
      title: "Process: An Egg Becomes a Hen",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these stages in the order a hen's life cycle happens.",
        scrambled_steps: [
          { id: "st3", label: "The growing chick develops feathers and gets bigger" },
          { id: "st1", label: "A hen lays an egg" },
          { id: "st4", label: "The young hen becomes an adult and can lay its own eggs" },
          { id: "st2", label: "The egg is kept warm until it hatches into a chick" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "An egg has to be laid and hatch before there's a chick to grow at all.",
      },
    },
    {
      title: "Process: A Butterfly's Changing Body",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these stages of a butterfly's life cycle in order.",
        scrambled_steps: [
          { id: "st2", label: "The egg hatches into a caterpillar that eats and grows" },
          { id: "st4", label: "A fully formed butterfly breaks out and flies away" },
          { id: "st1", label: "A butterfly lays a tiny egg on a leaf" },
          { id: "st3", label: "The caterpillar forms a hard case called a pupa" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The caterpillar has to grow first, and the pupa stage always comes right before the adult butterfly appears.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({ game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept._id,
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
