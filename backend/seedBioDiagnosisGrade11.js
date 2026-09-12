require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes a cell of the Biology 9-12 content gap found during the
// full-project audit: BIO_DIAGNOSIS previously existed at Grades 9
// (Causes of Disease) and 10 (deficiency diseases) but not Grade 11.
// Grade 11's NCERT syllabus has no Ecology or Genetics chapters (see
// seedGrade11_batch*.js — Class 11 covers diversity, cell biology,
// and plant/human physiology instead), so unlike BIO_ECOSYSTEM_BALANCE
// and BIO_GENETICS_SIMULATOR, which correctly have no Grade 11 cell,
// Diagnosis fits naturally here via the "Circulatory Disorders"
// half of the existing "Lymph and Circulatory Disorders" concept
// created by seedGrade11_batch6.js — run that first. Differential
// diagnosis across hypertension, coronary artery disease, and
// atherosclerosis, the three disorders this concept's own explanation
// text names. Same evidence-card / correct_piece_ids shape and
// scoring path as every other Diagnosis grade.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Lymph and Circulatory Disorders" });
  if (!concept) {
    console.error(
      "Concept 'Lymph and Circulatory Disorders' not found — run seedGrade11_batch6.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const levels = [
    {
      title: "The Silent Pressure",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario:
          "A 50-year-old man has no chest pain and feels generally fine, but a routine check-up repeatedly measures his blood pressure well above normal on separate visits. He has a family history of the same reading and eats a very salt-heavy diet.",
        evidence: [
          { id: "ev1", label: "Repeatedly elevated blood pressure readings", detail: "Above-normal readings confirmed on multiple separate visits, not just one." },
          { id: "ev2", label: "No chest pain or shortness of breath", detail: "Reports feeling generally fine day to day." },
          { id: "ev3", label: "High-salt diet", detail: "Regularly eats heavily salted food, which increases blood volume and vessel pressure." },
          { id: "ev4", label: "Family history of the same condition", detail: "A parent also had persistently high readings." },
          { id: "ev5", label: "Mild seasonal cold last month", detail: "A minor, already-resolved respiratory infection, unrelated to blood pressure." },
        ],
        correct_piece_ids: ["ev1", "ev3", "ev4"],
        diagnosis: "Hypertension",
        explanation:
          "Persistently elevated blood pressure on repeated readings, without needing any accompanying chest symptoms, defines hypertension — and a high-salt diet plus family history are its two classic contributing risk factors. The absence of chest pain doesn't rule this out since hypertension is often symptomless (\"silent\"), and the old cold is unrelated.",
        hint: "This condition is often called 'silent' because it can exist with no obvious symptoms at all — focus on what the readings themselves, plus the risk factors, tell you.",
      },
    },
    {
      title: "The Exertional Chest Pain",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "A 55-year-old woman reports a squeezing chest pain that appears only when she climbs stairs or walks briskly, and disappears within minutes of resting. She is a long-time smoker with high cholesterol.",
        evidence: [
          { id: "ev1", label: "Chest pain triggered by exertion", detail: "Pain reliably appears during stair-climbing or brisk walking." },
          { id: "ev2", label: "Pain resolves quickly with rest", detail: "Symptoms fade within a few minutes once she stops and rests." },
          { id: "ev3", label: "Long-time smoker", detail: "Smoking damages the inner lining of coronary arteries." },
          { id: "ev4", label: "High blood cholesterol", detail: "Elevated cholesterol contributes to fatty plaque buildup in artery walls." },
          { id: "ev5", label: "Occasional mild headaches", detail: "Unrelated, infrequent tension headaches with no connection to exertion." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3", "ev4"],
        diagnosis: "Coronary artery disease (angina)",
        explanation:
          "Chest pain that appears specifically during physical exertion and eases with rest is the classic pattern of angina, caused by narrowed coronary arteries unable to supply enough oxygenated blood to the heart muscle under increased demand — and smoking plus high cholesterol are the two evidence points that explain why those arteries are narrowed. The occasional headaches are an unrelated distractor.",
        hint: "Notice exactly when the pain shows up and when it goes away — that timing pattern points to the heart's blood supply, not something constant.",
      },
    },
    {
      title: "The Narrowing Vessel",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "An imaging scan on a 60-year-old man incidentally reveals thickened, hardened artery walls with visible fatty deposits along the inner lining, even though he has never reported any chest pain. He has a long history of a high-fat diet and minimal physical activity.",
        evidence: [
          { id: "ev1", label: "Thickened, hardened artery walls", detail: "Imaging shows the vessel walls have lost their normal elasticity." },
          { id: "ev2", label: "Visible fatty deposits (plaques) inside the artery lining", detail: "Cholesterol-rich plaques have built up along the inner surface of the vessel." },
          { id: "ev3", label: "Long history of high-fat diet", detail: "Years of a diet rich in saturated fat contribute directly to plaque formation." },
          { id: "ev4", label: "Minimal physical activity", detail: "A sedentary lifestyle that compounds the effect of diet on vessel health." },
          { id: "ev5", label: "No reported chest pain", detail: "The condition was found incidentally, with no symptoms prompting the scan." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3", "ev4"],
        diagnosis: "Atherosclerosis",
        explanation:
          "The defining feature here is structural: hardened vessel walls with fatty plaque deposits along the lining, which is atherosclerosis itself — a slow build-up process driven by a high-fat diet and inactivity, and one that can exist for years before producing any symptoms like chest pain. The absence of chest pain is expected at this stage, not evidence against the diagnosis.",
        hint: "This one is defined by what's physically happening inside the vessel wall, not by any symptom the person feels — the deposits and hardening are the diagnosis.",
      },
    },
  ];

  for (const level of levels) {
    const exists = await GameContent.findOne({ game_type: "BIO_DIAGNOSIS", title: level.title });
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
