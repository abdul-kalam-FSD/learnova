require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Mechanic-diversity pass for Grade 8 History: reuses the existing
// "The Mughal Empire" chapter from seedHistoryMughalTimelineGrade8.js (filename is
// historical — the file actually seeds Grade 8, see its own header
// comment; currently HISTORY_TIMELINE_BUILDER only), adds a new
// Concept + HISTORY_CAUSE_EFFECT_MATCH. Distinct from the existing
// "Causes and Consequences of Colonial Rule" chapter's Cause-Effect
// content (seedHistoryCauseEffectGrade8.js) — this one is Mughal
// administration, not colonial-era events.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 8 Social Science subject not found — run seedHistoryMughalTimelineGrade8.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Mughal Empire" });
  if (!chapter) {
    throw new Error("Chapter 'The Mughal Empire' not found — run seedHistoryMughalTimelineGrade8.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Mughal Policies to Their Effects" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Mughal Policies to Their Effects",
      explanation_text:
        "Knowing the sequence of Mughal emperors isn't the same as understanding why the empire rose and later declined. Akbar's alliances, the mansabdari system, and Aurangzeb's later policies each led to specific, real consequences.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const causeEffectChallenges = [
    {
      title: "Akbar's Policy of Alliance and Tolerance → Effect",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each of Akbar's policies to the effect it actually had.",
        slots: [
          { id: "s1", label: "Akbar formed marriage alliances with several Rajput kingdoms" },
          { id: "s2", label: "Akbar abolished the jizya tax on non-Muslims" },
          { id: "s3", label: "Akbar included Hindus and other groups in high administrative posts" },
        ],
        components: [
          { id: "c1", label: "Won the loyalty of powerful Rajput rulers and reduced border conflict" },
          { id: "c2", label: "Reduced resentment among non-Muslim subjects and encouraged their support" },
          { id: "c3", label: "Created a broader base of skilled and loyal officials to run the empire" },
          { id: "c4", label: "Caused most Rajput kingdoms to immediately revolt against Akbar" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Akbar's policies were consistently aimed at building loyalty and reducing conflict, not the opposite.",
      },
    },
    {
      title: "The Mansabdari System → Effect",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each feature of the mansabdari system to the effect it actually had.",
        slots: [
          { id: "s1", label: "Every noble was assigned a mansab (rank) fixing his status and the troops he had to maintain" },
          { id: "s2", label: "Mansabdars were paid mainly through revenue assignments (jagirs) rather than a fixed salary" },
          { id: "s3", label: "The emperor could raise, lower or transfer a mansabdar's rank at will" },
        ],
        components: [
          { id: "c1", label: "Created a standardized, ranked administrative and military structure" },
          { id: "c2", label: "Linked a noble's income directly to how well the assigned land was managed" },
          { id: "c3", label: "Kept individual nobles from becoming too powerful or too independent" },
          { id: "c4", label: "Made every mansabdar's rank permanent, impossible for the emperor to change" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The system gave nobles rank and income, but always kept ultimate control in the emperor's hands.",
      },
    },
    {
      title: "Aurangzeb's Policies and Mughal Decline → Effect",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each of Aurangzeb's policies to the effect it actually had on the empire.",
        slots: [
          { id: "s1", label: "Aurangzeb reimposed the jizya tax and pursued a less tolerant religious policy" },
          { id: "s2", label: "Aurangzeb fought long, costly military campaigns in the Deccan for decades" },
          { id: "s3", label: "Aurangzeb's successors faced weak central control and powerful regional governors" },
        ],
        components: [
          { id: "c1", label: "Alienated many non-Muslim subjects and allies who had earlier supported the empire" },
          { id: "c2", label: "Drained the treasury and weakened the Mughal army over time" },
          { id: "c3", label: "Allowed regional kingdoms and governors to break away and rule independently" },
          { id: "c4", label: "Strengthened Mughal unity and made the empire more stable than ever" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Historians generally see Aurangzeb's long reign as where the empire's strength began wearing down, not building up.",
      },
    },
  ];

  for (const challenge of causeEffectChallenges) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_CAUSE_EFFECT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_CAUSE_EFFECT_MATCH",
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
