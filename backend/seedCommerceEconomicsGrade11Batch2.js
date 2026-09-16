require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass). Grade 11
// Economics previously had only one chapter ("Introduction to
// Microeconomics: Demand and Supply", seedCommerceEconomicsGrade11.js).
// Adds a second, genuinely distinct NCERT Class 11 Indian Economic
// Development chapter — "Poverty and Unemployment in India" — with
// three concepts. Reuses COMMERCE_CONCEPT_MATCH and
// COMMERCE_PROCESS_BUILDER as-is, same mechanics the existing Commerce
// chapters already use.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Poverty and Unemployment in India" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Poverty and Unemployment in India",
      title: "Poverty and Unemployment in India",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: measuring poverty ----
  let povertyConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Measuring and Understanding Poverty" });
  if (!povertyConcept) {
    povertyConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Measuring and Understanding Poverty",
      explanation_text:
        "Absolute poverty is measured against a fixed poverty line — a minimum income or consumption level needed for basic necessities, below which a person is considered poor regardless of how others are doing. Relative poverty instead compares a person's income to others in society, so it can exist even where nobody falls below an absolute minimum. India primarily uses the poverty line approach, based on a minimum level of calorie intake and essential consumption expenditure.",
    });
    console.log("Created concept:", povertyConcept._id);
  } else {
    console.log("Using existing concept:", povertyConcept._id);
  }

  const povertyChallenges = [
    {
      title: "Absolute Poverty or Relative Poverty?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each description to the type of poverty it defines.",
        slots: [
          { id: "s1", label: "Measured against a fixed minimum income or consumption level" },
          { id: "s2", label: "Measured by comparing a person's income to others in the same society" },
          { id: "s3", label: "India's official poverty line approach" },
        ],
        components: [
          { id: "c1", label: "Absolute Poverty — an objective minimum, independent of what others earn" },
          { id: "c2", label: "Relative Poverty — inequality-based, so it changes as the whole society's income changes" },
          { id: "c3", label: "Absolute Poverty — based on minimum calorie intake and essential expenditure" },
          { id: "c4", label: "Neither concept applies to how poverty is actually measured anywhere" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Absolute poverty is anchored to a fixed minimum standard; relative poverty is anchored to comparison with others.",
      },
    },
    {
      title: "What the Poverty Line Actually Measures",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each poverty-related fact to what it actually tells us.",
        slots: [
          { id: "s1", label: "A household's monthly expenditure falls below the poverty line" },
          { id: "s2", label: "The poverty line is set using a minimum calorie requirement converted to expenditure" },
          { id: "s3", label: "The poverty ratio (headcount ratio) is falling over time" },
        ],
        components: [
          { id: "c1", label: "The household is classified as poor by the official definition" },
          { id: "c2", label: "The line reflects a basic nutritional and consumption need, not comfort or luxury" },
          { id: "c3", label: "A smaller share of the population is now below the poverty line than before" },
          { id: "c4", label: "Nothing meaningful — the poverty ratio has no relationship to the poverty line" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The poverty line sets the bar; whether a household is above or below it determines its classification, and the ratio tracks how many households fall below it.",
      },
    },
    {
      title: "Causes and Consequences of Poverty",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each factor to whether it's more accurately described as a cause or a consequence of poverty in India.",
        slots: [
          { id: "s1", label: "Low agricultural productivity trapping rural households in low income" },
          { id: "s2", label: "Children of poor households receiving less education, reducing their future earning capacity" },
          { id: "s3", label: "High population growth putting pressure on limited resources and jobs" },
        ],
        components: [
          { id: "c1", label: "Cause — low productivity directly limits how much income a household can earn" },
          { id: "c2", label: "Consequence that becomes a cause — poor education today perpetuates poverty into the next generation" },
          { id: "c3", label: "Cause — faster population growth means resources have to stretch further" },
          { id: "c4", label: "Neither a cause nor a consequence — population growth has no link to poverty" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Poverty often works as a cycle: some factors directly cause low income, while others are themselves caused by poverty and go on to cause more of it.",
      },
    },
  ];

  for (const challenge of povertyChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: povertyConcept._id,
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

  // ---- Concept 2: types of unemployment ----
  let unemploymentConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Types of Unemployment in India" });
  if (!unemploymentConcept) {
    unemploymentConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Types of Unemployment in India",
      explanation_text:
        "Disguised unemployment occurs when more people work on a task than are actually needed, so removing some workers wouldn't reduce output at all — common on small family farms. Seasonal unemployment happens when work is available only during certain months, such as agricultural labour outside the harvest season. Open unemployment is the visible kind, where a person is able and willing to work but simply cannot find a job.",
    });
    console.log("Created concept:", unemploymentConcept._id);
  } else {
    console.log("Using existing concept:", unemploymentConcept._id);
  }

  const unemploymentChallenges = [
    {
      title: "Match the Type of Unemployment",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each situation to the type of unemployment it illustrates.",
        slots: [
          { id: "s1", label: "A farm employs five family members though the work only needs three" },
          { id: "s2", label: "A farm labourer has no work for several months between harvests" },
          { id: "s3", label: "A graduate is actively searching for a job but hasn't found one" },
        ],
        components: [
          { id: "c1", label: "Disguised Unemployment — removing the extra workers wouldn't reduce output" },
          { id: "c2", label: "Seasonal Unemployment — work exists only in certain months of the year" },
          { id: "c3", label: "Open Unemployment — visibly without work despite being willing and able" },
          { id: "c4", label: "None of these count as unemployment in economic terms" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "One type is hidden within a job that doesn't need everyone in it, one comes and goes with the season, and one is simply visible joblessness.",
      },
    },
    {
      title: "Why Is This Unemployment Hard to Measure?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each type of unemployment to the reason it's difficult to count accurately.",
        slots: [
          { id: "s1", label: "Disguised unemployment on a family farm" },
          { id: "s2", label: "Seasonal unemployment among agricultural labourers" },
          { id: "s3", label: "Open unemployment among urban job-seekers" },
        ],
        components: [
          { id: "c1", label: "Everyone appears to be 'working', so no one is officially recorded as unemployed" },
          { id: "c2", label: "Workers are only unemployed part of the year, so annual surveys can miss the true extent" },
          { id: "c3", label: "This is the type most surveys are actually built to capture, since it's visible" },
          { id: "c4", label: "All three types are equally easy to measure with a simple headcount" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Hidden forms of unemployment don't show up as an empty job, which is exactly what makes them harder to count than open unemployment.",
      },
    },
    {
      title: "Matching Solutions to the Right Type of Unemployment",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each policy response to the type of unemployment it's best suited to address.",
        slots: [
          { id: "s1", label: "Developing non-farm rural industries to absorb surplus farm labour" },
          { id: "s2", label: "Providing guaranteed rural employment during the agricultural off-season" },
          { id: "s3", label: "Expanding industries and skill training to create more urban jobs" },
        ],
        components: [
          { id: "c1", label: "Addresses Disguised Unemployment — gives surplus workers productive alternative work" },
          { id: "c2", label: "Addresses Seasonal Unemployment — fills the gap between harvest cycles" },
          { id: "c3", label: "Addresses Open Unemployment — creates jobs where none currently exist" },
          { id: "c4", label: "A single uniform policy works equally well for every type of unemployment" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Each type of unemployment has a different root cause, so the most effective policy targets that specific cause rather than unemployment in general.",
      },
    },
  ];

  for (const challenge of unemploymentChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_CONCEPT_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: unemploymentConcept._id,
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

  // ---- Concept 3: process of a rural employment guarantee scheme ----
  let schemeConcept = await Concept.findOne({ chapter_id: chapter._id, title: "How a Rural Employment Guarantee Scheme Works" });
  if (!schemeConcept) {
    schemeConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "How a Rural Employment Guarantee Scheme Works",
      explanation_text:
        "Government programmes like MGNREGA aim to reduce seasonal and open unemployment in rural areas by guaranteeing a fixed number of days of paid manual work per year to any household that wants it. Getting that work follows a set sequence — registration and a job card come first, then work is applied for, allotted, and finally paid for based on the work actually completed.",
    });
    console.log("Created concept:", schemeConcept._id);
  } else {
    console.log("Using existing concept:", schemeConcept._id);
  }

  const schemeChallenges = [
    {
      title: "Process: Getting Work Under a Rural Employment Guarantee Scheme",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a rural household actually gets guaranteed employment.",
        scrambled_steps: [
          { id: "st4", label: "Wages are paid based on the work completed" },
          { id: "st3", label: "Work is allotted, usually within a fixed number of days of applying" },
          { id: "st2", label: "The household applies for work when it is needed" },
          { id: "st1", label: "The household registers and receives a job card" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Registration has to happen before any application for work, and payment can only follow after the work is actually allotted and done.",
      },
    },
    {
      title: "Process: How the Scheme Is Meant to Reduce Poverty",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order the scheme's poverty-reduction effect is meant to play out.",
        scrambled_steps: [
          { id: "st4", label: "Rising household consumption helps push some families above the poverty line" },
          { id: "st3", label: "Guaranteed wages become a steady, additional source of household income" },
          { id: "st2", label: "Households facing seasonal unemployment take up the guaranteed work" },
          { id: "st1", label: "The scheme identifies rural areas most affected by seasonal joblessness" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The scheme first targets where the problem exists, and each later step is a direct effect building on the one before it.",
      },
    },
    {
      title: "Process: What Happens If Work Isn't Provided on Time",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order the scheme's built-in accountability mechanism actually works.",
        scrambled_steps: [
          { id: "st4", label: "The household becomes eligible for an unemployment allowance instead" },
          { id: "st3", label: "The local authority fails to provide work within the guaranteed time limit" },
          { id: "st2", label: "The delay is recorded against the scheme's employment guarantee" },
          { id: "st1", label: "A registered household applies for work under the scheme" },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The guarantee only has teeth because a missed deadline is tracked and triggers a fallback payment — that fallback can't come before the delay is actually established.",
      },
    },
  ];

  for (const challenge of schemeChallenges) {
    const exists = await GameContent.findOne({ game_type: "COMMERCE_PROCESS_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_PROCESS_BUILDER",
        concept_id: schemeConcept._id,
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
