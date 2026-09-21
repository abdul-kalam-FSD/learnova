require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 6 (Grade 4-5 curriculum depth audit). "Shapes All Around"
// (Grade 4 Mathematics, seedMathGrade4.js) has exactly one concept,
// "Naming Basic Shapes," whose own explanation_text says: "Learning
// to spot these shapes around you is the first step BEFORE counting
// sides or measuring angles." That follow-on skill — counting
// sides — is never actually taught anywhere in Grade 4 Math: the
// chapter tests recognition/naming only, never quantifying. This adds
// a NEW concept, "Counting Sides and Corners," using the SAME
// MATH_SHAPE_MATCH mechanic already used one grade up (Grade 6's
// "Match: Shape to Sides," reused here at a simpler Grade 4 level —
// no angle-sum content, which stays a Grade 6 topic). This is a
// genuine missing skill the curriculum itself already promised, not
// manufactured filler. Errors out if the subject/chapter don't
// already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: /mathematics/i });
  if (!subject) {
    console.error("Grade 4 Mathematics subject not found — run seedMathGrade4.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter =
    (await Chapter.findOne({ subject_id: subject._id, title: "Shapes Around Us" })) ||
    (await Chapter.findOne({ subject_id: subject._id, title: "Shapes All Around" }));
  if (!chapter) {
    console.error('Chapter "Shapes Around Us" not found — run seedMathGrade4.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Counting Sides and Corners" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Counting Sides and Corners",
      explanation_text:
        "Once you can name a shape, the next step is counting how many straight sides it has. A triangle has 3 sides, a square and a rectangle both have 4, and a pentagon has 5. A circle is a special case — it has no straight sides at all, just one curved edge.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 6's "Match: Shape to Sides" —
  // `slots` are shapes (rendered via `shape`), `components` are
  // side-count cards, `correct_mapping` is { slotId: componentId }.
  const sideCountChallenges = [
    {
      title: "Match: Shape to Number of Sides — Set 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each shape to how many straight sides it has.",
        slots: [
          { id: "s1", shape: "triangle", label: "Triangle" },
          { id: "s2", shape: "square", label: "Square" },
          { id: "s3", shape: "circle", label: "Circle" },
        ],
        components: [
          { id: "c1", label: "3 sides" },
          { id: "c2", label: "4 sides" },
          { id: "c3", label: "0 straight sides" },
          { id: "c4", label: "5 sides" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Count the straight edges you'd have to draw to trace each shape. A circle is all curve, no straight lines.",
      },
    },
    {
      title: "Match: Shape to Number of Sides — Set 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "This time there's a rectangle and a pentagon too.",
        slots: [
          { id: "t1", shape: "rectangle", label: "Rectangle" },
          { id: "t2", shape: "pentagon", label: "Pentagon" },
          { id: "t3", shape: "triangle", label: "Triangle" },
        ],
        components: [
          { id: "d1", label: "4 sides" },
          { id: "d2", label: "5 sides" },
          { id: "d3", label: "3 sides" },
          { id: "d4", label: "6 sides" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "A rectangle has 4 sides just like a square — they just aren't all the same length.",
      },
    },
    {
      title: "Counting Sides on Classroom Objects",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "These shapes are drawn based on real classroom objects — match each to its number of sides.",
        slots: [
          { id: "u1", shape: "rectangle", label: "The door" },
          { id: "u2", shape: "circle", label: "The clock" },
          { id: "u3", shape: "triangle", label: "The set-square corner" },
          { id: "u4", shape: "pentagon", label: "The school crossing sign" },
        ],
        components: [
          { id: "e1", label: "0 straight sides" },
          { id: "e2", label: "3 sides" },
          { id: "e3", label: "4 sides" },
          { id: "e4", label: "5 sides" },
        ],
        correct_mapping: { u1: "e3", u2: "e1", u3: "e2", u4: "e4" },
        hint: "Trace around each real object in your head and count where it turns a corner — each corner ends one straight side and starts the next.",
      },
    },
  ];

  for (const challenge of sideCountChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_SHAPE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_SHAPE_MATCH",
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
