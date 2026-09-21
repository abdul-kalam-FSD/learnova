require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 10
// "Elephants, Tigers, and Leopards" — addition/subtraction of
// larger (4-digit) numbers, using real wildlife-count style
// examples such as comparing state elephant populations, plus
// number-pattern work from the chapter's addition chart). Reuses
// MATH_EQUATION_WORD_PROBLEM_MATCH. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Elephants, Tigers, and Leopards" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Elephants, Tigers, and Leopards",
      order_index: 10,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Adding and Comparing 4-Digit Wildlife Counts" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Adding and Comparing 4-Digit Wildlife Counts",
      explanation_text:
        "Wildlife counts from real surveys are often 4-digit numbers, and comparing or combining them uses the same addition and subtraction you already know, just with bigger numbers. For example, if one state's elephant survey counted 6,049 elephants and a neighbouring state counted 3,054, finding the total or the difference between the two counts tells you how the wildlife populations compare.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: Comparing State Elephant Counts",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "A wildlife survey counted 6,049 elephants in one state and 3,054 in a neighbouring state. Match each question to its answer.",
        slots: [
          { id: "s1", label: "Total elephants counted in both states?" },
          { id: "s2", label: "How many more elephants in the first state?" },
          { id: "s3", label: "If 1,000 more were counted later in the second state, its new total?" },
        ],
        components: [
          { id: "c1", label: "9,103" },
          { id: "c2", label: "2,995" },
          { id: "c3", label: "4,054" },
          { id: "c4", label: "9,049" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "'Total' means add both counts; 'how many more' means subtract the smaller from the larger.",
      },
    },
    {
      title: "Match: Tiger Reserve Counts",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Three tiger reserves reported counts of 1,245, 987 and 1,560 tigers. Match each question to its answer.",
        slots: [
          { id: "s1", label: "Total tigers across all three reserves?" },
          { id: "s2", label: "Difference between the highest and lowest counts?" },
          { id: "s3", label: "Total of just the two smaller counts?" },
        ],
        components: [
          { id: "c1", label: "3,792" },
          { id: "c2", label: "573" },
          { id: "c3", label: "2,232" },
          { id: "c4", label: "2,805" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Line up the numbers by place value before adding or subtracting, carrying or borrowing as needed.",
      },
    },
    {
      title: "Match: Leopard Sightings Over Two Years",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "A forest recorded 2,318 leopard sightings in one year and 2,875 the next year. Match each question to its answer.",
        slots: [
          { id: "s1", label: "By how much did sightings increase?" },
          { id: "s2", label: "Total sightings across both years?" },
          { id: "s3", label: "If sightings drop by 500 next year, what would the count be?" },
        ],
        components: [
          { id: "c1", label: "557" },
          { id: "c2", label: "5,193" },
          { id: "c3", label: "2,375" },
          { id: "c4", label: "3,375" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The drop applies to the most recent year's count, not the total of both years.",
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
