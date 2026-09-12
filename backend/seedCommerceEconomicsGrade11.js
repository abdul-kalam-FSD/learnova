require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Commerce stream build-out (Grade 11 Economics), part of
// the platform's first Commerce content. Creates the Subject and
// Chapter from scratch (Commerce didn't exist in this platform before),
// then seeds both Commerce mechanics: COMMERCE_CONCEPT_MATCH (mapping-
// family, reuses HISTORY_CAUSE_EFFECT_MATCH's generic mapping ===
// correct_mapping check) and COMMERCE_PROCESS_BUILDER (order-family,
// reuses CS_CODE_ORDER_BUILDER's generic orderedPieceIds === correct_
// order check) — no new backend scoring logic needed for either.
// Run seedStreams.js AFTER this file (and its five siblings) so the
// Commerce stream can actually find these subjects.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: "Economics" });
  if (!subject) {
    subject = await Subject.create({ name: "Economics", grade: 11 });
    console.log("Created new Grade 11 Economics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Introduction to Microeconomics: Demand and Supply" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Introductory Microeconomics",
      title: "Introduction to Microeconomics: Demand and Supply",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let matchConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Demand, Supply and Elasticity Concepts" });
  if (!matchConcept) {
    matchConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Demand, Supply and Elasticity Concepts",
      explanation_text: "Microeconomics distinguishes carefully between similar-sounding ideas — a movement along a curve versus a shift of the whole curve, and different degrees of how responsive demand is to price.",
    });
    console.log("Created concept:", matchConcept._id);
  } else {
    console.log("Using existing concept:", matchConcept._id);
  }

  const matchChallenges = [
    {
      title: "Demand and Supply Basics",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each basic microeconomics term to its correct definition.",
        slots: [
          { id: "s1", label: "Demand" },
          { id: "s2", label: "Supply" },
          { id: "s3", label: "Equilibrium Price" },
        ],
        components: [
          { id: "c1", label: "The quantity of a good buyers are willing and able to buy at a price" },
          { id: "c2", label: "The quantity of a good sellers are willing and able to sell at a price" },
          { id: "c3", label: "The price at which quantity demanded equals quantity supplied" },
          { id: "c4", label: "The price set permanently by the government for every good" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Demand and supply are both about quantities at a price — equilibrium is where those two quantities agree.",
      },
    },
    {
      title: "Shifts vs Movements Along the Demand Curve",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each cause to what it actually does to the demand curve.",
        slots: [
          { id: "s1", label: "A change in the price of the good itself" },
          { id: "s2", label: "A change in consumer income" },
          { id: "s3", label: "A change in the price of a related good" },
        ],
        components: [
          { id: "c1", label: "Causes a movement along the same demand curve" },
          { id: "c2", label: "Causes the whole demand curve to shift" },
          { id: "c3", label: "Also causes the whole demand curve to shift, if the goods are substitutes or complements" },
          { id: "c4", label: "Never has any effect on demand at all" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Only a change in the good's own price moves you along the existing curve — everything else shifts the curve itself.",
      },
    },
    {
      title: "Elasticity of Demand",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each type of elasticity to its correct definition.",
        slots: [
          { id: "s1", label: "Elastic Demand" },
          { id: "s2", label: "Inelastic Demand" },
          { id: "s3", label: "Unitary Elastic Demand" },
        ],
        components: [
          { id: "c1", label: "Quantity demanded changes by a larger percentage than the price change" },
          { id: "c2", label: "Quantity demanded changes by a smaller percentage than the price change" },
          { id: "c3", label: "Quantity demanded changes by exactly the same percentage as the price change" },
          { id: "c4", label: "Means quantity demanded never changes no matter how much the price changes" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Compare the size of the percentage change in quantity to the percentage change in price — bigger, smaller, or exactly equal.",
      },
    },
  ];

  for (const challenge of matchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: matchConcept._id,
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

  let processConcept = await Concept.findOne({ chapter_id: chapter._id, title: "How Markets Respond to Change" });
  if (!processConcept) {
    processConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "How Markets Respond to Change",
      explanation_text: "Market equilibrium isn't static — supply, demand and price adjust in a specific sequence in response to cost changes or government intervention, and each step only makes sense after the one before it.",
    });
    console.log("Created concept:", processConcept._id);
  } else {
    console.log("Using existing concept:", processConcept._id);
  }

  const processChallenges = [
    {
      title: "Process: How a Market Reaches Equilibrium",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a market actually reaches equilibrium.",
        scrambled_steps: [
          { id: "st4", label: "The price settles where quantity demanded equals quantity supplied" },
          { id: "st3", label: "Higher prices encourage more supply and reduce quantity demanded" },
          { id: "st2", label: "If demand exceeds supply, the price is bid upward by buyers" },
          { id: "st1", label: "At a given price, quantity demanded and quantity supplied are compared" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "The comparison of demand and supply comes first, and the price only settles once the two quantities have adjusted to match.",
      },
    },
    {
      title: "Process: Effect of a Fall in Input Costs on Supply",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order a fall in input costs actually affects the market.",
        scrambled_steps: [
          { id: "st4", label: "At the original price, there is now excess supply, pushing the price down" },
          { id: "st3", label: "The supply curve shifts to the right" },
          { id: "st2", label: "Producers are willing to supply more at every price" },
          { id: "st1", label: "The cost of producing the good falls" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "The cost change is the root cause — it has to happen before producers change their willingness to supply.",
      },
    },
    {
      title: "Process: Government Imposes a Price Ceiling",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a price ceiling actually plays out in a market.",
        scrambled_steps: [
          { id: "st4", label: "Some buyers cannot obtain the good at the legal price, and informal markets may emerge" },
          { id: "st3", label: "A shortage develops because demand now exceeds supply" },
          { id: "st2", label: "At this lower price, quantity demanded rises and quantity supplied falls" },
          { id: "st1", label: "The government sets a maximum price below the market equilibrium price" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "The policy comes first — everything else is a consequence that unfolds because the ceiling sits below equilibrium.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: processConcept._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
