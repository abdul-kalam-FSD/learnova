require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 6 Mathematics - Ganita Prakash (chapters 1-10 expansion)
// Generated content for the current 2026-27 Grade 6 curriculum. Idempotent:
// every Chapter/Concept/GameContent is looked up before it is created
// (GameContent is keyed on {game_type, title}), so re-running is safe.
// All reused mechanics keep their existing technical game_type (see the
// Phase 1 audit, GLOBAL-2); no new mechanic or shared UI/scoring change.
// Data Handling uses existing MATH_NUMBER_MACHINE items that describe pictographs/bar graphs/tally charts in words; no chart-building mechanic is created.

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 6 });
    console.log("Created new Grade 6 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- Chapter 1: Patterns in Mathematics ----------
  let chapter1 = await Chapter.findOne({ subject_id: subject._id, title: "Patterns in Mathematics" });
  if (!chapter1) {
    chapter1 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Patterns in Mathematics",
      order_index: 1,
    });
    console.log("Created chapter:", chapter1._id);
  } else {
    console.log("Using existing chapter:", chapter1._id);
  }

  let concept1_1 = await Concept.findOne({ chapter_id: chapter1._id, title: "Number Sequences and Patterns" });
  if (!concept1_1) {
    concept1_1 = await Concept.create({
      chapter_id: chapter1._id,
      title: "Number Sequences and Patterns",
      explanation_text:
        "A pattern in numbers follows a rule. Finding the rule, such as adding the same number, multiplying, or adding a growing number, lets us predict the next terms.",
    });
    console.log("Created concept:", concept1_1._id);
  } else {
    console.log("Using existing concept:", concept1_1._id);
  }

  const levels1_1_MATH_AP_SPEED_CHALLENGE = [
    {
      title: "Speed Round: Spot the Next Term",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "First find the rule that takes one term to the next, then apply it once more.",
        questions: [
          {
            id: "q1",
            prompt: "What comes next: 5, 10, 15, 20, ?",
            options: [
              {
                id: "a",
                label: "30",
              },
              {
                id: "b",
                label: "25",
              },
              {
                id: "c",
                label: "24",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "What comes next: 1, 4, 9, 16, ?",
            options: [
              {
                id: "a",
                label: "25",
              },
              {
                id: "b",
                label: "20",
              },
              {
                id: "c",
                label: "24",
              },
            ],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "What comes next: 1, 3, 6, 10, ?",
            options: [
              {
                id: "a",
                label: "14",
              },
              {
                id: "b",
                label: "16",
              },
              {
                id: "c",
                label: "15",
              },
            ],
            correct_option_id: "c",
          },
          {
            id: "q4",
            prompt: "What comes next: 2, 4, 8, 16, ?",
            options: [
              {
                id: "a",
                label: "24",
              },
              {
                id: "b",
                label: "30",
              },
              {
                id: "c",
                label: "32",
              },
            ],
            correct_option_id: "c",
          },
          {
            id: "q5",
            prompt: "The sum of the first four odd numbers, 1 + 3 + 5 + 7, is:",
            options: [
              {
                id: "a",
                label: "12",
              },
              {
                id: "b",
                label: "16",
              },
              {
                id: "c",
                label: "15",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "Find the missing term: 100, 90, 80, ?, 60",
            options: [
              {
                id: "a",
                label: "70",
              },
              {
                id: "b",
                label: "75",
              },
              {
                id: "c",
                label: "65",
              },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];
  for (const challenge of levels1_1_MATH_AP_SPEED_CHALLENGE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_AP_SPEED_CHALLENGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_AP_SPEED_CHALLENGE",
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

  let concept1_2 = await Concept.findOne({ chapter_id: chapter1._id, title: "Patterns with Shapes" });
  if (!concept1_2) {
    concept1_2 = await Concept.create({
      chapter_id: chapter1._id,
      title: "Patterns with Shapes",
      explanation_text:
        "Shapes made from matchsticks or dots grow in a pattern. Counting how many sticks each step adds tells us the rule for any later shape.",
    });
    console.log("Created concept:", concept1_2._id);
  } else {
    console.log("Using existing concept:", concept1_2._id);
  }

  const levels1_2_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: Triangles in a Row",
      difficulty: "medium",
      order_index: 1,
      payload: {
        equation_label: "One triangle uses 3 matchsticks. Two triangles in a row use 5, and three use 7. How many matchsticks do 6 triangles in a row need?",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 13,
        hint: "Each new triangle adds 2 sticks after the first one uses 3.",
      },
    },
    {
      title: "Machine: Squares in a Row",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_label: "One square uses 4 matchsticks. Two squares in a row use 7, and three use 10. How many matchsticks do 5 squares in a row need?",
        dial_min: 0,
        dial_max: 25,
        correct_answer: 16,
        hint: "Each extra square adds 3 sticks.",
      },
    },
  ];
  for (const challenge of levels1_2_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
        concept_id: concept1_2._id,
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

  // ---------- Chapter 2: Lines and Angles ----------
  let chapter2 = await Chapter.findOne({ subject_id: subject._id, title: "Lines and Angles" });
  if (!chapter2) {
    chapter2 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Lines and Angles",
      order_index: 2,
    });
    console.log("Created chapter:", chapter2._id);
  } else {
    console.log("Using existing chapter:", chapter2._id);
  }

  let concept2_1 = await Concept.findOne({ chapter_id: chapter2._id, title: "Points, Lines, Segments and Rays" });
  if (!concept2_1) {
    concept2_1 = await Concept.create({
      chapter_id: chapter2._id,
      title: "Points, Lines, Segments and Rays",
      explanation_text:
        "A point marks an exact position. A line segment has two endpoints, a ray has one endpoint and goes on forever in one direction, and a line goes on forever in both directions.",
    });
    console.log("Created concept:", concept2_1._id);
  } else {
    console.log("Using existing concept:", concept2_1._id);
  }

  const levels2_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Points, Segments, Rays and Lines",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each geometry term to its description.",
        slots: [
          {
            id: "s1",
            label: "Point",
          },
          {
            id: "s2",
            label: "Line segment",
          },
          {
            id: "s3",
            label: "Ray",
          },
          {
            id: "s4",
            label: "Line",
          },
        ],
        components: [
          {
            id: "c1",
            label: "An exact position with no size",
          },
          {
            id: "c5",
            label: "A curved path that ends at both points",
          },
          {
            id: "c3",
            label: "A straight path with one endpoint that goes on forever in one direction",
          },
          {
            id: "c2",
            label: "A straight path with two endpoints and a fixed length",
          },
          {
            id: "c4",
            label: "A straight path that goes on forever in both directions",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Count the endpoints and ask whether the path stops or goes on forever.",
      },
    },
  ];
  for (const challenge of levels2_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
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

  let concept2_2 = await Concept.findOne({ chapter_id: chapter2._id, title: "Angle Types" });
  if (!concept2_2) {
    concept2_2 = await Concept.create({
      chapter_id: chapter2._id,
      title: "Angle Types",
      explanation_text:
        "Angles are named by their size: acute (less than 90°), right (90°), obtuse (more than 90° and less than 180°), straight (180°) and reflex (more than 180° and less than 360°).",
    });
    console.log("Created concept:", concept2_2._id);
  } else {
    console.log("Using existing concept:", concept2_2._id);
  }

  const levels2_2_MATH_ANGLE_SPEED_CHALLENGE = [
    {
      title: "Speed Round: Name That Angle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 8,
        hint: "Acute < 90° < Right = 90° < Obtuse < 180° = Straight.",
        questions: [
          {
            id: "q1",
            prompt: "A 45° angle is:",
            options: [
              {
                id: "a",
                label: "Acute",
              },
              {
                id: "b",
                label: "Obtuse",
              },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "A 90° angle is:",
            options: [
              {
                id: "a",
                label: "Acute",
              },
              {
                id: "b",
                label: "Right",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "A 120° angle is:",
            options: [
              {
                id: "a",
                label: "Obtuse",
              },
              {
                id: "b",
                label: "Acute",
              },
            ],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "A 180° angle is:",
            options: [
              {
                id: "a",
                label: "Right",
              },
              {
                id: "b",
                label: "Straight",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q5",
            prompt: "A 15° angle is:",
            options: [
              {
                id: "a",
                label: "Acute",
              },
              {
                id: "b",
                label: "Obtuse",
              },
            ],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "A 100° angle is:",
            options: [
              {
                id: "a",
                label: "Acute",
              },
              {
                id: "b",
                label: "Obtuse",
              },
            ],
            correct_option_id: "b",
          },
        ],
      },
    },
    {
      title: "Speed Round: Angle Types and Reflex",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 10,
        hint: "Compare each angle with 90°, 180° and 360°.",
        questions: [
          {
            id: "q1",
            prompt: "A 30° angle is:",
            options: [
              {
                id: "a",
                label: "Obtuse",
              },
              {
                id: "b",
                label: "Acute",
              },
              {
                id: "c",
                label: "Reflex",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "A 90° angle is:",
            options: [
              {
                id: "a",
                label: "Right",
              },
              {
                id: "b",
                label: "Acute",
              },
              {
                id: "c",
                label: "Straight",
              },
            ],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "A 135° angle is:",
            options: [
              {
                id: "a",
                label: "Acute",
              },
              {
                id: "b",
                label: "Reflex",
              },
              {
                id: "c",
                label: "Obtuse",
              },
            ],
            correct_option_id: "c",
          },
          {
            id: "q4",
            prompt: "A 180° angle is:",
            options: [
              {
                id: "a",
                label: "Right",
              },
              {
                id: "b",
                label: "Obtuse",
              },
              {
                id: "c",
                label: "Straight",
              },
            ],
            correct_option_id: "c",
          },
          {
            id: "q5",
            prompt: "A 250° angle is:",
            options: [
              {
                id: "a",
                label: "Obtuse",
              },
              {
                id: "b",
                label: "Reflex",
              },
              {
                id: "c",
                label: "Straight",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "Which angle is larger than 180° but smaller than 360°?",
            options: [
              {
                id: "a",
                label: "Reflex",
              },
              {
                id: "b",
                label: "Obtuse",
              },
              {
                id: "c",
                label: "Right",
              },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];
  for (const challenge of levels2_2_MATH_ANGLE_SPEED_CHALLENGE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_ANGLE_SPEED_CHALLENGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_ANGLE_SPEED_CHALLENGE",
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

  let concept2_3 = await Concept.findOne({ chapter_id: chapter2._id, title: "Measuring and Drawing Angles" });
  if (!concept2_3) {
    concept2_3 = await Concept.create({
      chapter_id: chapter2._id,
      title: "Measuring and Drawing Angles",
      explanation_text:
        "A protractor measures angles in degrees. Place its centre on the vertex, line up one arm with the 0° baseline, and read where the other arm meets the scale.",
    });
    console.log("Created concept:", concept2_3._id);
  } else {
    console.log("Using existing concept:", concept2_3._id);
  }

  const levels2_3_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Measuring an Angle with a Protractor",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps for measuring an angle with a protractor.",
        scrambled_steps: [
          {
            id: "st2",
            label: "Line up the baseline with one arm of the angle so it reads 0°",
          },
          {
            id: "st4",
            label: "Read the value and write it with the degree sign",
          },
          {
            id: "st3",
            label: "Follow the scale to the point where the other arm crosses it",
          },
          {
            id: "st1",
            label: "Place the centre of the protractor on the vertex of the angle",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Line the tool up first, then read the scale from 0°.",
      },
    },
  ];
  for (const challenge of levels2_3_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept2_3._id,
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

  const levels2_3_MATH_EQUATION_SPEED_CALCULATION = [
    {
      title: "Speed Round: Angles on the Protractor",
      difficulty: "hard",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "Subtract the smaller reading from the larger when both arms start on the same baseline.",
        questions: [
          {
            id: "q1",
            equation_label: "One arm is at 0° and the other at 65°. The angle is ? degrees",
            correct_answer: 65,
          },
          {
            id: "q2",
            equation_label: "Arms at the 25° and 70° marks. The angle between them is ? degrees",
            correct_answer: 45,
          },
          {
            id: "q3",
            equation_label: "Arms at the 40° and 130° marks. The angle is ? degrees",
            correct_answer: 90,
          },
          {
            id: "q4",
            equation_label: "Arms at the 15° and 165° marks. The angle is ? degrees",
            correct_answer: 150,
          },
          {
            id: "q5",
            equation_label: "An angle of 80° is split by a line into 30° and ? degrees",
            correct_answer: 50,
          },
        ],
      },
    },
  ];
  for (const challenge of levels2_3_MATH_EQUATION_SPEED_CALCULATION) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_SPEED_CALCULATION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_SPEED_CALCULATION",
        concept_id: concept2_3._id,
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

  // ---------- Chapter 3: Number Play ----------
  let chapter3 = await Chapter.findOne({ subject_id: subject._id, title: "Number Play" });
  if (!chapter3) {
    chapter3 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Number Play",
      order_index: 3,
    });
    console.log("Created chapter:", chapter3._id);
  } else {
    console.log("Using existing chapter:", chapter3._id);
  }

  let concept3_1 = await Concept.findOne({ chapter_id: chapter3._id, title: "Number Puzzles and Play" });
  if (!concept3_1) {
    concept3_1 = await Concept.create({
      chapter_id: chapter3._id,
      title: "Number Puzzles and Play",
      explanation_text:
        "Numbers hide many patterns: reversing digits, adding numbers, and checking for palindromes reveal surprising results.",
    });
    console.log("Created concept:", concept3_1._id);
  } else {
    console.log("Using existing concept:", concept3_1._id);
  }

  const levels3_1_MATH_EQUATION_SPEED_CALCULATION = [
    {
      title: "Speed Round: Number Puzzles",
      difficulty: "medium",
      order_index: 1,
      payload: {
        time_limit_seconds: 15,
        hint: "Follow each instruction one step at a time; write down each result before the next step.",
        questions: [
          {
            id: "q1",
            equation_label: "Reverse the digits of 63 and add the result to 63. Answer:",
            correct_answer: 99,
          },
          {
            id: "q2",
            equation_label: "Reverse the digits of 45 and add the result to 45. Answer:",
            correct_answer: 99,
          },
          {
            id: "q3",
            equation_label: "Largest 3-digit number made from the digits 4, 9, 2 (each once) minus the smallest such number. Answer:",
            correct_answer: 693,
          },
          {
            id: "q4",
            equation_label: "The palindrome closest to 500 that is greater than 500. Answer:",
            correct_answer: 505,
          },
          {
            id: "q5",
            equation_label: "The number that is 10 more than the largest 2-digit palindrome. Answer:",
            correct_answer: 109,
          },
        ],
      },
    },
    {
      title: "Speed Round: Number Tricks",
      difficulty: "hard",
      order_index: 2,
      payload: {
        time_limit_seconds: 15,
        hint: "Add the digits first, then follow the rule.",
        questions: [
          {
            id: "q1",
            equation_label: "Add the digits of 3458, then add 1. Answer:",
            correct_answer: 21,
          },
          {
            id: "q2",
            equation_label: "Which number between 20 and 30 has digit sum 8? Answer:",
            correct_answer: 26,
          },
          {
            id: "q3",
            equation_label: "Write the number 6 less than the smallest 3-digit palindrome. Answer:",
            correct_answer: 95,
          },
          {
            id: "q4",
            equation_label: "What is the digit sum of 99? Answer:",
            correct_answer: 18,
          },
          {
            id: "q5",
            equation_label: "Add 27 to its reverse 72. Answer:",
            correct_answer: 99,
          },
        ],
      },
    },
  ];
  for (const challenge of levels3_1_MATH_EQUATION_SPEED_CALCULATION) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_SPEED_CALCULATION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_SPEED_CALCULATION",
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

  let concept3_2 = await Concept.findOne({ chapter_id: chapter3._id, title: "Counting and Digits" });
  if (!concept3_2) {
    concept3_2 = await Concept.create({
      chapter_id: chapter3._id,
      title: "Counting and Digits",
      explanation_text:
        "Counting how many numbers meet a rule is a puzzle skill: list them in order so none is missed.",
    });
    console.log("Created concept:", concept3_2._id);
  } else {
    console.log("Using existing concept:", concept3_2._id);
  }

  const levels3_2_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: Two-Digit Palindromes",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "How many two-digit numbers have both digits the same, like 11, 22 and so on up to 99?",
        dial_min: 0,
        dial_max: 15,
        correct_answer: 9,
        hint: "List them: 11, 22, ... and count.",
      },
    },
  ];
  for (const challenge of levels3_2_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
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

  // ---------- Chapter 4: Data Handling and Presentation ----------
  let chapter4 = await Chapter.findOne({ subject_id: subject._id, title: "Data Handling and Presentation" });
  if (!chapter4) {
    chapter4 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Data Handling and Presentation",
      order_index: 4,
    });
    console.log("Created chapter:", chapter4._id);
  } else {
    console.log("Using existing chapter:", chapter4._id);
  }

  let concept4_1 = await Concept.findOne({ chapter_id: chapter4._id, title: "Displays of Data" });
  if (!concept4_1) {
    concept4_1 = await Concept.create({
      chapter_id: chapter4._id,
      title: "Displays of Data",
      explanation_text:
        "Data can be displayed as a tally chart, a table, a pictograph (using pictures or symbols) or a bar graph (using bars of different heights). Choose the display that makes the data easy to read.",
    });
    console.log("Created concept:", concept4_1._id);
  } else {
    console.log("Using existing concept:", concept4_1._id);
  }

  const levels4_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Ways to Show Data",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each data display to how it shows information.",
        slots: [
          {
            id: "s1",
            label: "Tally chart",
          },
          {
            id: "s2",
            label: "Pictograph",
          },
          {
            id: "s3",
            label: "Bar graph",
          },
          {
            id: "s4",
            label: "Table",
          },
        ],
        components: [
          {
            id: "c4",
            label: "Rows and columns of numbers listed under headings",
          },
          {
            id: "c1",
            label: "Marks in groups of five that count items as they are collected",
          },
          {
            id: "c5",
            label: "A single number that hides all the details",
          },
          {
            id: "c3",
            label: "Bars whose heights or lengths show how large each value is",
          },
          {
            id: "c2",
            label: "Pictures or symbols, each standing for a fixed number of items",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Focus on the look of each display: marks, pictures, bars, rows.",
      },
    },
  ];
  for (const challenge of levels4_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
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

  let concept4_2 = await Concept.findOne({ chapter_id: chapter4._id, title: "Reading and Interpreting Data" });
  if (!concept4_2) {
    concept4_2 = await Concept.create({
      chapter_id: chapter4._id,
      title: "Reading and Interpreting Data",
      explanation_text:
        "To interpret data, read each value carefully, use the key of a pictograph, and compare values with simple sums and differences. (These items describe the data in words; graph-drawing is not part of this game set.)",
    });
    console.log("Created concept:", concept4_2._id);
  } else {
    console.log("Using existing concept:", concept4_2._id);
  }

  const levels4_2_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: Reading a Pictograph",
      difficulty: "medium",
      order_index: 1,
      payload: {
        equation_label: "In a pictograph, each 🍎 stands for 2 fruits. Monday shows 3 🍎 and Tuesday shows 5 🍎. How many more fruits were sold on Tuesday than on Monday?",
        dial_min: 0,
        dial_max: 12,
        correct_answer: 4,
        hint: "Find the difference in symbols, then multiply by the value of one symbol.",
      },
    },
    {
      title: "Machine: Reading a Bar Graph",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_label: "A bar graph shows books read: Mon 4, Tue 7, Wed 5, Thu 9. How many more books were read on Thursday than on the day with the fewest books?",
        dial_min: 0,
        dial_max: 15,
        correct_answer: 5,
        hint: "Find the lowest bar, then subtract it from the tallest one in the list.",
      },
    },
    {
      title: "Machine: Counting Tally Marks",
      difficulty: "easy",
      order_index: 3,
      payload: {
        equation_label: "A tally chart shows 3 full groups of five marks and 2 extra marks for red cars. How many red cars were counted?",
        dial_min: 0,
        dial_max: 25,
        correct_answer: 17,
        hint: "Each full group of five stands for 5.",
      },
    },
  ];
  for (const challenge of levels4_2_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
        concept_id: concept4_2._id,
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

  // ---------- Chapter 5: Prime Time ----------
  let chapter5 = await Chapter.findOne({ subject_id: subject._id, title: "Prime Time" });
  if (!chapter5) {
    chapter5 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Prime Time",
      order_index: 5,
    });
    console.log("Created chapter:", chapter5._id);
  } else {
    console.log("Using existing chapter:", chapter5._id);
  }

  let concept5_1 = await Concept.findOne({ chapter_id: chapter5._id, title: "Primes, Composites and Factors" });
  if (!concept5_1) {
    concept5_1 = await Concept.create({
      chapter_id: chapter5._id,
      title: "Primes, Composites and Factors",
      explanation_text:
        "A prime number has exactly two factors, 1 and itself. A composite number has more than two factors. The number 1 is neither prime nor composite, and 2 is the only even prime.",
    });
    console.log("Created concept:", concept5_1._id);
  } else {
    console.log("Using existing concept:", concept5_1._id);
  }

  const levels5_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Prime Time Words",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each term to its meaning.",
        slots: [
          {
            id: "s1",
            label: "Prime number",
          },
          {
            id: "s2",
            label: "Composite number",
          },
          {
            id: "s3",
            label: "Factor",
          },
          {
            id: "s4",
            label: "Multiple",
          },
        ],
        components: [
          {
            id: "c5",
            label: "A number with no factors at all",
          },
          {
            id: "c2",
            label: "A number with more than two factors",
          },
          {
            id: "c4",
            label: "The product of a number and a counting number",
          },
          {
            id: "c3",
            label: "A number that divides another number exactly",
          },
          {
            id: "c1",
            label: "A number greater than 1 with exactly two factors, 1 and itself",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Focus on the number of factors each type has.",
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

  const levels5_1_MATH_EQUATION_SPEED_CALCULATION = [
    {
      title: "Speed Round: Factors and Primes",
      difficulty: "medium",
      order_index: 1,
      payload: {
        time_limit_seconds: 15,
        hint: "List the factors in pairs so you do not miss any.",
        questions: [
          {
            id: "q1",
            equation_label: "How many factors does 12 have?",
            correct_answer: 6,
          },
          {
            id: "q2",
            equation_label: "What is the smallest prime number greater than 20?",
            correct_answer: 23,
          },
          {
            id: "q3",
            equation_label: "How many prime numbers are there between 1 and 20?",
            correct_answer: 8,
          },
          {
            id: "q4",
            equation_label: "What is the largest factor of 36 that is smaller than 36?",
            correct_answer: 18,
          },
          {
            id: "q5",
            equation_label: "What is the only even prime number?",
            correct_answer: 2,
          },
        ],
      },
    },
  ];
  for (const challenge of levels5_1_MATH_EQUATION_SPEED_CALCULATION) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_SPEED_CALCULATION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_SPEED_CALCULATION",
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

  const levels5_1_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: Prime Factorisation",
      difficulty: "hard",
      order_index: 1,
      payload: {
        equation_label: "Write 30 as a product of prime numbers: 2 × 3 × 5. What is the sum of these prime factors?",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 10,
        hint: "Add 2, 3 and 5.",
      },
    },
  ];
  for (const challenge of levels5_1_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
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

  // ---------- Chapter 6: Perimeter and Area ----------
  let chapter6 = await Chapter.findOne({ subject_id: subject._id, title: "Perimeter and Area" });
  if (!chapter6) {
    chapter6 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Perimeter and Area",
      order_index: 6,
    });
    console.log("Created chapter:", chapter6._id);
  } else {
    console.log("Using existing chapter:", chapter6._id);
  }

  let concept6_1 = await Concept.findOne({ chapter_id: chapter6._id, title: "Area of Rectangles and Squares" });
  if (!concept6_1) {
    concept6_1 = await Concept.create({
      chapter_id: chapter6._id,
      title: "Area of Rectangles and Squares",
      explanation_text:
        "The area of a rectangle is length × breadth and the area of a square is side × side, measured in square units. The perimeter of a rectangle is 2 × (length + breadth) and of a square is 4 × side.",
    });
    console.log("Created concept:", concept6_1._id);
  } else {
    console.log("Using existing concept:", concept6_1._id);
  }

  const levels6_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Area and Perimeter Formulas",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each quantity to its formula.",
        slots: [
          {
            id: "s1",
            label: "Perimeter of a rectangle",
          },
          {
            id: "s2",
            label: "Area of a rectangle",
          },
          {
            id: "s3",
            label: "Perimeter of a square",
          },
          {
            id: "s4",
            label: "Area of a square",
          },
        ],
        components: [
          {
            id: "c5",
            label: "length + breadth",
          },
          {
            id: "c4",
            label: "side × side",
          },
          {
            id: "c3",
            label: "4 × side",
          },
          {
            id: "c2",
            label: "length × breadth",
          },
          {
            id: "c1",
            label: "2 × (length + breadth)",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Perimeter is the distance around; area is the space inside.",
      },
    },
  ];
  for (const challenge of levels6_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
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

  const levels6_1_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: Area of a Rectangle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "A rectangle is 5 cm long and 4 cm wide. What is its area in square centimetres?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 20,
        hint: "Multiply length by breadth.",
      },
    },
    {
      title: "Machine: An L-Shaped Floor",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_label: "A 6 m by 4 m rectangular floor has a 2 m by 2 m square corner cut out. What is the area of the remaining floor in square metres?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 20,
        hint: "Area of the whole rectangle minus the area of the piece taken out.",
      },
    },
  ];
  for (const challenge of levels6_1_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
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

  // ---------- Chapter 7: Fractions ----------
  let chapter7 = await Chapter.findOne({ subject_id: subject._id, title: "Fractions" });
  if (!chapter7) {
    throw new Error("Chapter Fractions not found. Run the earlier Grade 6 seeds (or migrations/realignGrade6Curriculum.js) first.");
  }

  let concept7_1 = await Concept.findOne({ chapter_id: chapter7._id, title: "Comparing Fractions" });
  if (!concept7_1) {
    concept7_1 = await Concept.create({
      chapter_id: chapter7._id,
      title: "Comparing Fractions",
      explanation_text:
        "To compare fractions, give them a common denominator or compare them with a benchmark such as 1/2. The fraction with the larger value after conversion is the greater fraction.",
    });
    console.log("Created concept:", concept7_1._id);
  } else {
    console.log("Using existing concept:", concept7_1._id);
  }

  const levels7_1_MATH_FRACTION_MATCH = [
    {
      title: "Match: Which Fraction Is Larger?",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each pair of fractions to the larger fraction of the pair.",
        slots: [
          {
            id: "s1",
            label: "3/4 or 2/3?",
          },
          {
            id: "s2",
            label: "5/8 or 3/5?",
          },
          {
            id: "s3",
            label: "4/9 or 1/2?",
          },
        ],
        components: [
          {
            id: "c4",
            label: "2/3",
          },
          {
            id: "c3",
            label: "1/2",
          },
          {
            id: "c1",
            label: "3/4",
          },
          {
            id: "c5",
            label: "3/5",
          },
          {
            id: "c2",
            label: "5/8",
          },
          {
            id: "c6",
            label: "4/9",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Convert to a common denominator, or compare each with 1/2.",
      },
    },
  ];
  for (const challenge of levels7_1_MATH_FRACTION_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_MATCH",
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

  let concept7_2 = await Concept.findOne({ chapter_id: chapter7._id, title: "Subtracting Fractions" });
  if (!concept7_2) {
    concept7_2 = await Concept.create({
      chapter_id: chapter7._id,
      title: "Subtracting Fractions",
      explanation_text:
        "To subtract fractions, rewrite them with the same denominator, subtract the numerators, keep the denominator, and simplify the answer.",
    });
    console.log("Created concept:", concept7_2._id);
  } else {
    console.log("Using existing concept:", concept7_2._id);
  }

  const levels7_2_MATH_FRACTION_MATCH = [
    {
      title: "Match: Subtract and Simplify",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each subtraction to its answer in simplest form.",
        slots: [
          {
            id: "s1",
            label: "3/4 − 1/4",
          },
          {
            id: "s2",
            label: "5/6 − 1/6",
          },
          {
            id: "s3",
            label: "7/8 − 1/4",
          },
        ],
        components: [
          {
            id: "c3",
            label: "5/8",
          },
          {
            id: "c2",
            label: "2/3",
          },
          {
            id: "c1",
            label: "1/2",
          },
          {
            id: "c5",
            label: "3/4",
          },
          {
            id: "c4",
            label: "1/4",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Make the denominators the same, subtract the tops, then simplify.",
      },
    },
  ];
  for (const challenge of levels7_2_MATH_FRACTION_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_MATCH",
        concept_id: concept7_2._id,
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

  const levels7_2_MATH_FRACTION_SPEED_CHALLENGE = [
    {
      title: "Speed Round: Subtract Them Fast",
      difficulty: "hard",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "Get a common denominator, subtract the numerators, then simplify.",
        questions: [
          {
            id: "q1",
            prompt: "What is 3/4 − 1/2?",
            options: [
              {
                id: "a",
                label: "1/2",
              },
              {
                id: "b",
                label: "1/4",
              },
              {
                id: "c",
                label: "2/2",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "What is 5/6 − 1/3?",
            options: [
              {
                id: "a",
                label: "1/2",
              },
              {
                id: "b",
                label: "4/3",
              },
              {
                id: "c",
                label: "2/6",
              },
            ],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "What is 7/10 − 1/2?",
            options: [
              {
                id: "a",
                label: "6/8",
              },
              {
                id: "b",
                label: "2/8",
              },
              {
                id: "c",
                label: "1/5",
              },
            ],
            correct_option_id: "c",
          },
          {
            id: "q4",
            prompt: "What is 5/8 − 1/4?",
            options: [
              {
                id: "a",
                label: "4/4",
              },
              {
                id: "b",
                label: "4/8",
              },
              {
                id: "c",
                label: "3/8",
              },
            ],
            correct_option_id: "c",
          },
          {
            id: "q5",
            prompt: "What is 1 − 3/8?",
            options: [
              {
                id: "a",
                label: "2/8",
              },
              {
                id: "b",
                label: "5/8",
              },
              {
                id: "c",
                label: "3/8",
              },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "What is 9/10 − 3/5?",
            options: [
              {
                id: "a",
                label: "3/10",
              },
              {
                id: "b",
                label: "6/5",
              },
              {
                id: "c",
                label: "6/10",
              },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];
  for (const challenge of levels7_2_MATH_FRACTION_SPEED_CHALLENGE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_SPEED_CHALLENGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_SPEED_CHALLENGE",
        concept_id: concept7_2._id,
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

  let concept7_3 = await Concept.findOne({ chapter_id: chapter7._id, title: "Fractions on the Number Line" });
  if (!concept7_3) {
    concept7_3 = await Concept.create({
      chapter_id: chapter7._id,
      title: "Fractions on the Number Line",
      explanation_text:
        "A fraction can be marked as a point on the number line between 0 and 1. If the line is divided into equal parts, each mark is one part of the whole.",
    });
    console.log("Created concept:", concept7_3._id);
  } else {
    console.log("Using existing concept:", concept7_3._id);
  }

  const levels7_3_MATH_FRACTION_MATCH = [
    {
      title: "Match: Where Does It Sit on the Number Line?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each description of a point on the number line between 0 and 1 to its fraction.",
        slots: [
          {
            id: "s1",
            label: "Halfway between 0 and 1",
          },
          {
            id: "s2",
            label: "The third mark after 0 on a line split into 4 equal parts",
          },
          {
            id: "s3",
            label: "The second mark after 0 on a line split into 3 equal parts",
          },
        ],
        components: [
          {
            id: "c4",
            label: "1/3",
          },
          {
            id: "c2",
            label: "3/4",
          },
          {
            id: "c1",
            label: "1/2",
          },
          {
            id: "c5",
            label: "1/4",
          },
          {
            id: "c3",
            label: "2/3",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "The bottom number is how many equal parts; the top is how many marks from 0.",
      },
    },
  ];
  for (const challenge of levels7_3_MATH_FRACTION_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_MATCH",
        concept_id: concept7_3._id,
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

  // ---------- Chapter 8: Playing with Constructions ----------
  let chapter8 = await Chapter.findOne({ subject_id: subject._id, title: "Playing with Constructions" });
  if (!chapter8) {
    chapter8 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Playing with Constructions",
      order_index: 8,
    });
    console.log("Created chapter:", chapter8._id);
  } else {
    console.log("Using existing chapter:", chapter8._id);
  }

  let concept8_1 = await Concept.findOne({ chapter_id: chapter8._id, title: "Tools and Steps of Construction" });
  if (!concept8_1) {
    concept8_1 = await Concept.create({
      chapter_id: chapter8._id,
      title: "Tools and Steps of Construction",
      explanation_text:
        "Constructing accurate figures needs tools and a careful order of steps: a ruler measures and draws straight lines, a compass draws circles and arcs, a protractor measures and draws angles, and a set square helps draw right angles.",
    });
    console.log("Created concept:", concept8_1._id);
  } else {
    console.log("Using existing concept:", concept8_1._id);
  }

  const levels8_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Geometry Tools",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each drawing tool to its job.",
        slots: [
          {
            id: "s1",
            label: "Compass",
          },
          {
            id: "s2",
            label: "Ruler",
          },
          {
            id: "s3",
            label: "Protractor",
          },
          {
            id: "s4",
            label: "Set square",
          },
        ],
        components: [
          {
            id: "c1",
            label: "Draws circles and arcs",
          },
          {
            id: "c3",
            label: "Measures and draws angles",
          },
          {
            id: "c5",
            label: "Measures how heavy an object is",
          },
          {
            id: "c4",
            label: "Helps draw right angles and parallel lines",
          },
          {
            id: "c2",
            label: "Measures lengths and draws straight lines",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Each tool has one main job in constructions.",
      },
    },
  ];
  for (const challenge of levels8_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
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

  const levels8_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Drawing a Circle with a Compass",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps for drawing a circle of radius 4 cm.",
        scrambled_steps: [
          {
            id: "st2",
            label: "Set the compass so the needle and pencil are 4 cm apart",
          },
          {
            id: "st1",
            label: "Mark a point for the centre",
          },
          {
            id: "st3",
            label: "Place the needle firmly on the centre",
          },
          {
            id: "st4",
            label: "Turn the compass once around to draw the circle",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Set the radius before you place the needle and draw.",
      },
    },
    {
      title: "Process: Constructing a 6 cm by 4 cm Rectangle",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange the steps for constructing a rectangle 6 cm long and 4 cm wide.",
        scrambled_steps: [
          {
            id: "st4",
            label: "Check that opposite sides are equal and all corners are right angles",
          },
          {
            id: "st1",
            label: "Draw the 6 cm base with a ruler",
          },
          {
            id: "st3",
            label: "Join the top ends of the two upright lines",
          },
          {
            id: "st2",
            label: "At each end of the base, draw a 90° line that is 4 cm long",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Draw the base first, then the sides, then join and check.",
      },
    },
  ];
  for (const challenge of levels8_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 9: Symmetry ----------
  let chapter9 = await Chapter.findOne({ subject_id: subject._id, title: "Symmetry" });
  if (!chapter9) {
    chapter9 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Symmetry",
      order_index: 9,
    });
    console.log("Created chapter:", chapter9._id);
  } else {
    console.log("Using existing chapter:", chapter9._id);
  }

  let concept9_1 = await Concept.findOne({ chapter_id: chapter9._id, title: "Line Symmetry" });
  if (!concept9_1) {
    concept9_1 = await Concept.create({
      chapter_id: chapter9._id,
      title: "Line Symmetry",
      explanation_text:
        "A shape has line symmetry if a fold along a line makes the two halves match exactly. The fold is a line of symmetry, and some shapes have more than one.",
    });
    console.log("Created concept:", concept9_1._id);
  } else {
    console.log("Using existing concept:", concept9_1._id);
  }

  const levels9_1_MATH_SHAPE_MATCH = [
    {
      title: "Match: Lines of Symmetry",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each shape to its number of lines of symmetry.",
        slots: [
          {
            id: "s1",
            shape: "square",
            label: "Square",
          },
          {
            id: "s2",
            shape: "rectangle",
            label: "Rectangle (not a square)",
          },
          {
            id: "s3",
            shape: "triangle",
            label: "Equilateral triangle",
          },
          {
            id: "s4",
            shape: "hexagon",
            label: "Regular hexagon",
          },
        ],
        components: [
          {
            id: "c4",
            label: "6 lines of symmetry",
          },
          {
            id: "c2",
            label: "2 lines of symmetry",
          },
          {
            id: "c1",
            label: "4 lines of symmetry",
          },
          {
            id: "c3",
            label: "3 lines of symmetry",
          },
          {
            id: "c5",
            label: "5 lines of symmetry",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Count the ways you can fold the shape so that both halves fit exactly.",
      },
    },
  ];
  for (const challenge of levels9_1_MATH_SHAPE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "MATH_SHAPE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_SHAPE_MATCH",
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
      title: "Process: Testing for a Line of Symmetry",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps for testing whether a paper shape has a line of symmetry.",
        scrambled_steps: [
          {
            id: "st1",
            label: "Cut out the shape",
          },
          {
            id: "st4",
            label: "If they match, mark the fold as a line of symmetry",
          },
          {
            id: "st3",
            label: "Check whether the edges of the two halves match exactly",
          },
          {
            id: "st2",
            label: "Fold it along a line you think might be a line of symmetry",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Fold first, then compare the two halves.",
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

  const levels9_1_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: Lines of Symmetry of a Regular Polygon",
      difficulty: "hard",
      order_index: 1,
      payload: {
        equation_label: "A regular polygon has 6 equal sides. How many lines of symmetry does it have?",
        dial_min: 0,
        dial_max: 10,
        correct_answer: 6,
        hint: "A regular polygon has as many lines of symmetry as it has sides.",
      },
    },
  ];
  for (const challenge of levels9_1_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
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

  let concept9_2 = await Concept.findOne({ chapter_id: chapter9._id, title: "Rotational Symmetry" });
  if (!concept9_2) {
    concept9_2 = await Concept.create({
      chapter_id: chapter9._id,
      title: "Rotational Symmetry",
      explanation_text:
        "A shape has rotational symmetry if it looks the same after being turned less than a full turn about its centre. The number of times it fits in one full turn is its order of rotational symmetry.",
    });
    console.log("Created concept:", concept9_2._id);
  } else {
    console.log("Using existing concept:", concept9_2._id);
  }

  const levels9_2_MATH_SHAPE_MATCH = [
    {
      title: "Match: Order of Rotational Symmetry",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each shape to its order of rotational symmetry.",
        slots: [
          {
            id: "s1",
            shape: "square",
            label: "Square",
          },
          {
            id: "s2",
            shape: "triangle",
            label: "Equilateral triangle",
          },
          {
            id: "s3",
            shape: "rectangle",
            label: "Rectangle (not a square)",
          },
          {
            id: "s4",
            shape: "hexagon",
            label: "Regular hexagon",
          },
        ],
        components: [
          {
            id: "c5",
            label: "Order 5",
          },
          {
            id: "c4",
            label: "Order 6",
          },
          {
            id: "c3",
            label: "Order 2",
          },
          {
            id: "c2",
            label: "Order 3",
          },
          {
            id: "c1",
            label: "Order 4",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "How many times does the shape fit onto itself in one full turn?",
      },
    },
  ];
  for (const challenge of levels9_2_MATH_SHAPE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "MATH_SHAPE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_SHAPE_MATCH",
        concept_id: concept9_2._id,
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

  // ---------- Chapter 10: The Other Side of Zero ----------
  let chapter10 = await Chapter.findOne({ subject_id: subject._id, title: "The Other Side of Zero" });
  if (!chapter10) {
    chapter10 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "The Other Side of Zero",
      order_index: 10,
    });
    console.log("Created chapter:", chapter10._id);
  } else {
    console.log("Using existing chapter:", chapter10._id);
  }

  let concept10_1 = await Concept.findOne({ chapter_id: chapter10._id, title: "Integers in Everyday Life" });
  if (!concept10_1) {
    concept10_1 = await Concept.create({
      chapter_id: chapter10._id,
      title: "Integers in Everyday Life",
      explanation_text:
        "Positive integers stand for gains and values above zero; negative integers stand for losses and values below zero. Zero is neither positive nor negative.",
    });
    console.log("Created concept:", concept10_1._id);
  } else {
    console.log("Using existing concept:", concept10_1._id);
  }

  const levels10_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Situations and Integers",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each situation to the integer that describes it.",
        slots: [
          {
            id: "s1",
            label: "Depositing ₹50 in a bank",
          },
          {
            id: "s2",
            label: "Withdrawing ₹30 from a bank",
          },
          {
            id: "s3",
            label: "A temperature of 5 °C below zero",
          },
          {
            id: "s4",
            label: "A place 12 m above sea level",
          },
        ],
        components: [
          {
            id: "c1",
            label: "+50",
          },
          {
            id: "c5",
            label: "0",
          },
          {
            id: "c3",
            label: "−5",
          },
          {
            id: "c4",
            label: "+12",
          },
          {
            id: "c2",
            label: "−30",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Use positive numbers for gains and heights, and negative numbers for losses and depths.",
      },
    },
  ];
  for (const challenge of levels10_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
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

  const levels10_1_MATH_NUMBER_MACHINE = [
    {
      title: "Machine: A Rising Temperature",
      difficulty: "medium",
      order_index: 1,
      payload: {
        equation_label: "At 6 a.m. the temperature is −3 °C. By noon it rises by 5 °C. What is the temperature at noon?",
        dial_min: -5,
        dial_max: 10,
        correct_answer: 2,
        hint: "Start at −3 and move 5 steps to the right on the number line.",
      },
    },
    {
      title: "Machine: A Diver Rising",
      difficulty: "hard",
      order_index: 2,
      payload: {
        equation_label: "A diver is at −6 m (6 m below the surface) and swims up 4 m. What is her new position?",
        dial_min: -10,
        dial_max: 5,
        correct_answer: -2,
        hint: "Moving up adds to the position.",
      },
    },
  ];
  for (const challenge of levels10_1_MATH_NUMBER_MACHINE) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
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

  const levels10_1_MATH_EQUATION_SPEED_CALCULATION = [
    {
      title: "Speed Round: Adding and Subtracting Integers",
      difficulty: "hard",
      order_index: 1,
      payload: {
        time_limit_seconds: 15,
        hint: "Move right on the number line to add and left to subtract.",
        questions: [
          {
            id: "q1",
            equation_label: "−4 + 7 =",
            correct_answer: 3,
          },
          {
            id: "q2",
            equation_label: "−3 − 2 =",
            correct_answer: -5,
          },
          {
            id: "q3",
            equation_label: "5 − 9 =",
            correct_answer: -4,
          },
          {
            id: "q4",
            equation_label: "−8 + 8 =",
            correct_answer: 0,
          },
          {
            id: "q5",
            equation_label: "−2 + (−3) =",
            correct_answer: -5,
          },
        ],
      },
    },
  ];
  for (const challenge of levels10_1_MATH_EQUATION_SPEED_CALCULATION) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_SPEED_CALCULATION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_SPEED_CALCULATION",
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
