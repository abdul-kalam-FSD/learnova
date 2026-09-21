require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 14
// "Data Handling" — collecting, organising and reading data using
// tables and pictographs, e.g. a class survey of favourite
// subjects). Reuses MATH_EQUATION_WORD_PROBLEM_MATCH's generic
// scenario-to-answer mapping to present a small data table/
// pictograph and ask questions about it. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /mathematics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 4 });
    console.log("Created new Grade 4 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Data Handling" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Data Handling",
      order_index: 14,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Collecting and Reading Simple Data" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Collecting and Reading Simple Data",
      explanation_text:
        "Data handling means asking a clear question, collecting answers from a group of people, and organising them into a table or a pictograph so the information is easy to read at a glance. Once organised, you can quickly answer questions like which choice was the most popular or how many more people chose one option over another, without recounting every single answer.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: Reading a Favourite-Subject Survey",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "A class survey of favourite subjects recorded: Mathematics 12, Languages 9, Arts 6, The World Around Us 8, Physical Education 10. Match each question to its answer.",
        slots: [
          { id: "s1", label: "Which subject got the most votes?" },
          { id: "s2", label: "Which subject got the fewest votes?" },
          { id: "s3", label: "How many students were surveyed in total?" },
        ],
        components: [
          { id: "c1", label: "Mathematics" },
          { id: "c2", label: "Arts" },
          { id: "c3", label: "45 students" },
          { id: "c4", label: "Languages" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "For the total, add up every subject's votes together.",
      },
    },
    {
      title: "Match: Comparing Data Across Days",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "A stall recorded fruit chaat sales over 3 days: Day 1 = 8, Day 2 = 12, Day 3 = 8. Match each question to its answer.",
        slots: [
          { id: "s1", label: "Total fruit chaats sold over the 3 days?" },
          { id: "s2", label: "On which day were the most sold?" },
          { id: "s3", label: "How many more were sold on Day 2 than Day 1?" },
        ],
        components: [
          { id: "c1", label: "28" },
          { id: "c2", label: "Day 2" },
          { id: "c3", label: "4" },
          { id: "c4", label: "Day 1" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Compare the numbers for each day directly to see which is highest, then subtract for the difference.",
      },
    },
    {
      title: "Match: Reading a Pictograph",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "In a pictograph, each picture of an apple stands for 5 fruits sold. Monday shows 4 apple pictures, Tuesday shows 3, Wednesday shows 6. Match each question to its answer.",
        slots: [
          { id: "s1", label: "How many fruits were sold on Monday?" },
          { id: "s2", label: "How many fruits were sold on Wednesday?" },
          { id: "s3", label: "How many more fruits were sold on Wednesday than Tuesday?" },
        ],
        components: [
          { id: "c1", label: "20 fruits" },
          { id: "c2", label: "30 fruits" },
          { id: "c3", label: "15 fruits" },
          { id: "c4", label: "10 fruits" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Multiply the number of pictures by what each picture represents before comparing days.",
      },
    },
  ];

  for (const challenge of matchChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
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
