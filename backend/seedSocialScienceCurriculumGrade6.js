require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 6 Social Science - Exploring Society: India and Beyond (chapters 1, 3-5, 7, 9-14, plus one added concept in chapter 8)
// Generated content for the current 2026-27 Grade 6 curriculum. Idempotent:
// every Chapter/Concept/GameContent is looked up before it is created
// (GameContent is keyed on {game_type, title}), so re-running is safe.
// All reused mechanics keep their existing technical game_type (see the
// Phase 1 audit, GLOBAL-2); no new mechanic or shared UI/scoring change.
// Chapter 8 is the retitled "Unity in Diversity, or 'Many in the One'" (migrations/realignGrade6Curriculum.js retitles the live chapter; seedSocialScienceGrade6.js creates it under the new title on a fresh DB).

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 6 });
    console.log("Created new Grade 6 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- Chapter 1: Locating Places on the Earth ----------
  let chapter1 = await Chapter.findOne({ subject_id: subject._id, title: "Locating Places on the Earth" });
  if (!chapter1) {
    chapter1 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme A: India and the World: Land and the People",
      title: "Locating Places on the Earth",
      order_index: 1,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter1._id);
  } else {
    console.log("Using existing chapter:", chapter1._id);
  }

  let concept1_1 = await Concept.findOne({ chapter_id: chapter1._id, title: "Reference Lines on the Globe" });
  if (!concept1_1) {
    concept1_1 = await Concept.create({
      chapter_id: chapter1._id,
      title: "Reference Lines on the Globe",
      explanation_text:
        "The Equator (0° latitude) and the Prime Meridian (0° longitude) are the two main reference lines used to describe where any place is on the Earth. Other important lines of latitude include the Tropic of Cancer, Tropic of Capricorn, Arctic Circle and Antarctic Circle.",
    });
    console.log("Created concept:", concept1_1._id);
  } else {
    console.log("Using existing concept:", concept1_1._id);
  }

  const levels1_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Reference Lines of the Globe",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each reference line of the globe to what it is.",
        slots: [
          {
            id: "s1",
            label: "The Equator",
          },
          {
            id: "s2",
            label: "The Prime Meridian",
          },
          {
            id: "s3",
            label: "The Tropic of Cancer",
          },
        ],
        components: [
          {
            id: "c1",
            label: "The 0° line of latitude that divides the Earth into the Northern and Southern Hemispheres",
          },
          {
            id: "c4",
            label: "The point at 90° N where all lines of longitude meet",
          },
          {
            id: "c2",
            label: "The 0° line of longitude that passes through Greenwich, near London",
          },
          {
            id: "c3",
            label: "The line of latitude at about 23½° N that passes through India",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Latitudes run east–west and are measured from the Equator; longitudes run north–south and are measured from the Prime Meridian.",
      },
    },
  ];
  for (const challenge of levels1_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels1_1_GEOGRAPHY_ROUTE_BUILDER = [
    {
      title: "Route: Latitudes from Pole to Pole",
      difficulty: "medium",
      order_index: 1,
      payload: {
        journey_label: "Travel from the North Pole to the South Pole and list the main lines of latitude you cross, in order.",
        scrambled_stops: [
          {
            id: "g3",
            label: "The Equator (0°)",
          },
          {
            id: "g1",
            label: "Arctic Circle (about 66½° N)",
          },
          {
            id: "g4",
            label: "Tropic of Capricorn (about 23½° S)",
          },
          {
            id: "g5",
            label: "Antarctic Circle (about 66½° S)",
          },
          {
            id: "g2",
            label: "Tropic of Cancer (about 23½° N)",
          },
        ],
        correct_order: ["g1", "g2", "g3", "g4", "g5"],
        hint: "Go from north to south: high northern latitudes first, then the Equator, then the southern lines.",
      },
    },
  ];
  for (const challenge of levels1_1_GEOGRAPHY_ROUTE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
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

  let concept1_2 = await Concept.findOne({ chapter_id: chapter1._id, title: "Hemispheres, Directions and Coordinates" });
  if (!concept1_2) {
    concept1_2 = await Concept.create({
      chapter_id: chapter1._id,
      title: "Hemispheres, Directions and Coordinates",
      explanation_text:
        "The Equator divides the Earth into the Northern and Southern Hemispheres and the Prime Meridian (with the 180° meridian) into the Eastern and Western Hemispheres. A place is pinpointed by its latitude and longitude together.",
    });
    console.log("Created concept:", concept1_2._id);
  } else {
    console.log("Using existing concept:", concept1_2._id);
  }

  const levels1_2_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: The Four Hemispheres",
      difficulty: "hard",
      order_index: 1,
      payload: {
        scenario: "Match each hemisphere to a place or fact that belongs to it.",
        slots: [
          {
            id: "s1",
            label: "Northern Hemisphere",
          },
          {
            id: "s2",
            label: "Southern Hemisphere",
          },
          {
            id: "s3",
            label: "Eastern Hemisphere",
          },
          {
            id: "s4",
            label: "Western Hemisphere",
          },
        ],
        components: [
          {
            id: "c3",
            label: "Lies east of the Prime Meridian; India is located here too",
          },
          {
            id: "c1",
            label: "Lies north of the Equator; India is located here",
          },
          {
            id: "c4",
            label: "Lies west of the Prime Meridian; the Americas mostly lie here",
          },
          {
            id: "c5",
            label: "Lies on both sides of the Equator at the same time",
          },
          {
            id: "c2",
            label: "Lies south of the Equator; Australia is located here",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "India lies in two hemispheres at once: north of the Equator and east of the Prime Meridian. Compare what is unique in each card.",
      },
    },
  ];
  for (const challenge of levels1_2_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels1_2_SOCIAL_SCIENCE_PROCESS_BUILDER = [
    {
      title: "Process: Pinpointing a Place with Coordinates",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps you would follow to locate a city on a map using its latitude and longitude.",
        scrambled_steps: [
          {
            id: "st3",
            label: "Follow both lines until they cross",
          },
          {
            id: "st2",
            label: "Find the line of longitude given for the city on the map's top or bottom scale",
          },
          {
            id: "st1",
            label: "Find the line of latitude given for the city on the map's side scale",
          },
          {
            id: "st4",
            label: "Read the name of the place at the point where the lines meet",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "You need both lines before you can look for the place where they cross.",
      },
    },
  ];
  for (const challenge of levels1_2_SOCIAL_SCIENCE_PROCESS_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

  // ---------- Chapter 3: Landforms and Life ----------
  let chapter3 = await Chapter.findOne({ subject_id: subject._id, title: "Landforms and Life" });
  if (!chapter3) {
    chapter3 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme A: India and the World: Land and the People",
      title: "Landforms and Life",
      order_index: 3,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter3._id);
  } else {
    console.log("Using existing chapter:", chapter3._id);
  }

  let concept3_1 = await Concept.findOne({ chapter_id: chapter3._id, title: "Major Landforms" });
  if (!concept3_1) {
    concept3_1 = await Concept.create({
      chapter_id: chapter3._id,
      title: "Major Landforms",
      explanation_text:
        "Mountains, plateaus and plains are major landforms. Mountains rise high above the surrounding land, plateaus are raised areas with a mostly flat top, and plains are large, low, flat or gently rolling areas.",
    });
    console.log("Created concept:", concept3_1._id);
  } else {
    console.log("Using existing concept:", concept3_1._id);
  }

  const levels3_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Mountain, Plateau or Plain?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each landform to the description that fits it best.",
        slots: [
          {
            id: "s1",
            label: "A mountain",
          },
          {
            id: "s2",
            label: "A plateau",
          },
          {
            id: "s3",
            label: "A plain",
          },
        ],
        components: [
          {
            id: "c2",
            label: "A raised area of land with a mostly flat top and steep sides",
          },
          {
            id: "c3",
            label: "A large stretch of low-lying land that is flat or gently rolling",
          },
          {
            id: "c4",
            label: "A narrow channel of water joining two larger water bodies",
          },
          {
            id: "c1",
            label: "A high, steep landform that rises sharply above the land around it, often ending in a peak",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Think about height and shape: how high is it, and is the top pointed or flat?",
      },
    },
  ];
  for (const challenge of levels3_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  let concept3_2 = await Concept.findOne({ chapter_id: chapter3._id, title: "How Landforms Shape Life" });
  if (!concept3_2) {
    concept3_2 = await Concept.create({
      chapter_id: chapter3._id,
      title: "How Landforms Shape Life",
      explanation_text:
        "The landform where people live affects how they farm, travel and build. Fertile river plains support dense populations, mountain slopes need terrace farming, and deserts have few people because water is scarce.",
    });
    console.log("Created concept:", concept3_2._id);
  } else {
    console.log("Using existing concept:", concept3_2._id);
  }

  const levels3_2_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Landforms and Ways of Life",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each landform to the way of life it usually supports.",
        slots: [
          {
            id: "s1",
            label: "Fertile river plains",
          },
          {
            id: "s2",
            label: "Steep mountain slopes",
          },
          {
            id: "s3",
            label: "Hot, dry deserts",
          },
        ],
        components: [
          {
            id: "c2",
            label: "Farms cut into terraces, herding, and fewer large towns",
          },
          {
            id: "c4",
            label: "Ports and fishing harbours found far inland",
          },
          {
            id: "c1",
            label: "Good farming land, so many villages, towns and roads",
          },
          {
            id: "c3",
            label: "Very sparse settlement clustered near oases and water sources",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Ask what each landform offers: flat fertile land, water, or neither.",
      },
    },
  ];
  for (const challenge of levels3_2_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels3_2_GEOGRAPHY_ROUTE_BUILDER = [
    {
      title: "Route: A River from Source to Sea",
      difficulty: "hard",
      order_index: 1,
      payload: {
        journey_label: "Follow a river from its beginning to the sea and arrange the stages in order.",
        scrambled_stops: [
          {
            id: "g2",
            label: "A fast, narrow stream tumbling down a steep valley",
          },
          {
            id: "g3",
            label: "A wide, slow river flowing across the plain",
          },
          {
            id: "g1",
            label: "A spring or melting glacier in the mountains",
          },
          {
            id: "g5",
            label: "The sea",
          },
          {
            id: "g4",
            label: "A delta where the river splits into channels near the coast",
          },
        ],
        correct_order: ["g1", "g2", "g3", "g4", "g5"],
        hint: "Rivers begin high and end at sea level, slowing down as the land flattens.",
      },
    },
  ];
  for (const challenge of levels3_2_GEOGRAPHY_ROUTE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
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

  // ---------- Chapter 4: Timeline and Sources of History ----------
  let chapter4 = await Chapter.findOne({ subject_id: subject._id, title: "Timeline and Sources of History" });
  if (!chapter4) {
    chapter4 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme B: Tapestry of the Past",
      title: "Timeline and Sources of History",
      order_index: 4,
      strand: "History",
    });
    console.log("Created chapter:", chapter4._id);
  } else {
    console.log("Using existing chapter:", chapter4._id);
  }

  let concept4_1 = await Concept.findOne({ chapter_id: chapter4._id, title: "Reading Timelines: BCE and CE" });
  if (!concept4_1) {
    concept4_1 = await Concept.create({
      chapter_id: chapter4._id,
      title: "Reading Timelines: BCE and CE",
      explanation_text:
        "Years before the year 1 are counted backwards as BCE (Before Common Era) and years after it as CE (Common Era). A timeline places events in order, so an earlier date is a larger BCE number and a smaller CE number.",
    });
    console.log("Created concept:", concept4_1._id);
  } else {
    console.log("Using existing concept:", concept4_1._id);
  }

  const levels4_1_HISTORY_TIMELINE_BUILDER = [
    {
      title: "Timeline: BCE and CE Years",
      difficulty: "easy",
      order_index: 1,
      payload: {
        era_label: "Order these years from the earliest to the latest.",
        scrambled_events: [
          {
            id: "m1",
            label: "500 BCE",
          },
          {
            id: "m3",
            label: "100 CE",
          },
          {
            id: "m2",
            label: "100 BCE",
          },
          {
            id: "m4",
            label: "1000 CE",
          },
        ],
        correct_order: ["m1", "m2", "m3", "m4"],
        hint: "BCE years count down toward year 1, so 500 BCE comes before 100 BCE; every CE year comes after both.",
      },
    },
    {
      title: "Timeline: Events of Early India",
      difficulty: "medium",
      order_index: 2,
      payload: {
        era_label: "Place these events of India's past in the order they happened.",
        scrambled_events: [
          {
            id: "m2",
            label: "Ashoka rules the Mauryan Empire (c. 268–232 BCE)",
          },
          {
            id: "m4",
            label: "The Taj Mahal is built (1632–1653 CE)",
          },
          {
            id: "m1",
            label: "Harappan cities flourish (c. 2600 BCE)",
          },
          {
            id: "m3",
            label: "The Gupta Empire is at its height (c. 4th–5th century CE)",
          },
        ],
        correct_order: ["m1", "m2", "m3", "m4"],
        hint: "Use the BCE/CE dates in each card. BCE dates come first, with the larger BCE number earlier.",
      },
    },
  ];
  for (const challenge of levels4_1_HISTORY_TIMELINE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_TIMELINE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_TIMELINE_BUILDER",
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

  let concept4_2 = await Concept.findOne({ chapter_id: chapter4._id, title: "Sources of History" });
  if (!concept4_2) {
    concept4_2 = await Concept.create({
      chapter_id: chapter4._id,
      title: "Sources of History",
      explanation_text:
        "Historians learn about the past from sources: objects and remains dug up by archaeologists, inscriptions carved on stone or metal, coins, and manuscripts written by hand.",
    });
    console.log("Created concept:", concept4_2._id);
  } else {
    console.log("Using existing concept:", concept4_2._id);
  }

  const levels4_2_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Sources of History",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each source of history to what it is.",
        slots: [
          {
            id: "s1",
            label: "Coins",
          },
          {
            id: "s2",
            label: "Inscriptions",
          },
          {
            id: "s3",
            label: "Manuscripts",
          },
          {
            id: "s4",
            label: "Archaeological remains",
          },
        ],
        components: [
          {
            id: "c3",
            label: "Hand-written records on materials such as palm leaf, birch bark or paper",
          },
          {
            id: "c4",
            label: "Objects, tools and buildings found by digging up old settlements",
          },
          {
            id: "c1",
            label: "Metal pieces that often show a ruler's name or image and the way trade was carried on",
          },
          {
            id: "c2",
            label: "Writing carved into stone or metal, often recording a ruler's orders or gifts",
          },
          {
            id: "c5",
            label: "Newspaper reports written after the invention of the printing press",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Ask what each source is made of and how it was made.",
      },
    },
  ];
  for (const challenge of levels4_2_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  // ---------- Chapter 5: India, That Is Bharat ----------
  let chapter5 = await Chapter.findOne({ subject_id: subject._id, title: "India, That Is Bharat" });
  if (!chapter5) {
    chapter5 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme B: Tapestry of the Past",
      title: "India, That Is Bharat",
      order_index: 5,
      strand: "History",
    });
    console.log("Created chapter:", chapter5._id);
  } else {
    console.log("Using existing chapter:", chapter5._id);
  }

  let concept5_1 = await Concept.findOne({ chapter_id: chapter5._id, title: "Names and Identity of Bharat" });
  if (!concept5_1) {
    concept5_1 = await Concept.create({
      chapter_id: chapter5._id,
      title: "Names and Identity of Bharat",
      explanation_text:
        "The country is known as both India and Bharat. The name India is linked to the river Sindhu (Indus), while Bharat is an ancient name for the land that is also used officially in the Constitution.",
    });
    console.log("Created concept:", concept5_1._id);
  } else {
    console.log("Using existing concept:", concept5_1._id);
  }

  const levels5_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: India and Bharat",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each name or text to what it tells us.",
        slots: [
          {
            id: "s1",
            label: "The name 'India'",
          },
          {
            id: "s2",
            label: "The name 'Bharat'",
          },
          {
            id: "s3",
            label: "Article 1 of the Constitution",
          },
        ],
        components: [
          {
            id: "c1",
            label: "Traces back to the river Sindhu (Indus), whose name outsiders shaped into 'India'",
          },
          {
            id: "c3",
            label: "Declares that 'India, that is Bharat' is a Union of States",
          },
          {
            id: "c4",
            label: "A name given to the country only after 1947",
          },
          {
            id: "c2",
            label: "An ancient name for the land, found in old Indian texts",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "One card is about a river, one about age of the name, and one about the law.",
      },
    },
  ];
  for (const challenge of levels5_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  let concept5_2 = await Concept.findOne({ chapter_id: chapter5._id, title: "Land and Seas of India" });
  if (!concept5_2) {
    concept5_2 = await Concept.create({
      chapter_id: chapter5._id,
      title: "Land and Seas of India",
      explanation_text:
        "India has the Himalayas in the north, the northern plains, the Deccan Plateau in the peninsula, and is bordered by the Arabian Sea, the Bay of Bengal and the Indian Ocean.",
    });
    console.log("Created concept:", concept5_2._id);
  } else {
    console.log("Using existing concept:", concept5_2._id);
  }

  const levels5_2_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: India's Seas and Mountains",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each physical feature to its place in India's geography.",
        slots: [
          {
            id: "s1",
            label: "Arabian Sea",
          },
          {
            id: "s2",
            label: "Bay of Bengal",
          },
          {
            id: "s3",
            label: "Indian Ocean",
          },
          {
            id: "s4",
            label: "The Himalayas",
          },
        ],
        components: [
          {
            id: "c5",
            label: "The sea that lies along India's northern border",
          },
          {
            id: "c4",
            label: "A great mountain range along India's northern border",
          },
          {
            id: "c2",
            label: "Lies to the east of the Indian peninsula",
          },
          {
            id: "c1",
            label: "Lies to the west of the Indian peninsula",
          },
          {
            id: "c3",
            label: "Touches the southern tip of India at Kanyakumari",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Use directions: west, east, south and north.",
      },
    },
  ];
  for (const challenge of levels5_2_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels5_2_GEOGRAPHY_ROUTE_BUILDER = [
    {
      title: "Route: North to South Across India",
      difficulty: "hard",
      order_index: 1,
      payload: {
        journey_label: "Travel from the far north of India to the far south and arrange the regions in order.",
        scrambled_stops: [
          {
            id: "g3",
            label: "The Deccan Plateau",
          },
          {
            id: "g4",
            label: "Kanyakumari, the southern tip",
          },
          {
            id: "g2",
            label: "The Northern Plains",
          },
          {
            id: "g1",
            label: "The Himalayas",
          },
        ],
        correct_order: ["g1", "g2", "g3", "g4"],
        hint: "The Himalayas are in the north; the peninsula narrows towards Kanyakumari in the south.",
      },
    },
  ];
  for (const challenge of levels5_2_GEOGRAPHY_ROUTE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
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

  // ---------- Chapter 7: India's Cultural Roots ----------
  let chapter7 = await Chapter.findOne({ subject_id: subject._id, title: "India's Cultural Roots" });
  if (!chapter7) {
    chapter7 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme C: Our Cultural Heritage and Knowledge Traditions",
      title: "India's Cultural Roots",
      order_index: 7,
      strand: "History",
    });
    console.log("Created chapter:", chapter7._id);
  } else {
    console.log("Using existing chapter:", chapter7._id);
  }

  let concept7_1 = await Concept.findOne({ chapter_id: chapter7._id, title: "Ancient Texts and Teachers" });
  if (!concept7_1) {
    concept7_1 = await Concept.create({
      chapter_id: chapter7._id,
      title: "Ancient Texts and Teachers",
      explanation_text:
        "India's cultural roots include the Vedas and Upanishads, and the teachings of thinkers such as the Buddha and Mahavira. These ideas about knowledge, truth and non-violence spread across the land and beyond.",
    });
    console.log("Created concept:", concept7_1._id);
  } else {
    console.log("Using existing concept:", concept7_1._id);
  }

  const levels7_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Texts and Teachers",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each text or teacher to what they are known for.",
        slots: [
          {
            id: "s1",
            label: "The Vedas",
          },
          {
            id: "s2",
            label: "The Upanishads",
          },
          {
            id: "s3",
            label: "The Buddha",
          },
          {
            id: "s4",
            label: "Mahavira",
          },
        ],
        components: [
          {
            id: "c2",
            label: "Texts that explore deep questions about the self and the universe",
          },
          {
            id: "c1",
            label: "Some of the oldest Indian texts, composed in Sanskrit and passed on orally for centuries",
          },
          {
            id: "c3",
            label: "Taught a path to end suffering after gaining enlightenment at Bodh Gaya",
          },
          {
            id: "c5",
            label: "A court chronicle of the Mughal emperors",
          },
          {
            id: "c4",
            label: "A Jain teacher who stressed ahimsa, or non-violence",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "The Vedas are texts, the Upanishads are texts about philosophy, and the other two are teachers.",
      },
    },
  ];
  for (const challenge of levels7_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels7_1_HISTORY_TIMELINE_BUILDER = [
    {
      title: "Timeline: Growth of Indian Ideas",
      difficulty: "medium",
      order_index: 1,
      payload: {
        era_label: "Arrange these developments in the order they happened.",
        scrambled_events: [
          {
            id: "m2",
            label: "The Upanishads are composed",
          },
          {
            id: "m3",
            label: "The Buddha and Mahavira teach (about the 6th–5th century BCE)",
          },
          {
            id: "m1",
            label: "The Vedas are composed and memorised",
          },
          {
            id: "m4",
            label: "Ashoka spreads Buddhist ideas across his empire (3rd century BCE)",
          },
        ],
        correct_order: ["m1", "m2", "m3", "m4"],
        hint: "Texts came before the teachers, and Ashoka came after the Buddha.",
      },
    },
  ];
  for (const challenge of levels7_1_HISTORY_TIMELINE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_TIMELINE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_TIMELINE_BUILDER",
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

  let concept7_2 = await Concept.findOne({ chapter_id: chapter7._id, title: "Caring for Cultural Heritage" });
  if (!concept7_2) {
    concept7_2 = await Concept.create({
      chapter_id: chapter7._id,
      title: "Caring for Cultural Heritage",
      explanation_text:
        "Monuments, crafts and traditions are cultural heritage. People help keep them alive by learning their stories and treating heritage sites with respect.",
    });
    console.log("Created concept:", concept7_2._id);
  } else {
    console.log("Using existing concept:", concept7_2._id);
  }

  const levels7_2_SOCIAL_SCIENCE_CIVIC_DECISION = [
    {
      title: "Decision: An Old Temple in Your Town",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Your town has a very old temple with carvings. Some visitors are scribbling their names on the walls. What is the best response?",
        options: [
          {
            id: "o1",
            label: "Do nothing, because the wall is already old",
          },
          {
            id: "o2",
            label: "Politely ask them to stop, explain why the carvings matter, and tell the caretaker",
          },
          {
            id: "o3",
            label: "Scribble your own name to fit in",
          },
          {
            id: "o4",
            label: "Tell everyone that old buildings are not worth protecting",
          },
        ],
        correct_hotspot_id: "o2",
        hint: "Heritage belongs to everyone, so protect it in a respectful way.",
      },
    },
  ];
  for (const challenge of levels7_2_SOCIAL_SCIENCE_CIVIC_DECISION) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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

  // ---------- Chapter 8: Unity in Diversity, or 'Many in the One' ----------
  let chapter8 = await Chapter.findOne({ subject_id: subject._id, title: "Unity in Diversity, or 'Many in the One'" });
  if (!chapter8) {
    throw new Error("Chapter Unity in Diversity, or 'Many in the One' not found. Run the earlier Grade 6 seeds (or migrations/realignGrade6Curriculum.js) first.");
  }

  let concept8_1 = await Concept.findOne({ chapter_id: chapter8._id, title: "Shared Threads Across Regions" });
  if (!concept8_1) {
    concept8_1 = await Concept.create({
      chapter_id: chapter8._id,
      title: "Shared Threads Across Regions",
      explanation_text:
        "Travel, trade and pilgrimage carried foods, words, crafts and ideas between regions of India, helping build shared traditions while local differences continued to flourish.",
    });
    console.log("Created concept:", concept8_1._id);
  } else {
    console.log("Using existing concept:", concept8_1._id);
  }

  const levels8_1_HISTORY_CAUSE_EFFECT_MATCH = [
    {
      title: "Cause and Effect: How Regions Grew Closer",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each way people moved around to what it did for shared culture.",
        slots: [
          {
            id: "s1",
            label: "Traders travelling between regions",
          },
          {
            id: "s2",
            label: "Pilgrims visiting far-off holy places",
          },
          {
            id: "s3",
            label: "Festivals celebrated in many regions",
          },
        ],
        components: [
          {
            id: "c3",
            label: "Shared traditions grew while local variations also continued",
          },
          {
            id: "c1",
            label: "Foods, words and crafts spread and mixed",
          },
          {
            id: "c4",
            label: "All regions became exactly the same",
          },
          {
            id: "c2",
            label: "People from distant places learned about one another's customs",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Travel and shared celebrations create links, but they do not erase local differences.",
      },
    },
  ];
  for (const challenge of levels8_1_HISTORY_CAUSE_EFFECT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_CAUSE_EFFECT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_CAUSE_EFFECT_MATCH",
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

  // ---------- Chapter 9: Family and Community ----------
  let chapter9 = await Chapter.findOne({ subject_id: subject._id, title: "Family and Community" });
  if (!chapter9) {
    chapter9 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme D: Governance and Democracy",
      title: "Family and Community",
      order_index: 9,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter9._id);
  } else {
    console.log("Using existing chapter:", chapter9._id);
  }

  let concept9_1 = await Concept.findOne({ chapter_id: chapter9._id, title: "Families and Communities" });
  if (!concept9_1) {
    concept9_1 = await Concept.create({
      chapter_id: chapter9._id,
      title: "Families and Communities",
      explanation_text:
        "A family is a small group of related people living together, such as a nuclear family of parents and children or a joint family of several generations. A community is a larger group that lives in the same area or shares interests and helps one another.",
    });
    console.log("Created concept:", concept9_1._id);
  } else {
    console.log("Using existing concept:", concept9_1._id);
  }

  const levels9_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Family and Community Terms",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each term to its meaning.",
        slots: [
          {
            id: "s1",
            label: "Nuclear family",
          },
          {
            id: "s2",
            label: "Joint family",
          },
          {
            id: "s3",
            label: "Community",
          },
        ],
        components: [
          {
            id: "c4",
            label: "A group formed only to win an election",
          },
          {
            id: "c3",
            label: "A group of people who live in an area or share interests and support one another",
          },
          {
            id: "c2",
            label: "Several generations, such as grandparents, parents and cousins, sharing one household",
          },
          {
            id: "c1",
            label: "Parents and their children living together",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Think about who lives together in each one.",
      },
    },
  ];
  for (const challenge of levels9_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
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

  const levels9_1_SOCIAL_SCIENCE_CIVIC_DECISION = [
    {
      title: "Decision: Flooded Street Cleanup",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "After heavy rain a drain on your street is blocked and water is entering some homes. Elderly neighbours live nearby. What is the best response?",
        options: [
          {
            id: "o1",
            label: "Wait for someone else to fix it, since it is not your house",
          },
          {
            id: "o2",
            label: "Work with neighbours to clear the blockage safely, check on the elderly, and inform local authorities",
          },
          {
            id: "o3",
            label: "Blame the family closest to the drain",
          },
          {
            id: "o4",
            label: "Ignore it until the water leaves by itself",
          },
        ],
        correct_hotspot_id: "o2",
        hint: "Communities solve shared problems by cooperating and by involving the right officials.",
      },
    },
  ];
  for (const challenge of levels9_1_SOCIAL_SCIENCE_CIVIC_DECISION) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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
      title: "Process: Organising a Community Clean-up",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps for a neighbourhood clean-up drive.",
        scrambled_steps: [
          {
            id: "st4",
            label: "They review what worked and what to improve",
          },
          {
            id: "st1",
            label: "Neighbours notice the problem and talk about it",
          },
          {
            id: "st3",
            label: "They carry out the clean-up together",
          },
          {
            id: "st2",
            label: "They plan the day and share out tasks",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Talk and plan before you act, then reflect afterwards.",
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

  // ---------- Chapter 10: Grassroots Democracy — Part 1: Governance ----------
  let chapter10 = await Chapter.findOne({ subject_id: subject._id, title: "Grassroots Democracy — Part 1: Governance" });
  if (!chapter10) {
    chapter10 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme D: Governance and Democracy",
      title: "Grassroots Democracy — Part 1: Governance",
      order_index: 10,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter10._id);
  } else {
    console.log("Using existing chapter:", chapter10._id);
  }

  let concept10_1 = await Concept.findOne({ chapter_id: chapter10._id, title: "Levels of Government" });
  if (!concept10_1) {
    concept10_1 = await Concept.create({
      chapter_id: chapter10._id,
      title: "Levels of Government",
      explanation_text:
        "Governance is how a group of people is managed. India has local, state and central levels of government, and each handles different matters, from village streets to national defence.",
    });
    console.log("Created concept:", concept10_1._id);
  } else {
    console.log("Using existing concept:", concept10_1._id);
  }

  const levels10_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Levels of Government",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each level of government to the kind of matter it mainly handles.",
        slots: [
          {
            id: "s1",
            label: "Local government",
          },
          {
            id: "s2",
            label: "State government",
          },
          {
            id: "s3",
            label: "Central government",
          },
        ],
        components: [
          {
            id: "c1",
            label: "Everyday needs of a village or town, such as drinking water, streets and sanitation",
          },
          {
            id: "c2",
            label: "Matters for a whole state, such as state highways and police",
          },
          {
            id: "c4",
            label: "Deciding the rules of a single school class",
          },
          {
            id: "c3",
            label: "Matters for the whole country, such as defence and currency",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "The bigger the area, the bigger the matter.",
      },
    },
  ];
  for (const challenge of levels10_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels10_1_SOCIAL_SCIENCE_CIVIC_DECISION = [
    {
      title: "Decision: A Broken Streetlight",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "A streetlight in your ward has not worked for weeks and the road is dark at night. Where should the complaint first go?",
        options: [
          {
            id: "o1",
            label: "To the local ward representative or local body office",
          },
          {
            id: "o2",
            label: "Straight to the national defence office",
          },
          {
            id: "o3",
            label: "Nowhere, because lights are never repaired",
          },
          {
            id: "o4",
            label: "To a shopkeeper who does not manage streetlights",
          },
        ],
        correct_hotspot_id: "o1",
        hint: "Local problems like streetlights are usually handled by the local body.",
      },
    },
  ];
  for (const challenge of levels10_1_SOCIAL_SCIENCE_CIVIC_DECISION) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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
      title: "Process: How a Local Problem Gets Solved",
      difficulty: "hard",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps in which a village handpump problem could be solved by local government.",
        scrambled_steps: [
          {
            id: "st3",
            label: "The local body decides how to fix it and sets aside funds",
          },
          {
            id: "st4",
            label: "The repair is done and residents check that it works",
          },
          {
            id: "st1",
            label: "Residents notice that the handpump has stopped working",
          },
          {
            id: "st2",
            label: "They bring the issue to the Gram Sabha or the local body",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "A problem must be raised and decided on before it is repaired and checked.",
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

  // ---------- Chapter 11: Grassroots Democracy — Part 2: Local Government in Rural Areas ----------
  let chapter11 = await Chapter.findOne({ subject_id: subject._id, title: "Grassroots Democracy — Part 2: Local Government in Rural Areas" });
  if (!chapter11) {
    chapter11 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme D: Governance and Democracy",
      title: "Grassroots Democracy — Part 2: Local Government in Rural Areas",
      order_index: 11,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter11._id);
  } else {
    console.log("Using existing chapter:", chapter11._id);
  }

  let concept11_1 = await Concept.findOne({ chapter_id: chapter11._id, title: "Village Governance" });
  if (!concept11_1) {
    concept11_1 = await Concept.create({
      chapter_id: chapter11._id,
      title: "Village Governance",
      explanation_text:
        "In villages the Gram Sabha is the meeting of all adult voters, the Gram Panchayat is the elected village council headed by the Sarpanch, and each ward elects a member. Panchayats work at three levels: village, block and district.",
    });
    console.log("Created concept:", concept11_1._id);
  } else {
    console.log("Using existing concept:", concept11_1._id);
  }

  const levels11_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: People and Bodies of the Village",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each village body or role to its description.",
        slots: [
          {
            id: "s1",
            label: "Gram Sabha",
          },
          {
            id: "s2",
            label: "Gram Panchayat",
          },
          {
            id: "s3",
            label: "Sarpanch",
          },
          {
            id: "s4",
            label: "Ward member",
          },
        ],
        components: [
          {
            id: "c5",
            label: "An officer who runs the state police",
          },
          {
            id: "c2",
            label: "The elected council that manages the affairs of the village",
          },
          {
            id: "c1",
            label: "The meeting of all the adult voters of a village to discuss local matters",
          },
          {
            id: "c4",
            label: "Represents one ward of the village in the Gram Panchayat",
          },
          {
            id: "c3",
            label: "The elected head of the Gram Panchayat",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Big meeting, council, head of the council, and one ward's representative.",
      },
    },
  ];
  for (const challenge of levels11_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels11_1_GEOGRAPHY_ROUTE_BUILDER = [
    {
      title: "Route: The Three Tiers of Panchayati Raj",
      difficulty: "medium",
      order_index: 1,
      payload: {
        journey_label: "Arrange the three tiers of rural local government from the smallest area to the largest.",
        scrambled_stops: [
          {
            id: "g1",
            label: "Gram Panchayat (village)",
          },
          {
            id: "g3",
            label: "Zila Parishad (district)",
          },
          {
            id: "g2",
            label: "Panchayat Samiti (block)",
          },
        ],
        correct_order: ["g1", "g2", "g3"],
        hint: "A block has many villages and a district has many blocks.",
      },
    },
  ];
  for (const challenge of levels11_1_GEOGRAPHY_ROUTE_BUILDER) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_ROUTE_BUILDER",
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

  const levels11_1_SOCIAL_SCIENCE_CIVIC_DECISION = [
    {
      title: "Decision: A Road Through Farmland",
      difficulty: "hard",
      order_index: 1,
      payload: {
        scenario_label: "The Gram Sabha discusses a road that would cut through one family's farmland but help many villagers. What is the fairest way to decide?",
        options: [
          {
            id: "o1",
            label: "The Sarpanch decides alone and announces the plan",
          },
          {
            id: "o2",
            label: "Everyone discusses openly, listens to the affected family, looks for alternatives and votes fairly",
          },
          {
            id: "o3",
            label: "Only rich families vote",
          },
          {
            id: "o4",
            label: "Build the road at night to avoid arguments",
          },
        ],
        correct_hotspot_id: "o2",
        hint: "Fair democratic decisions involve open discussion and listening to those affected.",
      },
    },
  ];
  for (const challenge of levels11_1_SOCIAL_SCIENCE_CIVIC_DECISION) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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

  // ---------- Chapter 12: Grassroots Democracy — Part 3: Local Government in Urban Areas ----------
  let chapter12 = await Chapter.findOne({ subject_id: subject._id, title: "Grassroots Democracy — Part 3: Local Government in Urban Areas" });
  if (!chapter12) {
    chapter12 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme D: Governance and Democracy",
      title: "Grassroots Democracy — Part 3: Local Government in Urban Areas",
      order_index: 12,
      strand: "Civics",
    });
    console.log("Created chapter:", chapter12._id);
  } else {
    console.log("Using existing chapter:", chapter12._id);
  }

  let concept12_1 = await Concept.findOne({ chapter_id: chapter12._id, title: "Governing Towns and Cities" });
  if (!concept12_1) {
    concept12_1 = await Concept.create({
      chapter_id: chapter12._id,
      title: "Governing Towns and Cities",
      explanation_text:
        "Cities are governed by a Municipal Corporation headed by a Mayor and smaller towns by a Municipality. Each area is divided into wards, and each ward elects a councillor.",
    });
    console.log("Created concept:", concept12_1._id);
  } else {
    console.log("Using existing concept:", concept12_1._id);
  }

  const levels12_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Urban Local Bodies",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each urban local body or role to its description.",
        slots: [
          {
            id: "s1",
            label: "Municipal Corporation",
          },
          {
            id: "s2",
            label: "Municipality",
          },
          {
            id: "s3",
            label: "Ward councillor",
          },
          {
            id: "s4",
            label: "Mayor",
          },
        ],
        components: [
          {
            id: "c5",
            label: "The head of a village panchayat",
          },
          {
            id: "c2",
            label: "Governs a smaller town",
          },
          {
            id: "c1",
            label: "Governs a large city",
          },
          {
            id: "c3",
            label: "The elected representative of one ward of a town or city",
          },
          {
            id: "c4",
            label: "The elected head of a Municipal Corporation",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
          s4: "c4",
        },
        hint: "Bigger city, smaller town, one ward's representative, and the head of the corporation.",
      },
    },
  ];
  for (const challenge of levels12_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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
      title: "Process: How City Waste Is Managed",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the steps of a city's household waste system.",
        scrambled_steps: [
          {
            id: "st1",
            label: "Households separate wet and dry waste",
          },
          {
            id: "st3",
            label: "The waste is sorted at a processing site",
          },
          {
            id: "st4",
            label: "Recyclable materials are sent for recycling and the rest is processed or safely disposed of",
          },
          {
            id: "st2",
            label: "Collection vehicles pick up the waste from each street",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Waste must be separated and collected before it can be sorted and processed.",
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

  const levels12_1_SOCIAL_SCIENCE_CIVIC_DECISION = [
    {
      title: "Decision: Uncollected Garbage",
      difficulty: "hard",
      order_index: 1,
      payload: {
        scenario_label: "Garbage on your street has not been collected for a week and is starting to smell. What is the most effective response?",
        options: [
          {
            id: "o1",
            label: "Dump it on an empty plot nearby",
          },
          {
            id: "o2",
            label: "Report it to the ward councillor or municipal helpline and ask neighbours to do the same",
          },
          {
            id: "o3",
            label: "Wait quietly because nothing can be done",
          },
          {
            id: "o4",
            label: "Burn it at night",
          },
        ],
        correct_hotspot_id: "o2",
        hint: "Use the local body's complaint channels and act together.",
      },
    },
  ];
  for (const challenge of levels12_1_SOCIAL_SCIENCE_CIVIC_DECISION) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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

  // ---------- Chapter 13: The Value of Work ----------
  let chapter13 = await Chapter.findOne({ subject_id: subject._id, title: "The Value of Work" });
  if (!chapter13) {
    chapter13 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme E: Economic Life Around Us",
      title: "The Value of Work",
      order_index: 13,
      strand: "Economics",
    });
    console.log("Created chapter:", chapter13._id);
  } else {
    console.log("Using existing chapter:", chapter13._id);
  }

  let concept13_1 = await Concept.findOne({ chapter_id: chapter13._id, title: "Kinds of Work and Their Dignity" });
  if (!concept13_1) {
    concept13_1 = await Concept.create({
      chapter_id: chapter13._id,
      title: "Kinds of Work and Their Dignity",
      explanation_text:
        "People do many kinds of work: paid jobs, unpaid household work and voluntary work. All useful work has dignity, and society depends on many different kinds of work.",
    });
    console.log("Created concept:", concept13_1._id);
  } else {
    console.log("Using existing concept:", concept13_1._id);
  }

  const levels13_1_GEOGRAPHY_FEATURE_MATCH = [
    {
      title: "Match: Kinds of Work",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each kind of work to its description.",
        slots: [
          {
            id: "s1",
            label: "Paid work",
          },
          {
            id: "s2",
            label: "Unpaid household work",
          },
          {
            id: "s3",
            label: "Voluntary work",
          },
        ],
        components: [
          {
            id: "c4",
            label: "Work that is only valuable if it earns money",
          },
          {
            id: "c2",
            label: "Work such as cooking, cleaning and caring for family that is not paid",
          },
          {
            id: "c3",
            label: "Work done freely to help others without payment",
          },
          {
            id: "c1",
            label: "Work done in exchange for wages or a salary",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Ask whether money is exchanged and who benefits.",
      },
    },
  ];
  for (const challenge of levels13_1_GEOGRAPHY_FEATURE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

  const levels13_1_SOCIAL_SCIENCE_CIVIC_DECISION = [
    {
      title: "Decision: Sharing Class Chores",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Some students say cleaning the classroom is beneath them and should be left to the cleaner. How should the class respond?",
        options: [
          {
            id: "o1",
            label: "Agree, because some jobs are only for others",
          },
          {
            id: "o2",
            label: "Share the chores fairly, since all useful work deserves respect",
          },
          {
            id: "o3",
            label: "Punish the students who clean",
          },
          {
            id: "o4",
            label: "Skip cleaning altogether",
          },
        ],
        correct_hotspot_id: "o2",
        hint: "Respect for all kinds of work is at the heart of the dignity of labour.",
      },
    },
  ];
  for (const challenge of levels13_1_SOCIAL_SCIENCE_CIVIC_DECISION) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
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

  // ---------- Chapter 14: Economic Activities Around Us ----------
  let chapter14 = await Chapter.findOne({ subject_id: subject._id, title: "Economic Activities Around Us" });
  if (!chapter14) {
    chapter14 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Theme E: Economic Life Around Us",
      title: "Economic Activities Around Us",
      order_index: 14,
      strand: "Economics",
    });
    console.log("Created chapter:", chapter14._id);
  } else {
    console.log("Using existing chapter:", chapter14._id);
  }

  let concept14_1 = await Concept.findOne({ chapter_id: chapter14._id, title: "Types of Economic Activity" });
  if (!concept14_1) {
    concept14_1 = await Concept.create({
      chapter_id: chapter14._id,
      title: "Types of Economic Activity",
      explanation_text:
        "Economic activities are grouped as primary (using natural resources directly), secondary (making goods from raw materials) and tertiary (providing services).",
    });
    console.log("Created concept:", concept14_1._id);
  } else {
    console.log("Using existing concept:", concept14_1._id);
  }

  const levels14_1_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Primary, Secondary and Tertiary",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each type of economic activity to its meaning.",
        slots: [
          {
            id: "s1",
            label: "Primary activity",
          },
          {
            id: "s2",
            label: "Secondary activity",
          },
          {
            id: "s3",
            label: "Tertiary activity",
          },
        ],
        components: [
          {
            id: "c4",
            label: "Activities done only for fun, never for income",
          },
          {
            id: "c2",
            label: "Making finished goods from raw materials, such as weaving cloth or making steel",
          },
          {
            id: "c1",
            label: "Using natural resources directly, such as farming, fishing and mining",
          },
          {
            id: "c3",
            label: "Providing services, such as teaching, transport and banking",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Ask whether the work gathers, makes or serves.",
      },
    },
  ];
  for (const challenge of levels14_1_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
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
      title: "Process: From Wheat to Bread",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario_label: "Arrange the stages that turn wheat in a field into bread on a shop shelf.",
        scrambled_steps: [
          {
            id: "st2",
            label: "A flour mill grinds the wheat into flour",
          },
          {
            id: "st4",
            label: "Shops sell the bread to customers",
          },
          {
            id: "st3",
            label: "A bakery bakes the flour into bread",
          },
          {
            id: "st1",
            label: "Farmers grow and harvest wheat",
          },
        ],
        correct_order: ["st1", "st2", "st3", "st4"],
        hint: "Growing comes first, then making, then selling.",
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

  let concept14_2 = await Concept.findOne({ chapter_id: chapter14._id, title: "Barter, Money and Markets" });
  if (!concept14_2) {
    concept14_2 = await Concept.create({
      chapter_id: chapter14._id,
      title: "Barter, Money and Markets",
      explanation_text:
        "Before money, people traded by barter, directly exchanging goods. Money is accepted as payment, and a market is where buyers and sellers meet.",
    });
    console.log("Created concept:", concept14_2._id);
  } else {
    console.log("Using existing concept:", concept14_2._id);
  }

  const levels14_2_COMMERCE_CONCEPT_MATCH = [
    {
      title: "Match: Barter, Money and Market",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each term to its meaning.",
        slots: [
          {
            id: "s1",
            label: "Barter",
          },
          {
            id: "s2",
            label: "Money",
          },
          {
            id: "s3",
            label: "Market",
          },
        ],
        components: [
          {
            id: "c4",
            label: "A gift that must never be exchanged",
          },
          {
            id: "c3",
            label: "A place or system where buyers and sellers meet to exchange goods and services",
          },
          {
            id: "c2",
            label: "A widely accepted way to pay for goods and services",
          },
          {
            id: "c1",
            label: "Exchanging goods directly without using money",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Barter has no money, money is the payment, and a market is where trading happens.",
      },
    },
  ];
  for (const challenge of levels14_2_COMMERCE_CONCEPT_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "COMMERCE_CONCEPT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "COMMERCE_CONCEPT_MATCH",
        concept_id: concept14_2._id,
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
