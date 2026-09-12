require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes a cell of the Biology 9-12 content gap found during the
// full-project audit: BIO_DIAGNOSIS previously existed only at Grade
// 10. Links to the existing "Causes of Disease" concept created by
// seedGrade9_batch2.js — run that first. Pitched at the Grade 9 level
// of this concept: distinguishing infectious causes (spreading
// pathogens) from non-infectious causes (deficiency, lifestyle,
// genetic), rather than naming a specific vitamin-deficiency disease
// the way Grade 10 does. Same evidence-card / correct_piece_ids
// shape and scoring path (unordered-subset check in
// gameControllers.js checkAttempt) as every other Diagnosis grade.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Causes of Disease" });
  if (!concept) {
    console.error(
      "Concept 'Causes of Disease' not found — run seedGrade9_batch2.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const levels = [
    {
      title: "The Classroom Outbreak",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario:
          "Within three days, six students in the same classroom develop fever, sore throat, and a runny nose, one after another, starting from a student who returned from a trip.",
        evidence: [
          { id: "ev1", label: "Symptoms spread student-to-student", detail: "Each new case appeared a day or two after close contact with an already-sick classmate." },
          { id: "ev2", label: "Fever, sore throat, runny nose", detail: "All affected students share the same set of symptoms." },
          { id: "ev3", label: "Traced back to one returning student", detail: "The first case was a student who had just returned from a trip." },
          { id: "ev4", label: "Classroom has poor ventilation", detail: "The room has only one small window and no fan." },
          { id: "ev5", label: "One affected student also has a skin allergy", detail: "That student separately reacts to a certain soap, unrelated to the current symptoms." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Infectious disease (spread by a pathogen)",
        explanation:
          "A disease that spreads from person to person through close contact, producing the same symptom pattern in each new case and traceable to an index case, is infectious — caused by a pathogen passed between people, unlike a non-infectious disease which does not spread this way. Poor ventilation can help a pathogen spread but isn't itself evidence of infection, and the unrelated skin allergy is a distractor.",
        hint: "Look for the pattern that only spreading between people can produce — one case leading to the next.",
      },
    },
    {
      title: "The Weekend Camper's Rash",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "A student develops an itchy, blistering rash only on the arms and legs after a weekend camping trip. No one else on the trip is affected, and the rash has not spread to anyone at home.",
        evidence: [
          { id: "ev1", label: "Rash only on exposed skin", detail: "The blisters appear only on arms and legs, areas that brushed against plants during the hike." },
          { id: "ev2", label: "No one else affected", detail: "Three other students on the same trip have no symptoms at all." },
          { id: "ev3", label: "Not spreading at home", detail: "Family members in close contact have not developed the rash." },
          { id: "ev4", label: "Rash appeared hours after the hike", detail: "Symptoms began the same evening, well before any infection could typically develop." },
          { id: "ev5", label: "Student has mild seasonal pollen allergy", detail: "A separate, pre-existing allergy unrelated to this rash." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3", "ev4"],
        diagnosis: "Non-infectious reaction (contact irritant, not a pathogen)",
        explanation:
          "A skin reaction that stays limited to the person exposed to the trigger, does not spread to others in close contact, and appears within hours rather than after an incubation period, points to a non-infectious cause — most likely contact with an irritant plant — rather than a pathogen passed between people. The pre-existing pollen allergy is a separate condition and not evidence either way.",
        hint: "Ask whether this is spreading between people at all — a reaction that stays with only the exposed person usually isn't caused by a pathogen.",
      },
    },
    {
      title: "The Family Pattern",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "A student is diagnosed with a blood disorder that causes fatigue and pale skin. Investigation shows the student's parent and grandparent both have the same condition, but none of the student's close friends or classmates have ever shown similar symptoms, even after years of contact.",
        evidence: [
          { id: "ev1", label: "Runs in three generations of the same family", detail: "Parent and grandparent both diagnosed with the identical condition." },
          { id: "ev2", label: "No spread to classmates or friends", detail: "Years of close daily contact with classmates have never produced a single similar case." },
          { id: "ev3", label: "Present from early childhood", detail: "Symptoms were first noticed when the student was very young, not after any known contact with a sick person." },
          { id: "ev4", label: "Fatigue and pale skin", detail: "The main symptoms reported by the student." },
          { id: "ev5", label: "Student recently had a common cold", detail: "A separate, recent, unrelated minor illness that has already resolved." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Non-infectious disease (inherited/genetic cause)",
        explanation:
          "A condition that appears in successive generations of the same family, shows up from early childhood without any contact event, and never spreads to unrelated people despite years of close contact, points to a genetic cause rather than a pathogen — a non-infectious disease passed through inheritance, not transmission. The fatigue and pale skin describe the effect, not the cause, and the recent cold is an unrelated distractor.",
        hint: "A pattern that follows family lines but never jumps to friends, no matter how much contact, points away from anything contagious.",
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
