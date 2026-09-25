require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 6 English - Poorvi (16 chapters, original skill-based content)
// Generated content for the current 2026-27 Grade 6 curriculum. Idempotent:
// every Chapter/Concept/GameContent is looked up before it is created
// (GameContent is keyed on {game_type, title}), so re-running is safe.
// All reused mechanics keep their existing technical game_type (see the
// Phase 1 audit, GLOBAL-2); no new mechanic or shared UI/scoring change.
// No textbook passages are reproduced: every sentence, word and story sequence below is original and only inspired by the lesson theme.

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 6 });
    console.log("Created new Grade 6 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- Chapter 1: A Bottle of Dew ----------
  let chapter1 = await Chapter.findOne({ subject_id: subject._id, title: "A Bottle of Dew" });
  if (!chapter1) {
    chapter1 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 1: Fables and Folk Tales",
      title: "A Bottle of Dew",
      order_index: 1,
    });
    console.log("Created chapter:", chapter1._id);
  } else {
    console.log("Using existing chapter:", chapter1._id);
  }

  let concept1_1 = await Concept.findOne({ chapter_id: chapter1._id, title: "Careful Actions: Adverbs and Story Order" });
  if (!concept1_1) {
    concept1_1 = await Concept.create({
      chapter_id: chapter1._id,
      title: "Careful Actions: Adverbs and Story Order",
      explanation_text:
        "Adverbs of manner tell us how an action is done. Ordering events with time words helps us retell a story clearly.",
    });
    console.log("Created concept:", concept1_1._id);
  } else {
    console.log("Using existing concept:", concept1_1._id);
  }

  const levels1_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: A Bottle of Dew",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "in a way that shows hope",
        scrambled_pieces: [
          {
            id: "w2",
            label: "-ful (full of)",
          },
          {
            id: "w3",
            label: "-ly (in a way that is)",
          },
          {
            id: "w1",
            label: "hope",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "The base word comes first, then the ending that makes it an adjective, then the ending that makes it an adverb.",
      },
    },
  ];
  for (const challenge of levels1_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels1_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: A Bottle of Dew",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Put the adverb 'carefully' before the verb it describes.",
        scrambled_words: [
          {
            id: "w4",
            label: "collected",
          },
          {
            id: "w8",
            label: "a",
          },
          {
            id: "w1",
            label: "The",
          },
          {
            id: "w5",
            label: "morning",
          },
          {
            id: "w6",
            label: "dew",
          },
          {
            id: "w2",
            label: "farmer",
          },
          {
            id: "w7",
            label: "in",
          },
          {
            id: "w10",
            label: "bottle.",
          },
          {
            id: "w9",
            label: "small",
          },
          {
            id: "w3",
            label: "carefully",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10"],
        hint: "Start with the subject, then how, then what was done.",
      },
    },
  ];
  for (const challenge of levels1_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

  const levels1_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: A Bottle of Dew",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the events of this short story in the order they happen.",
        scrambled_steps: [
          {
            id: "st4",
            label: "Within days the seedlings stand up straight and green",
          },
          {
            id: "st1",
            label: "Ravi notices that the seedlings in his field are wilting",
          },
          {
            id: "st3",
            label: "In the morning he pours the collected water gently onto the seedlings",
          },
          {
            id: "st2",
            label: "He leaves a wide sheet out overnight to gather dew",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "A problem is noticed before a plan is made, and the result comes last.",
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

  // ---------- Chapter 2: The Raven and the Fox ----------
  let chapter2 = await Chapter.findOne({ subject_id: subject._id, title: "The Raven and the Fox" });
  if (!chapter2) {
    chapter2 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 1: Fables and Folk Tales",
      title: "The Raven and the Fox",
      order_index: 2,
    });
    console.log("Created chapter:", chapter2._id);
  } else {
    console.log("Using existing chapter:", chapter2._id);
  }

  let concept2_1 = await Concept.findOne({ chapter_id: chapter2._id, title: "Cunning and Wisdom: Connectors and Sequence" });
  if (!concept2_1) {
    concept2_1 = await Concept.create({
      chapter_id: chapter2._id,
      title: "Cunning and Wisdom: Connectors and Sequence",
      explanation_text:
        "Connecting words such as 'but' and 'because' join ideas. Prefixes such as un- give words the opposite meaning.",
    });
    console.log("Created concept:", concept2_1._id);
  } else {
    console.log("Using existing concept:", concept2_1._id);
  }

  const levels2_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: The Raven and the Fox",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "in a way that is not sensible",
        scrambled_pieces: [
          {
            id: "w3",
            label: "-ly (in a way that is)",
          },
          {
            id: "w2",
            label: "wise (sensible)",
          },
          {
            id: "w1",
            label: "un- (not)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "The prefix that means 'not' comes first, then the base word, then the ending.",
      },
    },
  ];
  for (const challenge of levels2_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels2_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: The Raven and the Fox",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The word 'but' joins two ideas that contrast.",
        scrambled_words: [
          {
            id: "w3",
            label: "spoke",
          },
          {
            id: "w7",
            label: "wise",
          },
          {
            id: "w9",
            label: "did",
          },
          {
            id: "w6",
            label: "a",
          },
          {
            id: "w2",
            label: "fox",
          },
          {
            id: "w12",
            label: "him.",
          },
          {
            id: "w11",
            label: "believe",
          },
          {
            id: "w10",
            label: "not",
          },
          {
            id: "w4",
            label: "sweetly,",
          },
          {
            id: "w5",
            label: "but",
          },
          {
            id: "w8",
            label: "raven",
          },
          {
            id: "w1",
            label: "The",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12"],
        hint: "Put the fox's action first, then the contrast.",
      },
    },
  ];
  for (const challenge of levels2_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

  const levels2_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: The Raven and the Fox",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the events of this fable-style story in the order they happen.",
        scrambled_steps: [
          {
            id: "st4",
            label: "The fox walks away hungry",
          },
          {
            id: "st3",
            label: "The raven realises the fox only wants the fruit and holds on tightly",
          },
          {
            id: "st2",
            label: "The fox praises the raven's voice in a very sweet tone",
          },
          {
            id: "st1",
            label: "A hungry fox sees a raven holding a fruit in its beak",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "The fox must see the fruit before he can flatter the raven.",
      },
    },
  ];
  for (const challenge of levels2_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 3: Rama to the Rescue ----------
  let chapter3 = await Chapter.findOne({ subject_id: subject._id, title: "Rama to the Rescue" });
  if (!chapter3) {
    chapter3 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 1: Fables and Folk Tales",
      title: "Rama to the Rescue",
      order_index: 3,
    });
    console.log("Created chapter:", chapter3._id);
  } else {
    console.log("Using existing chapter:", chapter3._id);
  }

  let concept3_1 = await Concept.findOne({ chapter_id: chapter3._id, title: "Courage in Action: Time Clauses and Rescue Sequence" });
  if (!concept3_1) {
    concept3_1 = await Concept.create({
      chapter_id: chapter3._id,
      title: "Courage in Action: Time Clauses and Rescue Sequence",
      explanation_text:
        "A time clause beginning with 'when' tells us the moment something happens. The suffix -less means without.",
    });
    console.log("Created concept:", concept3_1._id);
  } else {
    console.log("Using existing concept:", concept3_1._id);
  }

  const levels3_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: Rama to the Rescue",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "without fear, in a brave way",
        scrambled_pieces: [
          {
            id: "w3",
            label: "-ly (in a way that is)",
          },
          {
            id: "w2",
            label: "-less (without)",
          },
          {
            id: "w1",
            label: "fear",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Base word first, then -less (without), then -ly.",
      },
    },
  ];
  for (const challenge of levels3_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels3_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: Rama to the Rescue",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Start with the 'When' clause, then a comma, then the main action.",
        scrambled_words: [
          {
            id: "w2",
            label: "the",
          },
          {
            id: "w11",
            label: "neighbours.",
          },
          {
            id: "w8",
            label: "to",
          },
          {
            id: "w6",
            label: "villagers",
          },
          {
            id: "w7",
            label: "rushed",
          },
          {
            id: "w9",
            label: "help",
          },
          {
            id: "w3",
            label: "river",
          },
          {
            id: "w1",
            label: "When",
          },
          {
            id: "w10",
            label: "their",
          },
          {
            id: "w5",
            label: "brave",
          },
          {
            id: "w4",
            label: "rose,",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "The time clause comes first in this sentence.",
      },
    },
  ];
  for (const challenge of levels3_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

  const levels3_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: Rama to the Rescue",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of this rescue in the order they happen.",
        scrambled_steps: [
          {
            id: "st1",
            label: "A flood traps a family on the roof of their house",
          },
          {
            id: "st4",
            label: "The family is brought safely to dry land",
          },
          {
            id: "st3",
            label: "They row carefully to the roof",
          },
          {
            id: "st2",
            label: "Neighbours tie a strong rope to a boat",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Help must be organised before the boat sets out.",
      },
    },
  ];
  for (const challenge of levels3_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 4: The Unlikely Best Friends ----------
  let chapter4 = await Chapter.findOne({ subject_id: subject._id, title: "The Unlikely Best Friends" });
  if (!chapter4) {
    chapter4 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 2: Friendship",
      title: "The Unlikely Best Friends",
      order_index: 4,
    });
    console.log("Created chapter:", chapter4._id);
  } else {
    console.log("Using existing chapter:", chapter4._id);
  }

  let concept4_1 = await Concept.findOne({ chapter_id: chapter4._id, title: "Unusual Friendships: Suffixes and Comparisons" });
  if (!concept4_1) {
    concept4_1 = await Concept.create({
      chapter_id: chapter4._id,
      title: "Unusual Friendships: Suffixes and Comparisons",
      explanation_text:
        "The suffix -ship forms nouns that name a relationship or state. Comparing two things uses words such as 'larger' or 'smaller'.",
    });
    console.log("Created concept:", concept4_1._id);
  } else {
    console.log("Using existing concept:", concept4_1._id);
  }

  const levels4_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: The Unlikely Best Friends",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "the bonds between friends",
        scrambled_pieces: [
          {
            id: "w2",
            label: "-ship (the bond of)",
          },
          {
            id: "w1",
            label: "friend",
          },
          {
            id: "w3",
            label: "-s (more than one)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Start with the base word, then -ship, then the plural ending.",
      },
    },
  ];
  for (const challenge of levels4_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels4_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: The Unlikely Best Friends",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Describe each animal with an adjective before its name.",
        scrambled_words: [
          {
            id: "w3",
            label: "dog",
          },
          {
            id: "w6",
            label: "tall",
          },
          {
            id: "w11",
            label: "day.",
          },
          {
            id: "w1",
            label: "A",
          },
          {
            id: "w9",
            label: "together",
          },
          {
            id: "w8",
            label: "played",
          },
          {
            id: "w7",
            label: "giraffe",
          },
          {
            id: "w4",
            label: "and",
          },
          {
            id: "w5",
            label: "one",
          },
          {
            id: "w2",
            label: "small",
          },
          {
            id: "w10",
            label: "every",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "The two animals join with 'and' before the verb.",
      },
    },
  ];
  for (const challenge of levels4_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

  const levels4_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: The Unlikely Best Friends",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the events of this friendship story in the order they happen.",
        scrambled_steps: [
          {
            id: "st4",
            label: "They become inseparable friends",
          },
          {
            id: "st2",
            label: "They share warm straw on a cold night",
          },
          {
            id: "st3",
            label: "They begin to play together each morning",
          },
          {
            id: "st1",
            label: "A puppy and a calf are left alone in a barn",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "First they meet, then they share, then they play, then they become friends.",
      },
    },
  ];
  for (const challenge of levels4_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 5: A Friend's Prayer ----------
  let chapter5 = await Chapter.findOne({ subject_id: subject._id, title: "A Friend's Prayer" });
  if (!chapter5) {
    chapter5 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 2: Friendship",
      title: "A Friend's Prayer",
      order_index: 5,
    });
    console.log("Created chapter:", chapter5._id);
  } else {
    console.log("Using existing chapter:", chapter5._id);
  }

  let concept5_1 = await Concept.findOne({ chapter_id: chapter5._id, title: "Kind Words: Polite Requests and Gentle Support" });
  if (!concept5_1) {
    concept5_1 = await Concept.create({
      chapter_id: chapter5._id,
      title: "Kind Words: Polite Requests and Gentle Support",
      explanation_text:
        "Polite requests use 'please' and gentle verbs. The suffix -ness turns adjectives like 'kind' into nouns.",
    });
    console.log("Created concept:", concept5_1._id);
  } else {
    console.log("Using existing concept:", concept5_1._id);
  }

  const levels5_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: A Friend's Prayer",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "acts or feelings of caring",
        scrambled_pieces: [
          {
            id: "w3",
            label: "-s (more than one)",
          },
          {
            id: "w2",
            label: "-ness (the state of)",
          },
          {
            id: "w1",
            label: "kind",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Base word, then -ness, then the plural ending.",
      },
    },
  ];
  for (const challenge of levels5_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels5_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: A Friend's Prayer",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "A polite request often starts with 'Please'.",
        scrambled_words: [
          {
            id: "w11",
            label: "lonely.",
          },
          {
            id: "w1",
            label: "Please",
          },
          {
            id: "w2",
            label: "stay",
          },
          {
            id: "w6",
            label: "the",
          },
          {
            id: "w8",
            label: "becomes",
          },
          {
            id: "w9",
            label: "dark",
          },
          {
            id: "w4",
            label: "me",
          },
          {
            id: "w10",
            label: "and",
          },
          {
            id: "w7",
            label: "path",
          },
          {
            id: "w5",
            label: "when",
          },
          {
            id: "w3",
            label: "beside",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "Put 'Please' first and 'when' before the second clause.",
      },
    },
  ];
  for (const challenge of levels5_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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
      title: "Story Order: A Friend's Prayer",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of supporting a worried friend in the order they happen.",
        scrambled_steps: [
          {
            id: "st1",
            label: "Anu notices that her friend looks worried about a test",
          },
          {
            id: "st4",
            label: "Her friend feels calmer and more confident",
          },
          {
            id: "st3",
            label: "She offers to revise the difficult chapter together",
          },
          {
            id: "st2",
            label: "Anu sits down and listens to her worries",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Listening should come before offering help.",
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

  // ---------- Chapter 6: The Chair ----------
  let chapter6 = await Chapter.findOne({ subject_id: subject._id, title: "The Chair" });
  if (!chapter6) {
    chapter6 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 2: Friendship",
      title: "The Chair",
      order_index: 6,
    });
    console.log("Created chapter:", chapter6._id);
  } else {
    console.log("Using existing chapter:", chapter6._id);
  }

  let concept6_1 = await Concept.findOne({ chapter_id: chapter6._id, title: "Objects with Stories: Prefixes and Contrast" });
  if (!concept6_1) {
    concept6_1 = await Concept.create({
      chapter_id: chapter6._id,
      title: "Objects with Stories: Prefixes and Contrast",
      explanation_text:
        "The prefix un- reverses the meaning of a word. The connectors 'yet' and 'but' show contrast.",
    });
    console.log("Created concept:", concept6_1._id);
  } else {
    console.log("Using existing concept:", concept6_1._id);
  }

  const levels6_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: The Chair",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "not pleasant to sit or lie on",
        scrambled_pieces: [
          {
            id: "w2",
            label: "comfort",
          },
          {
            id: "w1",
            label: "un- (not)",
          },
          {
            id: "w3",
            label: "-able (able to be)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "The prefix that means 'not' comes first.",
      },
    },
  ];
  for (const challenge of levels6_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels6_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: The Chair",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The word 'yet' joins two contrasting ideas.",
        scrambled_words: [
          {
            id: "w6",
            label: "rather",
          },
          {
            id: "w8",
            label: "yet",
          },
          {
            id: "w1",
            label: "The",
          },
          {
            id: "w7",
            label: "uncomfortable,",
          },
          {
            id: "w5",
            label: "was",
          },
          {
            id: "w4",
            label: "chair",
          },
          {
            id: "w11",
            label: "many",
          },
          {
            id: "w3",
            label: "wooden",
          },
          {
            id: "w12",
            label: "warm",
          },
          {
            id: "w2",
            label: "old",
          },
          {
            id: "w13",
            label: "memories.",
          },
          {
            id: "w9",
            label: "it",
          },
          {
            id: "w10",
            label: "held",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12", "w13"],
        hint: "Describe the chair first, then use 'yet'.",
      },
    },
  ];
  for (const challenge of levels6_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

  const levels6_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: The Chair",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps in which a family restores an old chair.",
        scrambled_steps: [
          {
            id: "st2",
            label: "The children polish it until it shines",
          },
          {
            id: "st4",
            label: "Grandfather sits down and tells them stories",
          },
          {
            id: "st3",
            label: "They add a soft cushion to make it comfortable",
          },
          {
            id: "st1",
            label: "Grandfather brings an old wooden chair to the veranda",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Bringing it out and polishing come before adding comfort.",
      },
    },
  ];
  for (const challenge of levels6_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 7: Neem Baba ----------
  let chapter7 = await Chapter.findOne({ subject_id: subject._id, title: "Neem Baba" });
  if (!chapter7) {
    chapter7 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 3: Nurturing Nature",
      title: "Neem Baba",
      order_index: 7,
    });
    console.log("Created chapter:", chapter7._id);
  } else {
    console.log("Using existing chapter:", chapter7._id);
  }

  let concept7_1 = await Concept.findOne({ chapter_id: chapter7._id, title: "Trees That Help Us: Habits and Uses" });
  if (!concept7_1) {
    concept7_1 = await Concept.create({
      chapter_id: chapter7._id,
      title: "Trees That Help Us: Habits and Uses",
      explanation_text:
        "The present tense describes habits and facts. The prefix re- means again, and -able means able to be done.",
    });
    console.log("Created concept:", concept7_1._id);
  } else {
    console.log("Using existing concept:", concept7_1._id);
  }

  const levels7_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: Neem Baba",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "able to be made fresh or used again",
        scrambled_pieces: [
          {
            id: "w1",
            label: "re- (again)",
          },
          {
            id: "w3",
            label: "-able (able to be)",
          },
          {
            id: "w2",
            label: "new",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Prefix first, then the base, then the ending.",
      },
    },
  ];
  for (const challenge of levels7_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels7_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: Neem Baba",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The phrase 'every summer' shows a regular habit.",
        scrambled_words: [
          {
            id: "w10",
            label: "store",
          },
          {
            id: "w13",
            label: "grain.",
          },
          {
            id: "w9",
            label: "to",
          },
          {
            id: "w3",
            label: "the",
          },
          {
            id: "w6",
            label: "fresh",
          },
          {
            id: "w2",
            label: "summer",
          },
          {
            id: "w7",
            label: "neem",
          },
          {
            id: "w1",
            label: "Every",
          },
          {
            id: "w4",
            label: "villagers",
          },
          {
            id: "w11",
            label: "with",
          },
          {
            id: "w8",
            label: "leaves",
          },
          {
            id: "w12",
            label: "their",
          },
          {
            id: "w5",
            label: "gather",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12", "w13"],
        hint: "The time phrase can start the sentence.",
      },
    },
  ];
  for (const challenge of levels7_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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
      title: "Story Order: Neem Baba",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps in which villagers use neem leaves to protect stored grain.",
        scrambled_steps: [
          {
            id: "st1",
            label: "Villagers collect fresh neem leaves",
          },
          {
            id: "st2",
            label: "They wash the leaves clean",
          },
          {
            id: "st4",
            label: "They place the dry leaves among the stored grain",
          },
          {
            id: "st3",
            label: "They dry the leaves in the shade",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Leaves are collected and cleaned before use.",
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

  // ---------- Chapter 8: What a Bird Thought ----------
  let chapter8 = await Chapter.findOne({ subject_id: subject._id, title: "What a Bird Thought" });
  if (!chapter8) {
    chapter8 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 3: Nurturing Nature",
      title: "What a Bird Thought",
      order_index: 8,
    });
    console.log("Created chapter:", chapter8._id);
  } else {
    console.log("Using existing chapter:", chapter8._id);
  }

  let concept8_1 = await Concept.findOne({ chapter_id: chapter8._id, title: "Bird's-Eye Description: Vivid Words" });
  if (!concept8_1) {
    concept8_1 = await Concept.create({
      chapter_id: chapter8._id,
      title: "Bird's-Eye Description: Vivid Words",
      explanation_text:
        "Descriptive words such as adjectives and adverbs bring a scene to life. A phrase such as 'above the fields' tells us where.",
    });
    console.log("Created concept:", concept8_1._id);
  } else {
    console.log("Using existing concept:", concept8_1._id);
  }

  const levels8_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: What a Bird Thought",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "in a smooth and elegant way",
        scrambled_pieces: [
          {
            id: "w1",
            label: "grace",
          },
          {
            id: "w3",
            label: "-ly (in a way that is)",
          },
          {
            id: "w2",
            label: "-ful (full of)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Base word, then -ful, then -ly.",
      },
    },
  ];
  for (const challenge of levels8_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels8_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: What a Bird Thought",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The phrase 'Above the quiet fields' can start the sentence.",
        scrambled_words: [
          {
            id: "w11",
            label: "morning",
          },
          {
            id: "w4",
            label: "fields,",
          },
          {
            id: "w3",
            label: "quiet",
          },
          {
            id: "w7",
            label: "sparrow",
          },
          {
            id: "w2",
            label: "the",
          },
          {
            id: "w6",
            label: "tiny",
          },
          {
            id: "w1",
            label: "Above",
          },
          {
            id: "w10",
            label: "bright",
          },
          {
            id: "w8",
            label: "chirped",
          },
          {
            id: "w5",
            label: "a",
          },
          {
            id: "w12",
            label: "song.",
          },
          {
            id: "w9",
            label: "its",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12"],
        hint: "Place the phrase first, then a comma, then the bird.",
      },
    },
  ];
  for (const challenge of levels8_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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
      title: "Story Order: What a Bird Thought",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the scene of a bird's morning in the order it happens.",
        scrambled_steps: [
          {
            id: "st1",
            label: "The sun rises and light spreads across the fields",
          },
          {
            id: "st4",
            label: "Other birds join in the morning chorus",
          },
          {
            id: "st2",
            label: "A sparrow wakes and stretches its wings",
          },
          {
            id: "st3",
            label: "It flies to a branch and sings",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Light comes before the birds start to sing.",
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

  // ---------- Chapter 9: Spices that Heal Us ----------
  let chapter9 = await Chapter.findOne({ subject_id: subject._id, title: "Spices that Heal Us" });
  if (!chapter9) {
    chapter9 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 3: Nurturing Nature",
      title: "Spices that Heal Us",
      order_index: 9,
    });
    console.log("Created chapter:", chapter9._id);
  } else {
    console.log("Using existing chapter:", chapter9._id);
  }

  let concept9_1 = await Concept.findOne({ chapter_id: chapter9._id, title: "Kitchen Wisdom: Lists and Compound Words" });
  if (!concept9_1) {
    concept9_1 = await Concept.create({
      chapter_id: chapter9._id,
      title: "Kitchen Wisdom: Lists and Compound Words",
      explanation_text:
        "Items in a list are separated by commas, with 'and' before the last item. Some words are formed by joining two small words.",
    });
    console.log("Created concept:", concept9_1._id);
  } else {
    console.log("Using existing concept:", concept9_1._id);
  }

  const levels9_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: Spices that Heal Us",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "full of taste",
        scrambled_pieces: [
          {
            id: "w2",
            label: "-ful (full of)",
          },
          {
            id: "w1",
            label: "flavour",
          },
        ],
        correct_order: ["w1", "w2"],
        hint: "Base word first, then the ending that means full of.",
      },
    },
  ];
  for (const challenge of levels9_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels9_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: Spices that Heal Us",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Items in a list are separated by commas, and 'and' comes before the last one.",
        scrambled_words: [
          {
            id: "w9",
            label: "used",
          },
          {
            id: "w6",
            label: "are",
          },
          {
            id: "w8",
            label: "spices",
          },
          {
            id: "w12",
            label: "kitchens.",
          },
          {
            id: "w10",
            label: "in",
          },
          {
            id: "w3",
            label: "pepper",
          },
          {
            id: "w11",
            label: "Indian",
          },
          {
            id: "w1",
            label: "Turmeric,",
          },
          {
            id: "w2",
            label: "ginger,",
          },
          {
            id: "w7",
            label: "common",
          },
          {
            id: "w5",
            label: "cloves",
          },
          {
            id: "w4",
            label: "and",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12"],
        hint: "List the spices in a row, then say what they are.",
      },
    },
  ];
  for (const challenge of levels9_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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
      title: "Story Order: Spices that Heal Us",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of preparing fresh ginger for a warm drink.",
        scrambled_steps: [
          {
            id: "st1",
            label: "A cook picks a fresh piece of ginger",
          },
          {
            id: "st3",
            label: "She crushes it gently",
          },
          {
            id: "st4",
            label: "She adds it to a warm herbal drink",
          },
          {
            id: "st2",
            label: "She washes and peels it",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Clean before crushing, and crush before adding to the drink.",
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

  // ---------- Chapter 10: Change of Heart ----------
  let chapter10 = await Chapter.findOne({ subject_id: subject._id, title: "Change of Heart" });
  if (!chapter10) {
    chapter10 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 4: Sports and Wellness",
      title: "Change of Heart",
      order_index: 10,
    });
    console.log("Created chapter:", chapter10._id);
  } else {
    console.log("Using existing chapter:", chapter10._id);
  }

  let concept10_1 = await Concept.findOne({ chapter_id: chapter10._id, title: "Fair Play and Second Thoughts: Cause and Result" });
  if (!concept10_1) {
    concept10_1 = await Concept.create({
      chapter_id: chapter10._id,
      title: "Fair Play and Second Thoughts: Cause and Result",
      explanation_text:
        "A word such as 'after' shows the order of two events. The prefix un- and suffix -ly help describe how someone behaves.",
    });
    console.log("Created concept:", concept10_1._id);
  } else {
    console.log("Using existing concept:", concept10_1._id);
  }

  const levels10_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: Change of Heart",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "in a way that is not just",
        scrambled_pieces: [
          {
            id: "w2",
            label: "fair",
          },
          {
            id: "w1",
            label: "un- (not)",
          },
          {
            id: "w3",
            label: "-ly (in a way that is)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Prefix, base word, ending.",
      },
    },
  ];
  for (const challenge of levels10_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels10_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: Change of Heart",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "'After' shows what came first.",
        scrambled_words: [
          {
            id: "w1",
            label: "After",
          },
          {
            id: "w10",
            label: "start",
          },
          {
            id: "w8",
            label: "apologise",
          },
          {
            id: "w2",
            label: "losing",
          },
          {
            id: "w11",
            label: "again.",
          },
          {
            id: "w9",
            label: "and",
          },
          {
            id: "w5",
            label: "Meera",
          },
          {
            id: "w4",
            label: "match,",
          },
          {
            id: "w7",
            label: "to",
          },
          {
            id: "w6",
            label: "decided",
          },
          {
            id: "w3",
            label: "the",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "The phrase 'After losing the match' begins the sentence.",
      },
    },
  ];
  for (const challenge of levels10_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

  const levels10_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: Change of Heart",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of a change of heart after losing a race.",
        scrambled_steps: [
          {
            id: "st1",
            label: "Sam loses a race and feels angry",
          },
          {
            id: "st3",
            label: "He thinks about how hard the winner trained",
          },
          {
            id: "st4",
            label: "He returns and congratulates the winner",
          },
          {
            id: "st2",
            label: "He walks away from the field",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Anger comes first; reflection leads to the change.",
      },
    },
  ];
  for (const challenge of levels10_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 11: The Winner ----------
  let chapter11 = await Chapter.findOne({ subject_id: subject._id, title: "The Winner" });
  if (!chapter11) {
    chapter11 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 4: Sports and Wellness",
      title: "The Winner",
      order_index: 11,
    });
    console.log("Created chapter:", chapter11._id);
  } else {
    console.log("Using existing chapter:", chapter11._id);
  }

  let concept11_1 = await Concept.findOne({ chapter_id: chapter11._id, title: "Winning Well: Compound Nouns and Past Tense" });
  if (!concept11_1) {
    concept11_1 = await Concept.create({
      chapter_id: chapter11._id,
      title: "Winning Well: Compound Nouns and Past Tense",
      explanation_text:
        "Compound words join two or more words. The past tense tells us what already happened.",
    });
    console.log("Created concept:", concept11_1._id);
  } else {
    console.log("Using existing concept:", concept11_1._id);
  }

  const levels11_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: The Winner",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "fair and generous behaviour in a game",
        scrambled_pieces: [
          {
            id: "w3",
            label: "-ship (the bond of)",
          },
          {
            id: "w2",
            label: "man (person)",
          },
          {
            id: "w1",
            label: "sports",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Say the three parts in order.",
      },
    },
  ];
  for (const challenge of levels11_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels11_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: The Winner",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Use the past tense verbs 'shook' and 'thanked'.",
        scrambled_words: [
          {
            id: "w6",
            label: "every",
          },
          {
            id: "w7",
            label: "player",
          },
          {
            id: "w3",
            label: "shook",
          },
          {
            id: "w5",
            label: "with",
          },
          {
            id: "w4",
            label: "hands",
          },
          {
            id: "w11",
            label: "coach.",
          },
          {
            id: "w10",
            label: "her",
          },
          {
            id: "w2",
            label: "winner",
          },
          {
            id: "w9",
            label: "thanked",
          },
          {
            id: "w8",
            label: "and",
          },
          {
            id: "w1",
            label: "The",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "The winner is the subject; the handshake comes first.",
      },
    },
  ];
  for (const challenge of levels11_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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
      title: "Story Order: The Winner",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the events of Lina's race day.",
        scrambled_steps: [
          {
            id: "st3",
            label: "She keeps a steady pace to the finish",
          },
          {
            id: "st4",
            label: "She crosses the line and shakes hands with the other runners",
          },
          {
            id: "st2",
            label: "She enters the school race",
          },
          {
            id: "st1",
            label: "Lina practises running every morning",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Practice must come before the race.",
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

  // ---------- Chapter 12: Yoga — A Way of Life ----------
  let chapter12 = await Chapter.findOne({ subject_id: subject._id, title: "Yoga — A Way of Life" });
  if (!chapter12) {
    chapter12 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 4: Sports and Wellness",
      title: "Yoga — A Way of Life",
      order_index: 12,
    });
    console.log("Created chapter:", chapter12._id);
  } else {
    console.log("Using existing chapter:", chapter12._id);
  }

  let concept12_1 = await Concept.findOne({ chapter_id: chapter12._id, title: "Calm and Balance: Instructions and Suffixes" });
  if (!concept12_1) {
    concept12_1 = await Concept.create({
      chapter_id: chapter12._id,
      title: "Calm and Balance: Instructions and Suffixes",
      explanation_text:
        "Instructions use short command sentences in order. The suffix -ation turns verbs into nouns.",
    });
    console.log("Created concept:", concept12_1._id);
  } else {
    console.log("Using existing concept:", concept12_1._id);
  }

  const levels12_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: Yoga — A Way of Life",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "the state of being calm and rested",
        scrambled_pieces: [
          {
            id: "w2",
            label: "-ation (the act or state of)",
          },
          {
            id: "w1",
            label: "relax",
          },
        ],
        correct_order: ["w1", "w2"],
        hint: "Base verb first, then the ending that makes a noun.",
      },
    },
  ];
  for (const challenge of levels12_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

  const levels12_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: Yoga — A Way of Life",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The subject is 'Slow breathing and gentle stretches'.",
        scrambled_words: [
          {
            id: "w5",
            label: "stretches",
          },
          {
            id: "w2",
            label: "breathing",
          },
          {
            id: "w1",
            label: "Slow",
          },
          {
            id: "w9",
            label: "calm",
          },
          {
            id: "w11",
            label: "strong.",
          },
          {
            id: "w3",
            label: "and",
          },
          {
            id: "w6",
            label: "help",
          },
          {
            id: "w7",
            label: "us",
          },
          {
            id: "w8",
            label: "feel",
          },
          {
            id: "w4",
            label: "gentle",
          },
          {
            id: "w10",
            label: "but",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "The joined subject comes first, then the verb.",
      },
    },
  ];
  for (const challenge of levels12_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

  const levels12_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: Yoga — A Way of Life",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of a short calming routine.",
        scrambled_steps: [
          {
            id: "st1",
            label: "Sit comfortably on a mat",
          },
          {
            id: "st3",
            label: "Stretch your arms slowly above your head",
          },
          {
            id: "st4",
            label: "Lower your arms and rest quietly",
          },
          {
            id: "st2",
            label: "Close your eyes and breathe slowly",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Get settled first, then breathe and stretch.",
      },
    },
  ];
  for (const challenge of levels12_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 13: Hamara Bharat — Incredible India! ----------
  let chapter13 = await Chapter.findOne({ subject_id: subject._id, title: "Hamara Bharat — Incredible India!" });
  if (!chapter13) {
    chapter13 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 5: Culture and Tradition",
      title: "Hamara Bharat — Incredible India!",
      order_index: 13,
    });
    console.log("Created chapter:", chapter13._id);
  } else {
    console.log("Using existing chapter:", chapter13._id);
  }

  let concept13_1 = await Concept.findOne({ chapter_id: chapter13._id, title: "Diversity and Pride: Describing a Country" });
  if (!concept13_1) {
    concept13_1 = await Concept.create({
      chapter_id: chapter13._id,
      title: "Diversity and Pride: Describing a Country",
      explanation_text:
        "Adjectives make descriptions rich. The prefix un- and suffix -able can change how a word describes an experience.",
    });
    console.log("Created concept:", concept13_1._id);
  } else {
    console.log("Using existing concept:", concept13_1._id);
  }

  const levels13_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: Hamara Bharat — Incredible India!",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "so special that it cannot be forgotten",
        scrambled_pieces: [
          {
            id: "w2",
            label: "forget",
          },
          {
            id: "w1",
            label: "un- (not)",
          },
          {
            id: "w3",
            label: "-able (able to be)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Prefix, base word, ending.",
      },
    },
  ];
  for (const challenge of levels13_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
        concept_id: concept13_1._id,
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

  const levels13_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: Hamara Bharat — Incredible India!",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "'Many' comes before the list.",
        scrambled_words: [
          {
            id: "w4",
            label: "land",
          },
          {
            id: "w3",
            label: "a",
          },
          {
            id: "w9",
            label: "and",
          },
          {
            id: "w6",
            label: "many",
          },
          {
            id: "w1",
            label: "India",
          },
          {
            id: "w5",
            label: "of",
          },
          {
            id: "w11",
            label: "foods.",
          },
          {
            id: "w10",
            label: "delicious",
          },
          {
            id: "w7",
            label: "languages,",
          },
          {
            id: "w2",
            label: "is",
          },
          {
            id: "w8",
            label: "festivals",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "The list follows the phrase 'a land of'.",
      },
    },
  ];
  for (const challenge of levels13_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
        concept_id: concept13_1._id,
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

  const levels13_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: Hamara Bharat — Incredible India!",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of Ria's journey across India.",
        scrambled_steps: [
          {
            id: "st2",
            label: "She visits a mountain town",
          },
          {
            id: "st1",
            label: "Ria plans a trip across India",
          },
          {
            id: "st3",
            label: "She tastes local food in a coastal city",
          },
          {
            id: "st4",
            label: "She writes about what she learned",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Planning comes first and writing about the trip comes last.",
      },
    },
  ];
  for (const challenge of levels13_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept13_1._id,
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

  // ---------- Chapter 14: The Kites ----------
  let chapter14 = await Chapter.findOne({ subject_id: subject._id, title: "The Kites" });
  if (!chapter14) {
    chapter14 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 5: Culture and Tradition",
      title: "The Kites",
      order_index: 14,
    });
    console.log("Created chapter:", chapter14._id);
  } else {
    console.log("Using existing chapter:", chapter14._id);
  }

  let concept14_1 = await Concept.findOne({ chapter_id: chapter14._id, title: "Colour and Movement: Adjectives and Action Verbs" });
  if (!concept14_1) {
    concept14_1 = await Concept.create({
      chapter_id: chapter14._id,
      title: "Colour and Movement: Adjectives and Action Verbs",
      explanation_text:
        "Action verbs and colour adjectives make writing lively. The suffix -ful means full of.",
    });
    console.log("Created concept:", concept14_1._id);
  } else {
    console.log("Using existing concept:", concept14_1._id);
  }

  const levels14_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: The Kites",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "in a bright, many-coloured way",
        scrambled_pieces: [
          {
            id: "w2",
            label: "-ful (full of)",
          },
          {
            id: "w1",
            label: "colour",
          },
          {
            id: "w3",
            label: "-ly (in a way that is)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Base word, then -ful, then -ly.",
      },
    },
  ];
  for (const challenge of levels14_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
        concept_id: concept14_1._id,
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

  const levels14_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: The Kites",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The phrase 'of red, yellow and green' describes the kites.",
        scrambled_words: [
          {
            id: "w8",
            label: "danced",
          },
          {
            id: "w10",
            label: "above",
          },
          {
            id: "w12",
            label: "rooftops.",
          },
          {
            id: "w6",
            label: "and",
          },
          {
            id: "w5",
            label: "yellow",
          },
          {
            id: "w4",
            label: "red,",
          },
          {
            id: "w7",
            label: "green",
          },
          {
            id: "w3",
            label: "of",
          },
          {
            id: "w2",
            label: "kites",
          },
          {
            id: "w1",
            label: "Bright",
          },
          {
            id: "w11",
            label: "the",
          },
          {
            id: "w9",
            label: "high",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12"],
        hint: "The kites are the subject and 'danced' is the verb.",
      },
    },
  ];
  for (const challenge of levels14_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
        concept_id: concept14_1._id,
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

  const levels14_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: The Kites",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of making and flying a paper kite.",
        scrambled_steps: [
          {
            id: "st2",
            label: "They fix the paper on a light frame",
          },
          {
            id: "st3",
            label: "They tie the string to the frame",
          },
          {
            id: "st4",
            label: "They fly the kite in an open field",
          },
          {
            id: "st1",
            label: "Children cut colourful paper into a diamond shape",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Build the kite first and fly it last.",
      },
    },
  ];
  for (const challenge of levels14_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept14_1._id,
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

  // ---------- Chapter 15: Ila Sachani: Embroidering Dreams with Her Feet ----------
  let chapter15 = await Chapter.findOne({ subject_id: subject._id, title: "Ila Sachani: Embroidering Dreams with Her Feet" });
  if (!chapter15) {
    chapter15 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 5: Culture and Tradition",
      title: "Ila Sachani: Embroidering Dreams with Her Feet",
      order_index: 15,
    });
    console.log("Created chapter:", chapter15._id);
  } else {
    console.log("Using existing chapter:", chapter15._id);
  }

  let concept15_1 = await Concept.findOne({ chapter_id: chapter15._id, title: "Creativity and Effort: Phrases and Compound Words" });
  if (!concept15_1) {
    concept15_1 = await Concept.create({
      chapter_id: chapter15._id,
      title: "Creativity and Effort: Phrases and Compound Words",
      explanation_text:
        "A phrase such as 'with patient fingers' tells us how something is done. Compound words join smaller words.",
    });
    console.log("Created concept:", concept15_1._id);
  } else {
    console.log("Using existing concept:", concept15_1._id);
  }

  const levels15_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: Ila Sachani: Embroidering Dreams with Her Feet",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "made skilfully by hand",
        scrambled_pieces: [
          {
            id: "w3",
            label: "-ed (already done)",
          },
          {
            id: "w1",
            label: "hand",
          },
          {
            id: "w2",
            label: "craft",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Say the two base words first, then the ending.",
      },
    },
  ];
  for (const challenge of levels15_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
        concept_id: concept15_1._id,
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

  const levels15_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: Ila Sachani: Embroidering Dreams with Her Feet",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The phrase 'With patient fingers' can begin the sentence.",
        scrambled_words: [
          {
            id: "w8",
            label: "onto",
          },
          {
            id: "w6",
            label: "tiny",
          },
          {
            id: "w2",
            label: "patient",
          },
          {
            id: "w10",
            label: "bright",
          },
          {
            id: "w4",
            label: "she",
          },
          {
            id: "w11",
            label: "cloth.",
          },
          {
            id: "w1",
            label: "With",
          },
          {
            id: "w5",
            label: "stitched",
          },
          {
            id: "w3",
            label: "fingers",
          },
          {
            id: "w9",
            label: "the",
          },
          {
            id: "w7",
            label: "flowers",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "Put the phrase first, then the subject 'she'.",
      },
    },
  ];
  for (const challenge of levels15_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
        concept_id: concept15_1._id,
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

  const levels15_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: Ila Sachani: Embroidering Dreams with Her Feet",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of making an embroidered cloth.",
        scrambled_steps: [
          {
            id: "st2",
            label: "She draws it lightly on the cloth",
          },
          {
            id: "st1",
            label: "An artist chooses a design",
          },
          {
            id: "st3",
            label: "She stitches it patiently with coloured thread",
          },
          {
            id: "st4",
            label: "She displays the finished cloth at a fair",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Design first, stitch second, display last.",
      },
    },
  ];
  for (const challenge of levels15_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept15_1._id,
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

  // ---------- Chapter 16: National War Memorial ----------
  let chapter16 = await Chapter.findOne({ subject_id: subject._id, title: "National War Memorial" });
  if (!chapter16) {
    chapter16 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Unit 5: Culture and Tradition",
      title: "National War Memorial",
      order_index: 16,
    });
    console.log("Created chapter:", chapter16._id);
  } else {
    console.log("Using existing chapter:", chapter16._id);
  }

  let concept16_1 = await Concept.findOne({ chapter_id: chapter16._id, title: "Remembering with Respect: Relative Clauses" });
  if (!concept16_1) {
    concept16_1 = await Concept.create({
      chapter_id: chapter16._id,
      title: "Remembering with Respect: Relative Clauses",
      explanation_text:
        "A relative clause begins with words such as 'who' or 'that' and gives extra information about a person or thing.",
    });
    console.log("Created concept:", concept16_1._id);
  } else {
    console.log("Using existing concept:", concept16_1._id);
  }

  const levels16_1_ENGLISH_WORD_FORGE = [
    {
      title: "Word Forge: National War Memorial",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "the act of keeping someone in mind with respect",
        scrambled_pieces: [
          {
            id: "w2",
            label: "member",
          },
          {
            id: "w1",
            label: "re- (again)",
          },
          {
            id: "w3",
            label: "-ance (the act of)",
          },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "Prefix, base word, ending.",
      },
    },
  ];
  for (const challenge of levels16_1_ENGLISH_WORD_FORGE) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
        concept_id: concept16_1._id,
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

  const levels16_1_ENGLISH_SENTENCE_BUILDER = [
    {
      title: "Sentence Builder: National War Memorial",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "The words 'who protected our country' tell us more about the soldiers.",
        scrambled_words: [
          {
            id: "w6",
            label: "remember",
          },
          {
            id: "w11",
            label: "our",
          },
          {
            id: "w7",
            label: "the",
          },
          {
            id: "w4",
            label: "silence",
          },
          {
            id: "w1",
            label: "We",
          },
          {
            id: "w3",
            label: "in",
          },
          {
            id: "w8",
            label: "soldiers",
          },
          {
            id: "w5",
            label: "to",
          },
          {
            id: "w2",
            label: "stand",
          },
          {
            id: "w12",
            label: "country.",
          },
          {
            id: "w10",
            label: "protected",
          },
          {
            id: "w9",
            label: "who",
          },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12"],
        hint: "The main clause comes first.",
      },
    },
  ];
  for (const challenge of levels16_1_ENGLISH_SENTENCE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
        concept_id: concept16_1._id,
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

  const levels16_1_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Story Order: National War Memorial",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of a school visit to a memorial.",
        scrambled_steps: [
          {
            id: "st4",
            label: "Students place flowers respectfully",
          },
          {
            id: "st3",
            label: "Everyone stands in silence",
          },
          {
            id: "st2",
            label: "A bugle is played",
          },
          {
            id: "st1",
            label: "Students gather quietly at the memorial",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Gather before the silent moment, and flowers come last.",
      },
    },
  ];
  for (const challenge of levels16_1_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
        concept_id: concept16_1._id,
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
