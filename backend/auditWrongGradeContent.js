require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// READ-ONLY audit. Does not modify or delete anything.
// Finds content that may have been left behind under the OLD (wrong)
// grade before the Gap 8 rename/move fixes:
//   seedChemistryGrade8.js   -> now seedChemistryEquationBalancerGrade10.js (Grade 8 -> 10)
//   seedHistoryGrade4.js     -> now seedHistoryGandhiTimelineGrade8.js      (Grade 4 -> 8)
//   seedHistoryGrade7.js     -> now seedHistoryMughalTimelineGrade8.js      (Grade 7 -> 8)
//   seedPhysicsGrade11.js    -> now seedPhysicsCapacitorCircuitGrade12.js   (Grade 11 -> 12)
//   seedPhysicsGrade6.js     -> now seedPhysicsCircuitBasicsGrade7.js       (Grade 6 -> 7)
//   seedPhysicsGrade9.js     -> now seedPhysicsSeriesParallelGrade10.js     (Grade 9 -> 10)

const checks = [
  { label: "Chemistry (old Grade 8)", grade: 8, subjectNamePattern: /science/i, keywordPattern: /balanc|equation/i },
  { label: "History Gandhi (old Grade 4)", grade: 4, subjectNamePattern: /history|social/i, keywordPattern: /gandhi/i },
  { label: "History Mughal (old Grade 7)", grade: 7, subjectNamePattern: /history|social/i, keywordPattern: /mughal/i },
  { label: "Physics Capacitor (old Grade 11)", grade: 11, subjectNamePattern: /physics|science/i, keywordPattern: /capacit|electrostat/i },
  { label: "Physics Circuit Basics (old Grade 6)", grade: 6, subjectNamePattern: /physics|science/i, keywordPattern: /circuit|bulb/i },
  { label: "Physics Series/Parallel (old Grade 9)", grade: 9, subjectNamePattern: /physics|science/i, keywordPattern: /series|parallel|electricity/i },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");
  console.log("=== READ-ONLY AUDIT — nothing will be modified ===\n");

  for (const check of checks) {
    console.log(`--- ${check.label} ---`);
    const subjects = await Subject.find({ grade: check.grade, name: check.subjectNamePattern });
    if (subjects.length === 0) {
      console.log(`  No Subject found at grade ${check.grade} matching ${check.subjectNamePattern}. Nothing to clean here.\n`);
      continue;
    }
    for (const subj of subjects) {
      console.log(`  Subject: "${subj.name}" (grade ${subj.grade}) id=${subj._id}`);
      const chapters = await Chapter.find({ subject_id: subj._id });
      for (const ch of chapters) {
        const matchesKeyword = check.keywordPattern.test(ch.title) || check.keywordPattern.test(ch.unit_name || "");
        const concepts = await Concept.find({ chapter_id: ch._id });
        let anyGameContent = 0;
        for (const c of concepts) {
          const gc = await GameContent.countDocuments({ concept_id: c._id });
          anyGameContent += gc;
        }
        const flag = matchesKeyword ? "  <-- POSSIBLE OLD-GRADE MATCH" : "";
        console.log(`    Chapter: "${ch.title}" id=${ch._id} | ${concepts.length} concept(s), ${anyGameContent} GameContent doc(s)${flag}`);
        for (const c of concepts) {
          console.log(`      Concept: "${c.title}" id=${c._id}`);
        }
      }
    }
    console.log("");
  }

  console.log("=== Audit complete. No data was changed. ===");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
