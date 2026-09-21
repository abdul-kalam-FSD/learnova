require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 EVS — "Our Wondrous World" Chapter 4 "Our School:
// A Happy Place" (2026-27 session, Unit 2: Health and Well-being).
//
// Reuses SOCIAL_SCIENCE_CIVIC_DECISION — the same single-choice
// "pick the fairest/most responsible response to a scenario"
// mechanic already used for "Sharing What We Have Fairly" — a
// genuine fit for school-community civic scenarios (keeping the
// school clean, resolving playground conflicts, including everyone).
// No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Our School: A Happy Place" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Health and Well-being",
      title: "Our School: A Happy Place",
      order_index: 4,
      strand: "Social Science",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Being Responsible at School" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Being Responsible at School",
      explanation_text:
        "A school stays a happy place when everyone takes responsibility for it — keeping shared spaces clean, following safety rules, and making sure classmates feel included rather than left out. Small daily choices, like how you treat a new student or whether you pick up litter you see, add up to what makes a school genuinely welcoming.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const schoolChallenges = [
    {
      title: "The New Student at Lunch",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "A new student is sitting alone at lunch, not knowing anyone yet. What's the most responsible thing to do?",
        options: [
          { id: "o1", label: "Ignore them since they're not your friend yet" },
          { id: "o2", label: "Invite them to sit with your group" },
          { id: "o3", label: "Wait for a teacher to notice and help" },
          { id: "o4", label: "Talk about them with your friends instead" },
        ],
        correct_hotspot_id: "o2",
        hint: "Making someone feel included doesn't need permission from a teacher — anyone can do it.",
      },
    },
    {
      title: "Litter in the Playground",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "You notice wrappers and litter scattered across the playground, but you didn't drop them. What's the most responsible response?",
        options: [
          { id: "o1", label: "Leave it — it's not your mess to clean" },
          { id: "o2", label: "Pick up what you can and remind friends to use the bins" },
          { id: "o3", label: "Complain loudly about whoever littered" },
          { id: "o4", label: "Report only if a teacher directly asks you to" },
        ],
        correct_hotspot_id: "o2",
        hint: "A shared space stays clean when people take responsibility for it, not just the person who made the mess.",
      },
    },
    {
      title: "Two Friends Fighting Over a Turn",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Two classmates are arguing over whose turn it is on the only swing, and it's about to turn into a shouting match. What's the most responsible thing a bystander can do?",
        options: [
          { id: "o1", label: "Walk away — it's not your problem" },
          { id: "o2", label: "Take sides with whichever friend you like more" },
          { id: "o3", label: "Suggest they take turns with a timer, and offer to help keep time" },
          { id: "o4", label: "Encourage them to keep arguing until a teacher shows up" },
        ],
        correct_hotspot_id: "o3",
        hint: "A responsible bystander looks for a fair solution both sides can actually agree to, rather than staying out of it or making things worse.",
      },
    },
  ];

  for (const challenge of schoolChallenges) {
    const exists = await GameContent.findOne({ game_type: "SOCIAL_SCIENCE_CIVIC_DECISION", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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
