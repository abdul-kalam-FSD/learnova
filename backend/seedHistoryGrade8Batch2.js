require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Milestones on the Road to
// Independence" (Grade 8 Social Science / History strand,
// seedHistoryGrade8.js) only has 2 GameContent items, both covering
// 1857-1947 at a high level. This adds 2 more
// HISTORY_TIMELINE_BUILDER challenges to the SAME existing concept:
// the earlier reform-and-resistance period (1828-1858) the original 2
// challenges don't cover, and the constitutional/legislative track
// running alongside the mass movements. Same scrambled_events/
// correct_order payload shape — no new mechanic. Errors out if the
// subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: "Social Science" });
  if (!subject) {
    console.error("Grade 8 Social Science subject not found — run seedHistoryGrade8.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "India's Freedom Struggle" });
  if (!chapter) {
    console.error('Chapter "India\'s Freedom Struggle" not found — run seedHistoryGrade8.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Milestones on the Road to Independence" });
  if (!concept) {
    console.error('Concept "Milestones on the Road to Independence" not found — run seedHistoryGrade8.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Early Reform and the First War of Independence",
      difficulty: "easy",
      order_index: 3,
      payload: {
        era_label: "1828 \u2013 1858",
        scrambled_events: [
          { id: "m3", label: "Sepoys at Meerut revolt, sparking the Revolt of 1857 across northern India" },
          { id: "m1", label: "Raja Ram Mohan Roy founds the Brahmo Samaj, campaigning for social reform (1828)" },
          { id: "m4", label: "The British Crown takes direct control of India from the East India Company (1858)" },
          { id: "m2", label: "The British East India Company annexes Indian states under the Doctrine of Lapse (1848\u20131856)" },
        ],
        correct_order: ["m1", "m2", "m3", "m4"],
        hint: "Social reform and annexation built resentment for years before the actual outbreak of revolt in 1857 \u2014 and the Crown's takeover came only after the revolt was suppressed.",
      },
    },
    {
      title: "Constitutional Reforms on the Path to Independence",
      difficulty: "medium",
      order_index: 4,
      payload: {
        era_label: "1909 \u2013 1947",
        scrambled_events: [
          { id: "k3", label: "The Cripps Mission and later the Cabinet Mission attempt to negotiate a transfer of power (1942\u20131946)" },
          { id: "k1", label: "The Morley-Minto Reforms introduce separate electorates (1909)" },
          { id: "k4", label: "The Indian Independence Act is passed, ending British rule (1947)" },
          { id: "k2", label: "The Government of India Act expands provincial self-government (1935)" },
        ],
        correct_order: ["k1", "k2", "k3", "k4"],
        hint: "Constitutional reforms expanded gradually over decades before the final negotiations and legislation that actually ended British rule.",
      },
    },
  ];

  for (const challenge of newChallenges) {
    const exists = await GameContent.findOne({ game_type: "HISTORY_TIMELINE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_TIMELINE_BUILDER",
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
