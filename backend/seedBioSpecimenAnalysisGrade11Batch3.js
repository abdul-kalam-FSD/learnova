require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Specimen Analysis coverage for "The Living World" — the chapter is
// entirely about placing organisms into taxonomic ranks, which is the
// same inspect-features-then-classify loop this mechanic already runs
// for Animal Kingdom, so the classification options here are taxonomic
// categories and taxonomical aids rather than phyla.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Biology subject not found — run seedGrade11.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Living World" });
  if (!chapter) {
    console.error("Chapter 'The Living World' not found — run seedGrade11.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptTitles = [
    "What is Living?",
    "Taxonomic Categories",
    "Concept of a Species and Taxonomical Aids",
  ];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade11.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["What is Living?"],
      levels: [
        {
          title: "Specimen L1: Is It Alive?",
          difficulty: "easy",
          order_index: 1,
          payload: {
            specimenName: "Specimen L1: The Growing Crystal",
            context:
              "A salt crystal in a beaker steadily increases in size over several days as more salt is deposited on its outer surface.",
            features: [
              { id: "f1", label: "Increases in size over time", detail: "The crystal is visibly larger each day." },
              { id: "f2", label: "New material added only on the outside", detail: "Growth happens by deposition on the surface, not from within." },
              { id: "f3", label: "No metabolism of any kind", detail: "No chemical reactions occur inside the crystal to sustain it." },
              { id: "f4", label: "Cannot reproduce or respond to stimuli", detail: "It produces no offspring and does not react to its surroundings." },
            ],
            classificationOptions: [
              { id: "living", label: "Living — it shows true growth" },
              { id: "nonliving", label: "Non-living — growth here is not a living property" },
              { id: "dormant", label: "Living but dormant" },
              { id: "virus", label: "A virus-like borderline case" },
            ],
            correct_hotspot_id: "nonliving",
            explanation:
              "Growth by surface deposition is not the growth of living things. Living organisms grow from within by cell division, and the defining properties of life are metabolism, reproduction, and self-consciousness/response. The crystal has none of these, so it is non-living.",
            hint: "Ask where the new material is added — inside the body, or only on the outside surface?",
          },
        },
      ],
    },
    {
      concept: concepts["Taxonomic Categories"],
      levels: [
        {
          title: "Specimen L2: Name the Rank",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimenName: "Specimen L2: The Group 'Felidae'",
            context:
              "A taxonomist places lions, tigers, and domestic cats into a single group called Felidae, which itself sits inside the group Carnivora.",
            features: [
              { id: "f1", label: "Contains several related genera", detail: "Panthera and Felis are both placed inside this group." },
              { id: "f2", label: "Itself contained within Carnivora", detail: "Carnivora is the order that includes this group." },
              { id: "f3", label: "Name ends in -idae", detail: "Animal groups at this rank conventionally end in the suffix -idae." },
              { id: "f4", label: "Members share flesh-eating adaptations", detail: "All members have retractile claws and specialised shearing teeth." },
            ],
            classificationOptions: [
              { id: "genus", label: "Genus" },
              { id: "family", label: "Family" },
              { id: "order", label: "Order" },
              { id: "class", label: "Class" },
            ],
            correct_hotspot_id: "family",
            explanation:
              "A group that collects several related genera and sits directly below an order is a family. The -idae ending is the standard suffix for animal family names, and Felidae contains the genera Panthera and Felis within the order Carnivora.",
            hint: "Work out the rank from what it contains and what contains it: it holds genera, and it sits inside an order.",
          },
        },
        {
          title: "Specimen L3: Reading a Scientific Name",
          difficulty: "medium",
          order_index: 2,
          payload: {
            specimenName: "Specimen L3: Mangifera indica",
            context:
              "A plant is labelled in a herbarium as Mangifera indica Linn., written in italics with only the first word capitalised.",
            features: [
              { id: "f1", label: "Two-word Latinised name", detail: "The name has exactly two components, as required by binomial nomenclature." },
              { id: "f2", label: "First word capitalised, second in lower case", detail: "Mangifera is capitalised; indica is not." },
              { id: "f3", label: "Printed in italics", detail: "Scientific names are italicised in print and underlined when handwritten." },
              { id: "f4", label: "Author abbreviation follows the name", detail: "'Linn.' shows the name was first published by Linnaeus." },
            ],
            classificationOptions: [
              { id: "genusspecies", label: "Mangifera = genus, indica = specific epithet" },
              { id: "speciesgenus", label: "Mangifera = specific epithet, indica = genus" },
              { id: "familygenus", label: "Mangifera = family, indica = genus" },
              { id: "bothgenus", label: "Both words together form the genus" },
            ],
            correct_hotspot_id: "genusspecies",
            explanation:
              "Under binomial nomenclature the first word is the genus (capitalised) and the second is the specific epithet (lower case). Both are italicised, and the author's abbreviated name may follow at the end.",
            hint: "In a two-word scientific name, the capitalised word always names the larger group.",
          },
        },
      ],
    },
    {
      concept: concepts["Concept of a Species and Taxonomical Aids"],
      levels: [
        {
          title: "Specimen L4: Choose the Taxonomical Aid",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimenName: "Specimen L4: The Pressed and Mounted Plant",
            context:
              "A researcher needs to consult a collection of plant specimens that have been dried, pressed, mounted on sheets, and labelled with their collection details.",
            features: [
              { id: "f1", label: "Specimens are dried and pressed", detail: "Plants are preserved flat rather than kept alive." },
              { id: "f2", label: "Mounted on labelled sheets", detail: "Each sheet carries date, place of collection, and the collector's name." },
              { id: "f3", label: "Arranged by classification system", detail: "Sheets are filed according to an accepted taxonomic order." },
              { id: "f4", label: "Used as a reference for identification", detail: "Researchers compare new collections against these stored sheets." },
            ],
            classificationOptions: [
              { id: "herbarium", label: "Herbarium" },
              { id: "botanicalgarden", label: "Botanical garden" },
              { id: "museum", label: "Museum" },
              { id: "zoopark", label: "Zoological park" },
            ],
            correct_hotspot_id: "herbarium",
            explanation:
              "A herbarium stores dried, pressed, and mounted plant specimens on labelled sheets arranged by a classification system. Botanical gardens keep living plants, museums hold preserved animal specimens, and zoological parks keep living animals.",
            hint: "The specimens here are dead and flattened, not living — which of these collections stores plants that way?",
          },
        },
      ],
    },
  ];

  for (const { concept, levels } of allChallenges) {
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
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
