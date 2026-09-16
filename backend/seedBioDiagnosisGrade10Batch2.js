require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 10 Biology expansion (Section 7 of the approved expansion
// strategy): closes the "Control and Coordination" gap. Existing
// BIO_DIAGNOSIS (seedBioDiagnosisGrade10.js) covers "Clinical
// Reasoning from Symptoms" in the "Human Health and Disease" chapter
// — this file repurposes the same evidence-card -> diagnosis shape
// for a different kind of diagnosis: given a real-life response
// scenario, the student inspects evidence about *how* the response
// happened (speed, whether it involved conscious thought, what
// carried the signal) and diagnoses *which coordination pathway* —
// voluntary nervous control, a spinal reflex, or hormonal signaling —
// explains it. Each challenge is tagged to whichever of the three
// concepts it's actually testing. Links to concepts created by
// seedGrade10.js — run that first. Same payload shape (scenario +
// evidence + correct_piece_ids + diagnosis + explanation) and scoring
// path (unordered-subset check on attempt.selectedPieceIds vs
// payload.correct_piece_ids — see gameControllers.js checkAttempt) as
// the existing Grade 10 Diagnosis file. Additive only. Safe to re-run
// (GameContent.findOne guard before every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science subject not found — run seedGrade10.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }
  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Control and Coordination" });
  if (!chapter) {
    console.error("Chapter 'Control and Coordination' not found — run seedGrade10.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptTitles = ["Nervous System", "Reflex Action", "Hormonal Coordination"];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade10.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const nervousSystemChallenges = [
    {
      title: "The Chess Player's Decision",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario:
          "A chess player studies the board for two full minutes, weighing several possible moves, before deliberately moving her bishop.",
        evidence: [
          { id: "ev1", label: "Took two minutes to respond", detail: "A slow, deliberate response rather than an instant one." },
          { id: "ev2", label: "Weighed several possible moves", detail: "Multiple options were consciously considered before acting." },
          { id: "ev3", label: "Deliberately chose to move the bishop", detail: "The action was a willed, conscious decision, not an automatic reaction." },
          { id: "ev4", label: "Was sitting in a quiet room", detail: "The room's noise level had no bearing on how the decision was made." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Voluntary nervous system control",
        explanation:
          "Weighing options and consciously deciding on an action is the signature of voluntary nervous control — the brain processes information, considers alternatives, and sends a deliberate signal to the muscles. This is different from a reflex (which is involuntary and near-instant) or hormonal coordination (which acts over minutes to hours via the bloodstream, not through a single willed decision). The quiet room is irrelevant to the reasoning process.",
        hint: "Look for evidence about conscious choice and weighing options — that's what separates willed action from an automatic one.",
      },
    },
    {
      title: "The Careful Threading of a Needle",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "A tailor threads a needle, making tiny, precise adjustments to his hand position while watching closely and correcting his aim each time he misses.",
        evidence: [
          { id: "ev1", label: "Makes precise, corrected adjustments", detail: "Each attempt is fine-tuned based on what was seen in the previous attempt." },
          { id: "ev2", label: "Watches closely while acting", detail: "Visual feedback is being used continuously to guide the hand." },
          { id: "ev3", label: "Repeats the action many times", detail: "Several attempts were needed before success." },
          { id: "ev4", label: "Is an experienced tailor", detail: "Years of experience with needlework, unrelated to what's happening in this specific moment." },
        ],
        correct_piece_ids: ["ev1", "ev2"],
        diagnosis: "Voluntary nervous system control",
        explanation:
          "Continuously using visual feedback to consciously fine-tune a movement is voluntary nervous control at work — the brain is actively monitoring and adjusting the action in real time, which only a consciously directed process can do. Repeating an action isn't itself diagnostic (reflexes repeat too), and his general experience level doesn't explain what's happening in this specific instance.",
        hint: "Focus on the evidence that shows conscious, real-time correction — not on how many times something happened or how experienced he is in general.",
      },
    },
  ];

  const reflexChallenges = [
    {
      title: "Touching a Hot Pan",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario:
          "A cook's hand jerks away from a hot pan almost instantly, before she even consciously registers the pain.",
        evidence: [
          { id: "ev1", label: "Happened almost instantly", detail: "The hand moved away in a fraction of a second." },
          { id: "ev2", label: "Occurred before conscious pain registered", detail: "The withdrawal happened before she was even aware of feeling pain." },
          { id: "ev3", label: "No decision-making involved", detail: "There was no weighing of options — the hand simply moved." },
          { id: "ev4", label: "The pan was on a working stove", detail: "Describes the setting, not anything about how her body responded." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Reflex action (spinal reflex arc)",
        explanation:
          "A response that happens before conscious awareness, with no decision-making, is a reflex — the signal travels a short reflex arc through the spinal cord and straight back to the muscle, without waiting for the brain to process it first. That's what makes reflexes so much faster than voluntary responses. Where the pan was sitting has nothing to do with how her nervous system responded.",
        hint: "The key clue is that it happened before she was even consciously aware of the pain — that timing only fits one kind of response.",
      },
    },
    {
      title: "The Doctor's Knee Tap",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "During a checkup, a doctor taps just below a patient's kneecap with a small hammer, and the patient's lower leg kicks forward automatically, without the patient trying to move it.",
        evidence: [
          { id: "ev1", label: "Kick happened automatically", detail: "The leg moved without the patient intending or trying to move it." },
          { id: "ev2", label: "Same response every time it's tested", detail: "The kick happens consistently and predictably whenever the tap is applied correctly." },
          { id: "ev3", label: "Triggered by a specific physical tap", detail: "A precise external stimulus set off the response — not a thought or decision." },
          { id: "ev4", label: "The patient is a first-time visitor to this doctor", detail: "Has no bearing on how the leg responds to the tap." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Reflex action (spinal reflex arc)",
        explanation:
          "An automatic, consistent, stimulus-triggered response with no conscious intention behind it is the classic pattern of a reflex — in this case the knee-jerk (patellar) reflex, a standard neurological test precisely because it bypasses the brain and reveals how the spinal reflex arc itself is functioning. Being a first-time patient doesn't affect the physical reflex pathway at all.",
        hint: "Notice that the response is exactly the same every time, with no intention behind it — that consistency is a reflex hallmark.",
      },
    },
  ];

  const hormonalChallenges = [
    {
      title: "The Slow Build of a Growth Spurt",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario:
          "Over the course of a year, a teenager grows several centimeters taller, with changes happening gradually across many months rather than in a single moment.",
        evidence: [
          { id: "ev1", label: "Change unfolded over many months", detail: "Growth happened gradually across the whole year, not instantly." },
          { id: "ev2", label: "No single triggering event", detail: "There was no specific moment or stimulus that set it off." },
          { id: "ev3", label: "Affected the whole body's growth", detail: "The effect was widespread and general, not localized to one muscle or reflex." },
          { id: "ev4", label: "The teenager plays a sport twice a week", detail: "An unrelated lifestyle detail with no bearing on the underlying growth process." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Hormonal coordination",
        explanation:
          "A slow, gradual, whole-body change with no single triggering event is the signature of hormonal coordination — chemical messengers released into the bloodstream (here, growth hormone) act on tissues throughout the body over an extended period, unlike the instant, localized signals of the nervous system. Playing a sport is a lifestyle detail unrelated to the hormonal process itself.",
        hint: "Notice how long this took and how widespread the effect was — that pace and scale point away from anything nerve-based.",
      },
    },
    {
      title: "Staying Calm After the Scare Passes",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario:
          "A hiker is startled by a sudden noise and her heart races immediately — but even after the danger turns out to be nothing, her heart stays fast and her body stays 'on edge' for several more minutes before gradually calming down.",
        evidence: [
          { id: "ev1", label: "Effect lingered for several minutes after the trigger ended", detail: "The heightened state continued well past the moment the danger was gone." },
          { id: "ev2", label: "Calmed down gradually, not instantly", detail: "There was no sudden switch-off — the feeling faded slowly over time." },
          { id: "ev3", label: "Affected heart rate and overall body state broadly", detail: "Multiple body systems stayed activated together, not just one muscle group." },
          { id: "ev4", label: "The initial startle reaction itself was instant", detail: "Describes the very first split-second jump — a separate nervous reflex, not the lingering part being asked about here." },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Hormonal coordination",
        explanation:
          "The instant startle jump is a fast nervous reflex, but the evidence here is specifically about what happens *after* that — the lingering, slowly-fading, whole-body 'on edge' state. That slower, broader, longer-lasting pattern is hormonal: adrenaline released into the bloodstream during the scare keeps circulating and acting on the body until it's gradually broken down, long after the nervous signal that triggered it has finished.",
        hint: "Don't get distracted by the instant first jump — focus on what the evidence says about what happens in the minutes afterward.",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Nervous System"], levels: nervousSystemChallenges },
    { concept: concepts["Reflex Action"], levels: reflexChallenges },
    { concept: concepts["Hormonal Coordination"], levels: hormonalChallenges },
  ];

  for (const { concept, levels } of allChallenges) {
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
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
