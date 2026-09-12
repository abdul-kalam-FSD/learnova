require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses BIO_SPECIMEN_ANALYSIS (same
// inspect -> observe -> classify loop as the Grade 10 version) but
// with a far simpler classification target: sorting familiar animals
// into the broad groups (mammal/bird/fish/insect) taught at this
// age, instead of formal taxonomic classes.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Biology is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Biology" for mastery/analytics. See
  // migrations/mergeGrade4ScienceAndSocialScience.js for the one-time
  // migration that moves any pre-existing standalone Biology content
  // into this shape.
  let subject = await Subject.findOne({ grade: 4, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 4 });
    console.log("Created new Grade 4 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Animal Groups" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Living Things Around Us",
      title: "Animal Groups",
      order_index: 1,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Sorting Animals by Features" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Sorting Animals by Features",
      explanation_text:
        "Animals can be sorted into groups based on features you can observe: mammals have fur and feed their babies milk, birds have feathers and lay eggs, fish live in water and breathe through gills, and insects have six legs and three body parts. Looking closely at these features — not just where the animal lives — tells you which group it belongs to.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const levels = [
    {
      title: "Specimen: The Backyard Visitor",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Backyard Visitor",
        context: "A small animal is spotted hopping across the garden. Look at its features to sort it correctly.",
        features: [
          { id: "f1", label: "Covered in soft fur", detail: "Its whole body is covered in short, soft fur." },
          { id: "f2", label: "Feeds its babies milk", detail: "The mother feeds her young milk from her own body." },
          { id: "f3", label: "Has four legs", detail: "It moves around on four legs." },
          { id: "f4", label: "Seen near a water bowl", detail: "It was drinking water from a bowl in the garden." },
        ],
        classificationOptions: [
          { id: "mammal", label: "Mammal" },
          { id: "bird", label: "Bird" },
          { id: "fish", label: "Fish" },
          { id: "insect", label: "Insect" },
        ],
        correct_hotspot_id: "mammal",
        explanation:
          "Fur and feeding babies milk are the two defining features of mammals — no other animal group does both. Where it was seen drinking water doesn't tell you its group; lots of animals drink water.",
      },
    },
    {
      title: "Specimen: The Pond Dweller",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen: The Pond Dweller",
        context: "This animal was found swimming in the school pond.",
        features: [
          { id: "g1", label: "Covered in scales", detail: "Its body is covered in smooth, shiny scales." },
          { id: "g2", label: "Breathes through gills", detail: "It has gills on the sides of its head to breathe underwater." },
          { id: "g3", label: "Has fins, not legs", detail: "It swims using fins instead of legs." },
          { id: "g4", label: "Lives its whole life in water", detail: "It has never been seen out of the pond." },
        ],
        classificationOptions: [
          { id: "mammal", label: "Mammal" },
          { id: "bird", label: "Bird" },
          { id: "fish", label: "Fish" },
          { id: "insect", label: "Insect" },
        ],
        correct_hotspot_id: "fish",
        explanation:
          "Scales, gills for breathing underwater, and fins instead of legs are the defining features of fish. A mammal that swims (like an otter) still has fur and breathes air — this animal has none of that.",
      },
    },
    {
      title: "Specimen: The Buzzing Flyer",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen: The Buzzing Flyer",
        context: "A tiny creature landed on a flower in the school garden.",
        features: [
          { id: "h1", label: "Six legs", detail: "It has exactly six legs, three on each side." },
          { id: "h2", label: "Body in three parts", detail: "Its body is clearly divided into a head, middle, and tail section." },
          { id: "h3", label: "Two pairs of wings", detail: "It has two see-through wings on each side." },
          { id: "h4", label: "Landed on a yellow flower", detail: "It was seen collecting something from a yellow flower." },
        ],
        classificationOptions: [
          { id: "mammal", label: "Mammal" },
          { id: "bird", label: "Bird" },
          { id: "fish", label: "Fish" },
          { id: "insect", label: "Insect" },
        ],
        correct_hotspot_id: "insect",
        explanation:
          "Six legs and a three-part body are the defining features of insects. The flower colour doesn't matter for classification — it's just where the animal happened to be seen.",
      },
    },
  ];

  for (const level of levels) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: level.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
