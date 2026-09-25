require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 6 currently has no Social Science content at
// all. Seeded directly into a new integrated "Social Science"
// subject with a strand tag, per this project's established
// convention (Grades 4/7/8/9/10).
//
// Source basis (Gap 5): grounded in NCERT Class 6 Civics ("Social and
// Political Life-I"), which opens with a unit on diversity and how
// communities include people of different backgrounds, languages,
// and customs — reworded into original scenarios, not textbook text.
//
// Reuses SOCIAL_SCIENCE_CIVIC_DECISION (same single-choice check as
// the Grade 4/5/9/10 versions).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 6 });
    console.log("Created new Grade 6 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Unity in Diversity, or 'Many in the One'" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme C: Our Cultural Heritage and Knowledge Traditions",
      title: "Unity in Diversity, or 'Many in the One'",
      order_index: 8,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Diversity Is Not the Same as Inequality" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Diversity Is Not the Same as Inequality",
      explanation_text:
        "A community made up of people with different languages, foods, religions, and customs is diverse — that's simply a fact about who lives there. Diversity becomes a problem only when it's used as a reason to treat some people unfairly. Respecting diversity means valuing those differences, not ignoring them or using them to exclude anyone.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const civicChallenges = [
    {
      title: "The School Lunch Menu",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Your school is planning a shared lunch, and students come from families with very different food customs. What's the fairest way to plan it?",
        options: [
          { id: "o1", label: "Only serve the food most students already eat at home" },
          { id: "o2", label: "Ask families what they can and can't eat, and include a variety of options" },
          { id: "o3", label: "Let each student bring their own food and eat separately" },
          { id: "o4", label: "Skip the shared lunch entirely to avoid the question" },
        ],
        correct_hotspot_id: "o2",
        hint: "A genuinely shared meal should work for everyone at the table, not just the majority.",
      },
    },
    {
      title: "A New Classmate's Accent",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "A new classmate speaks with an accent different from everyone else's, and a few students start mimicking it to make others laugh. What's the right response?",
        options: [
          { id: "p1", label: "Join in since it's just a joke" },
          { id: "p2", label: "Say it's not okay to mock how someone speaks, and include them normally" },
          { id: "p3", label: "Stay quiet and let it continue" },
          { id: "p4", label: "Suggest the new classmate try to hide their accent" },
        ],
        correct_hotspot_id: "p2",
        hint: "Mocking how someone naturally speaks targets something they can't simply switch off — speaking up matters here.",
      },
    },
    {
      title: "Choosing Festival Holidays",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "A neighbourhood association is deciding which festivals to publicly celebrate, but the neighbourhood includes families who celebrate several different festivals. What's the fairest approach?",
        options: [
          { id: "q1", label: "Only celebrate the festival most families in the neighbourhood already celebrate" },
          { id: "q2", label: "Recognize and make room for the different festivals families in the neighbourhood actually celebrate" },
          { id: "q3", label: "Cancel all public festival celebrations to avoid choosing" },
          { id: "q4", label: "Let whichever group complains the loudest decide" },
        ],
        correct_hotspot_id: "q2",
        hint: "A shared neighbourhood space works best when it reflects everyone who actually lives there, not just the largest group.",
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
