require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 English — Decision A-1 (APPROVED): skill-based
// chapter inspired by Santoor Unit 1 "Let's Have Fun" (Chapters 1-2,
// "Papa's Spectacles" and "Gone with the Scooter" — both humorous
// everyday-mishap stories), rather than reproducing the stories
// themselves. The transferable skill this unit targets is describing
// an everyday mishap or exaggeration clearly and vividly, using
// "so...that" cause-and-effect sentence construction — a genuine
// grammar skill, not a comprehension quiz about the specific stories.
//
// Reuses ENGLISH_SENTENCE_BUILDER exactly as the existing
// "Prefixes and Suffixes" chapter's second concept does. No new
// mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 5 });
    console.log("Created new Grade 5 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Describing Everyday Mishaps" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Descriptive Language",
      title: "Describing Everyday Mishaps",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building 'So...That' Cause-and-Effect Sentences" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building 'So...That' Cause-and-Effect Sentences",
      explanation_text:
        "Funny everyday stories often describe something happening 'so' much that it causes a surprising result — like being 'so sleepy that he put his shoes on the wrong feet.' This 'so...that' pattern links a cause (how much/how strongly something happened) to its effect (what happened as a result), and makes ordinary descriptions much more vivid and specific.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape matches the existing ENGLISH_SENTENCE_BUILDER
  // convention exactly (word_bank + correct_order), verified against
  // seedEnglishSentenceGrade5.js.
  const sentenceChallenges = [
    {
      title: "Build: So Sleepy That He Forgot His Bag",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence about a very sleepy morning mishap.",
        scrambled_words: [
          { id: "w1", label: "He" },
          { id: "w2", label: "was" },
          { id: "w3", label: "so" },
          { id: "w4", label: "sleepy" },
          { id: "w5", label: "that" },
          { id: "w6", label: "he" },
          { id: "w7", label: "forgot" },
          { id: "w8", label: "his" },
          { id: "w9", label: "school" },
          { id: "w10", label: "bag." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10"],
        hint: "First say how sleepy he was, then use 'that' to introduce what happened because of it.",
      },
    },
    {
      title: "Build: So Loud That the Whole Class Turned",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence about a surprisingly loud mishap.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "sneeze" },
          { id: "w3", label: "was" },
          { id: "w4", label: "so" },
          { id: "w5", label: "loud" },
          { id: "w6", label: "that" },
          { id: "w7", label: "the" },
          { id: "w8", label: "whole" },
          { id: "w9", label: "class" },
          { id: "w10", label: "turned" },
          { id: "w11", label: "around." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "Describe the sneeze's loudness first, then explain the surprising reaction it caused.",
      },
    },
    {
      title: "Build: So Wobbly That the Scooter Tipped Over",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence about a wobbly scooter mishap.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "scooter" },
          { id: "w3", label: "was" },
          { id: "w4", label: "riding" },
          { id: "w5", label: "so" },
          { id: "w6", label: "wobbly" },
          { id: "w7", label: "that" },
          { id: "w8", label: "it" },
          { id: "w9", label: "tipped" },
          { id: "w10", label: "over" },
          { id: "w11", label: "near" },
          { id: "w12", label: "the" },
          { id: "w13", label: "gate." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12", "w13"],
        hint: "Keep the subject and verb together first ('The scooter was riding'), then attach the 'so...that' description after it.",
      },
    },
  ];

  for (const challenge of sentenceChallenges) {
    const exists = await GameContent.findOne({ game_type: "ENGLISH_SENTENCE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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
