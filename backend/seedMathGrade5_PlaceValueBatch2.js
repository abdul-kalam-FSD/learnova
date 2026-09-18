require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 6 (Grade 4-5 curriculum depth audit). "Understanding Place
// Value" (Grade 5 Mathematics, seedMathGrade5_PlaceValue.js) opens
// with a 4-digit-number round whose component options are Ones,
// Tens, Hundreds, and Thousands — but all 3 of that round's slots
// only ever highlight the Ones/Tens/Hundreds positions. "Thousands"
// (the newest, leftmost place when a number grows from 3 digits to
// 4) is offered as an option but never once the correct answer, so a
// student could finish the introductory round without ever
// identifying it — the exact position this round should be
// establishing first. This adds 1 more MATH_PLACE_VALUE_MATCH round
// to the SAME existing concept, completing coverage of all 4
// positions in a 4-digit number before the concept moves on to
// 5-digit and 6-digit numbers. Same slots/components/correct_mapping
// payload shape as the original 3 rounds — no new mechanic. Errors
// out if the subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 5 Mathematics subject not found — run seedMathGrade5_PlaceValue.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Large Numbers and Place Value" });
  if (!chapter) {
    console.error('Chapter "Large Numbers and Place Value" not found — run seedMathGrade5_PlaceValue.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Understanding Place Value" });
  if (!concept) {
    console.error('Concept "Understanding Place Value" not found — run seedMathGrade5_PlaceValue.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Match: Place Value in 4-Digit Numbers — The Thousands Place",
      difficulty: "easy",
      order_index: 4,
      payload: {
        scenario: "Match the highlighted digit in each number to its place value.",
        slots: [
          { id: "s1", number: "4739", highlightIndex: 0, label: "Highlighted: 4" },
          { id: "s2", number: "8256", highlightIndex: 0, label: "Highlighted: 8" },
          { id: "s3", number: "3164", highlightIndex: 0, label: "Highlighted: 3" },
        ],
        components: [
          { id: "c1", label: "Ones" },
          { id: "c2", label: "Tens" },
          { id: "c3", label: "Hundreds" },
          { id: "c4", label: "Thousands" },
        ],
        correct_mapping: { s1: "c4", s2: "c4", s3: "c4" },
        hint: "In a 4-digit number, the leftmost digit is always the Thousands place — it's the digit that appeared when the number grew from 3 digits to 4.",
      },
    },
  ];

  for (const challenge of newChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_PLACE_VALUE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_PLACE_VALUE_MATCH",
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
