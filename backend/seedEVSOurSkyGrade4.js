require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, "Our Wondrous World",
// Unit 5 "Our Environment"). New chapter: "Our Sky". Placed under
// the integrated Grade 4 "Science" subject (strand: Physics), since
// day/night and the sun/moon/stars are physical, not social,
// science — a judgement call documented in the Batch 1 report.
//
// Reuses SOCIAL_SCIENCE_PROCESS_BUILDER's generic "arrange in order"
// mechanic for sequencing the day/night cycle. No new mechanic
// needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 4 });
    console.log("Created new Grade 4 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Our Sky" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Environment",
      title: "Our Sky",
      order_index: 2,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Day, Night and the Changing Sky" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Day, Night and the Changing Sky",
      explanation_text:
        "The sky looks different at different times of day because the Earth is slowly spinning. As it spins, the side facing the Sun has daytime, and the side facing away has night — that's why the Sun seems to rise in the east and set in the west. At night, the Moon and stars become visible instead of the Sun. The Moon doesn't make its own light; it shines because it reflects sunlight.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: A Day in the Sky",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these moments of a single day in the order they happen.",
        scrambled_steps: [
          { id: "st2", label: "The Sun is high overhead at midday" },
          { id: "st4", label: "The sky turns dark and stars appear" },
          { id: "st1", label: "The Sun rises in the east at sunrise" },
          { id: "st3", label: "The Sun sinks low and sets in the west" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The Sun is always highest in the middle of the day, between rising and setting.",
      },
    },
    {
      title: "Process: Why We Have Day and Night",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these statements in the order that explains why day turns into night.",
        scrambled_steps: [
          { id: "st1", label: "The Earth keeps spinning slowly on its axis, all day and night" },
          { id: "st3", label: "As the Earth keeps spinning, that same side turns away from the Sun" },
          { id: "st4", label: "With no direct sunlight reaching it, that side experiences night" },
          { id: "st2", label: "The side of the Earth facing the Sun experiences daytime" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Night isn't the Sun disappearing — it's your side of the spinning Earth turning away from it.",
      },
    },
    {
      title: "Process: Watching the Moon Change",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these ideas in the order that explains why we can see the Moon at night.",
        scrambled_steps: [
          { id: "st1", label: "The Sun always shines on one half of the Moon" },
          { id: "st3", label: "That reflected light travels through space to Earth" },
          { id: "st2", label: "The Moon's surface reflects some of that sunlight, rather than making its own light" },
          { id: "st4", label: "We see the Moon glowing in the night sky because of this reflected sunlight" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The Moon has no light of its own — every step here is about sunlight bouncing off it and reaching us.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({ game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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
