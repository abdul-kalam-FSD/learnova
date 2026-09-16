require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const Question = require("./src/models/Question");

// Adds NCERT Class 12 Chapter 13 "Biodiversity and Conservation", the
// last chapter of Unit X and the one chapter of the current 13-chapter
// rationalised syllabus missing from the seedGrade12_batch*.js series
// (batch 4 stops at "Ecosystem"). Idempotent so it can be re-run
// alongside the other batches.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Biology", grade: 12 });
    console.log("Created new Grade 12 Biology subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- CHAPTER 13: Biodiversity and Conservation ----------
  let ch13 = await Chapter.findOne({
    subject_id: subject._id,
    title: "Biodiversity and Conservation",
  });
  if (!ch13) {
    ch13 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ecology and Environment",
      title: "Biodiversity and Conservation",
      order_index: 13,
    });
    console.log("Created chapter:", ch13._id);
  }

  let cA = await Concept.findOne({
    chapter_id: ch13._id,
    title: "Biodiversity and Its Patterns",
  });
  if (!cA) {
    cA = await Concept.create({
      chapter_id: ch13._id,
      title: "Biodiversity and Its Patterns",
      explanation_text:
        "Biodiversity spans genetic, species, and ecological levels, and is distributed unevenly across the planet — richest in the tropics and declining toward the poles, with species richness also rising with the area sampled.",
    });
  }

  let cB = await Concept.findOne({
    chapter_id: ch13._id,
    title: "Loss of Biodiversity and Its Causes",
  });
  if (!cB) {
    cB = await Concept.create({
      chapter_id: ch13._id,
      title: "Loss of Biodiversity and Its Causes",
      explanation_text:
        "Species are being lost far faster than natural extinction rates, driven mainly by habitat loss and fragmentation, over-exploitation, invasive alien species, and co-extinctions — often summarised as the Evil Quartet.",
    });
  }

  let cC = await Concept.findOne({
    chapter_id: ch13._id,
    title: "Conservation Strategies",
  });
  if (!cC) {
    cC = await Concept.create({
      chapter_id: ch13._id,
      title: "Conservation Strategies",
      explanation_text:
        "Biodiversity is protected in situ through biosphere reserves, national parks, sanctuaries, and sacred groves, and ex situ through zoos, botanical gardens, seed banks, and cryopreservation of gametes.",
    });
  }

  const existingQuestions = await Question.countDocuments({
    concept_id: { $in: [cA._id, cB._id, cC._id] },
  });
  if (existingQuestions > 0) {
    console.log("Questions already seeded for this chapter — skipping.");
    await mongoose.disconnect();
    return;
  }

  await Question.insertMany([
    {
      concept_id: cA._id,
      question_text: "The term 'biodiversity' as popularised by Edward Wilson refers to diversity at which levels?",
      options: [
        { id: "a", text: "Only species level" },
        { id: "b", text: "Genetic, species, and ecological levels" },
        { id: "c", text: "Only genetic level" },
        { id: "d", text: "Only ecosystem level" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Biodiversity covers the whole range of biological variation — genetic diversity within a species, species diversity within a community, and ecological diversity at the ecosystem level.",
      difficulty: "easy",
    },
    {
      concept_id: cA._id,
      question_text: "Species diversity generally shows which pattern with latitude?",
      options: [
        { id: "a", text: "Increases from the equator toward the poles" },
        { id: "b", text: "Decreases from the equator toward the poles" },
        { id: "c", text: "Remains constant at all latitudes" },
        { id: "d", text: "Is highest at the poles" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Tropical regions near the equator support far more species than temperate and polar regions, because they have had longer undisturbed evolutionary time, a constant environment, and more available solar energy.",
      difficulty: "easy",
    },
    {
      concept_id: cA._id,
      question_text: "In the species–area relationship S = CA^Z, the value of Z is called the:",
      options: [
        { id: "a", text: "Regression coefficient (slope of the line)" },
        { id: "b", text: "Y-intercept" },
        { id: "c", text: "Species richness" },
        { id: "d", text: "Total area" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Z is the slope of the straight line obtained when the relationship is plotted on a log scale, and it typically lies between 0.1 and 0.2 regardless of the taxonomic group or region.",
      difficulty: "hard",
    },
    {
      concept_id: cA._id,
      question_text: "Which group contributes the largest share of the total number of described species globally?",
      options: [
        { id: "a", text: "Flowering plants" },
        { id: "b", text: "Fungi" },
        { id: "c", text: "Insects" },
        { id: "d", text: "Vertebrates" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Insects alone account for more than 70 per cent of all described animal species, making them by far the most species-rich group on Earth.",
      difficulty: "medium",
    },
    {
      concept_id: cB._id,
      question_text: "Which of the following is NOT one of the four major causes of biodiversity loss (the 'Evil Quartet')?",
      options: [
        { id: "a", text: "Habitat loss and fragmentation" },
        { id: "b", text: "Over-exploitation" },
        { id: "c", text: "Alien species invasions" },
        { id: "d", text: "Ecological succession" },
      ],
      correct_option_id: "d",
      explanation_text:
        "The Evil Quartet is habitat loss and fragmentation, over-exploitation, alien species invasions, and co-extinctions; ecological succession is a natural community process, not a cause of species loss.",
      difficulty: "medium",
    },
    {
      concept_id: cB._id,
      question_text: "The single most important cause driving animals and plants toward extinction is:",
      options: [
        { id: "a", text: "Habitat loss and fragmentation" },
        { id: "b", text: "Co-extinction" },
        { id: "c", text: "Natural disasters" },
        { id: "d", text: "Genetic drift" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Habitat loss and fragmentation, seen most dramatically in the clearing of tropical rainforests, is the leading cause of biodiversity loss worldwide.",
      difficulty: "easy",
    },
    {
      concept_id: cB._id,
      question_text: "The introduction of the Nile perch into Lake Victoria caused the extinction of many native cichlid fish. This illustrates:",
      options: [
        { id: "a", text: "Co-extinction" },
        { id: "b", text: "Alien species invasion" },
        { id: "c", text: "Over-exploitation" },
        { id: "d", text: "Habitat fragmentation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "An alien species introduced outside its natural range became invasive and drove more than 200 native cichlid species to extinction, a classic case of alien species invasion.",
      difficulty: "medium",
    },
    {
      concept_id: cB._id,
      question_text: "When a host fish species becomes extinct, its unique assemblage of parasites also disappears. This is an example of:",
      options: [
        { id: "a", text: "Over-exploitation" },
        { id: "b", text: "Habitat loss" },
        { id: "c", text: "Co-extinction" },
        { id: "d", text: "Alien invasion" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Co-extinction occurs when a species that is obligately associated with another — such as a host-specific parasite or an obligate plant–pollinator pair — is lost along with it.",
      difficulty: "hard",
    },
    {
      concept_id: cC._id,
      question_text: "Conserving a species within its natural habitat is known as:",
      options: [
        { id: "a", text: "Ex situ conservation" },
        { id: "b", text: "In situ conservation" },
        { id: "c", text: "Cryopreservation" },
        { id: "d", text: "Tissue culture" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In situ conservation protects species where they naturally live, through biosphere reserves, national parks, wildlife sanctuaries, and sacred groves.",
      difficulty: "easy",
    },
    {
      concept_id: cC._id,
      question_text: "A region qualifies as a biodiversity hotspot on the basis of:",
      options: [
        { id: "a", text: "High species richness and high endemism under serious threat" },
        { id: "b", text: "Large geographical area alone" },
        { id: "c", text: "Presence of any national park" },
        { id: "d", text: "High human population density" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Hotspots are identified by exceptionally high levels of species richness and endemism combined with a serious degree of habitat threat, which is why protecting them is so efficient.",
      difficulty: "medium",
    },
    {
      concept_id: cC._id,
      question_text: "Which of these is an example of ex situ conservation?",
      options: [
        { id: "a", text: "Wildlife sanctuary" },
        { id: "b", text: "Sacred grove" },
        { id: "c", text: "Seed bank" },
        { id: "d", text: "National park" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Ex situ conservation removes threatened organisms from their habitat and maintains them under special care — in zoos, botanical gardens, seed banks, or by cryopreserving gametes.",
      difficulty: "easy",
    },
    {
      concept_id: cC._id,
      question_text: "Which biodiversity hotspots are located in India?",
      options: [
        { id: "a", text: "Western Ghats–Sri Lanka, Indo-Burma, and Himalaya" },
        { id: "b", text: "Amazon, Congo, and Borneo" },
        { id: "c", text: "Madagascar, Caribbean, and Andes" },
        { id: "d", text: "Great Barrier Reef and Serengeti" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Three of the world's biodiversity hotspots cover Indian territory: the Western Ghats–Sri Lanka, Indo-Burma, and the Himalaya.",
      difficulty: "medium",
    },
  ]);

  console.log("Grade 12 Batch 5 seed complete: 1 chapter, 3 concepts, 12 questions added.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
