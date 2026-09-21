require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 7
// "The Cleanest Village" — a real-world context chapter that applies
// addition and subtraction of larger numbers to everyday situations
// like a cleanliness-drive count). Reuses
// MATH_EQUATION_WORD_PROBLEM_MATCH's generic scenario-to-answer
// mapping. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Cleanest Village" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "The Cleanest Village",
      order_index: 7,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Adding and Subtracting Larger Numbers in Real Situations" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Adding and Subtracting Larger Numbers in Real Situations",
      explanation_text:
        "Real situations often need you to combine or compare larger numbers — like adding up how many trees were planted across several streets during a cleanliness drive, or working out how many more bins one village used than another. The method is the same addition and subtraction you already know; the numbers are just bigger and the words describing the situation tell you whether to add or subtract.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: Counting the Cleanup Drive",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each cleanup-drive story to its correct total.",
        slots: [
          { id: "s1", label: "Street A collected 245 kg of waste, Street B collected 189 kg. Total collected?" },
          { id: "s2", label: "The village planted 350 saplings this year, 120 more than last year. How many last year?" },
          { id: "s3", label: "480 households joined the drive, but 95 dropped out later. How many remain?" },
        ],
        components: [
          { id: "c1", label: "434 kg" },
          { id: "c2", label: "230 saplings" },
          { id: "c3", label: "385 households" },
          { id: "c4", label: "470 saplings" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "'More than last year' means last year's number is smaller — subtract to find it.",
      },
    },
    {
      title: "Match: Comparing Two Villages",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each comparison to its correct answer.",
        slots: [
          { id: "s1", label: "Village X has 1,240 trees, Village Y has 875 trees. How many more does X have?" },
          { id: "s2", label: "Village Z collected 560 kg of waste in week 1 and 430 kg in week 2. Total?" },
          { id: "s3", label: "A drive needs 2,000 volunteers; 1,350 have signed up. How many more are needed?" },
        ],
        components: [
          { id: "c1", label: "365 more trees" },
          { id: "c2", label: "990 kg" },
          { id: "c3", label: "650 more volunteers" },
          { id: "c4", label: "2,115 trees" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "'How many more' and 'how many needed' are both subtraction — find the gap between the two numbers.",
      },
    },
    {
      title: "Match: A Month of Cleanup Totals",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each multi-step story to the correct final total.",
        slots: [
          { id: "s1", label: "Week 1: 320 kg, Week 2: 275 kg, Week 3: 410 kg collected. Total for 3 weeks?" },
          { id: "s2", label: "A village had 2,450 kg of waste; after 3 cleanup days removing 890 kg and 675 kg, how much remains?" },
          { id: "s3", label: "3 villages planted 540, 610 and 390 saplings. Total saplings planted?" },
        ],
        components: [
          { id: "c1", label: "1,005 kg" },
          { id: "c2", label: "885 kg remaining" },
          { id: "c3", label: "1,540 saplings" },
          { id: "c4", label: "1,565 kg" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Add all three amounts for a total; for a remaining amount, subtract every removed amount from the start.",
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
