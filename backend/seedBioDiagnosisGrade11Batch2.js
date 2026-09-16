require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Diagnosis coverage for "Chemical Coordination and Integration". The
// chapter's own syllabus content is hormone -> gland -> effect, and
// NCERT teaches each hormone through its deficiency/excess disorder,
// so the inspect-evidence-then-identify loop maps onto it directly:
// the student separates the signs caused by the hormone from
// unrelated red herrings.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Biology subject not found — run seedGrade11_batch7.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({
    subject_id: subject._id,
    title: "Chemical Coordination and Integration",
  });
  if (!chapter) {
    console.error("Chapter 'Chemical Coordination and Integration' not found — run seedGrade11_batch7.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptTitles = [
    "Endocrine Glands and Hormone Action",
    "Pituitary, Thyroid, and Adrenal Glands",
    "Pancreas, Gonads, and Hormonal Disorders",
  ];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade11_batch7.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Endocrine Glands and Hormone Action"],
      levels: [
        {
          title: "The Signal With No Duct",
          difficulty: "medium",
          order_index: 1,
          payload: {
            scenario:
              "A student is asked to work out whether a gland in a diagram is endocrine or exocrine. Select only the observations that identify it as an endocrine gland.",
            evidence: [
              { id: "ev1", label: "Secretion released directly into the bloodstream", detail: "The product enters surrounding capillaries rather than a tube." },
              { id: "ev2", label: "No duct leads away from the gland", detail: "Endocrine glands are described as ductless glands." },
              { id: "ev3", label: "Secretion acts on distant target organs", detail: "The chemical travels in blood and acts only where receptors exist." },
              { id: "ev4", label: "Gland is pink in the diagram", detail: "Diagram colour is a drawing convention and carries no biological meaning." },
              { id: "ev5", label: "Secretion poured onto the skin surface through a tube", detail: "This describes an exocrine gland such as a sweat gland." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3"],
            diagnosis: "Endocrine gland",
            explanation:
              "Endocrine glands are ductless: they release hormones straight into the blood, which carries them to distant target organs bearing the right receptors. A duct discharging onto a surface is the defining feature of an exocrine gland, and diagram colour means nothing.",
            hint: "Focus on where the secretion goes and whether a tube carries it — ignore anything about how the picture is drawn.",
          },
        },
      ],
    },
    {
      concept: concepts["Pituitary, Thyroid, and Adrenal Glands"],
      levels: [
        {
          title: "The Swollen Neck",
          difficulty: "medium",
          order_index: 1,
          payload: {
            scenario:
              "A patient living in a hilly inland region has a visibly enlarged thyroid gland in the neck, feels persistently tired and cold, and has gained weight. Select only the findings that support a diagnosis of iodine-deficiency goitre.",
            evidence: [
              { id: "ev1", label: "Visibly enlarged thyroid gland", detail: "The gland enlarges as it works harder to try to make thyroxine." },
              { id: "ev2", label: "Diet very low in iodine", detail: "Iodine is an essential raw material for making thyroxine." },
              { id: "ev3", label: "Feels cold and tired, has gained weight", detail: "Low thyroxine lowers the basal metabolic rate." },
              { id: "ev4", label: "Recently sprained an ankle", detail: "A minor unrelated injury with no link to thyroid function." },
              { id: "ev5", label: "Blood sugar within normal limits", detail: "Normal glucose points away from a pancreatic problem but does not itself indicate goitre." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3"],
            diagnosis: "Simple (iodine-deficiency) goitre",
            explanation:
              "Thyroxine synthesis requires iodine. When dietary iodine is insufficient the thyroid enlarges in an attempt to compensate, producing goitre, while the resulting hypothyroidism lowers metabolic rate — causing cold intolerance, fatigue, and weight gain. The sprain is unrelated, and a normal blood sugar is not evidence for goitre.",
            hint: "Link the missing raw material to the gland that needs it, then to what a low level of its hormone does to metabolism.",
          },
        },
        {
          title: "The Emergency Response",
          difficulty: "hard",
          order_index: 2,
          payload: {
            scenario:
              "A student is suddenly startled by a loud noise. Within seconds their heart pounds, breathing quickens, and pupils widen. Select only the findings caused by the adrenal medullary hormones.",
            evidence: [
              { id: "ev1", label: "Heart rate and force of contraction increase", detail: "Adrenaline acts on the heart to raise cardiac output." },
              { id: "ev2", label: "Breathing rate rises", detail: "Airways dilate and respiration quickens to supply more oxygen." },
              { id: "ev3", label: "Pupils dilate", detail: "Adrenaline dilates the pupil as part of the fight-or-flight response." },
              { id: "ev4", label: "Blood glucose rises through glycogen breakdown", detail: "Catecholamines mobilise glucose to fuel muscles." },
              { id: "ev5", label: "Long bones grow longer over the following months", detail: "Bone lengthening is driven by growth hormone, over a far longer timescale." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3", "ev4"],
            diagnosis: "Adrenaline (fight-or-flight) response",
            explanation:
              "Adrenaline and noradrenaline from the adrenal medulla produce the fight-or-flight response within seconds: faster and stronger heartbeat, quicker breathing, dilated pupils, and glucose released from glycogen. Growth of long bones is a growth-hormone effect operating over months, not seconds.",
            hint: "Everything that happens within seconds of the fright belongs together — one option works on a timescale of months.",
          },
        },
      ],
    },
    {
      concept: concepts["Pancreas, Gonads, and Hormonal Disorders"],
      levels: [
        {
          title: "The Persistent Thirst",
          difficulty: "hard",
          order_index: 1,
          payload: {
            scenario:
              "A patient reports constant thirst, frequent urination, and unexplained weight loss. Laboratory tests show a high fasting blood glucose level and glucose present in the urine. Select only the findings that support diabetes mellitus.",
            evidence: [
              { id: "ev1", label: "High fasting blood glucose", detail: "Without enough effective insulin, glucose stays in the blood instead of entering cells." },
              { id: "ev2", label: "Glucose detected in the urine", detail: "Blood glucose exceeds the kidney threshold, so the excess spills into urine." },
              { id: "ev3", label: "Frequent urination and constant thirst", detail: "Glucose in the filtrate draws water with it, increasing urine volume and causing dehydration." },
              { id: "ev4", label: "Unexplained weight loss", detail: "Cells cannot use glucose, so the body breaks down fat and protein for energy instead." },
              { id: "ev5", label: "Slightly enlarged thyroid gland", detail: "A thyroid finding unrelated to insulin or glucose handling." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3", "ev4"],
            diagnosis: "Diabetes mellitus",
            explanation:
              "Diabetes mellitus follows from insufficient or ineffective insulin from the pancreatic beta cells. Glucose accumulates in blood, spills into urine once the kidney threshold is crossed, and osmotically drags water out — producing excessive urination and thirst. Cells starved of glucose burn fat and protein, causing weight loss. The thyroid finding belongs to a different gland entirely.",
            hint: "Trace one failing hormone through blood, then urine, then water loss, then energy use — and set aside the finding that belongs to another gland.",
          },
        },
      ],
    },
  ];

  for (const { concept, levels } of allChallenges) {
    for (const level of levels) {
      const exists = await GameContent.findOne({
        game_type: "BIO_DIAGNOSIS",
        title: level.title,
      });
      if (!exists) {
        const created = await GameContent.create({
          game_type: "BIO_DIAGNOSIS",
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
  console.error("Seed failed:", err.message);
  process.exit(1);
});
