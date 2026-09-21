require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 13
// "The Transport Museum" — connecting numbers to real-life
// situations like fares, seats and coins, comparing old and new
// modes of transport). Reuses MATH_EQUATION_WORD_PROBLEM_MATCH. No
// new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Transport Museum" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "The Transport Museum",
      order_index: 13,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Numbers Applied to Fares, Seats and Coins" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Numbers Applied to Fares, Seats and Coins",
      explanation_text:
        "Everyday transport situations are full of maths: working out a bus fare for a family, counting how many seats are still free, or making up an exact amount using different coins. These problems usually combine multiplication (fare per person times number of people) with addition or subtraction (seats used versus seats available).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const matchChallenges = [
    {
      title: "Match: Working Out the Bus Fare",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "A bus ticket costs ₹15 per person. Match each group to its total fare.",
        slots: [
          { id: "s1", label: "A family of 4 people" },
          { id: "s2", label: "A group of 6 friends" },
          { id: "s3", label: "A single traveller" },
        ],
        components: [
          { id: "c1", label: "₹60" },
          { id: "c2", label: "₹90" },
          { id: "c3", label: "₹15" },
          { id: "c4", label: "₹75" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Multiply the fare per person by the number of people travelling.",
      },
    },
    {
      title: "Match: Counting Free Seats",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "A train coach has 72 seats. Match each situation to the correct number of free seats.",
        slots: [
          { id: "s1", label: "45 seats are already booked" },
          { id: "s2", label: "58 seats are already booked" },
          { id: "s3", label: "All but 9 seats are booked" },
        ],
        components: [
          { id: "c1", label: "27 free seats" },
          { id: "c2", label: "14 free seats" },
          { id: "c3", label: "9 free seats" },
          { id: "c4", label: "63 free seats" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Subtract the number of booked seats from the total number of seats.",
      },
    },
    {
      title: "Match: Making Up a Fare in Coins",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "A ticket costs ₹47. Match each set of coins/notes to whether it makes exactly ₹47.",
        slots: [
          { id: "s1", label: "One ₹20 note, one ₹20 note, one ₹5 coin, one ₹2 coin" },
          { id: "s2", label: "Two ₹10 notes, two ₹5 coins, one ₹2 coin, one ₹1 coin" },
          { id: "s3", label: "One ₹10 note, one ₹10 note, one ₹10 note, one ₹10 note, one ₹5 coin" },
        ],
        components: [
          { id: "c1", label: "Total = ₹47 — makes the fare exactly" },
          { id: "c2", label: "Total = ₹33 — not enough for the fare" },
          { id: "c3", label: "Total = ₹45 — not enough for the fare" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Add up every note and coin in each set before comparing it to ₹47.",
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
