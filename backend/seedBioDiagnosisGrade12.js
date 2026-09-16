require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes the last remaining cell of the Biology 9-12 content gap
// found during the full-project audit: BIO_DIAGNOSIS previously
// existed at Grades 9, 10, and 11 but not Grade 12. Links to the
// existing "Common Diseases in Humans" concept created by
// seedGrade12_batch3.js — run that first. Pitched at the Grade 12
// level of this concept: differential diagnosis across the named
// pathogen-caused diseases (typhoid, pneumonia, malaria, amoebiasis)
// using their distinguishing symptom patterns and modes of
// transmission, rather than a single deficiency disease. Same
// evidence-card / correct_piece_ids shape and scoring path as every
// other Diagnosis grade.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 12 Science/Biology subject not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Human Health and Disease" });
  if (!chapter) {
    console.error("Chapter 'Human Health and Disease' not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Common Diseases in Humans" });
  if (!concept) {
    console.error(
      "Concept 'Common Diseases in Humans' not found — run seedGrade12_batch3.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const levels = [
    {
      title: "The Cyclic Fever",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario:
          "A patient returning from a rural, mosquito-heavy region develops fever that spikes and breaks in a recurring cycle, accompanied by chills and sweating, roughly every 48 hours.",
        evidence: [
          { id: "ev1", label: "Fever recurs in a regular cycle", detail: "Spikes and breaks roughly every 48 hours, a distinctive pattern rather than continuous fever." },
          { id: "ev2", label: "Chills and profuse sweating with each spike", detail: "Classic accompaniment to each fever episode." },
          { id: "ev3", label: "Recent travel to a mosquito-heavy region", detail: "Spent two weeks in an area with high mosquito density." },
          { id: "ev4", label: "Mild headache throughout", detail: "A general symptom present across many different feverish illnesses, not distinguishing on its own." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Malaria",
        explanation:
          "A fever that spikes and breaks in a regular cycle with chills and sweating, following exposure to mosquitoes, is the hallmark presentation of malaria — caused by a Plasmodium parasite transmitted through the bite of an infected female Anopheles mosquito, which produces this cyclic pattern as the parasite's life cycle progresses in the blood. A general headache fits almost any fever and doesn't distinguish this diagnosis.",
        hint: "The regular, repeating rhythm of the fever is the strongest clue here — few diseases produce a cycle this precise.",
      },
    },
    {
      title: "The Watery Stool",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "A patient who recently ate at a roadside stall with visibly unhygienic water handling develops persistent loose, watery stools with abdominal cramping and mild fever, but no blood in the stool and no cough.",
        evidence: [
          { id: "ev1", label: "Persistent watery stools with cramping", detail: "Ongoing loose stools accompanied by abdominal cramps for several days." },
          { id: "ev2", label: "Recent exposure to contaminated water/food", detail: "Ate at a stall with visibly poor water hygiene shortly before symptoms began." },
          { id: "ev3", label: "No blood in stool", detail: "Stool appears watery but without visible blood." },
          { id: "ev4", label: "No cough or respiratory symptoms", detail: "Rules out a respiratory-tract infection as the cause of the fever." },
          { id: "ev5", label: "Mild fever", detail: "A low-grade fever accompanying the digestive symptoms." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev5"],
        diagnosis: "Amoebiasis",
        explanation:
          "Persistent watery, cramping stools with mild fever, traced to contaminated food or water, matches amoebiasis — caused by the protozoan Entamoeba histolytica, transmitted through the faecal-oral route via contaminated water and food, exactly as this concept's explanation describes. The absence of blood and absence of cough are useful negatives that help rule out other conditions, but the positive evidence for amoebiasis is the symptom-and-exposure pattern itself.",
        hint: "Trace the illness back to what the patient ate or drank, and match the digestive symptom pattern that follows from it.",
      },
    },
    {
      title: "The Productive Cough",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "An elderly patient develops a high fever with chills, a cough producing thick, discolored mucus, and sharp chest pain that worsens with deep breathing. Symptoms began suddenly, two days after a bout of the common cold.",
        evidence: [
          { id: "ev1", label: "High fever with chills", detail: "Sudden onset of high fever accompanied by shaking chills." },
          { id: "ev2", label: "Cough producing thick, discolored mucus", detail: "A productive cough, distinct from the dry cough of a simple cold." },
          { id: "ev3", label: "Sharp chest pain worsened by deep breathing", detail: "Pain that specifically increases when the lungs expand fully." },
          { id: "ev4", label: "Followed a recent common cold", detail: "Symptoms escalated two days after an initial mild upper-respiratory cold." },
          { id: "ev5", label: "Patient is elderly", detail: "An age-related risk factor that increases susceptibility but isn't itself a symptom of any specific disease." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Pneumonia",
        explanation:
          "High fever with chills, a productive cough bringing up thick mucus, and chest pain that worsens with breathing describes inflammation of the lung's air sacs (alveoli) filling with fluid — pneumonia, which can develop as a bacterial complication following an initial viral cold. The preceding cold explains the trigger but isn't itself the diagnosis, and advanced age is a risk factor rather than diagnostic evidence.",
        hint: "Focus on where the infection has moved to — the chest-pain-with-breathing and thick mucus point to the lungs specifically, beyond just a cold.",
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
