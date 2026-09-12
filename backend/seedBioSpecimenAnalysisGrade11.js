require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes another cell of the Biology 9-12 content gap found during
// the full-project audit: BIO_SPECIMEN_ANALYSIS previously existed
// only at Grade 10. Links to the existing "Basis of Classification"
// concept created by seedGrade11_batch2.js — run that first.
//
// Pitched harder than Grade 9/10: distinguishes between non-chordate
// phyla using symmetry, body cavity (coelom), and segmentation —
// exactly the classification criteria this concept's own explanation
// text names — rather than the broad vertebrate/invertebrate split
// used at Grade 9. Same single-choice-after-inspecting-every-feature
// shape and scoring path as every other Specimen Analysis grade.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Basis of Classification" });
  if (!concept) {
    console.error(
      "Concept 'Basis of Classification' not found — run seedGrade11_batch2.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const levels = [
    {
      title: "Specimen X: The Reef Filter-Feeder",
      difficulty: "medium",
      order_index: 1,
      payload: {
        specimenName: "Specimen X: The Reef Filter-Feeder",
        context: "A stationary, pore-covered organism is found attached to a coral reef, drawing water through its body.",
        features: [
          { id: "f1", label: "Body covered in tiny pores", detail: "Numerous small openings (ostia) cover the outer body surface." },
          { id: "f2", label: "No true tissues or organs", detail: "Cells are loosely organized around a central cavity, with no distinct tissue layers." },
          { id: "f3", label: "Asymmetrical body", detail: "The body shows no consistent plane of symmetry." },
          { id: "f4", label: "Permanently attached to the reef", detail: "Does not move once settled as an adult." },
        ],
        classificationOptions: [
          { id: "porifera", label: "Phylum Porifera (Sponges)" },
          { id: "cnidaria", label: "Phylum Cnidaria" },
          { id: "annelida", label: "Phylum Annelida" },
          { id: "echinodermata", label: "Phylum Echinodermata" },
        ],
        correct_hotspot_id: "porifera",
        explanation:
          "Pore-covered bodies with no true tissues and no defined symmetry are the hallmark of Porifera (sponges) — the simplest multicellular animal phylum. Cnidarians have radial symmetry and true tissues; annelids are segmented with bilateral symmetry; echinoderms have five-part radial symmetry as adults. Being sessile (fixed in place) fits sponges but isn't unique to them.",
        hint: "No true tissues and no symmetry at all rules out every phylum except the simplest one.",
      },
    },
    {
      title: "Specimen Y: The Segmented Burrower",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimenName: "Specimen Y: The Segmented Burrower",
        context: "A long, tube-shaped organism is found burrowing through damp garden soil.",
        features: [
          { id: "f1", label: "Body divided into repeating segments", detail: "Dozens of identical ring-like segments run the length of the body." },
          { id: "f2", label: "Bilateral symmetry", detail: "The left and right halves of the body mirror each other." },
          { id: "f3", label: "True coelom (fluid-filled body cavity)", detail: "A fluid-filled cavity fully lined by mesoderm separates the gut from the body wall." },
          { id: "f4", label: "Found in damp soil", detail: "Prefers moist, organic-rich soil environments." },
        ],
        classificationOptions: [
          { id: "porifera", label: "Phylum Porifera (Sponges)" },
          { id: "platyhelminthes", label: "Phylum Platyhelminthes (Flatworms)" },
          { id: "annelida", label: "Phylum Annelida (Segmented Worms)" },
          { id: "echinodermata", label: "Phylum Echinodermata" },
        ],
        correct_hotspot_id: "annelida",
        explanation:
          "True segmentation combined with bilateral symmetry and a true coelom is the defining combination for Annelida (segmented worms, e.g. earthworms). Flatworms are bilaterally symmetric but unsegmented and lack a true coelom; sponges have no symmetry at all; echinoderms have radial symmetry as adults. Soil habitat is consistent but not itself diagnostic.",
        hint: "Segmentation plus a true coelom together point to one specific phylum — flatworms have neither.",
      },
    },
    {
      title: "Specimen Z: The Spiny Sea-Floor Dweller",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimenName: "Specimen Z: The Spiny Sea-Floor Dweller",
        context: "A slow-moving, spiny-skinned organism with a five-part body plan is found on the ocean floor.",
        features: [
          { id: "f1", label: "Five-part (pentaradial) symmetry", detail: "The adult body is organized into five roughly equal sections around a central point." },
          { id: "f2", label: "Spiny, calcified skin", detail: "The outer surface is covered in a hard, spine-studded endoskeleton." },
          { id: "f3", label: "Water vascular system with tube feet", detail: "Movement is powered by a network of fluid-filled canals ending in small tube feet." },
          { id: "f4", label: "Lives on the sea floor", detail: "Found crawling slowly across rocky substrate." },
        ],
        classificationOptions: [
          { id: "cnidaria", label: "Phylum Cnidaria" },
          { id: "mollusca", label: "Phylum Mollusca" },
          { id: "arthropoda", label: "Phylum Arthropoda" },
          { id: "echinodermata", label: "Phylum Echinodermata" },
        ],
        correct_hotspot_id: "echinodermata",
        explanation:
          "Five-part symmetry, a spiny calcified endoskeleton, and a water vascular system with tube feet are unique, defining features of Echinodermata (e.g. starfish, sea urchins) — no other phylum has this combination. Cnidarians have radial (not specifically five-part) symmetry and no endoskeleton; molluscs and arthropods have entirely different body plans. Sea-floor habitat alone wouldn't distinguish any of these.",
        hint: "The water vascular system and tube feet are found in exactly one phylum on this list.",
      },
    },
  ];

  for (const level of levels) {
    const exists = await GameContent.findOne({ game_type: "BIO_SPECIMEN_ANALYSIS", title: level.title });
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
