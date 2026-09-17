require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Measuring Angles" (Grade 6
// Mathematics, seedMathAngleSpeedChallenge.js) only has 2 GameContent
// rounds (naming angle types, and complementary/supplementary pairs),
// with no round on angles formed by intersecting lines. This adds 2
// more MATH_ANGLE_SPEED_CHALLENGE rounds to the SAME existing concept:
// angles on a straight line / around a point, and vertically opposite
// angles from two crossing lines. Same MCQ question batch payload
// shape as the original 2 rounds — no new mechanic. Errors out if the
// subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 6, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 6 Mathematics subject not found — run seedMathAngleSpeedChallenge.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Geometry" });
  if (!chapter) {
    console.error('Chapter "Geometry" not found — run seedMathAngleSpeedChallenge.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Measuring Angles" });
  if (!concept) {
    console.error('Concept "Measuring Angles" not found — run seedMathAngleSpeedChallenge.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newRounds = [
    {
      title: "Speed Round: Angles on a Straight Line and Around a Point",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 10,
        hint: "Angles on a straight line add up to 180\u00b0; angles that go all the way around a point add up to 360\u00b0.",
        questions: [
          { id: "q1", prompt: "Two angles on a straight line are 110\u00b0 and x. Find x.", options: [{ id: "a", label: "70\u00b0" }, { id: "b", label: "80\u00b0" }, { id: "c", label: "60\u00b0" }], correct_option_id: "a" },
          { id: "q2", prompt: "Three angles around a point are 90\u00b0, 120\u00b0, and x. Find x.", options: [{ id: "a", label: "150\u00b0" }, { id: "b", label: "140\u00b0" }, { id: "c", label: "160\u00b0" }], correct_option_id: "a" },
          { id: "q3", prompt: "Two angles on a straight line are 65\u00b0 and x. Find x.", options: [{ id: "a", label: "115\u00b0" }, { id: "b", label: "105\u00b0" }, { id: "c", label: "125\u00b0" }], correct_option_id: "a" },
          { id: "q4", prompt: "Four angles around a point are 90\u00b0, 90\u00b0, 90\u00b0, and x. Find x.", options: [{ id: "a", label: "90\u00b0" }, { id: "b", label: "80\u00b0" }, { id: "c", label: "100\u00b0" }], correct_option_id: "a" },
          { id: "q5", prompt: "Two angles on a straight line are 148\u00b0 and x. Find x.", options: [{ id: "a", label: "32\u00b0" }, { id: "b", label: "42\u00b0" }, { id: "c", label: "22\u00b0" }], correct_option_id: "a" },
          { id: "q6", prompt: "Three angles around a point are 100\u00b0, 140\u00b0, and x. Find x.", options: [{ id: "a", label: "120\u00b0" }, { id: "b", label: "110\u00b0" }, { id: "c", label: "130\u00b0" }], correct_option_id: "a" },
        ],
      },
    },
    {
      title: "Speed Round: Vertically Opposite Angles",
      difficulty: "hard",
      order_index: 4,
      payload: {
        time_limit_seconds: 10,
        hint: "Vertically opposite angles (formed by two crossing lines) are always equal; angles next to each other on the same straight line are supplementary (add to 180\u00b0).",
        questions: [
          { id: "q1", prompt: "Two lines cross, forming a 70\u00b0 angle on one side. Find the angle vertically opposite to it.", options: [{ id: "a", label: "70\u00b0" }, { id: "b", label: "110\u00b0" }, { id: "c", label: "20\u00b0" }], correct_option_id: "a" },
          { id: "q2", prompt: "Two lines cross, forming a 115\u00b0 angle. Find its vertically opposite angle.", options: [{ id: "a", label: "115\u00b0" }, { id: "b", label: "65\u00b0" }, { id: "c", label: "155\u00b0" }], correct_option_id: "a" },
          { id: "q3", prompt: "Two lines cross, forming angles of 40\u00b0 and x next to each other on a straight line. Find x.", options: [{ id: "a", label: "140\u00b0" }, { id: "b", label: "40\u00b0" }, { id: "c", label: "50\u00b0" }], correct_option_id: "a" },
          { id: "q4", prompt: "Two lines cross, forming a 25\u00b0 angle. Find its vertically opposite angle.", options: [{ id: "a", label: "25\u00b0" }, { id: "b", label: "155\u00b0" }, { id: "c", label: "65\u00b0" }], correct_option_id: "a" },
          { id: "q5", prompt: "Two lines cross, forming angles of 162\u00b0 and x next to each other on a straight line. Find x.", options: [{ id: "a", label: "18\u00b0" }, { id: "b", label: "162\u00b0" }, { id: "c", label: "28\u00b0" }], correct_option_id: "a" },
          { id: "q6", prompt: "Two lines cross, forming a 90\u00b0 angle. Find its vertically opposite angle.", options: [{ id: "a", label: "90\u00b0" }, { id: "b", label: "180\u00b0" }, { id: "c", label: "45\u00b0" }], correct_option_id: "a" },
        ],
      },
    },
  ];

  for (const round of newRounds) {
    const exists = await GameContent.findOne({ game_type: "MATH_ANGLE_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_ANGLE_SPEED_CHALLENGE",
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
