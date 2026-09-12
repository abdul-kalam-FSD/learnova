require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-gap fill (genuine gap list item 2): Grade 10 Social Science
// already has an Economics chapter (seedSocialScienceGrade10.js,
// "Protecting Consumer Rights") but no Geography strand content.
// Curriculum reference: as of the 2026-27 CBSE session, Grade 10's
// Geography book has not yet been folded into the new NCF-SE 2023
// integrated structure the way Grades 6-9 have — it still follows the
// long-standing NCERT "Contemporary India II" syllabus, whose
// Agriculture chapter distinguishes farming types by their defining
// characteristics (subsistence vs. commercial vs. plantation
// farming). That's a natural fit for GEOGRAPHY_FEATURE_MATCH (the
// same mapping-family check as seedGeographyFeatureGrade8.js), so no
// new backend scoring logic is needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 10 Social Science subject not found — run seedSocialScienceGrade10.js first.");
  }
  console.log("Using existing subject:", subject._id);

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Resources and Agriculture in India" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Contemporary India",
      title: "Resources and Agriculture in India",
      order_index: 2,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Farming Types and Resource Categories to What Defines Them" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Farming Types and Resource Categories to What Defines Them",
      explanation_text:
        "India's farming isn't a single practice — subsistence, commercial, and plantation farming each have their own scale, purpose, and inputs. Resources split the same way, by whether nature can replenish them within a human lifetime or not. Naming a type is one skill; correctly matching it to what actually defines it is another.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 8's Feature Match — `slots` are
  // matched against `components`; `correct_mapping` (stripped before
  // the client sees it) is the true slot-id -> component-id pairing.
  const featureChallenges = [
    {
      title: "Types of Farming in India",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each type of farming to what actually defines it.",
        slots: [
          { id: "s1", label: "Primitive subsistence farming" },
          { id: "s2", label: "Commercial farming" },
          { id: "s3", label: "Plantation farming" },
        ],
        components: [
          { id: "c1", label: "Small landholdings worked mainly by family labour with simple tools, growing food chiefly for the farmer's own household" },
          { id: "c2", label: "Larger-scale farming using modern inputs like HYV seeds and machinery, growing crops mainly to sell" },
          { id: "c3", label: "A single cash crop grown on a large estate, with its own processing industry attached to it" },
          { id: "c4", label: "Farming that happens only inside greenhouses, regardless of scale or purpose" },
        ],
        correct_mapping: { "s1": "c1", "s2": "c2", "s3": "c3" },
        hint: "Ask what each type is grown for — the farmer's own table, the market, or a single processed export crop — and how much land and machinery it uses.",
      },
    },
    {
      title: "Renewable vs. Non-Renewable Resources",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each resource category to the description that actually fits it.",
        slots: [
          { id: "t1", label: "Renewable resources" },
          { id: "t2", label: "Non-renewable resources" },
          { id: "t3", label: "Continuous (flow) resources" },
        ],
        components: [
          { id: "d1", label: "Can be replenished by nature within a human lifetime through natural processes, e.g. forests and groundwater" },
          { id: "d2", label: "Take millions of years to form and cannot be replaced once used up, e.g. coal and petroleum" },
          { id: "d3", label: "Are available on an ongoing basis regardless of human use, e.g. solar and wind energy" },
          { id: "d4", label: "Exist only underground and can never be seen or mapped" },
        ],
        correct_mapping: { "t1": "d1", "t2": "d2", "t3": "d3" },
        hint: "The difference is about time: does nature restore it within a lifetime, does it take geological ages, or is it simply always there?",
      },
    },
    {
      title: "India's Major Crops and What They Need",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each major crop to the growing conditions it actually needs.",
        slots: [
          { id: "u1", label: "Rice" },
          { id: "u2", label: "Wheat" },
          { id: "u3", label: "Cotton" },
        ],
        components: [
          { id: "e1", label: "High temperature, high humidity, and heavy rainfall (or irrigation) during its growing season" },
          { id: "e2", label: "Moderate, cool temperature during growth and bright sunshine at the time of ripening" },
          { id: "e3", label: "High temperature, light rainfall, at least 210 frost-free days, and black cotton soil" },
          { id: "e4", label: "Requires no soil at all and can be grown equally well on any terrain" },
        ],
        correct_mapping: { "u1": "e1", "u2": "e2", "u3": "e3" },
        hint: "Rice needs the most water and heat of the three; wheat needs cool growth but sun to ripen; cotton needs a long frost-free period and a particular soil type.",
      },
    },
  ];

  for (const challenge of featureChallenges) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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
