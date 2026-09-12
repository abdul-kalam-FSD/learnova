require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses SOCIAL_SCIENCE_CIVIC_DECISION (same
// single-choice check as the Grade 9 Gram Sabha version), scaled to
// classroom/community scenarios a Grade 4 civics syllabus actually
// covers instead of local-governance process.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /social science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 4 });
    console.log("Created new Grade 4 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Being a Good Citizen" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Living Together",
      title: "Being a Good Citizen",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Making Fair, Honest Choices" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Making Fair, Honest Choices",
      explanation_text:
        "Being a good citizen — even at school or in your neighbourhood — means choosing the fair and honest option, not just the easiest one. Good choices usually mean telling the truth, thinking of others, and following rules everyone has agreed to.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const civicChallenges = [
    {
      title: "The Lost Wallet",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "You find a wallet with money in it on the school playground. What should you do?",
        options: [
          { id: "o1", label: "Keep the money and throw away the wallet" },
          { id: "o2", label: "Hand it to your teacher so they can find the owner" },
          { id: "o3", label: "Leave it on the ground where you found it" },
          { id: "o4", label: "Ask your friends if any of them want it" },
        ],
        correct_hotspot_id: "o2",
        hint: "A trusted adult can help return it to whoever lost it — that's the honest and helpful choice.",
      },
    },
    {
      title: "Sharing Classroom Duties",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Your class needs to clean the classroom before going home. Some students want to leave without helping. What's the fair thing to do?",
        options: [
          { id: "p1", label: "Everyone helps, so the work is shared and finished quickly" },
          { id: "p2", label: "Only the class monitor should have to clean up" },
          { id: "p3", label: "Whoever finished their homework first can skip cleaning" },
          { id: "p4", label: "No one cleans, and the room stays messy" },
        ],
        correct_hotspot_id: "p1",
        hint: "Shared spaces are everyone's responsibility, not just one person's.",
      },
    },
    {
      title: "A New Student Sits Alone",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "A new student just joined your class and is sitting alone at lunch, looking nervous. What's the best thing to do?",
        options: [
          { id: "q1", label: "Ignore them since you already have your own friends" },
          { id: "q2", label: "Go sit with them and introduce yourself" },
          { id: "q3", label: "Tell other students to avoid the new student" },
          { id: "q4", label: "Wait for a teacher to solve it" },
        ],
        correct_hotspot_id: "q2",
        hint: "Being welcoming to someone new is a small action that makes a real difference to them.",
      },
    },
  ];

  for (const challenge of civicChallenges) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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
