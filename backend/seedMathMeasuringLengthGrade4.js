require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 6
// "Measuring Length"). Reuses MATH_EQUATION_WORD_PROBLEM_MATCH's
// generic scenario-to-answer mapping mechanic — matching a
// real-life length scenario to the correct measurement/unit. No new
// mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Measuring Length" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Measuring Length",
      order_index: 6,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Choosing the Right Unit of Length" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Choosing the Right Unit of Length",
      explanation_text:
        "Length is measured in different units depending on how big or small the thing is. Centimetres (cm) suit small objects like a pencil or a book, metres (m) suit medium distances like a room or a garden, and kilometres (km) suit long distances like the trip between two towns. 100 centimetres make 1 metre, and 1000 metres make 1 kilometre.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: Object to the Right Unit",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each object to the unit best suited for measuring its length.",
        slots: [
          { id: "s1", label: "The length of a pencil" },
          { id: "s2", label: "The length of a classroom" },
          { id: "s3", label: "The distance between two cities" },
        ],
        components: [
          { id: "c1", label: "Centimetres (cm)" },
          { id: "c2", label: "Metres (m)" },
          { id: "c3", label: "Kilometres (km)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Pick the unit that avoids using either a huge number or a tiny fraction to describe the length.",
      },
    },
    {
      title: "Match: Converting Between Units",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each length to its equal value in a different unit.",
        slots: [
          { id: "s1", label: "200 centimetres" },
          { id: "s2", label: "3 metres" },
          { id: "s3", label: "500 centimetres" },
        ],
        components: [
          { id: "c1", label: "2 metres" },
          { id: "c2", label: "300 centimetres" },
          { id: "c3", label: "5 metres" },
          { id: "c4", label: "50 metres" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Remember: 100 centimetres always equal 1 metre.",
      },
    },
    {
      title: "Match: Real-Life Length Problems",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each situation to the correct total length.",
        slots: [
          { id: "s1", label: "Two ribbons, each 45cm long, laid end to end" },
          { id: "s2", label: "A rope 2m long, cut down by 60cm" },
          { id: "s3", label: "Walking 3km and then another 2km" },
        ],
        components: [
          { id: "c1", label: "90cm in total" },
          { id: "c2", label: "1m 40cm remaining" },
          { id: "c3", label: "5km in total" },
          { id: "c4", label: "60cm remaining" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Convert everything to the same unit first before adding or subtracting.",
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
