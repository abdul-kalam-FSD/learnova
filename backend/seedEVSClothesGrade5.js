require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 8 "Clothes:
// How Things Are Made" (2026-27 session, Unit 4: Things Around Us).
//
// Reuses SOCIAL_SCIENCE_PROCESS_BUILDER — the same order-sensitive
// "arrange these steps correctly" mechanic already used for fair-
// sharing processes — a genuine fit for how raw fibre becomes cloth
// (a real, fixed manufacturing sequence). No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    subject = await Subject.create({ name: "EVS", grade: 5 });
    console.log("Created new Grade 5 EVS subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Clothes: How Things Are Made" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Things Around Us",
      title: "Clothes: How Things Are Made",
      order_index: 8,
      strand: "Chemistry",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "From Fibre to Fabric" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "From Fibre to Fabric",
      explanation_text:
        "Cloth doesn't start out as cloth — it begins as a natural fibre (like cotton from a plant or wool from a sheep) or a man-made fibre, and goes through several steps before it becomes the clothes we wear: the fibre is spun into thread, the thread is woven or knitted into fabric, and the fabric is often dyed and then stitched into a finished garment.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const clothesChallenges = [
    {
      title: "Process: From Cotton Plant to Cotton Cloth",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order cotton becomes cloth.",
        scrambled_steps: [
          { id: "st4", label: "The fabric is stitched into a finished garment" },
          { id: "st3", label: "The thread is woven into fabric" },
          { id: "st2", label: "The cotton fibre is spun into thread" },
          { id: "st1", label: "Cotton is picked from the cotton plant" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "You need raw fibre before you can spin thread, and thread before you can weave fabric.",
      },
    },
    {
      title: "Process: Adding Colour and Design to Fabric",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a plain fabric is turned into a coloured, patterned one.",
        scrambled_steps: [
          { id: "st4", label: "The dyed fabric is cut and stitched into clothing" },
          { id: "st3", label: "A pattern or print is added on top of the dyed fabric" },
          { id: "st2", label: "The plain woven fabric is dyed a base colour" },
          { id: "st1", label: "Plain, undyed fabric is woven from thread" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "A base colour goes on before a pattern can be printed over it, and both happen before the fabric is cut for stitching.",
      },
    },
    {
      title: "Process: From Sheep to Woollen Sweater",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order wool from a sheep becomes a woollen sweater.",
        scrambled_steps: [
          { id: "st5", label: "The woollen yarn is knitted into a sweater" },
          { id: "st4", label: "The cleaned wool is spun into yarn" },
          { id: "st3", label: "The sheared wool is washed to remove dirt and grease" },
          { id: "st2", label: "Wool is sheared (cut) from a sheep's coat" },
          { id: "st1", label: "A sheep grows a thick woollen coat" },
        ],
        correct_order: ["st1", "st2", "st3", "st4", "st5"],
        hint: "The wool has to exist and be removed from the sheep before it can be cleaned, and cleaned before it can be spun.",
      },
    },
  ];

  for (const challenge of clothesChallenges) {
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
