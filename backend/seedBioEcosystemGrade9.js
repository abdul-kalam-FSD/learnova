require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes another cell of the Biology 9-12 content gap found during
// the full-project audit: BIO_ECOSYSTEM_BALANCE previously existed
// only at Grades 10 and 12. Links to the existing "Biogeochemical
// Cycles" concept created by seedGrade9_batch2.js — run that first.
// Same cause-effect ordering shape and scoring path (unordered-chain
// check on attempt.orderedPieceIds vs payload.correct_order — see
// gameControllers.js checkAttempt) as the Grade 10/12 scripts, but
// built around nutrient-cycle disruption instead of a food web,
// matching what this concept actually teaches.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 9 Science/Biology subject not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Natural Resources" });
  if (!chapter) {
    console.error("Chapter 'Natural Resources' not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Biogeochemical Cycles" });
  if (!concept) {
    console.error(
      "Concept 'Biogeochemical Cycles' not found — run seedGrade9_batch2.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const ecosystemChallenges = [
    {
      title: "Deforestation Disrupts the Water Cycle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        trigger: "A large area of forest is cleared for farmland.",
        scrambled_effects: [
          { id: "d1", label: "Less water vapor is released into the air (less transpiration)" },
          { id: "d2", label: "Local rainfall decreases over time" },
          { id: "d3", label: "Soil dries out and erodes more easily without root systems" },
          { id: "d4", label: "Trees are cut down and removed" },
        ],
        correct_order: ["d4", "d1", "d2", "d3"],
        explanation:
          "Removing trees first cuts off transpiration (water vapor release from leaves), which reduces the moisture available to form local rain clouds, so rainfall drops — and without roots holding it together, the drier soil erodes faster.",
        hint: "Start with the direct human action, then trace what trees normally contribute to the water cycle.",
      },
    },
    {
      title: "Overuse of Nitrogen Fertilizer",
      difficulty: "medium",
      order_index: 2,
      payload: {
        trigger: "A farm applies far more nitrogen fertilizer than crops can absorb.",
        scrambled_effects: [
          { id: "d1", label: "Excess nitrogen runs off into a nearby river after rain" },
          { id: "d2", label: "Algae in the river grow rapidly (algal bloom)" },
          { id: "d3", label: "Farm applies excess nitrogen fertilizer to the soil" },
          { id: "d4", label: "Decomposing algae consume oxygen, and fish die from lack of oxygen" },
        ],
        correct_order: ["d3", "d1", "d2", "d4"],
        explanation:
          "Unused fertilizer doesn't stay in the soil — it washes into waterways, where the extra nitrogen fuels explosive algae growth. When that algae dies and decomposes, the decomposition process uses up dissolved oxygen, suffocating fish and other aquatic life. This chain (eutrophication) is a real consequence of disrupting the natural nitrogen cycle.",
        hint: "Trace the nitrogen's journey: soil, then water, then what that extra nitrogen feeds, then what happens when that dies.",
      },
    },
    {
      title: "Burning Fossil Fuels and the Carbon Cycle",
      difficulty: "hard",
      order_index: 3,
      payload: {
        trigger: "A region sharply increases its burning of coal and oil for energy.",
        scrambled_effects: [
          { id: "d1", label: "Large amounts of carbon dioxide are released into the atmosphere" },
          { id: "d2", label: "Coal and oil (long-buried carbon) are burned for energy" },
          { id: "d3", label: "Atmospheric CO2 concentration rises faster than plants can absorb it" },
          { id: "d4", label: "The greenhouse effect intensifies, trapping more heat" },
        ],
        correct_order: ["d2", "d1", "d3", "d4"],
        explanation:
          "Fossil fuels store carbon that was removed from the atmosphere over millions of years; burning them releases that carbon back as CO2 far faster than the carbon cycle's natural sinks (plants, oceans) can reabsorb it, so atmospheric CO2 builds up and traps more heat — an example of a natural cycle being disrupted faster than it can self-balance.",
        hint: "The carbon has to leave the ground before it can enter the air — then think about what a rising gas concentration does to heat trapping.",
      },
    },
  ];

  for (const level of ecosystemChallenges) {
    const exists = await GameContent.findOne({ game_type: "BIO_ECOSYSTEM_BALANCE", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_ECOSYSTEM_BALANCE",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
