require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 15 "Data Through
// Pictures" (2026-27 session, last chapter). Confirmed via a current
// CBSE school's 2026-27 academic calendar (paired with "Pictograph
// and Bar graph"; bar-graph-making activity). Direct Grade 5
// continuation of Grade 4's Data Handling chapter, which used
// MATH_EQUATION_WORD_PROBLEM_MATCH — reused here for reading
// pictographs/bar graphs and answering questions about the data they
// show. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 5 });
    console.log("Created new Grade 5 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Data Through Pictures" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Data Handling",
      title: "Data Through Pictures",
      order_index: 15,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Reading Pictographs and Bar Graphs",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading Pictographs and Bar Graphs",
      explanation_text:
        "A pictograph uses a repeated picture (like a fruit icon) to stand for a fixed number of items, shown with a key such as '1 picture = 5 students'. A bar graph uses the height or length of a bar instead of pictures. Both let you compare groups at a glance — reading them means checking the key or scale first, then counting pictures or reading bar heights to answer questions like 'which is the most' or 'how many more'.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const dataChallenges = [
    {
      title: "Match: Reading a Pictograph",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "A pictograph shows favourite fruits, where each apple picture = 5 votes. Apples: 3 pictures, Mangoes: 5 pictures, Bananas: 2 pictures. Match each fruit to its total votes.",
        slots: [
          { id: "s1", label: "Apples (3 pictures)" },
          { id: "s2", label: "Mangoes (5 pictures)" },
          { id: "s3", label: "Bananas (2 pictures)" },
        ],
        components: [
          { id: "c1", label: "15 votes" },
          { id: "c2", label: "25 votes" },
          { id: "c3", label: "10 votes" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Multiply the number of pictures by what one picture stands for, according to the key.",
      },
    },
    {
      title: "Match: Comparing Bar Graph Heights",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "A bar graph shows books read by 4 students in a month: Asha 12, Bilal 8, Chitra 15, Dev 8. Match each question to its correct answer.",
        slots: [
          { id: "s1", label: "Who read the most books?" },
          { id: "s2", label: "How many more books did Chitra read than Bilal?" },
          { id: "s3", label: "Which two students read the same number of books?" },
        ],
        components: [
          { id: "c1", label: "Chitra" },
          { id: "c2", label: "7 more books" },
          { id: "c3", label: "Bilal and Dev" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The tallest bar is the most; two equal-height bars belong to students with the same count.",
      },
    },
    {
      title: "Match: Total and Average from a Data Set",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "A pictograph shows umbrellas sold over 4 days, where each umbrella picture = 4 units: Monday 3 pictures, Tuesday 5 pictures, Wednesday 2 pictures, Thursday 6 pictures. Match each question to its correct answer.",
        slots: [
          { id: "s1", label: "Total umbrellas sold over the 4 days?" },
          { id: "s2", label: "How many more were sold on Thursday than Wednesday?" },
          { id: "s3", label: "What was the average number sold per day?" },
        ],
        components: [
          { id: "c1", label: "64 umbrellas" },
          { id: "c2", label: "16 more" },
          { id: "c3", label: "16 per day" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert every day's pictures to actual units first (pictures × 4), then add, subtract, or divide as needed.",
      },
    },
  ];

  for (const challenge of dataChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
      title: challenge.title,
    });
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
