require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fourth Biology mechanic (Priority 7 of the completion spec: Genetics
// Simulator, then Diagnosis, then Specimen Analysis). Deliberately
// distinct from the legacy Case model (Case.js / caseControllers.js /
// /api/cases) — this is a GameContent-backed game_type like every
// other mechanic, so it goes through the same Game Selection Engine,
// grade-scoping, and adaptive-recommendation pipeline the Case system
// never plugged into.
//
// Gameplay: student inspects evidence cards (tap once to reveal detail
// text), then taps a second time to mark a card as supporting their
// diagnosis. Scored server-side via the same unordered-subset check as
// FractionBuilder/MoleculeBuilder/GeometryBuilder (attempt.selectedPieceIds
// vs payload.correct_piece_ids — see gameControllers.js checkAttempt) —
// only the game_type needed adding to that check's list. The diagnosis
// name and explanation are withheld from the client until a correct
// attempt (see sanitizePayloadForClient + submitGameAttempt's
// reveal-on-correct fields), matching the spec's "Diagnosis ->
// Explanation" payoff at the end of the reasoning loop.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Biology now lives inside the integrated "Science"
  // subject (see seedGrade10.js) rather than its own top-level
  // Subject, so this must match "Science" too, not just "Biology".
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science subject not found — run seedGrade10.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Human Health and Disease" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Human Health and Disease",
      title: "Human Health and Disease",
      strand: "Biology",
      order_index: 101,
    });
    console.log("Created chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Clinical Reasoning from Symptoms" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Clinical Reasoning from Symptoms",
      explanation_text:
        "Diagnosing a condition means separating symptoms that are actually caused by the underlying condition from coincidental or misleading ones, then matching the true symptom pattern to a known cause.",
    });
    console.log("Created concept:", concept._id);
  }

  const levels = [
    {
      title: "The Tired Sailor",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario:
          "A sailor returning from a six-month voyage reports bleeding gums, joint pain, and slow-healing wounds. His diet on board was mostly salted meat and hardtack, with almost no fresh fruit or vegetables.",
        evidence: [
          { id: "ev1", label: "Bleeding gums", detail: "Gums bleed even with light brushing — a classic sign of weakened connective tissue." },
          { id: "ev2", label: "Slow-healing wounds", detail: "Small cuts from ship work are taking weeks to close." },
          { id: "ev3", label: "Diet: salted meat and hardtack", detail: "No fresh fruit or vegetables for six months — essentially zero vitamin C intake." },
          { id: "ev4", label: "Mild fever", detail: "A low-grade fever from an unrelated cold caught in port last week." },
          { id: "ev5", label: "Joint pain", detail: "Aching joints, worse in the legs, with no swelling or redness." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3", "ev5"],
        diagnosis: "Scurvy (Vitamin C deficiency)",
        explanation:
          "Vitamin C is required to build collagen, which holds blood vessels, gums, and connective tissue together. Months without fresh produce starved the sailor of vitamin C, causing bleeding gums, slow wound healing, and joint pain. The mild fever is unrelated — a separate, coincidental cold.",
        hint: "Focus on symptoms that connect back to the sailor's diet — the fever has nothing to do with what he's been eating.",
      },
    },
    {
      title: "The Breathless Runner",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "A teenage athlete feels unusually breathless and fatigued during practice, with pale skin and brittle nails. She recently switched to a strict vegetarian diet and has been training harder than usual.",
        evidence: [
          { id: "ev1", label: "Pale skin", detail: "Skin and inner eyelids look noticeably pale compared to a month ago." },
          { id: "ev2", label: "Brittle, spoon-shaped nails", detail: "Nails chip easily and have started curving inward at the tips." },
          { id: "ev3", label: "Recent diet change: strict vegetarian", detail: "Cut out all meat six weeks ago without adding iron-rich plant substitutes." },
          { id: "ev4", label: "Increased training load", detail: "Running an extra 10km per week for an upcoming meet." },
          { id: "ev5", label: "Breathlessness during practice", detail: "Gets winded faster than teammates doing the same drills." },
          { id: "ev6", label: "Mild ankle sprain last month", detail: "A minor sprain that has already fully healed." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3", "ev5"],
        diagnosis: "Iron-deficiency anemia",
        explanation:
          "Iron is essential for making hemoglobin, which carries oxygen in the blood. Cutting out meat without replacing dietary iron reduced her iron stores, leading to fewer/weaker red blood cells — hence the pale skin, brittle nails, and breathlessness from reduced oxygen delivery. The training increase and old ankle sprain are unrelated distractions.",
        hint: "The nail and skin changes plus the diet switch point to a blood-related deficiency, not an overtraining injury.",
      },
    },
    {
      title: "The Farmer's Rash",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "A farmer develops a scaly, dark rash on the back of his hands and neck — the sun-exposed areas — along with diarrhea and confusion. His diet this season has relied heavily on untreated maize (corn) as the main staple.",
        evidence: [
          { id: "ev1", label: "Rash on sun-exposed skin", detail: "Dark, scaly, symmetric rash only on hands, neck, and face — areas that get direct sun." },
          { id: "ev2", label: "Diarrhea", detail: "Ongoing loose stools for the past two weeks." },
          { id: "ev3", label: "Confusion and irritability", detail: "Family reports he seems mentally foggy and short-tempered lately." },
          { id: "ev4", label: "Diet: untreated maize as staple", detail: "Corn has not been nixtamalized (lime-treated), which is needed to release its bound niacin." },
          { id: "ev5", label: "Works outdoors most of the day", detail: "Long hours in direct sunlight during harvest season." },
          { id: "ev6", label: "Mild seasonal allergies", detail: "Occasional sneezing during harvest dust season, unrelated to the rash." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3", "ev4"],
        diagnosis: "Pellagra (Niacin / Vitamin B3 deficiency)",
        explanation:
          "Pellagra classically presents with the 'three Ds': dermatitis (the sun-exposed rash), diarrhea, and dementia/confusion. Untreated maize contains niacin in a bound form the body can't absorb unless the corn is nixtamalized — a staple diet of it without that processing step causes niacin deficiency. Working outdoors explains sun exposure but isn't itself the cause; the seasonal allergies are unrelated.",
        hint: "Look for the classic triad of skin, gut, and mental symptoms, then trace it back to what's missing from his diet.",
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
