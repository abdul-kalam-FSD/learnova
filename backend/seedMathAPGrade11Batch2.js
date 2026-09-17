require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Arithmetic Progression" (Grade 11
// Mathematics, seedMathAPGrade11.js) only has 2 GameContent rounds —
// finding the nth term, and finding the sum of n terms — with no
// "hard" round and no word-problem application. This adds 3 more
// MATH_AP_SPEED_CHALLENGE rounds to the SAME existing concept:
// solving for n (number of terms), three-consecutive-term / real-world
// nth-term word problems, and sum-based word problems. Same MCQ
// question-batch payload shape as the original 2 rounds, same
// MULTI_QUESTION_GAME_TYPES / checkMultiQuestionAttempt scoring — no
// new mechanic. Errors out if the subject/chapter/concept don't
// already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 11 Mathematics subject not found — run seedMathAPGrade11.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Sequences and Series" });
  if (!chapter) {
    console.error('Chapter "Sequences and Series" not found — run seedMathAPGrade11.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Arithmetic Progression" });
  if (!concept) {
    console.error('Concept "Arithmetic Progression" not found — run seedMathAPGrade11.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newRounds = [
    {
      title: "Speed Round: Finding the Number of Terms",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 15,
        hint: "Set a_n equal to the given term and solve for n: n = (a_n − a) / d + 1.",
        questions: [
          {
            id: "q1",
            prompt: "In the AP 3, 7, 11, ..., how many terms are needed to reach 39?",
            options: [{ id: "a", label: "10" }, { id: "b", label: "9" }, { id: "c", label: "11" }],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "In the AP 5, 8, 11, ..., which term is 50?",
            options: [{ id: "a", label: "16th" }, { id: "b", label: "15th" }, { id: "c", label: "17th" }],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "In the AP 100, 95, 90, ..., which term is the first to become negative?",
            options: [{ id: "a", label: "22nd" }, { id: "b", label: "21st" }, { id: "c", label: "20th" }],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "In the AP 2, 9, 16, ..., which term equals 100?",
            options: [{ id: "a", label: "15th" }, { id: "b", label: "14th" }, { id: "c", label: "16th" }],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "In the AP 50, 45, 40, ..., which term equals 0?",
            options: [{ id: "a", label: "11th" }, { id: "b", label: "10th" }, { id: "c", label: "12th" }],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "In the AP 4, 10, 16, ..., which term equals 100?",
            options: [{ id: "a", label: "17th" }, { id: "b", label: "16th" }, { id: "c", label: "18th" }],
            correct_option_id: "a",
          },
        ],
      },
    },
    {
      title: "Speed Round: Three-Term APs and nth-Term Word Problems",
      difficulty: "medium",
      order_index: 4,
      payload: {
        time_limit_seconds: 15,
        hint: "Three consecutive AP terms can be written as (a − d), a, (a + d) — their sum is always 3a. For word problems, identify the first term and common difference before applying a_n = a + (n − 1)d.",
        questions: [
          {
            id: "q1",
            prompt: "Three numbers in AP have a sum of 27. Find the middle number.",
            options: [{ id: "a", label: "9" }, { id: "b", label: "8" }, { id: "c", label: "10" }],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "Three numbers in AP have a sum of 36. Find the middle number.",
            options: [{ id: "a", label: "12" }, { id: "b", label: "11" }, { id: "c", label: "13" }],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "A person saves ₹10 in the first week, and increases their savings by ₹5 every following week. How much do they save in the 6th week?",
            options: [{ id: "a", label: "₹35" }, { id: "b", label: "₹30" }, { id: "c", label: "₹40" }],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "A stadium has 20 seats in the first row, and each row behind it has 3 more seats than the row before. How many seats are in the 8th row?",
            options: [{ id: "a", label: "41" }, { id: "b", label: "38" }, { id: "c", label: "44" }],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "Three numbers in AP have a sum of 21, and the smallest is 5. Find the common difference.",
            options: [{ id: "a", label: "2" }, { id: "b", label: "3" }, { id: "c", label: "1" }],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "A theatre's rows start with 15 seats and each row has 2 more seats than the previous row. How many seats does the 10th row have?",
            options: [{ id: "a", label: "33" }, { id: "b", label: "31" }, { id: "c", label: "35" }],
            correct_option_id: "a",
          },
        ],
      },
    },
    {
      title: "Speed Round: Sum-Based Word Problems",
      difficulty: "hard",
      order_index: 5,
      payload: {
        time_limit_seconds: 18,
        hint: "Total accumulated amounts (total savings, total seats, total distance) over n steps of an AP use S_n = n/2 [2a + (n − 1)d].",
        questions: [
          {
            id: "q1",
            prompt: "A person saves ₹100 in the first month, and ₹50 more each month after that. Find their TOTAL savings after 6 months.",
            options: [{ id: "a", label: "₹1,350" }, { id: "b", label: "₹1,300" }, { id: "c", label: "₹1,200" }],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "A hall has 20 seats in the first row, increasing by 4 seats each row. Find the TOTAL number of seats in the first 10 rows.",
            options: [{ id: "a", label: "380" }, { id: "b", label: "360" }, { id: "c", label: "400" }],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "A cyclist covers 5 km in the first hour and 3 km more each following hour. Find the TOTAL distance covered in 5 hours.",
            options: [{ id: "a", label: "55 km" }, { id: "b", label: "50 km" }, { id: "c", label: "60 km" }],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "Find the sum of the first 15 terms of the AP with a = 2 and d = 3.",
            options: [{ id: "a", label: "345" }, { id: "b", label: "330" }, { id: "c", label: "360" }],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "A theatre donates ₹500 in year 1 and increases its donation by ₹200 each year. Find the TOTAL donated over the first 4 years.",
            options: [{ id: "a", label: "₹3,200" }, { id: "b", label: "₹3,000" }, { id: "c", label: "₹3,400" }],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "Find the sum of the first 12 terms of the AP with a = 7 and d = -2.",
            options: [{ id: "a", label: "-48" }, { id: "b", label: "-36" }, { id: "c", label: "-60" }],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];

  for (const round of newRounds) {
    const exists = await GameContent.findOne({ game_type: "MATH_AP_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_AP_SPEED_CHALLENGE",
        concept_id: concept._id,
        title: round.title,
        difficulty: round.difficulty,
        order_index: round.order_index,
        payload: round.payload,
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
