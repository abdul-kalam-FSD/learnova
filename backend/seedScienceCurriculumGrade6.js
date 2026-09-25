require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 6 integrated Science - Curiosity (chapters 1-12)
// Generated content for the current 2026-27 Grade 6 curriculum. Idempotent:
// every Chapter/Concept/GameContent is looked up before it is created
// (GameContent is keyed on {game_type, title}), so re-running is safe.
// All reused mechanics keep their existing technical game_type (see the
// Phase 1 audit, GLOBAL-2); no new mechanic or shared UI/scoring change.
// Grade 6 Science is ONE integrated subject; no Physics/Chemistry/Biology subject split is recreated. Chapters 2, 4 and 9 already exist from seedBiologyGrade6.js / seedPhysicsMatchGrade6.js / seedChemistryGrade6.js.

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /^science$/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 6 });
    console.log("Created new Grade 6 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- Chapter 1: The Wonderful World of Science ----------
  let chapter1 = await Chapter.findOne({ subject_id: subject._id, title: "The Wonderful World of Science" });
  if (!chapter1) {
    chapter1 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "The Wonderful World of Science",
      order_index: 1,
    });
    console.log("Created chapter:", chapter1._id);
  } else {
    console.log("Using existing chapter:", chapter1._id);
  }

  let concept1_1 = await Concept.findOne({ chapter_id: chapter1._id, title: "Thinking and Working Like a Scientist" });
  if (!concept1_1) {
    concept1_1 = await Concept.create({
      chapter_id: chapter1._id,
      title: "Thinking and Working Like a Scientist",
      explanation_text:
        "Scientists ask questions, make predictions, test them with fair experiments, record what they observe and draw conclusions from the evidence.",
    });
    console.log("Created concept:", concept1_1._id);
  } else {
    console.log("Using existing concept:", concept1_1._id);
  }

  const levels1_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Investigating a Science Question",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps a student follows to investigate: Does a plant need light to grow well?",
        scrambled_steps: [
          {
            id: "st2",
            label: "Set up two identical plants, one in light and one in the dark",
          },
          {
            id: "st4",
            label: "Record what you see and draw a conclusion from the evidence",
          },
          {
            id: "st3",
            label: "Water both equally and observe them for several days",
          },
          {
            id: "st1",
            label: "Ask the question and make a prediction",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Plan the test before you observe, and conclude only after you have recorded results.",
      },
    },
  ];
  for (const challenge of levels1_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept1_1._id,
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

  const levels1_1_BIO_DIAGNOSIS = [
    {
      title: "Evidence: Does a Plant Need Light?",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "A student keeps two identical plants in identical pots with the same soil and water. One sits by a window and one sits in a dark cupboard. After a week the cupboard plant is pale and drooping while the window plant is green and firm. Which observations support the conclusion that plants need light to stay healthy?",
        evidence: [
          {
            id: "ev1",
            label: "Cupboard plant: pale, yellowish leaves",
            detail: "The leaves lost their green colour in the dark.",
          },
          {
            id: "ev2",
            label: "Cupboard plant: drooping stem",
            detail: "The stem could not stay upright without light.",
          },
          {
            id: "ev3",
            label: "Window plant: green, firm leaves",
            detail: "With light and the same water, the plant stayed healthy.",
          },
          {
            id: "ev4",
            label: "Both pots have the same soil and water",
            detail: "This shows the test was fair, but does not itself show what light does.",
          },
          {
            id: "ev5",
            label: "The cupboard plant's pot is blue",
            detail: "The colour of the pot has nothing to do with plant health.",
          },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Plants need light to stay healthy",
        explanation: "Because everything else was kept the same, the difference in health points to light. The soil and water being equal makes the test fair, and the pot colour is irrelevant.",
        hint: "Look for observations that compare the two plants and connect to the one thing that differed.",
      },
    },
  ];
  for (const challenge of levels1_1_BIO_DIAGNOSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_DIAGNOSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_DIAGNOSIS",
        concept_id: concept1_1._id,
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

  // ---------- Chapter 2: Diversity in the Living World ----------
  let chapter2 = await Chapter.findOne({ subject_id: subject._id, title: "Diversity in the Living World" });
  if (!chapter2) {
    throw new Error("Chapter Diversity in the Living World not found. Run the earlier Grade 6 seeds (or migrations/realignGrade6Curriculum.js) first.");
  }

  let concept2_1 = await Concept.findOne({ chapter_id: chapter2._id, title: "Grouping Plants by Their Form" });
  if (!concept2_1) {
    concept2_1 = await Concept.create({
      chapter_id: chapter2._id,
      title: "Grouping Plants by Their Form",
      explanation_text:
        "Plants can be grouped as herbs, shrubs and trees based on the size, stem and life of the plant. Herbs are small with soft green stems, shrubs are bushy with several woody stems, and trees are tall with a thick woody trunk.",
    });
    console.log("Created concept:", concept2_1._id);
  } else {
    console.log("Using existing concept:", concept2_1._id);
  }

  const levels2_1_BIO_SPECIMEN_ANALYSIS = [
    {
      title: "Specimen: The Soft-Stemmed Plant",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Soft-Stemmed Plant",
        context: "A small plant growing in a garden bed. Inspect its features to sort it into the right group.",
        features: [
          {
            id: "f1",
            label: "Stem is green and soft",
            detail: "You can bend the stem easily with your fingers.",
          },
          {
            id: "f2",
            label: "Grows only about 30 cm tall",
            detail: "It stays very short compared with most plants.",
          },
          {
            id: "f3",
            label: "Lives for a short time",
            detail: "It dies within a season or two.",
          },
          {
            id: "f4",
            label: "Grew in a garden bed",
            detail: "This tells us where it lives, not its group.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Tree",
          },
          {
            id: "o2",
            label: "Herb",
          },
          {
            id: "o3",
            label: "Shrub",
          },
          {
            id: "o4",
            label: "Climber",
          },
        ],
        correct_hotspot_id: "o2",
        explanation: "A short plant with a soft green stem that lives only a short time is a herb. Where it grows does not decide its group.",
      },
    },
    {
      title: "Specimen: The Tall Woody Plant",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen: The Tall Woody Plant",
        context: "A plant seen along a road. Inspect its features to sort it correctly.",
        features: [
          {
            id: "f1",
            label: "Grows many metres tall",
            detail: "Its top reaches well above the roofs nearby.",
          },
          {
            id: "f2",
            label: "One thick, hard, woody trunk",
            detail: "Its trunk is too thick to put your arms around.",
          },
          {
            id: "f3",
            label: "Branches start high above the ground",
            detail: "The lower trunk is bare.",
          },
          {
            id: "f4",
            label: "Has green leaves",
            detail: "Most plants do, so this does not help sort it.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Herb",
          },
          {
            id: "o2",
            label: "Shrub",
          },
          {
            id: "o3",
            label: "Climber",
          },
          {
            id: "o4",
            label: "Tree",
          },
        ],
        correct_hotspot_id: "o4",
        explanation: "A tall plant with a single thick woody trunk and branches high up is a tree. Having green leaves is common to all these plants.",
      },
    },
  ];
  for (const challenge of levels2_1_BIO_SPECIMEN_ANALYSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept2_1._id,
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

  let concept2_2 = await Concept.findOne({ chapter_id: chapter2._id, title: "Grouping Animals by Their Features" });
  if (!concept2_2) {
    concept2_2 = await Concept.create({
      chapter_id: chapter2._id,
      title: "Grouping Animals by Their Features",
      explanation_text:
        "Animals can be sorted by features such as body covering, number of legs and body parts. Insects have three body parts and six legs.",
    });
    console.log("Created concept:", concept2_2._id);
  } else {
    console.log("Using existing concept:", concept2_2._id);
  }

  const levels2_2_BIO_SPECIMEN_ANALYSIS = [
    {
      title: "Specimen: The Six-Legged Visitor",
      difficulty: "medium",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Six-Legged Visitor",
        context: "A small creature lands on a leaf. Look at its features to sort it into the right group.",
        features: [
          {
            id: "f1",
            label: "Body has three parts",
            detail: "It has a head, a thorax and an abdomen.",
          },
          {
            id: "f2",
            label: "Six legs",
            detail: "Three pairs of legs are attached to the middle part.",
          },
          {
            id: "f3",
            label: "A pair of feelers",
            detail: "It has two antennae on its head.",
          },
          {
            id: "f4",
            label: "Found on a leaf",
            detail: "Many animals live on leaves, so this does not sort it.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Spider",
          },
          {
            id: "o2",
            label: "Insect",
          },
          {
            id: "o3",
            label: "Bird",
          },
          {
            id: "o4",
            label: "Fish",
          },
        ],
        correct_hotspot_id: "o2",
        explanation: "Three body parts, six legs and a pair of feelers are the features of an insect. A spider has eight legs.",
      },
    },
  ];
  for (const challenge of levels2_2_BIO_SPECIMEN_ANALYSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept2_2._id,
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

  // ---------- Chapter 3: Mindful Eating: A Path to a Healthy Body ----------
  let chapter3 = await Chapter.findOne({ subject_id: subject._id, title: "Mindful Eating: A Path to a Healthy Body" });
  if (!chapter3) {
    chapter3 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Mindful Eating: A Path to a Healthy Body",
      order_index: 3,
    });
    console.log("Created chapter:", chapter3._id);
  } else {
    console.log("Using existing chapter:", chapter3._id);
  }

  let concept3_1 = await Concept.findOne({ chapter_id: chapter3._id, title: "Nutrients and Their Jobs" });
  if (!concept3_1) {
    concept3_1 = await Concept.create({
      chapter_id: chapter3._id,
      title: "Nutrients and Their Jobs",
      explanation_text:
        "Food gives us nutrients: carbohydrates for energy, proteins for growth and repair, fats for stored energy, and vitamins and minerals to protect the body. Fibre and water are also needed.",
    });
    console.log("Created concept:", concept3_1._id);
  } else {
    console.log("Using existing concept:", concept3_1._id);
  }

  const levels3_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: What Nutrients Do",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each nutrient to its main job in the body.",
        slots: [
          {
            id: "s1",
            label: "Carbohydrates",
          },
          {
            id: "s2",
            label: "Proteins",
          },
          {
            id: "s3",
            label: "Fats",
          },
          {
            id: "s4",
            label: "Vitamins and minerals",
          },
        ],
        components: [
          {
            id: "c4",
            label: "Protect the body and keep it working well, found in fruits and vegetables",
          },
          {
            id: "c3",
            label: "Store energy and protect organs, found in oils, nuts and ghee",
          },
          {
            id: "c2",
            label: "Help the body grow and repair itself, found in pulses, eggs and milk",
          },
          {
            id: "c5",
            label: "Provide no nutrition and should replace meals",
          },
          {
            id: "c1",
            label: "Give quick energy, found in foods such as rice, wheat and potatoes",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Match by the job first: energy, growth, storage or protection.",
      },
    },
  ];
  for (const challenge of levels3_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: concept3_1._id,
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

  let concept3_2 = await Concept.findOne({ chapter_id: chapter3._id, title: "Deficiency and Diet" });
  if (!concept3_2) {
    concept3_2 = await Concept.create({
      chapter_id: chapter3._id,
      title: "Deficiency and Diet",
      explanation_text:
        "A diet that lacks a needed nutrient can cause deficiency problems, such as trouble seeing in dim light from too little vitamin A, or a swelling in the neck from too little iodine.",
    });
    console.log("Created concept:", concept3_2._id);
  } else {
    console.log("Using existing concept:", concept3_2._id);
  }

  const levels3_2_BIO_DIAGNOSIS = [
    {
      title: "Diagnosis: Trouble Seeing at Dusk",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "A child eats mostly polished rice and very few vegetables, fruits or milk. In the evening the child finds it very hard to see in dim light. Which observations point to the cause?",
        evidence: [
          {
            id: "ev1",
            label: "Difficulty seeing in dim light",
            detail: "The child bumps into things at dusk but sees well in bright light.",
          },
          {
            id: "ev2",
            label: "Diet lacks yellow-orange fruit, green leafy vegetables and milk",
            detail: "These are good sources of vitamin A.",
          },
          {
            id: "ev3",
            label: "Diet is mostly polished rice",
            detail: "Rice gives energy but almost no vitamin A.",
          },
          {
            id: "ev4",
            label: "The child wears a red cap",
            detail: "The cap colour does not affect eyesight.",
          },
          {
            id: "ev5",
            label: "The child sleeps nine hours",
            detail: "A normal amount of sleep does not explain the problem.",
          },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Vitamin A deficiency (night blindness)",
        explanation: "Vitamin A helps the eyes work in dim light. A diet with almost no vitamin A-rich food can cause night blindness.",
        hint: "Link the eyesight symptom to what is missing from the diet.",
      },
    },
    {
      title: "Diagnosis: A Swelling in the Neck",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scenario: "A young girl has a swelling at the front of her neck. She lives far from the sea and her family uses ordinary salt that has not been iodised. Which observations point to the cause?",
        evidence: [
          {
            id: "ev1",
            label: "Swelling at the front of the neck",
            detail: "The thyroid gland is enlarged.",
          },
          {
            id: "ev2",
            label: "Family uses non-iodised salt",
            detail: "There is little iodine in their meals.",
          },
          {
            id: "ev3",
            label: "Lives far from the sea",
            detail: "Foods from far inland can contain little natural iodine.",
          },
          {
            id: "ev4",
            label: "She plays cricket every day",
            detail: "Exercise does not cause this swelling.",
          },
          {
            id: "ev5",
            label: "Her school bag is heavy",
            detail: "A heavy bag does not swell the neck.",
          },
        ],
        correct_piece_ids: ["ev1", "ev2", "ev3"],
        diagnosis: "Iodine deficiency (goitre)",
        explanation: "The body needs iodine to make thyroid hormones. Too little iodine can enlarge the thyroid gland, which shows as a swelling in the neck.",
        hint: "Look for a missing nutrient that can explain a swollen neck.",
      },
    },
  ];
  for (const challenge of levels3_2_BIO_DIAGNOSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_DIAGNOSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_DIAGNOSIS",
        concept_id: concept3_2._id,
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

  let concept3_3 = await Concept.findOne({ chapter_id: chapter3._id, title: "Mindful Eating Habits" });
  if (!concept3_3) {
    concept3_3 = await Concept.create({
      chapter_id: chapter3._id,
      title: "Mindful Eating Habits",
      explanation_text:
        "Mindful eating means paying attention to what and how we eat: washing hands, eating slowly and stopping when full.",
    });
    console.log("Created concept:", concept3_3._id);
  } else {
    console.log("Using existing concept:", concept3_3._id);
  }

  const levels3_3_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Eating Mindfully",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of a mindful, healthy meal.",
        scrambled_steps: [
          {
            id: "st4",
            label: "Stop eating when you feel full",
          },
          {
            id: "st3",
            label: "Eat slowly and chew well",
          },
          {
            id: "st2",
            label: "Serve a sensible portion of a balanced meal",
          },
          {
            id: "st1",
            label: "Wash your hands before sitting down",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Get ready first, then eat slowly, and stop when you feel full.",
      },
    },
  ];
  for (const challenge of levels3_3_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept3_3._id,
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

  // ---------- Chapter 4: Exploring Magnets ----------
  let chapter4 = await Chapter.findOne({ subject_id: subject._id, title: "Exploring Magnets" });
  if (!chapter4) {
    throw new Error("Chapter Exploring Magnets not found. Run the earlier Grade 6 seeds (or migrations/realignGrade6Curriculum.js) first.");
  }

  let concept4_1 = await Concept.findOne({ chapter_id: chapter4._id, title: "Poles, Compass and Magnetic Behaviour" });
  if (!concept4_1) {
    concept4_1 = await Concept.create({
      chapter_id: chapter4._id,
      title: "Poles, Compass and Magnetic Behaviour",
      explanation_text:
        "A magnet has two poles. Like poles repel and unlike poles attract. A freely swinging magnet settles in the north–south direction, which is how a compass works.",
    });
    console.log("Created concept:", concept4_1._id);
  } else {
    console.log("Using existing concept:", concept4_1._id);
  }

  const levels4_1_PHYSICS_MATCH = [
    {
      title: "Match: Poles and Behaviour",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each situation to what happens.",
        slots: [
          {
            id: "s1",
            label: "North pole brought near another north pole",
          },
          {
            id: "s2",
            label: "North pole brought near a south pole",
          },
          {
            id: "s3",
            label: "A bar magnet hung freely from a thread",
          },
        ],
        components: [
          {
            id: "c3",
            label: "It comes to rest pointing roughly north–south",
          },
          {
            id: "c1",
            label: "The two magnets push apart",
          },
          {
            id: "c2",
            label: "The two magnets pull together",
          },
          {
            id: "c4",
            label: "Nothing happens, because magnets only affect other magnets",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Like poles repel; unlike poles attract; a free magnet points north–south.",
      },
    },
    {
      title: "Match: Uses of Magnets",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each everyday item to how a magnet is used in it.",
        slots: [
          {
            id: "s1",
            label: "A compass needle",
          },
          {
            id: "s2",
            label: "A magnetic door catch",
          },
          {
            id: "s3",
            label: "A magnetic separator at a recycling plant",
          },
        ],
        components: [
          {
            id: "c2",
            label: "Holds a door shut by attracting an iron or steel plate",
          },
          {
            id: "c3",
            label: "Pulls iron and steel pieces out of a mixed pile of waste",
          },
          {
            id: "c4",
            label: "Keeps a plastic lunch-box lid closed by attracting the plastic",
          },
          {
            id: "c1",
            label: "Turns to point north–south to help you find direction",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Each item uses either the north–south behaviour or the attraction of magnets to iron.",
      },
    },
  ];
  for (const challenge of levels4_1_PHYSICS_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_MATCH",
        concept_id: concept4_1._id,
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

  // ---------- Chapter 5: Measurement of Length and Motion ----------
  let chapter5 = await Chapter.findOne({ subject_id: subject._id, title: "Measurement of Length and Motion" });
  if (!chapter5) {
    chapter5 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Measurement of Length and Motion",
      order_index: 5,
    });
    console.log("Created chapter:", chapter5._id);
  } else {
    console.log("Using existing chapter:", chapter5._id);
  }

  let concept5_1 = await Concept.findOne({ chapter_id: chapter5._id, title: "Measuring Length" });
  if (!concept5_1) {
    concept5_1 = await Concept.create({
      chapter_id: chapter5._id,
      title: "Measuring Length",
      explanation_text:
        "Length is measured in units such as millimetres, centimetres, metres and kilometres. The metre is the standard (SI) unit of length. The right unit and the right way to use a ruler give accurate measurements.",
    });
    console.log("Created concept:", concept5_1._id);
  } else {
    console.log("Using existing concept:", concept5_1._id);
  }

  const levels5_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Choosing the Right Unit",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each measurement to the unit that suits it best.",
        slots: [
          {
            id: "s1",
            label: "The length of a classroom",
          },
          {
            id: "s2",
            label: "The distance between two cities",
          },
          {
            id: "s3",
            label: "The thickness of a coin",
          },
        ],
        components: [
          {
            id: "c1",
            label: "Metre (m)",
          },
          {
            id: "c4",
            label: "Litre (L)",
          },
          {
            id: "c2",
            label: "Kilometre (km)",
          },
          {
            id: "c3",
            label: "Millimetre (mm)",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Choose a big unit for big distances and a small unit for tiny lengths.",
      },
    },
  ];
  for (const challenge of levels5_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: concept5_1._id,
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

  const levels5_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Measuring a Pencil Correctly",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps for measuring the length of a pencil with a ruler.",
        scrambled_steps: [
          {
            id: "st4",
            label: "Write the reading with its unit",
          },
          {
            id: "st2",
            label: "Keep your eye directly above the other end of the pencil",
          },
          {
            id: "st3",
            label: "Read the mark that lines up with the other end",
          },
          {
            id: "st1",
            label: "Place the pencil along the ruler with one end at the 0 mark",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Start at zero, look straight down, then read and record the value with its unit.",
      },
    },
  ];
  for (const challenge of levels5_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept5_1._id,
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

  let concept5_2 = await Concept.findOne({ chapter_id: chapter5._id, title: "Types of Motion" });
  if (!concept5_2) {
    concept5_2 = await Concept.create({
      chapter_id: chapter5._id,
      title: "Types of Motion",
      explanation_text:
        "Objects can move in a straight line (linear motion), around a fixed point (circular motion), spin about their own axis (rotational motion) or repeat a to-and-fro movement (periodic motion).",
    });
    console.log("Created concept:", concept5_2._id);
  } else {
    console.log("Using existing concept:", concept5_2._id);
  }

  const levels5_2_BIO_SPECIMEN_ANALYSIS = [
    {
      title: "Specimen: The Playground Swing",
      difficulty: "medium",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Playground Swing",
        context: "A swing in a park moves back and forth. Inspect its motion to classify it.",
        features: [
          {
            id: "f1",
            label: "Moves to and fro along a curved path",
            detail: "It swings forward and back.",
          },
          {
            id: "f2",
            label: "Repeats the same movement again and again",
            detail: "Each swing looks like the last.",
          },
          {
            id: "f3",
            label: "Each swing takes about equal time",
            detail: "A full swing takes the same time each turn.",
          },
          {
            id: "f4",
            label: "Has a seat and two chains",
            detail: "This describes the swing, not its motion.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Linear motion",
          },
          {
            id: "o2",
            label: "Rotational motion",
          },
          {
            id: "o3",
            label: "Periodic motion",
          },
          {
            id: "o4",
            label: "Circular motion",
          },
        ],
        correct_hotspot_id: "o3",
        explanation: "A movement that repeats after equal intervals of time is periodic motion. A swing moves to and fro in this way.",
      },
    },
    {
      title: "Specimen: The Spinning Top",
      difficulty: "hard",
      order_index: 2,
      payload: {
        specimenName: "Specimen: The Spinning Top",
        context: "A toy top is spinning on the floor. Inspect its motion to classify it.",
        features: [
          {
            id: "f1",
            label: "Turns around a line through its own body",
            detail: "It spins about its own axis.",
          },
          {
            id: "f2",
            label: "Its tip stays almost in one place",
            detail: "It does not travel across the floor much.",
          },
          {
            id: "f3",
            label: "Made of painted wood",
            detail: "This describes the material, not the motion.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Rotational motion",
          },
          {
            id: "o2",
            label: "Linear motion",
          },
          {
            id: "o3",
            label: "Periodic motion",
          },
          {
            id: "o4",
            label: "Circular motion",
          },
        ],
        correct_hotspot_id: "o1",
        explanation: "A body that spins around its own axis shows rotational motion. Circular motion is different: the whole object travels around a fixed point.",
      },
    },
  ];
  for (const challenge of levels5_2_BIO_SPECIMEN_ANALYSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept5_2._id,
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

  // ---------- Chapter 6: Materials Around Us ----------
  let chapter6 = await Chapter.findOne({ subject_id: subject._id, title: "Materials Around Us" });
  if (!chapter6) {
    chapter6 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Materials Around Us",
      order_index: 6,
    });
    console.log("Created chapter:", chapter6._id);
  } else {
    console.log("Using existing chapter:", chapter6._id);
  }

  let concept6_1 = await Concept.findOne({ chapter_id: chapter6._id, title: "Sorting Materials by Properties" });
  if (!concept6_1) {
    concept6_1 = await Concept.create({
      chapter_id: chapter6._id,
      title: "Sorting Materials by Properties",
      explanation_text:
        "Materials are sorted by how they behave: transparent materials let light through so we can see clearly, translucent ones let some light through, and opaque ones block light. Some materials dissolve in water and others do not.",
    });
    console.log("Created concept:", concept6_1._id);
  } else {
    console.log("Using existing concept:", concept6_1._id);
  }

  const levels6_1_CHEMISTRY_MATCH = [
    {
      title: "Match: Transparent, Translucent or Opaque",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each material to how it behaves with light.",
        slots: [
          {
            id: "s1",
            label: "A clear glass window pane",
          },
          {
            id: "s2",
            label: "Frosted bathroom glass",
          },
          {
            id: "s3",
            label: "A wooden door",
          },
        ],
        components: [
          {
            id: "c3",
            label: "Blocks light completely",
          },
          {
            id: "c2",
            label: "Lets some light through but you cannot see clearly through it",
          },
          {
            id: "c1",
            label: "Lets light through so you see clearly through it",
          },
          {
            id: "c4",
            label: "Produces its own light",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Think of whether you can see through it clearly, blurrily or not at all.",
      },
    },
    {
      title: "Match: Mixing with Water",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each substance to what happens when you stir it into water.",
        slots: [
          {
            id: "s1",
            label: "Salt",
          },
          {
            id: "s2",
            label: "Sand",
          },
          {
            id: "s3",
            label: "Cooking oil",
          },
        ],
        components: [
          {
            id: "c3",
            label: "Floats as a separate layer and does not mix",
          },
          {
            id: "c1",
            label: "Dissolves completely and gives a clear solution",
          },
          {
            id: "c2",
            label: "Stays as separate grains that settle at the bottom",
          },
          {
            id: "c4",
            label: "Turns into a solid block",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Some materials disappear into water, some sink as grains, and some float in a layer.",
      },
    },
  ];
  for (const challenge of levels6_1_CHEMISTRY_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: concept6_1._id,
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

  const levels6_1_BIO_SPECIMEN_ANALYSIS = [
    {
      title: "Specimen: The Cooking Pot",
      difficulty: "hard",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Cooking Pot",
        context: "A kitchen pot is being used on a stove. Inspect its features to decide what kind of material it is made of.",
        features: [
          {
            id: "f1",
            label: "Shiny when polished",
            detail: "Its surface gleams.",
          },
          {
            id: "f2",
            label: "Heats up quickly on the flame",
            detail: "Heat travels through it fast.",
          },
          {
            id: "f3",
            label: "Makes a ringing sound when tapped",
            detail: "It gives a clear ringing note.",
          },
          {
            id: "f4",
            label: "Found in the kitchen",
            detail: "This says where it is, not what it is made of.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Wood",
          },
          {
            id: "o2",
            label: "Plastic",
          },
          {
            id: "o3",
            label: "Metal",
          },
          {
            id: "o4",
            label: "Glass",
          },
        ],
        correct_hotspot_id: "o3",
        explanation: "Shiny, quick to heat and ringing when struck are properties of metals. Being in the kitchen does not describe the material.",
      },
    },
  ];
  for (const challenge of levels6_1_BIO_SPECIMEN_ANALYSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept6_1._id,
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

  // ---------- Chapter 7: Temperature and its Measurement ----------
  let chapter7 = await Chapter.findOne({ subject_id: subject._id, title: "Temperature and its Measurement" });
  if (!chapter7) {
    chapter7 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Temperature and its Measurement",
      order_index: 7,
    });
    console.log("Created chapter:", chapter7._id);
  } else {
    console.log("Using existing chapter:", chapter7._id);
  }

  let concept7_1 = await Concept.findOne({ chapter_id: chapter7._id, title: "Measuring Temperature" });
  if (!concept7_1) {
    concept7_1 = await Concept.create({
      chapter_id: chapter7._id,
      title: "Measuring Temperature",
      explanation_text:
        "Temperature tells us how hot or cold something is. It is measured in degrees Celsius (°C) with a thermometer. Normal human body temperature is about 37 °C, water freezes at 0 °C and boils at 100 °C.",
    });
    console.log("Created concept:", concept7_1._id);
  } else {
    console.log("Using existing concept:", concept7_1._id);
  }

  const levels7_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Thermometers and Fixed Points",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each term to its meaning.",
        slots: [
          {
            id: "s1",
            label: "Clinical thermometer",
          },
          {
            id: "s2",
            label: "Laboratory thermometer",
          },
          {
            id: "s3",
            label: "Freezing point of water",
          },
          {
            id: "s4",
            label: "Boiling point of water",
          },
        ],
        components: [
          {
            id: "c5",
            label: "The temperature at which ice becomes hotter",
          },
          {
            id: "c2",
            label: "Used to measure the temperature of liquids and other things in experiments",
          },
          {
            id: "c4",
            label: "The temperature at which water boils, 100 °C",
          },
          {
            id: "c3",
            label: "The temperature at which water turns into ice, 0 °C",
          },
          {
            id: "c1",
            label: "Used to measure the temperature of the human body",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Two are instruments and two are fixed temperatures of water.",
      },
    },
  ];
  for (const challenge of levels7_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: concept7_1._id,
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

  const levels7_1_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: Fever Above Normal",
      difficulty: "medium",
      order_index: 1,
      payload: {
        equation_label: "Normal body temperature is 37 °C. A patient's thermometer reads 39 °C. By how many degrees is the temperature above normal?",
        dial_min: 0,
        dial_max: 10,
        correct_answer: 2,
        hint: "Subtract normal temperature from the reading.",
      },
    },
    {
      title: "Machine: Heating Water to Boil",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_label: "Water boils at 100 °C. A kettle of water is now at 78 °C. By how many degrees must it still be heated to boil?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 22,
        hint: "Find the difference between 100 and the current reading.",
      },
    },
  ];
  for (const challenge of levels7_1_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
        concept_id: concept7_1._id,
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

  const levels7_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Using a Laboratory Thermometer",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps for measuring the temperature of a cup of warm water.",
        scrambled_steps: [
          {
            id: "st4",
            label: "Write the reading with its unit, °C",
          },
          {
            id: "st1",
            label: "Hold the thermometer upright with its bulb in the water without touching the cup",
          },
          {
            id: "st2",
            label: "Wait until the liquid level in the thermometer stops moving",
          },
          {
            id: "st3",
            label: "Read the level with your eye level with the mark",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Steady the thermometer, wait for a steady level, then read at eye level.",
      },
    },
  ];
  for (const challenge of levels7_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept7_1._id,
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

  // ---------- Chapter 8: A Journey through States of Water ----------
  let chapter8 = await Chapter.findOne({ subject_id: subject._id, title: "A Journey through States of Water" });
  if (!chapter8) {
    chapter8 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "A Journey through States of Water",
      order_index: 8,
    });
    console.log("Created chapter:", chapter8._id);
  } else {
    console.log("Using existing chapter:", chapter8._id);
  }

  let concept8_1 = await Concept.findOne({ chapter_id: chapter8._id, title: "States and Changes of Water" });
  if (!concept8_1) {
    concept8_1 = await Concept.create({
      chapter_id: chapter8._id,
      title: "States and Changes of Water",
      explanation_text:
        "Water exists as solid ice, liquid water and gaseous water vapour. Heat turns ice into water (melting) and water into vapour (evaporation); cooling turns vapour into droplets (condensation) and water into ice (freezing).",
    });
    console.log("Created concept:", concept8_1._id);
  } else {
    console.log("Using existing concept:", concept8_1._id);
  }

  const levels8_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Changes of State",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each change of state of water to what happens.",
        slots: [
          {
            id: "s1",
            label: "Melting",
          },
          {
            id: "s2",
            label: "Freezing",
          },
          {
            id: "s3",
            label: "Evaporation",
          },
          {
            id: "s4",
            label: "Condensation",
          },
        ],
        components: [
          {
            id: "c1",
            label: "Ice takes in heat and turns into liquid water",
          },
          {
            id: "c2",
            label: "Liquid water loses heat and turns into ice",
          },
          {
            id: "c4",
            label: "Water vapour cools and turns into tiny droplets",
          },
          {
            id: "c5",
            label: "Ice turns straight into water vapour in a fridge",
          },
          {
            id: "c3",
            label: "Liquid water turns into vapour at its surface",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Two changes need heating and two need cooling.",
      },
    },
  ];
  for (const challenge of levels8_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
        concept_id: concept8_1._id,
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

  const levels8_1_GEOGRAPHY_ROUTE_BUILDER = [
    {
      title: "Route: The Journey of a Water Drop",
      difficulty: "medium",
      order_index: 1,
      payload: {
        journey_label: "Follow a drop of water from a lake through the water cycle and arrange the stages in order.",
        scrambled_stops: [
          {
            id: "g2",
            label: "Water vapour rises and cools",
          },
          {
            id: "g3",
            label: "Vapour condenses into tiny droplets that form a cloud",
          },
          {
            id: "g5",
            label: "Rain runs into streams and returns to the lake",
          },
          {
            id: "g4",
            label: "Rain or snow falls back on the land",
          },
          {
            id: "g1",
            label: "The Sun warms the lake and water evaporates",
          },
        ],
        correct_order: ["g1", "g2", "g3", "g4", "g5"],
        hint: "Water must be heated and rise before it can form clouds and fall as rain.",
      },
    },
  ];
  for (const challenge of levels8_1_GEOGRAPHY_ROUTE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
        concept_id: concept8_1._id,
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

  const levels8_1_BIO_SPECIMEN_ANALYSIS = [
    {
      title: "Specimen: The Mystery Substance",
      difficulty: "hard",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Mystery Substance",
        context: "A clear substance is poured from a jug into a bottle. Inspect its behaviour to name its state.",
        features: [
          {
            id: "f1",
            label: "Takes the shape of the bottle",
            detail: "It fills the lower part of the container.",
          },
          {
            id: "f2",
            label: "Has a fixed volume",
            detail: "The amount of it does not change when it is poured.",
          },
          {
            id: "f3",
            label: "Flows and can be poured",
            detail: "It runs freely.",
          },
          {
            id: "f4",
            label: "Is clear and colourless",
            detail: "Many things are clear, so this does not name the state.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Gas",
          },
          {
            id: "o2",
            label: "Solid",
          },
          {
            id: "o3",
            label: "Liquid",
          },
          {
            id: "o4",
            label: "Vapour",
          },
        ],
        correct_hotspot_id: "o3",
        explanation: "A substance that flows, takes the shape of its container and has a fixed volume is a liquid.",
      },
    },
  ];
  for (const challenge of levels8_1_BIO_SPECIMEN_ANALYSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept8_1._id,
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

  // ---------- Chapter 9: Methods of Separation in Everyday Life ----------
  let chapter9 = await Chapter.findOne({ subject_id: subject._id, title: "Methods of Separation in Everyday Life" });
  if (!chapter9) {
    throw new Error("Chapter Methods of Separation in Everyday Life not found. Run the earlier Grade 6 seeds (or migrations/realignGrade6Curriculum.js) first.");
  }

  let concept9_1 = await Concept.findOne({ chapter_id: chapter9._id, title: "More Ways to Separate Mixtures" });
  if (!concept9_1) {
    concept9_1 = await Concept.create({
      chapter_id: chapter9._id,
      title: "More Ways to Separate Mixtures",
      explanation_text:
        "Threshing, decantation, hand-picking and filtration are further ways to separate the parts of a mixture, chosen according to the properties of the materials.",
    });
    console.log("Created concept:", concept9_1._id);
  } else {
    console.log("Using existing concept:", concept9_1._id);
  }

  const levels9_1_CHEMISTRY_MATCH = [
    {
      title: "Match: Which Method Fits?",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each separation job to the method that suits it.",
        slots: [
          {
            id: "s1",
            label: "Tea leaves separated from prepared tea",
          },
          {
            id: "s2",
            label: "Grains beaten free from harvested stalks",
          },
          {
            id: "s3",
            label: "Clear water poured off from settled mud",
          },
        ],
        components: [
          {
            id: "c1",
            label: "Filtration through a strainer",
          },
          {
            id: "c3",
            label: "Decantation",
          },
          {
            id: "c4",
            label: "Magnetic separation",
          },
          {
            id: "c2",
            label: "Threshing",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Ask what makes the parts different: size, weight or settling.",
      },
    },
  ];
  for (const challenge of levels9_1_CHEMISTRY_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "CHEMISTRY_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_MATCH",
        concept_id: concept9_1._id,
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

  const levels9_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Getting Salt from Sea Water",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps in which salt is obtained from sea water.",
        scrambled_steps: [
          {
            id: "st1",
            label: "Sea water is collected in shallow pans",
          },
          {
            id: "st4",
            label: "The salt is collected and washed",
          },
          {
            id: "st3",
            label: "Salt crystals are left behind in the pans",
          },
          {
            id: "st2",
            label: "The Sun heats the water and it evaporates",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Evaporation leaves the dissolved salt behind.",
      },
    },
  ];
  for (const challenge of levels9_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept9_1._id,
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

  // ---------- Chapter 10: Living Creatures: Exploring their Characteristics ----------
  let chapter10 = await Chapter.findOne({ subject_id: subject._id, title: "Living Creatures: Exploring their Characteristics" });
  if (!chapter10) {
    chapter10 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Living Creatures: Exploring their Characteristics",
      order_index: 10,
    });
    console.log("Created chapter:", chapter10._id);
  } else {
    console.log("Using existing chapter:", chapter10._id);
  }

  let concept10_1 = await Concept.findOne({ chapter_id: chapter10._id, title: "Characteristics of Living Things" });
  if (!concept10_1) {
    concept10_1 = await Concept.create({
      chapter_id: chapter10._id,
      title: "Characteristics of Living Things",
      explanation_text:
        "Living things need food, grow, respond to their surroundings and reproduce. Non-living things do not show these characteristics.",
    });
    console.log("Created concept:", concept10_1._id);
  } else {
    console.log("Using existing concept:", concept10_1._id);
  }

  const levels10_1_BIO_SPECIMEN_ANALYSIS = [
    {
      title: "Specimen: The Dry Seed",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimenName: "Specimen: The Dry Seed",
        context: "A tiny seed lies still on the shelf. It is planted in moist soil and observed for a week.",
        features: [
          {
            id: "f1",
            label: "Absorbs water and swells",
            detail: "It takes in water from the moist soil.",
          },
          {
            id: "f2",
            label: "Sprouts a root and a shoot",
            detail: "Growth begins after a few days.",
          },
          {
            id: "f3",
            label: "Grows into a small plant",
            detail: "It becomes larger and produces leaves.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Non-living thing",
          },
          {
            id: "o2",
            label: "Living thing",
          },
          {
            id: "o3",
            label: "Machine",
          },
        ],
        correct_hotspot_id: "o2",
        explanation: "Growing and responding to water are signs of life. A seed may look still, but it is alive.",
      },
    },
    {
      title: "Specimen: The Rolling Pebble",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen: The Rolling Pebble",
        context: "A pebble rolls down a slope after being kicked. Observe it over many days.",
        features: [
          {
            id: "f1",
            label: "Moves only when pushed or when it rolls down a slope",
            detail: "It does not move on its own.",
          },
          {
            id: "f2",
            label: "Does not grow or change size",
            detail: "It stays the same size for years.",
          },
          {
            id: "f3",
            label: "Does not need food or air",
            detail: "It does not eat or breathe.",
          },
        ],
        classificationOptions: [
          {
            id: "o1",
            label: "Living thing",
          },
          {
            id: "o2",
            label: "A very slow plant",
          },
          {
            id: "o3",
            label: "Non-living thing",
          },
        ],
        correct_hotspot_id: "o3",
        explanation: "Moving because of a push is not a sign of life. The pebble does not grow, breathe or need food.",
      },
    },
  ];
  for (const challenge of levels10_1_BIO_SPECIMEN_ANALYSIS) {
    const exists = await GameContent.findOne({
      game_type: "BIO_SPECIMEN_ANALYSIS",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_SPECIMEN_ANALYSIS",
        concept_id: concept10_1._id,
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

  let concept10_2 = await Concept.findOne({ chapter_id: chapter10._id, title: "Habitats and Adaptations" });
  if (!concept10_2) {
    concept10_2 = await Concept.create({
      chapter_id: chapter10._id,
      title: "Habitats and Adaptations",
      explanation_text:
        "Habitats are the places where living things live. Adaptations are features that help a living thing survive in its habitat, such as gills in fish or thick fur in polar animals.",
    });
    console.log("Created concept:", concept10_2._id);
  } else {
    console.log("Using existing concept:", concept10_2._id);
  }

  const levels10_2_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Adaptations to Habitats",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each animal to the feature that helps it live in its habitat.",
        slots: [
          {
            id: "s1",
            label: "Fish",
          },
          {
            id: "s2",
            label: "Camel",
          },
          {
            id: "s3",
            label: "Polar bear",
          },
        ],
        components: [
          {
            id: "c1",
            label: "Gills for breathing under water and a streamlined body",
          },
          {
            id: "c4",
            label: "Webbed feet for digging deep tunnels underground",
          },
          {
            id: "c3",
            label: "A thick coat and layer of fat that keep it warm in freezing cold",
          },
          {
            id: "c2",
            label: "Fat stored in the hump and wide feet that do not sink into sand",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Ask what problem the habitat presents: water, heat or cold.",
      },
    },
  ];
  for (const challenge of levels10_2_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
        concept_id: concept10_2._id,
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

  // ---------- Chapter 11: Nature's Treasures ----------
  let chapter11 = await Chapter.findOne({ subject_id: subject._id, title: "Nature's Treasures" });
  if (!chapter11) {
    chapter11 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Nature's Treasures",
      order_index: 11,
    });
    console.log("Created chapter:", chapter11._id);
  } else {
    console.log("Using existing chapter:", chapter11._id);
  }

  let concept11_1 = await Concept.findOne({ chapter_id: chapter11._id, title: "Natural Resources and Conservation" });
  if (!concept11_1) {
    concept11_1 = await Concept.create({
      chapter_id: chapter11._id,
      title: "Natural Resources and Conservation",
      explanation_text:
        "Air, water, soil, forests and minerals are natural resources. Some, such as sunlight and wind, are renewable; others, such as coal and petroleum, are non-renewable and can run out. We conserve resources by using them wisely.",
    });
    console.log("Created concept:", concept11_1._id);
  } else {
    console.log("Using existing concept:", concept11_1._id);
  }

  const levels11_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Kinds of Resources",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each term to its meaning.",
        slots: [
          {
            id: "s1",
            label: "Renewable resource",
          },
          {
            id: "s2",
            label: "Non-renewable resource",
          },
          {
            id: "s3",
            label: "Conservation",
          },
          {
            id: "s4",
            label: "Pollution",
          },
        ],
        components: [
          {
            id: "c5",
            label: "Making more of a resource by wasting it",
          },
          {
            id: "c2",
            label: "A resource that takes millions of years to form and can run out, such as coal",
          },
          {
            id: "c4",
            label: "Adding harmful substances to air, water or soil",
          },
          {
            id: "c3",
            label: "Using resources carefully so that they last longer",
          },
          {
            id: "c1",
            label: "A resource that can be replaced or is constantly available, such as sunlight",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Two terms describe types of resource; the other two describe what people do.",
      },
    },
  ];
  for (const challenge of levels11_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: concept11_1._id,
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

  const levels11_1_BIO_ECOSYSTEM_BALANCE = [
    {
      title: "Chain: A Cleared Hillside",
      difficulty: "medium",
      order_index: 1,
      payload: {
        trigger: "A hillside forest is cut down. Arrange the chain of effects in the order they follow.",
        scrambled_effects: [
          {
            id: "d1",
            label: "The soil is loosened because tree roots no longer hold it",
          },
          {
            id: "d3",
            label: "Rivers below fill with mud and flood more easily",
          },
          {
            id: "d4",
            label: "Farmland downstream loses fertile soil",
          },
          {
            id: "d2",
            label: "Heavy rain washes the soil away",
          },
        ],
        correct_order: ["d1", "d2", "d3", "d4"],
        hint: "Trace what happens after the roots are gone, step by step.",
      },
    },
  ];
  for (const challenge of levels11_1_BIO_ECOSYSTEM_BALANCE) {
    const exists = await GameContent.findOne({
      game_type: "BIO_ECOSYSTEM_BALANCE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_ECOSYSTEM_BALANCE",
        concept_id: concept11_1._id,
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

  const levels11_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Harvesting Rainwater",
      difficulty: "hard",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the stages of a simple rainwater harvesting system on a school roof.",
        scrambled_steps: [
          {
            id: "st4",
            label: "Clean water is stored in a tank or sent into the ground",
          },
          {
            id: "st1",
            label: "Rain falls on the roof",
          },
          {
            id: "st2",
            label: "Gutters collect the water and carry it to a pipe",
          },
          {
            id: "st3",
            label: "A filter removes leaves and dust",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Water is collected and channelled before it is filtered and stored.",
      },
    },
  ];
  for (const challenge of levels11_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept11_1._id,
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

  // ---------- Chapter 12: Beyond Earth ----------
  let chapter12 = await Chapter.findOne({ subject_id: subject._id, title: "Beyond Earth" });
  if (!chapter12) {
    chapter12 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Curiosity",
      title: "Beyond Earth",
      order_index: 12,
    });
    console.log("Created chapter:", chapter12._id);
  } else {
    console.log("Using existing chapter:", chapter12._id);
  }

  let concept12_1 = await Concept.findOne({ chapter_id: chapter12._id, title: "The Sun, Moon and Planets" });
  if (!concept12_1) {
    concept12_1 = await Concept.create({
      chapter_id: chapter12._id,
      title: "The Sun, Moon and Planets",
      explanation_text:
        "The Solar System has the Sun at its centre with eight planets in order: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. The Moon is Earth's natural satellite.",
    });
    console.log("Created concept:", concept12_1._id);
  } else {
    console.log("Using existing concept:", concept12_1._id);
  }

  const levels12_1_GEOGRAPHY_ROUTE_BUILDER = [
    {
      title: "Route: Planets from the Sun Outwards",
      difficulty: "hard",
      order_index: 1,
      payload: {
        journey_label: "Travel outwards from the Sun and arrange the eight planets in order of distance.",
        scrambled_stops: [
          {
            id: "g8",
            label: "Neptune",
          },
          {
            id: "g3",
            label: "Earth",
          },
          {
            id: "g4",
            label: "Mars",
          },
          {
            id: "g2",
            label: "Venus",
          },
          {
            id: "g7",
            label: "Uranus",
          },
          {
            id: "g5",
            label: "Jupiter",
          },
          {
            id: "g1",
            label: "Mercury",
          },
          {
            id: "g6",
            label: "Saturn",
          },
        ],
        correct_order: ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"],
        hint: "The four small rocky planets come first, then the giant planets.",
      },
    },
  ];
  for (const challenge of levels12_1_GEOGRAPHY_ROUTE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
        concept_id: concept12_1._id,
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

  const levels12_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Objects in the Sky",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each sky object to its meaning.",
        slots: [
          {
            id: "s1",
            label: "Star",
          },
          {
            id: "s2",
            label: "Planet",
          },
          {
            id: "s3",
            label: "Natural satellite",
          },
          {
            id: "s4",
            label: "Constellation",
          },
        ],
        components: [
          {
            id: "c5",
            label: "A small rock that only appears at noon",
          },
          {
            id: "c2",
            label: "A large body that travels around a star and does not make its own light",
          },
          {
            id: "c1",
            label: "A huge ball of hot gas that gives out its own light, such as the Sun",
          },
          {
            id: "c3",
            label: "A body that travels around a planet, such as the Moon around Earth",
          },
          {
            id: "c4",
            label: "A group of stars that forms a pattern in the night sky",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Match each term to what it does or what it is made of.",
      },
    },
  ];
  for (const challenge of levels12_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: concept12_1._id,
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

  let concept12_2 = await Concept.findOne({ chapter_id: chapter12._id, title: "Phases of the Moon" });
  if (!concept12_2) {
    concept12_2 = await Concept.create({
      chapter_id: chapter12._id,
      title: "Phases of the Moon",
      explanation_text:
        "The Moon's shape seems to change through the month because we see different amounts of its lit half. It goes from new moon to full moon and back again.",
    });
    console.log("Created concept:", concept12_2._id);
  } else {
    console.log("Using existing concept:", concept12_2._id);
  }

  const levels12_2_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Waxing Moon Phases",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these Moon phases in the order they appear in the first half of the lunar month.",
        scrambled_steps: [
          {
            id: "st3",
            label: "First quarter (half lit)",
          },
          {
            id: "st1",
            label: "New moon (dark)",
          },
          {
            id: "st2",
            label: "Waxing crescent",
          },
          {
            id: "st4",
            label: "Waxing gibbous",
          },
          {
            id: "st5",
            label: "Full moon",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4", "st5"],
        hint: "The lit part grows from nothing to all of it.",
      },
    },
  ];
  for (const challenge of levels12_2_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept12_2._id,
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
