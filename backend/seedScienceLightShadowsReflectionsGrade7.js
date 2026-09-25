require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Science Batch 3. Adds the current NCERT Class 7 Science
// ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter 11, "Light:
// Shadows and Reflections" — verified via multiple independent
// sources: rectilinear propagation of light, transparent/translucent/
// opaque materials, shadow formation, laws of reflection, lateral
// inversion, plane mirror images, pinhole cameras, periscopes.
//
// Gap 1 (carried over from earlier batches): Physics lives inside the
// integrated "Science" subject below Grade 11, tagged strand:
// "Physics" for mastery/analytics.
//
// Reuses PHYSICS_MATCH's mapping-equality check (same shape used for
// Heat Transfer and Time & Motion) for both concepts — no new
// mechanic.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Light: Shadows and Reflections" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Light",
      title: "Light: Shadows and Reflections",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---------- Concept 1: shadows and materials ----------
  let conceptShadows = await Concept.findOne({ chapter_id: chapter._id, title: "Formation of Shadows" });
  if (!conceptShadows) {
    conceptShadows = await Concept.create({
      chapter_id: chapter._id,
      title: "Formation of Shadows",
      explanation_text:
        "Light travels in straight lines, so an opaque object blocks it completely and casts a sharp, dark shadow. A translucent material lets some light through, so it casts a faint, blurry shadow. A transparent material lets almost all light through, so it barely casts a shadow at all.",
    });
    console.log("Created concept:", conceptShadows._id);
  } else {
    console.log("Using existing concept:", conceptShadows._id);
  }

  const shadowChallenges = [
    {
      title: "Sort the Material: Transparent, Translucent, or Opaque",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Sort each material into how much light it lets through.",
        slots: [
          { id: "s1", label: "Clear glass window — you can see clearly through it" },
          { id: "s2", label: "Frosted bathroom glass — light gets through but you can't see a clear image" },
          { id: "s3", label: "A wooden door — no light passes through at all" },
          { id: "s4", label: "A glass of clean water" },
        ],
        components: [
          { id: "c1", label: "Transparent" },
          { id: "c2", label: "Translucent" },
          { id: "c3", label: "Opaque" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3", s4: "c1" },
        hint: "Can you see a clear, sharp image through it, a blurry glow, or nothing at all?",
      },
    },
    {
      title: "Sort by Shadow Behaviour",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Sort each shadow description into the material type that would cause it.",
        slots: [
          { id: "s1", label: "Objects behind it cast almost no shadow, since light passes straight through" },
          { id: "s2", label: "Objects behind it cast a full, sharp, dark shadow, since no light gets through" },
          { id: "s3", label: "Objects behind it cast a faint, blurry shadow, since only some light gets through" },
        ],
        components: [
          { id: "c1", label: "Transparent" },
          { id: "c2", label: "Opaque" },
          { id: "c3", label: "Translucent" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A sharp, dark shadow means the light was fully blocked.",
      },
    },
  ];

  for (const challenge of shadowChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_MATCH",
        concept_id: conceptShadows._id,
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

  // ---------- Concept 2: reflection ----------
  let conceptReflection = await Concept.findOne({ chapter_id: chapter._id, title: "Reflection and Mirror Images" });
  if (!conceptReflection) {
    conceptReflection = await Concept.create({
      chapter_id: chapter._id,
      title: "Reflection and Mirror Images",
      explanation_text:
        "A plane (flat) mirror reflects light to form an upright, same-size image that is laterally inverted — left and right appear swapped. This is why ambulances often have their name written backwards, so it reads correctly in a driver's rearview mirror. A pinhole camera and a periscope both use the straight-line travel of light to form images in useful ways.",
    });
    console.log("Created concept:", conceptReflection._id);
  } else {
    console.log("Using existing concept:", conceptReflection._id);
  }

  const reflectionChallenges = [
    {
      title: "Match: Reflection Term to Its Meaning",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each term to its correct meaning.",
        slots: [
          { id: "s1", label: "Lateral inversion" },
          { id: "s2", label: "Plane mirror" },
          { id: "s3", label: "Angle of incidence" },
          { id: "s4", label: "Angle of reflection" },
        ],
        components: [
          { id: "c1", label: "The left-right flip you see in a mirror image" },
          { id: "c2", label: "A flat mirror that forms an upright, same-size image" },
          { id: "c3", label: "The angle at which incoming light hits the mirror" },
          { id: "c4", label: "The angle at which light bounces off the mirror" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3", s4: "c4" },
        hint: "\"Incidence\" is the light coming in; \"reflection\" is the light bouncing back out.",
      },
    },
    {
      title: "Match: Everyday Example to the Light Concept It Shows",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each everyday example to the light concept it demonstrates.",
        slots: [
          { id: "s1", label: "The word \"AMBULANCE\" is written backwards on the front of the vehicle" },
          { id: "s2", label: "A pinhole camera projects an upside-down image of the scene outside" },
          { id: "s3", label: "A periscope lets you see around a corner or over a wall" },
        ],
        components: [
          { id: "c1", label: "Lateral inversion (so it reads correctly in a driver's mirror)" },
          { id: "c2", label: "Light travels in straight lines" },
          { id: "c3", label: "Two mirrors reflecting light in sequence" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A periscope uses two flat mirrors, angled to redirect the light path twice.",
      },
    },
  ];

  for (const challenge of reflectionChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_MATCH",
        concept_id: conceptReflection._id,
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
