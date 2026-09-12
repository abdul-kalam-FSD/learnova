require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-gap fill (genuine gap list item 3): Grade 9 Social Science
// already has a Civics chapter (seedSocialScienceGrade9.js) but no
// History strand content. Curriculum reference: NCERT's new Grade 9
// book "Understanding Society: India and Beyond, Part 1" (NCF-SE
// 2023, 2026-27 session) opens its History portion with early human
// development through the beginnings of settled civilisation — a
// broad, well-established historical sequence (tool use, farming,
// permanent settlement, early cities) rather than book-specific dates
// that would need the actual textbook to state precisely. Reuses the
// existing HISTORY_TIMELINE_BUILDER mechanic (same ordered-sequence
// check as seedHistoryGrade8.js), no new backend scoring logic
// needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 9 Social Science subject not found — run seedSocialScienceGrade9.js first.");
  }
  console.log("Using existing subject:", subject._id);

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Early Humans and the Beginning of Civilisation" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Understanding Society: India and Beyond",
      title: "Early Humans and the Beginning of Civilisation",
      order_index: 3,
      strand: "History",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "From Wandering Bands to Settled Cities" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "From Wandering Bands to Settled Cities",
      explanation_text:
        "Human societies didn't jump straight from wandering hunter-gatherer bands to organized cities — each step depended on the one before it. Learning to farm made permanent settlement possible; permanent settlement made large villages possible; only large, food-secure settlements could grow into the planned cities of early civilisations.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 8's Timeline Builder —
  // `scrambled_events` shown out of order, `correct_order` (stripped
  // before the client sees it) is the true sequence.
  const timelineChallenges = [
    {
      title: "From Hunting to Harvest",
      difficulty: "easy",
      order_index: 1,
      payload: {
        era_label: "The long shift from foraging to farming",
        scrambled_events: [
          { id: "e3", label: "People begin deliberately planting and tending crops instead of only gathering wild plants" },
          { id: "e1", label: "Early humans live in small bands, hunting animals and gathering wild plants for food" },
          { id: "e4", label: "Farming families settle permanently near their fields instead of moving with the seasons" },
          { id: "e2", label: "Some groups learn to tame and herd wild animals rather than only hunting them" },
        ],
        correct_order: ["e1", "e2", "e3", "e4"],
        hint: "People had to first depend on hunting and gathering before slowly domesticating animals and plants — permanent settlement only made sense once farming could reliably feed a group in one place.",
      },
    },
    {
      title: "The Rise of the First Cities",
      difficulty: "medium",
      order_index: 2,
      payload: {
        era_label: "From village to city",
        scrambled_events: [
          { id: "v3", label: "Some villages grow large enough to support full-time craftspeople who don't farm at all" },
          { id: "v1", label: "Small farming villages appear near rivers, with a reliable food surplus" },
          { id: "v4", label: "Planned cities emerge with organized streets, granaries, and trade with distant regions" },
          { id: "v2", label: "A village's surplus food allows its population to grow larger" },
        ],
        correct_order: ["v1", "v2", "v3", "v4"],
        hint: "A food surplus has to exist before a population can grow, and a population has to grow before it can support people who don't farm — cities are the last stage, not the first.",
      },
    },
    {
      title: "Everyday Life Before and After Farming",
      difficulty: "hard",
      order_index: 3,
      payload: {
        era_label: "How daily tools and skills changed over time",
        scrambled_events: [
          { id: "w2", label: "Polished stone tools and the first pottery appear alongside early farming" },
          { id: "w4", label: "Bronze tools and weapons appear as cities begin organized metalworking" },
          { id: "w1", label: "Early humans chip stone into simple, rough-edged hunting tools" },
          { id: "w3", label: "Woven cloth and basic loom weaving develop as settled communities produce their own fibres" },
        ],
        correct_order: ["w1", "w2", "w3", "w4"],
        hint: "Toolmaking got steadily more refined as societies settled down — rough hunting tools came first, and organized metalworking only appears once cities exist.",
      },
    },
  ];

  for (const challenge of timelineChallenges) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_TIMELINE_BUILDER",
      title: challenge.title,
    });
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
