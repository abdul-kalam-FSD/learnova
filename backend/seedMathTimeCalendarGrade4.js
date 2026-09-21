require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 12
// "Ticking Clocks and Turning Calendar" — reading 12-hour and
// 24-hour clocks, and reading calendars). Reuses
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Ticking Clocks and Turning Calendar" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Ticking Clocks and Turning Calendar",
      order_index: 12,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading Time (12-hour and 24-hour) and the Calendar" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading Time (12-hour and 24-hour) and the Calendar",
      explanation_text:
        "A day has 24 hours. The 12-hour clock counts 1 to 12 twice, using a.m. for before noon and p.m. for after noon, while the 24-hour clock counts straight from 00:00 to 23:59 without repeating. So 3:00 p.m. on a 12-hour clock is 15:00 on a 24-hour clock — add 12 to any p.m. hour (except 12 p.m. itself) to convert. A calendar organises days into weeks and months, which helps you count how many days lie between two dates.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: 12-Hour to 24-Hour Time",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each 12-hour clock time to its correct 24-hour equivalent.",
        slots: [
          { id: "s1", label: "9:00 a.m." },
          { id: "s2", label: "3:00 p.m." },
          { id: "s3", label: "11:30 p.m." },
        ],
        components: [
          { id: "c1", label: "09:00" },
          { id: "c2", label: "15:00" },
          { id: "c3", label: "23:30" },
          { id: "c4", label: "21:00" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "For any p.m. time (except 12 p.m.), add 12 to the hour to get the 24-hour version.",
      },
    },
    {
      title: "Match: Counting Days on a Calendar",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each calendar question to its correct answer.",
        slots: [
          { id: "s1", label: "How many days are there from 5th March to 12th March?" },
          { id: "s2", label: "If today is Monday, what day is it in 3 days?" },
          { id: "s3", label: "How many weeks are in 21 days?" },
        ],
        components: [
          { id: "c1", label: "7 days" },
          { id: "c2", label: "Thursday" },
          { id: "c3", label: "3 weeks" },
          { id: "c4", label: "Wednesday" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Counting from the 5th to the 12th, don't forget both the start and end date span 7 days apart.",
      },
    },
    {
      title: "Match: Duration Between Two Times",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each situation to how much time has passed.",
        slots: [
          { id: "s1", label: "A train departs at 14:20 and arrives at 17:05. Journey duration?" },
          { id: "s2", label: "A movie starts at 6:45 p.m. and ends at 9:10 p.m. Movie duration?" },
          { id: "s3", label: "School starts at 08:00 and ends at 14:30. School duration?" },
        ],
        components: [
          { id: "c1", label: "2 hours 45 minutes" },
          { id: "c2", label: "2 hours 25 minutes" },
          { id: "c3", label: "6 hours 30 minutes" },
          { id: "c4", label: "6 hours" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Find the difference in hours first, then adjust for the extra minutes.",
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
