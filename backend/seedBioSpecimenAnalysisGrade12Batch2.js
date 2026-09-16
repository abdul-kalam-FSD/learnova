require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Specimen Analysis coverage for the three Grade 12 chapters whose
// content is taught as "inspect the case, then name the category":
// which microbe yields which product, which biotechnology underlies an
// application, and which interaction links two species.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 12 Biology subject not found — run the Grade 12 batch seeds first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptChapters = {
    "Microbes in Household Products and Industrial Production": "Microbes in Human Welfare",
    "Microbes as Biocontrol Agents and Biofertilizers": "Microbes in Human Welfare",
    "Biotechnological Applications in Agriculture": "Biotechnology and its Applications",
    "Biotechnological Applications in Medicine": "Biotechnology and its Applications",
    "Population Interactions": "Organisms and Populations",
    "Organisms and Their Environment": "Organisms and Populations",
  };

  const concepts = {};
  for (const [title, chapterTitle] of Object.entries(conceptChapters)) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.error(`Chapter "${chapterTitle}" not found — run the Grade 12 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run the Grade 12 batch seeds first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Microbes in Household Products and Industrial Production"],
      levels: [
        {
          title: "Specimen M1: The Dough Riser",
          difficulty: "easy",
          order_index: 1,
          payload: {
            specimenName: "Specimen M1: The Dough Riser",
            context:
              "A baker adds a microbe to bread dough. Over the next hour the dough puffs up to twice its size, and a faint smell of alcohol develops.",
            features: [
              { id: "f1", label: "Dough increases in volume", detail: "Gas bubbles trapped in the dough make it rise." },
              { id: "f2", label: "Carbon dioxide is released", detail: "The gas responsible for the puffed texture." },
              { id: "f3", label: "A small amount of ethanol forms", detail: "A by-product of fermentation alongside the carbon dioxide." },
              { id: "f4", label: "Works without oxygen", detail: "The process continues inside the dough where little oxygen is available." },
            ],
            classificationOptions: [
              { id: "saccharomyces", label: "Saccharomyces cerevisiae (baker's yeast)" },
              { id: "lactobacillus", label: "Lactobacillus (lactic acid bacteria)" },
              { id: "aspergillus", label: "Aspergillus niger" },
              { id: "methanogens", label: "Methanogens" },
            ],
            correct_hotspot_id: "saccharomyces",
            explanation:
              "Baker's yeast, Saccharomyces cerevisiae, ferments sugars in the dough to carbon dioxide and ethanol; the trapped carbon dioxide makes bread rise. Lactobacillus curdles milk, Aspergillus niger produces citric acid, and methanogens produce methane in biogas plants.",
            hint: "The gas that puffs the dough plus a trace of alcohol points to one specific fermenting organism.",
          },
        },
        {
          title: "Specimen M2: The Cholesterol Blocker",
          difficulty: "medium",
          order_index: 2,
          payload: {
            specimenName: "Specimen M2: The Cholesterol Blocker",
            context:
              "A microbial product is found to lower blood cholesterol by competitively inhibiting the enzyme responsible for cholesterol synthesis in the body.",
            features: [
              { id: "f1", label: "Produced by a yeast", detail: "The source organism is Monascus purpureus, a yeast." },
              { id: "f2", label: "Acts as a competitive inhibitor", detail: "It competes with the normal substrate for the enzyme's active site." },
              { id: "f3", label: "Targets cholesterol synthesis", detail: "It blocks the enzyme that catalyses a key step in making cholesterol." },
              { id: "f4", label: "Used as a blood-cholesterol-lowering agent", detail: "Prescribed clinically to reduce cholesterol levels." },
            ],
            classificationOptions: [
              { id: "statin", label: "Statin" },
              { id: "penicillin", label: "Penicillin" },
              { id: "cyclosporin", label: "Cyclosporin A" },
              { id: "streptokinase", label: "Streptokinase" },
            ],
            correct_hotspot_id: "statin",
            explanation:
              "Statins from Monascus purpureus competitively inhibit the enzyme that makes cholesterol. Penicillin is an antibiotic, cyclosporin A is an immunosuppressant used in transplants, and streptokinase dissolves clots in heart attack patients.",
            hint: "Match the product to its target: this one acts on an enzyme in a synthesis pathway, not on bacteria or clots.",
          },
        },
      ],
    },
    {
      concept: concepts["Microbes as Biocontrol Agents and Biofertilizers"],
      levels: [
        {
          title: "Specimen M3: The Caterpillar Killer",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimenName: "Specimen M3: The Caterpillar Killer",
            context:
              "A farmer sprays dried spores of a bacterium onto cotton plants. Caterpillars feeding on the leaves die within days, but other insects on the same plants are unaffected.",
            features: [
              { id: "f1", label: "Kills only caterpillars (larvae)", detail: "The toxin is activated only in the alkaline gut of specific larvae." },
              { id: "f2", label: "Applied as dried spores", detail: "Spores are mixed with water and sprayed onto vulnerable plants." },
              { id: "f3", label: "Produces a protein toxin in the gut", detail: "The inactive protoxin is converted to active toxin by the larval gut environment." },
              { id: "f4", label: "Harmless to other insects and plants", detail: "The narrow specificity makes it a safe biological control agent." },
            ],
            classificationOptions: [
              { id: "bt", label: "Bacillus thuringiensis" },
              { id: "trichoderma", label: "Trichoderma" },
              { id: "baculovirus", label: "Baculovirus" },
              { id: "rhizobium", label: "Rhizobium" },
            ],
            correct_hotspot_id: "bt",
            explanation:
              "Bacillus thuringiensis produces a protoxin crystal that becomes an active toxin in the alkaline gut of caterpillars, killing them while sparing other organisms. Trichoderma controls fungal plant pathogens, baculoviruses target insects as narrow-spectrum viral agents, and Rhizobium is a nitrogen-fixing biofertilizer.",
            hint: "The toxin only activates in a specific gut chemistry — that specificity identifies the organism.",
          },
        },
      ],
    },
    {
      concept: concepts["Biotechnological Applications in Agriculture"],
      levels: [
        {
          title: "Specimen B1: The Pest-Resistant Cotton",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimenName: "Specimen B1: The Pest-Resistant Cotton",
            context:
              "A cotton variety carries a bacterial gene that makes it resistant to bollworm attack, sharply reducing the need for chemical insecticide.",
            features: [
              { id: "f1", label: "Carries a gene transferred from Bacillus thuringiensis", detail: "The cry gene was introduced into the cotton genome." },
              { id: "f2", label: "Produces a protoxin harmless to the plant itself", detail: "The toxin stays inactive in the plant's own cells." },
              { id: "f3", label: "Toxin activates in the insect's alkaline gut", detail: "The protoxin converts to active form only after ingestion by the pest." },
              { id: "f4", label: "Sharply reduces chemical insecticide use", detail: "Farmers need far fewer sprays to protect the crop." },
            ],
            classificationOptions: [
              { id: "btcotton", label: "Bt transgenic crop" },
              { id: "rnai", label: "RNA interference (RNAi)" },
              { id: "goldenrice", label: "Nutrient-enriched biofortified crop" },
              { id: "tissueculture", label: "Conventional tissue culture" },
            ],
            correct_hotspot_id: "btcotton",
            explanation:
              "Bt cotton carries cry genes from Bacillus thuringiensis, producing a protoxin that only becomes toxic in the alkaline gut of the feeding insect. RNAi silences a parasite's gene rather than producing a toxin, biofortification improves nutritional content, and tissue culture is not gene transfer at all.",
            hint: "A bacterial gene inserted into the plant to produce an insect-killing protein has a specific name in the chapter.",
          },
        },
      ],
    },
    {
      concept: concepts["Biotechnological Applications in Medicine"],
      levels: [
        {
          title: "Specimen B2: The Engineered Insulin",
          difficulty: "hard",
          order_index: 1,
          payload: {
            specimenName: "Specimen B2: The Engineered Insulin",
            context:
              "A company produces human insulin by inserting the A and B chain genes into E. coli, then joining the separately produced chains by disulphide bonds.",
            features: [
              { id: "f1", label: "Chains produced separately in E. coli", detail: "Each polypeptide chain is expressed from its own inserted gene." },
              { id: "f2", label: "Chains joined by disulphide bonds in vitro", detail: "The mature hormone is assembled after extraction." },
              { id: "f3", label: "Product is identical to human insulin", detail: "It avoids the immune reactions caused by animal-derived insulin." },
              { id: "f4", label: "Gene of human origin expressed in a bacterium", detail: "A human gene functions inside a bacterial host cell." },
            ],
            classificationOptions: [
              { id: "rdnatherapeutic", label: "Recombinant DNA therapeutic (humulin)" },
              { id: "genetherapy", label: "Gene therapy" },
              { id: "molecular_diagnosis", label: "Molecular diagnosis" },
              { id: "transgenicanimal", label: "Transgenic animal product" },
            ],
            correct_hotspot_id: "rdnatherapeutic",
            explanation:
              "Humulin is a recombinant DNA therapeutic: human insulin chains are expressed in E. coli and assembled into the mature hormone. Gene therapy corrects a defective gene inside a patient, molecular diagnosis detects disease early, and transgenic animals produce proteins in milk rather than in bacteria.",
            hint: "The human gene is being expressed in a bacterium to manufacture a drug — not inserted into a patient.",
          },
        },
      ],
    },
    {
      concept: concepts["Population Interactions"],
      levels: [
        {
          title: "Specimen P1: The Fig and Its Wasp",
          difficulty: "medium",
          order_index: 1,
          payload: {
            specimenName: "Specimen P1: The Fig and Its Wasp",
            context:
              "A fig tree is pollinated by one specific wasp species. The wasp lays its eggs inside the fig and its larvae feed on some of the developing seeds.",
            features: [
              { id: "f1", label: "The wasp pollinates the fig", detail: "The fig cannot set seed without this specific pollinator." },
              { id: "f2", label: "The fig provides a site for egg-laying", detail: "The wasp's larvae develop inside the fig's protected interior." },
              { id: "f3", label: "The larvae consume some developing seeds", detail: "The fig loses a portion of its seeds to the developing wasps." },
              { id: "f4", label: "Both species benefit overall", detail: "Neither species can complete its life cycle without the other." },
            ],
            classificationOptions: [
              { id: "mutualism", label: "Mutualism (+ / +)" },
              { id: "commensalism", label: "Commensalism (+ / 0)" },
              { id: "parasitism", label: "Parasitism (+ / −)" },
              { id: "competition", label: "Competition (− / −)" },
            ],
            correct_hotspot_id: "mutualism",
            explanation:
              "Both partners gain: the fig gets pollinated and the wasp gets a nursery for its larvae, so despite the cost of some lost seeds the net outcome is positive for both. Commensalism benefits only one partner, parasitism harms one, and competition harms both.",
            hint: "Weigh the net outcome for each partner — losing some seeds still leaves the fig unable to reproduce without the wasp.",
          },
        },
        {
          title: "Specimen P2: The Barnacle and the Whale",
          difficulty: "medium",
          order_index: 2,
          payload: {
            specimenName: "Specimen P2: The Barnacle and the Whale",
            context:
              "Barnacles attach permanently to the skin of a whale. They gain transport and access to plankton-rich waters. The whale appears entirely unaffected.",
            features: [
              { id: "f1", label: "Barnacles gain transport and feeding opportunity", detail: "Riding the whale carries them through nutrient-rich water." },
              { id: "f2", label: "The whale is neither helped nor harmed", detail: "No measurable cost or benefit to the whale has been found." },
              { id: "f3", label: "Barnacles do not feed on the whale's tissue", detail: "They filter plankton from the surrounding water, not from the host." },
              { id: "f4", label: "The association is permanent for the barnacle", detail: "Once attached, the barnacle stays for life." },
            ],
            classificationOptions: [
              { id: "commensalism", label: "Commensalism (+ / 0)" },
              { id: "mutualism", label: "Mutualism (+ / +)" },
              { id: "parasitism", label: "Parasitism (+ / −)" },
              { id: "amensalism", label: "Amensalism (− / 0)" },
            ],
            correct_hotspot_id: "commensalism",
            explanation:
              "One species benefits and the other is unaffected, which defines commensalism. It is not parasitism because the barnacle does not feed on the whale, and not mutualism because the whale gains nothing.",
            hint: "Count the outcomes: one clear gain, and one species with no change at all.",
          },
        },
      ],
    },
    {
      concept: concepts["Organisms and Their Environment"],
      levels: [
        {
          title: "Specimen P3: Surviving the Cold",
          difficulty: "hard",
          order_index: 1,
          payload: {
            specimenName: "Specimen P3: Surviving the Cold",
            context:
              "A mammal in a cold region passes the winter in an inactive state in a burrow. Its body temperature drops, its metabolic rate falls sharply, and it emerges when spring arrives.",
            features: [
              { id: "f1", label: "Body temperature drops with the surroundings", detail: "The animal does not maintain its usual high internal temperature." },
              { id: "f2", label: "Metabolic rate falls sharply", detail: "Energy use drops to a fraction of the normal rate." },
              { id: "f3", label: "The animal stays in a burrow through winter", detail: "It escapes the worst of the cold by sheltering in place." },
              { id: "f4", label: "Normal activity resumes when conditions improve", detail: "The state is temporary and reversible." },
            ],
            classificationOptions: [
              { id: "hibernation", label: "Hibernation" },
              { id: "aestivation", label: "Aestivation" },
              { id: "migration", label: "Migration" },
              { id: "regulation", label: "Regulation (homeostasis)" },
            ],
            correct_hotspot_id: "hibernation",
            explanation:
              "Passing the winter in an inactive, low-metabolism state is hibernation — a form of suspension. Aestivation is the equivalent response to summer heat and drought, migration means moving away to a more favourable habitat, and regulation would mean holding body temperature constant instead of letting it fall.",
            hint: "The season involved separates two similar strategies, and the animal stays put rather than travelling.",
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
