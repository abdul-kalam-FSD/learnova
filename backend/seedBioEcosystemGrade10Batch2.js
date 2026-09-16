require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 10 Biology expansion (Section 7 of the approved expansion
// strategy): closes the "Environment" and "Natural Resources" gaps.
// Existing BIO_ECOSYSTEM_BALANCE (seedBioEcosystemBalance.js) already
// covers "Food Chains and Food Webs" in the "Our Environment" chapter
// — this file adds its sibling concept "Environmental Issues" (same
// chapter), plus "Conservation of Resources" in the "Management of
// Natural Resources" chapter.
//
// NOTE ON GROUPING: the approved brief also lists "Sustainable
// Management" and "The 3 R's — Reduce, Reuse, Recycle" under the same
// "Management of Natural Resources" chapter. Per the brief's design
// standard ("group closely related concepts where appropriate" /
// "do not create separate games for every descriptive concept"),
// this file does not create a fourth and fifth dedicated GameContent
// set for those two — they are closely related to, and thematically
// folded into, the "Conservation of Resources" challenges below
// (each explanation below explicitly connects the cause-effect chain
// back to what sustainable management / the 3 R's would have
// prevented). They remain covered as content/questions under their
// own concepts, matching the brief's allowance for concepts that
// don't need a dedicated game.
//
// Links to the existing concepts created by seedGrade10_batch2.js —
// run that first. Same cause-effect ordering shape and scoring path
// (ordered-sequence check on attempt.orderedPieceIds vs
// payload.correct_order — see gameControllers.js checkAttempt) as
// every other Ecosystem Balance grade. Additive only. Safe to re-run
// (GameContent.findOne guard before every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science subject not found — run seedGrade10_batch2.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptChapters = {
    "Environmental Issues": "Our Environment",
    "Conservation of Resources": "Management of Natural Resources",
  };
  const concepts = {};
  for (const [title, chapterTitle] of Object.entries(conceptChapters)) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.error(`Chapter "${chapterTitle}" not found — run seedGrade10_batch2.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade10_batch2.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const environmentalIssuesChallenges = [
    {
      title: "A City's Air Turns Hazy",
      difficulty: "easy",
      order_index: 1,
      payload: {
        trigger: "A rapidly growing city sees a sharp rise in the number of vehicles and factories over a few years.",
        scrambled_effects: [
          { id: "d1", label: "Vehicle and factory emissions increase sharply" },
          { id: "d2", label: "Ground-level air pollutant concentration rises" },
          { id: "d3", label: "Respiratory illness cases in the city's hospitals increase" },
          { id: "d4", label: "The city grows rapidly, adding more vehicles and factories" },
        ],
        correct_order: ["d4", "d1", "d2", "d3"],
        explanation:
          "Rapid growth first increases the number of pollution sources (vehicles, factories), which increases the actual pollutants released, which raises pollutant concentration in the air people breathe, and that directly translates into more respiratory illness. This is why environmental issues caused by unmanaged growth eventually become public health issues — the kind of chain that conservation planning tries to break early, before it reaches people's lungs.",
        hint: "Start with what caused more pollution to be produced in the first place, then trace how that pollution actually reaches people's health.",
      },
    },
    {
      title: "Plastic Waste Reaches the Ocean",
      difficulty: "medium",
      order_index: 2,
      payload: {
        trigger: "A coastal town's waste management system is overwhelmed, and increasing amounts of plastic waste go uncollected.",
        scrambled_effects: [
          { id: "d1", label: "Uncollected plastic waste washes into rivers and eventually the ocean" },
          { id: "d2", label: "Marine animals ingest or become entangled in plastic debris" },
          { id: "d3", label: "The town's waste management system falls behind on collection" },
          { id: "d4", label: "Affected marine animal populations decline over time" },
        ],
        correct_order: ["d3", "d1", "d2", "d4"],
        explanation:
          "A breakdown in waste management is a human/systemic cause, not a natural one — uncollected waste doesn't stay put, it travels through waterways to the ocean, where marine animals directly encounter it, and repeated harm at the individual level eventually shows up as population-level decline. This is exactly the kind of chain that reducing waste at the source (the 'Reduce' in the 3 R's) is meant to interrupt before it ever reaches the ocean.",
        hint: "This starts with a human systems failure, not a natural event — find that root cause first, then trace where the waste physically ends up.",
      },
    },
    {
      title: "A Lake Chokes on Algae",
      difficulty: "hard",
      order_index: 3,
      payload: {
        trigger: "Untreated sewage from a growing settlement is discharged directly into a nearby lake for several years.",
        scrambled_effects: [
          { id: "d1", label: "Nutrient levels (nitrogen and phosphorus) in the lake rise sharply" },
          { id: "d2", label: "Algae grow explosively across the lake's surface, blocking sunlight" },
          { id: "d3", label: "Untreated sewage is discharged directly into the lake" },
          { id: "d4", label: "Underwater plants die from lack of light, and decomposition of dead algae depletes dissolved oxygen" },
          { id: "d5", label: "Fish and other lake life die off from oxygen depletion" },
        ],
        correct_order: ["d3", "d1", "d2", "d4", "d5"],
        explanation:
          "This is a longer chain than the previous two: the human cause (sewage discharge) raises nutrient levels, which fuels an algal bloom, whose surface coverage blocks sunlight from reaching underwater plants — and when that algae eventually dies, its decomposition consumes the lake's dissolved oxygen, which is what actually kills off fish and other lake life. Sustainable management of waste (treating sewage before discharge, rather than releasing it untreated) is precisely the kind of resource conservation measure that would have stopped this chain at its very first link.",
        hint: "There are two separate 'something dies' steps here — one from lack of light, one from lack of oxygen — figure out which happens first and what causes each.",
      },
    },
  ];

  const conservationChallenges = [
    {
      title: "A Forest Is Overharvested for Timber",
      difficulty: "easy",
      order_index: 1,
      payload: {
        trigger: "A logging company harvests trees from a forest far faster than the forest can naturally regrow them.",
        scrambled_effects: [
          { id: "d1", label: "Trees are cut down faster than new ones can mature" },
          { id: "d2", label: "The forest's total tree cover shrinks year over year" },
          { id: "d3", label: "Species that depend on forest habitat lose living space" },
          { id: "d4", label: "The logging company increases its harvest rate to meet rising demand" },
        ],
        correct_order: ["d4", "d1", "d2", "d3"],
        explanation:
          "Once harvesting outpaces natural regrowth (a resource being extracted faster than it renews), the resource base itself keeps shrinking, and every species relying on that habitat loses ground along with it. This is the core idea behind conservation of resources: use a renewable resource no faster than it can replenish itself — logging at a sustainably managed rate, matched to the forest's actual regrowth speed, would have kept this chain from ever starting.",
        hint: "Start with the decision that made the harvest rate exceed the forest's regrowth rate, then trace what a shrinking forest does to the species living in it.",
      },
    },
    {
      title: "A Village Well Runs Dry",
      difficulty: "medium",
      order_index: 2,
      payload: {
        trigger: "A village's groundwater is pumped for irrigation at a rate far exceeding how fast rainfall can recharge the aquifer beneath it.",
        scrambled_effects: [
          { id: "d1", label: "Groundwater is pumped out faster than rainfall recharges the aquifer" },
          { id: "d2", label: "The water table (underground water level) drops steadily each year" },
          { id: "d3", label: "Shallow wells in the village begin running dry" },
          { id: "d4", label: "Villagers must dig deeper wells or transport water from farther away" },
        ],
        correct_order: ["d1", "d2", "d3", "d4"],
        explanation:
          "Groundwater is a resource that renews, but only at the pace of natural recharge — pumping it out faster than that pace draws down the water table year after year, and once it falls below a shallow well's reach, that well simply stops producing water, forcing costlier workarounds. This is a textbook case for resource conservation and sustainable management: rationing or timing withdrawals to stay within the aquifer's natural recharge rate would keep the wells running indefinitely instead of running dry.",
        hint: "This chain runs in a straight line, no branching — follow the water level itself as it drops, one consequence directly causing the next.",
      },
    },
    {
      title: "Overfishing Collapses a Fishery",
      difficulty: "hard",
      order_index: 3,
      payload: {
        trigger:
          "A coastal fishing fleet, competing to maximize short-term catch, steadily increases how many fish it takes each season — including many fish too young to have reproduced yet.",
        scrambled_effects: [
          { id: "d1", label: "The fleet increases its catch each season, including young, not-yet-reproduced fish" },
          { id: "d2", label: "Fewer fish survive to reproductive age each year" },
          { id: "d3", label: "The fish population's ability to replenish itself weakens" },
          { id: "d4", label: "Total fish population size declines sharply over several seasons" },
          { id: "d5", label: "The fishery eventually collapses, and the fleet can no longer catch enough fish to be viable" },
        ],
        correct_order: ["d1", "d2", "d3", "d4", "d5"],
        explanation:
          "This is the classic conservation-of-resources cautionary chain: catching fish before they can reproduce doesn't just remove those individual fish, it removes the *next generation* they would have produced — so the population's replenishment capacity weakens before its size even visibly drops, and by the time the decline is obvious, the damage compounds quickly into a full collapse. Sustainable management practices — catch limits, minimum size limits, and seasonal closures during breeding — exist specifically to keep the harvest rate within what the population can regenerate, exactly the step skipped here.",
        hint: "The population's ability to bounce back is damaged before its total size actually drops — find the step about reproduction before the step about population decline.",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Environmental Issues"], levels: environmentalIssuesChallenges },
    { concept: concepts["Conservation of Resources"], levels: conservationChallenges },
  ];

  for (const { concept, levels } of allChallenges) {
    for (const level of levels) {
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
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
