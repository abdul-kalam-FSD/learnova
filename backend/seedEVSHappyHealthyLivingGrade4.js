require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, "Our Wondrous World",
// Unit 3 "Health and Well-being"). New chapter: "Happy and Healthy
// Living" — daily hygiene and health habits. Strand: Biology.
//
// Reuses SOCIAL_SCIENCE_PROCESS_BUILDER's "arrange these steps in
// order" mechanic — a genuine fit for daily-routine sequencing
// (e.g. handwashing steps). No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 4 });
    console.log("Created new Grade 4 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Happy and Healthy Living" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Health and Well-being",
      title: "Happy and Healthy Living",
      order_index: 5,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Daily Habits for Good Health" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Daily Habits for Good Health",
      explanation_text:
        "Staying healthy isn't one big action — it's a set of small daily habits done in the right order and at the right time: washing hands before eating, brushing teeth after meals, getting enough sleep, and being active during the day. Skipping a step, like eating before washing hands, breaks the habit's purpose even if every other step is followed correctly.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: Washing Hands the Right Way",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order you should wash your hands before eating.",
        scrambled_steps: [
          { id: "st2", label: "Rub soap over both hands, including between the fingers" },
          { id: "st4", label: "Dry your hands with a clean towel" },
          { id: "st1", label: "Wet both hands under running water" },
          { id: "st3", label: "Rinse off all the soap with running water" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "You can't rub in soap on dry hands, and you can't dry hands that still have soap and water on them.",
      },
    },
    {
      title: "Process: A Healthy Morning Routine",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in a sensible order for a healthy morning routine.",
        scrambled_steps: [
          { id: "st1", label: "Wake up and freshen up" },
          { id: "st3", label: "Eat a balanced breakfast" },
          { id: "st2", label: "Brush your teeth" },
          { id: "st4", label: "Get some outdoor play or exercise" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Teeth are brushed after freshening up but before breakfast, and outdoor play fits best once you've eaten.",
      },
    },
    {
      title: "Process: What to Do When You Feel Unwell",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order you should follow if you feel unwell at school.",
        scrambled_steps: [
          { id: "st1", label: "Notice you have a headache or feel feverish" },
          { id: "st3", label: "Rest in the school sick room until a guardian arrives" },
          { id: "st2", label: "Tell your teacher how you are feeling" },
          { id: "st4", label: "See a doctor if the guardian feels it's needed" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "An adult needs to know before any rest or next step is arranged, and seeing a doctor is a guardian's decision, not the first response.",
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
