require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const Question = require("./src/models/Question");
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Biology is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Biology" for mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Biology content into this shape.
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 10 });
    console.log("Created new Grade 10 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- CHAPTER 1: Life Processes ----------
  const ch1 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Life Processes",
    title: "Life Processes",
    order_index: 1,
    strand: "Biology",
  });

  const c1a = await Concept.create({
    chapter_id: ch1._id,
    title: "Nutrition",
    explanation_text:
      "Nutrition is the process by which organisms obtain and utilize food for energy, growth, and repair. Autotrophic organisms make their own food via photosynthesis, while heterotrophic organisms depend on other organisms for food.",
  });
  const c1b = await Concept.create({
    chapter_id: ch1._id,
    title: "Respiration",
    explanation_text:
      "Respiration is the process of breaking down food to release energy, using oxygen (aerobic) or without oxygen (anaerobic). In humans, this occurs mainly in the mitochondria of cells.",
  });
  const c1c = await Concept.create({
    chapter_id: ch1._id,
    title: "Transportation and Excretion",
    explanation_text:
      "Transportation moves nutrients, gases, and wastes throughout the body via the circulatory system, while excretion removes metabolic waste products, primarily through the kidneys in humans.",
  });

  await Question.insertMany([
    {
      concept_id: c1a._id,
      question_text:
        "The process by which green plants make their own food is called:",
      options: [
        { id: "a", text: "Photosynthesis" },
        { id: "b", text: "Respiration" },
        { id: "c", text: "Excretion" },
        { id: "d", text: "Transpiration" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text:
        "Organisms that depend on other organisms for food are called:",
      options: [
        { id: "a", text: "Heterotrophs" },
        { id: "b", text: "Autotrophs" },
        { id: "c", text: "Producers" },
        { id: "d", text: "Decomposers only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Heterotrophic organisms, like animals, cannot make their own food and must consume other organisms.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text:
        "In human digestion, the breakdown of starch begins in the:",
      options: [
        { id: "a", text: "Mouth" },
        { id: "b", text: "Stomach" },
        { id: "c", text: "Small intestine only" },
        { id: "d", text: "Large intestine" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Saliva in the mouth contains the enzyme amylase, which begins breaking down starch.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "Which enzyme in the stomach helps digest proteins?",
      options: [
        { id: "a", text: "Pepsin" },
        { id: "b", text: "Amylase" },
        { id: "c", text: "Lipase" },
        { id: "d", text: "Maltase" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Pepsin, activated by stomach acid, breaks down proteins into smaller peptides.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "Absorption of digested food mainly occurs in the:",
      options: [
        { id: "a", text: "Small intestine" },
        { id: "b", text: "Stomach" },
        { id: "c", text: "Esophagus" },
        { id: "d", text: "Large intestine" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The small intestine's villi provide a large surface area for absorbing digested nutrients.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "The raw materials required for photosynthesis are:",
      options: [
        { id: "a", text: "Carbon dioxide and water" },
        { id: "b", text: "Oxygen and glucose" },
        { id: "c", text: "Nitrogen and water" },
        { id: "d", text: "Oxygen only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Photosynthesis uses carbon dioxide and water, along with sunlight, to produce glucose and oxygen.",
      difficulty: "easy",
    },

    {
      concept_id: c1b._id,
      question_text: "Aerobic respiration requires the presence of:",
      options: [
        { id: "a", text: "Oxygen" },
        { id: "b", text: "Carbon dioxide only" },
        { id: "c", text: "Nitrogen" },
        { id: "d", text: "No gases" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Aerobic respiration uses oxygen to fully break down glucose and release maximum energy.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text:
        "The end products of anaerobic respiration in muscle cells (during vigorous exercise) include:",
      options: [
        { id: "a", text: "Lactic acid" },
        { id: "b", text: "Carbon dioxide and water only" },
        { id: "c", text: "Ethanol" },
        { id: "d", text: "Oxygen" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In oxygen-deficient muscle cells, glucose breaks down to lactic acid, causing muscle fatigue.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "Cellular respiration mainly takes place in the:",
      options: [
        { id: "a", text: "Mitochondria" },
        { id: "b", text: "Nucleus" },
        { id: "c", text: "Ribosome" },
        { id: "d", text: "Golgi apparatus" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Mitochondria are the site of aerobic respiration, producing ATP energy for the cell.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text: "Yeast performs anaerobic respiration to produce:",
      options: [
        { id: "a", text: "Ethanol and carbon dioxide" },
        { id: "b", text: "Lactic acid" },
        { id: "c", text: "Oxygen" },
        { id: "d", text: "Water only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Yeast ferments glucose anaerobically to produce ethanol and carbon dioxide.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text:
        "Compared to anaerobic respiration, aerobic respiration releases:",
      options: [
        { id: "a", text: "Much more energy" },
        { id: "b", text: "Much less energy" },
        { id: "c", text: "The exact same energy" },
        { id: "d", text: "No energy" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Aerobic respiration fully oxidizes glucose, releasing significantly more energy than anaerobic respiration.",
      difficulty: "hard",
    },
    {
      concept_id: c1b._id,
      question_text:
        "In humans, gaseous exchange (oxygen intake, carbon dioxide release) occurs mainly in the:",
      options: [
        { id: "a", text: "Lungs (alveoli)" },
        { id: "b", text: "Heart" },
        { id: "c", text: "Kidneys" },
        { id: "d", text: "Liver" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The alveoli in the lungs provide a large surface area for the exchange of oxygen and carbon dioxide.",
      difficulty: "easy",
    },

    {
      concept_id: c1c._id,
      question_text:
        "The fluid connective tissue that transports substances throughout the human body is:",
      options: [
        { id: "a", text: "Blood" },
        { id: "b", text: "Bone" },
        { id: "c", text: "Cartilage" },
        { id: "d", text: "Skin" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Blood transports oxygen, nutrients, hormones, and waste products throughout the body.",
      difficulty: "easy",
    },
    {
      concept_id: c1c._id,
      question_text:
        "The main excretory organs responsible for removing nitrogenous waste in humans are the:",
      options: [
        { id: "a", text: "Kidneys" },
        { id: "b", text: "Lungs" },
        { id: "c", text: "Liver only" },
        { id: "d", text: "Skin only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The kidneys filter blood and remove nitrogenous wastes like urea, forming urine.",
      difficulty: "easy",
    },
    {
      concept_id: c1c._id,
      question_text:
        "The human heart pumps blood through the body using how many chambers?",
      options: [
        { id: "a", text: "Four" },
        { id: "b", text: "Two" },
        { id: "c", text: "Three" },
        { id: "d", text: "One" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The human heart has four chambers: two atria and two ventricles, enabling efficient double circulation.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text:
        "The functional unit of the kidney, responsible for filtration, is called the:",
      options: [
        { id: "a", text: "Nephron" },
        { id: "b", text: "Neuron" },
        { id: "c", text: "Alveolus" },
        { id: "d", text: "Villus" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The nephron is the structural and functional unit of the kidney, filtering blood to form urine.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text: "In plants, excess water is removed mainly through:",
      options: [
        { id: "a", text: "Transpiration (via stomata)" },
        { id: "b", text: "Kidneys" },
        { id: "c", text: "Sweat glands" },
        { id: "d", text: "Roots absorbing it back" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Transpiration through stomata on leaves helps plants get rid of excess water.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text: "Which blood vessels carry blood away from the heart?",
      options: [
        { id: "a", text: "Arteries" },
        { id: "b", text: "Veins" },
        { id: "c", text: "Capillaries only" },
        { id: "d", text: "Lymph vessels" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Arteries carry oxygenated blood away from the heart to the rest of the body (except the pulmonary artery).",
      difficulty: "hard",
    },
  ]);

  // ---------- CHAPTER 2: Control and Coordination ----------
  const ch2 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Control and Coordination",
    title: "Control and Coordination",
    order_index: 2,
    strand: "Biology",
  });

  const c2a = await Concept.create({
    chapter_id: ch2._id,
    title: "Nervous System",
    explanation_text:
      "The nervous system, made up of the brain, spinal cord, and nerves, coordinates the body's responses to stimuli. Neurons transmit electrical impulses to enable rapid communication.",
  });
  const c2b = await Concept.create({
    chapter_id: ch2._id,
    title: "Reflex Action",
    explanation_text:
      "A reflex action is an automatic, rapid response to a stimulus that does not involve conscious thought, controlled by a reflex arc that bypasses direct brain processing for speed.",
  });
  const c2c = await Concept.create({
    chapter_id: ch2._id,
    title: "Hormonal Coordination",
    explanation_text:
      "Hormones are chemical messengers secreted by endocrine glands that regulate body functions like growth, metabolism, and reproduction, acting more slowly than the nervous system but with longer-lasting effects.",
  });

  await Question.insertMany([
    {
      concept_id: c2a._id,
      question_text: "The basic functional unit of the nervous system is the:",
      options: [
        { id: "a", text: "Neuron" },
        { id: "b", text: "Nephron" },
        { id: "c", text: "Alveolus" },
        { id: "d", text: "Axon only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Neurons are specialized cells that transmit electrical impulses throughout the nervous system.",
      difficulty: "easy",
    },
    {
      concept_id: c2a._id,
      question_text:
        "The part of the human brain responsible for maintaining balance and posture is the:",
      options: [
        { id: "a", text: "Cerebellum" },
        { id: "b", text: "Cerebrum" },
        { id: "c", text: "Medulla" },
        { id: "d", text: "Hypothalamus" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The cerebellum coordinates muscle movements and maintains balance and posture.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text:
        "Voluntary actions and thinking are primarily controlled by the:",
      options: [
        { id: "a", text: "Cerebrum" },
        { id: "b", text: "Cerebellum" },
        { id: "c", text: "Spinal cord" },
        { id: "d", text: "Medulla oblongata" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The cerebrum, the largest part of the brain, controls voluntary actions, thinking, and memory.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Nerve impulses travel across a synapse mainly through:",
      options: [
        { id: "a", text: "Chemical messengers (neurotransmitters)" },
        { id: "b", text: "Direct electrical contact only" },
        { id: "c", text: "Blood flow" },
        { id: "d", text: "Muscle contraction" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Neurotransmitters are released at the synapse to transmit signals from one neuron to the next.",
      difficulty: "hard",
    },
    {
      concept_id: c2a._id,
      question_text:
        "Which part of the neuron receives signals from other neurons?",
      options: [
        { id: "a", text: "Dendrites" },
        { id: "b", text: "Axon" },
        { id: "c", text: "Cell body only" },
        { id: "d", text: "Myelin sheath" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Dendrites receive signals from neighboring neurons and pass them to the cell body.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "The medulla in the brainstem primarily controls:",
      options: [
        { id: "a", text: "Involuntary actions like heartbeat and breathing" },
        { id: "b", text: "Voluntary movement" },
        { id: "c", text: "Memory and thought" },
        { id: "d", text: "Vision only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The medulla oblongata regulates vital involuntary functions such as heart rate and breathing.",
      difficulty: "medium",
    },

    {
      concept_id: c2b._id,
      question_text: "A reflex action is best described as a response that is:",
      options: [
        {
          id: "a",
          text: "Rapid and automatic, not requiring conscious thought",
        },
        { id: "b", text: "Slow and deliberate" },
        { id: "c", text: "Only controlled by hormones" },
        { id: "d", text: "Always voluntary" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Reflex actions are quick, automatic responses that occur without conscious brain processing.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text:
        "The pathway followed by a nerve impulse during a reflex action is called the:",
      options: [
        { id: "a", text: "Reflex arc" },
        { id: "b", text: "Nerve cord" },
        { id: "c", text: "Synapse loop" },
        { id: "d", text: "Motor pathway only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The reflex arc is the neural pathway that controls a reflex action, typically bypassing the brain.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text:
        "Reflex actions are primarily controlled and processed by the:",
      options: [
        { id: "a", text: "Spinal cord" },
        { id: "b", text: "Cerebrum" },
        { id: "c", text: "Cerebellum" },
        { id: "d", text: "Endocrine glands" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Most reflex actions are processed by the spinal cord for a faster response than involving the brain.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text: "An example of a reflex action is:",
      options: [
        { id: "a", text: "Withdrawing your hand quickly from a hot object" },
        { id: "b", text: "Solving a math problem" },
        { id: "c", text: "Deciding what to eat" },
        { id: "d", text: "Reading a book" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Withdrawing your hand from a hot object is a classic reflex, occurring rapidly without conscious decision.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text: "Reflex actions are important because they:",
      options: [
        { id: "a", text: "Protect the body quickly from harm" },
        { id: "b", text: "Require deep thinking" },
        { id: "c", text: "Are always slow" },
        { id: "d", text: "Only occur during sleep" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Reflexes allow the body to respond quickly to potentially harmful stimuli, minimizing injury.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text:
        "The neurons involved in a simple reflex arc, in order, are:",
      options: [
        { id: "a", text: "Sensory neuron, relay neuron, motor neuron" },
        { id: "b", text: "Motor neuron only" },
        { id: "c", text: "Sensory neuron only" },
        { id: "d", text: "Relay neuron only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A reflex arc typically involves a sensory neuron detecting the stimulus, a relay neuron in the spinal cord, and a motor neuron triggering the response.",
      difficulty: "hard",
    },

    {
      concept_id: c2c._id,
      question_text:
        "Hormones are chemical substances secreted directly into the:",
      options: [
        { id: "a", text: "Bloodstream" },
        { id: "b", text: "Digestive tract" },
        { id: "c", text: "Muscles only" },
        { id: "d", text: "Skin only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Endocrine glands secrete hormones directly into the bloodstream, which carries them to target organs.",
      difficulty: "easy",
    },
    {
      concept_id: c2c._id,
      question_text:
        "Which gland is often called the 'master gland' because it regulates other endocrine glands?",
      options: [
        { id: "a", text: "Pituitary gland" },
        { id: "b", text: "Thyroid gland" },
        { id: "c", text: "Pancreas" },
        { id: "d", text: "Adrenal gland" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The pituitary gland controls the activity of most other endocrine glands in the body.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text:
        "The hormone insulin, produced by the pancreas, primarily regulates:",
      options: [
        { id: "a", text: "Blood glucose levels" },
        { id: "b", text: "Growth of bones" },
        { id: "c", text: "Heart rate" },
        { id: "d", text: "Sleep cycles" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Insulin helps regulate blood sugar levels by promoting glucose uptake into cells.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text:
        "Compared to nervous coordination, hormonal coordination is generally:",
      options: [
        { id: "a", text: "Slower but longer-lasting" },
        { id: "b", text: "Always faster" },
        { id: "c", text: "Identical in speed" },
        { id: "d", text: "Non-existent in animals" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Hormones travel via blood and act more slowly than nerve impulses, but their effects tend to last longer.",
      difficulty: "hard",
    },
    {
      concept_id: c2c._id,
      question_text:
        "The hormone responsible for the 'fight or flight' response is:",
      options: [
        { id: "a", text: "Adrenaline" },
        { id: "b", text: "Insulin" },
        { id: "c", text: "Thyroxine" },
        { id: "d", text: "Growth hormone" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Adrenaline, secreted by the adrenal glands, prepares the body for sudden physical action during stress.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text:
        "Growth hormone deficiency in childhood can primarily lead to:",
      options: [
        { id: "a", text: "Stunted growth" },
        { id: "b", text: "Diabetes only" },
        { id: "c", text: "Improved memory" },
        { id: "d", text: "Faster reflexes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Insufficient growth hormone during childhood can result in reduced height and stunted growth.",
      difficulty: "medium",
    },
  ]);

  // ---------- CHAPTER 3: How Do Organisms Reproduce ----------
  const ch3 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Reproduction",
    title: "How Do Organisms Reproduce",
    order_index: 3,
    strand: "Biology",
  });

  const c3a = await Concept.create({
    chapter_id: ch3._id,
    title: "Asexual Reproduction",
    explanation_text:
      "Asexual reproduction produces genetically identical offspring from a single parent, occurring through methods like budding, fission, and vegetative propagation, without the fusion of gametes.",
  });
  const c3b = await Concept.create({
    chapter_id: ch3._id,
    title: "Sexual Reproduction",
    explanation_text:
      "Sexual reproduction involves the fusion of male and female gametes to form a zygote, producing genetically varied offspring, and is the primary mode of reproduction in humans and most animals.",
  });
  const c3c = await Concept.create({
    chapter_id: ch3._id,
    title: "Human Reproductive Health",
    explanation_text:
      "Reproductive health involves understanding puberty, the human reproductive system, and practices like contraception and prevention of sexually transmitted infections (STIs) to maintain overall well-being.",
  });

  await Question.insertMany([
    {
      concept_id: c3a._id,
      question_text: "Asexual reproduction produces offspring that are:",
      options: [
        { id: "a", text: "Genetically identical to the parent" },
        { id: "b", text: "Always genetically varied" },
        { id: "c", text: "A mix of two different species" },
        { id: "d", text: "Sterile" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Since asexual reproduction involves only one parent, offspring are genetically identical clones.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text: "Hydra reproduces asexually mainly through:",
      options: [
        { id: "a", text: "Budding" },
        { id: "b", text: "Binary fission" },
        { id: "c", text: "Spore formation" },
        { id: "d", text: "Vegetative propagation" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Hydra reproduces by budding, where a new individual grows out from the parent's body.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text: "Amoeba reproduces asexually through:",
      options: [
        { id: "a", text: "Binary fission" },
        { id: "b", text: "Budding" },
        { id: "c", text: "Sexual fusion" },
        { id: "d", text: "Grafting" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Amoeba splits into two identical daughter cells through binary fission.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text:
        "Growing a new plant from a stem cutting is an example of:",
      options: [
        { id: "a", text: "Vegetative propagation" },
        { id: "b", text: "Budding" },
        { id: "c", text: "Fission" },
        { id: "d", text: "Sexual reproduction" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Vegetative propagation allows new plants to grow from parts like stems, roots, or leaves.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text:
        "Spore formation as a means of asexual reproduction is commonly seen in:",
      options: [
        { id: "a", text: "Fungi like bread mold (Rhizopus)" },
        { id: "b", text: "Humans" },
        { id: "c", text: "Fish" },
        { id: "d", text: "Birds" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Fungi such as Rhizopus reproduce asexually by releasing spores that grow into new organisms.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text: "A key disadvantage of asexual reproduction is:",
      options: [
        { id: "a", text: "Lack of genetic variation, reducing adaptability" },
        { id: "b", text: "It requires two parents" },
        { id: "c", text: "It is always slower than sexual reproduction" },
        { id: "d", text: "It cannot occur in plants" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Without genetic variation, populations formed by asexual reproduction are more vulnerable to changing conditions or disease.",
      difficulty: "hard",
    },

    {
      concept_id: c3b._id,
      question_text: "Sexual reproduction involves the fusion of:",
      options: [
        { id: "a", text: "Male and female gametes" },
        { id: "b", text: "Two identical cells" },
        { id: "c", text: "Only female gametes" },
        { id: "d", text: "Somatic cells" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Sexual reproduction requires the fusion of a male gamete (sperm) and a female gamete (egg) to form a zygote.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text:
        "The fertilized egg formed after fusion of gametes is called a:",
      options: [
        { id: "a", text: "Zygote" },
        { id: "b", text: "Embryo only" },
        { id: "c", text: "Spore" },
        { id: "d", text: "Bud" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The zygote is the initial cell formed when male and female gametes fuse.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text:
        "A key advantage of sexual reproduction over asexual reproduction is:",
      options: [
        { id: "a", text: "It introduces genetic variation in offspring" },
        { id: "b", text: "It requires only one parent" },
        { id: "c", text: "It is always faster" },
        { id: "d", text: "Offspring are identical clones" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Sexual reproduction combines genetic material from two parents, creating variation that aids adaptation.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text: "In flowering plants, the male reproductive part is the:",
      options: [
        { id: "a", text: "Stamen" },
        { id: "b", text: "Pistil" },
        { id: "c", text: "Sepal" },
        { id: "d", text: "Petal" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The stamen, consisting of the anther and filament, is the male reproductive structure in flowers.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text:
        "In flowering plants, the female reproductive part is the:",
      options: [
        { id: "a", text: "Pistil" },
        { id: "b", text: "Stamen" },
        { id: "c", text: "Anther" },
        { id: "d", text: "Petal" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The pistil, including the stigma, style, and ovary, is the female reproductive structure in flowers.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text:
        "The transfer of pollen grains from anther to stigma is called:",
      options: [
        { id: "a", text: "Pollination" },
        { id: "b", text: "Fertilization" },
        { id: "c", text: "Germination" },
        { id: "d", text: "Budding" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Pollination is the transfer of pollen, a necessary step before fertilization can occur in flowering plants.",
      difficulty: "medium",
    },

    {
      concept_id: c3c._id,
      question_text:
        "The stage of life when reproductive organs become functionally mature is called:",
      options: [
        { id: "a", text: "Puberty" },
        { id: "b", text: "Infancy" },
        { id: "c", text: "Menopause only" },
        { id: "d", text: "Old age" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Puberty marks the period when reproductive organs mature and secondary sexual characteristics develop.",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text: "Contraceptive methods are primarily used to:",
      options: [
        { id: "a", text: "Prevent unwanted pregnancy" },
        { id: "b", text: "Increase fertility" },
        { id: "c", text: "Cure infections" },
        { id: "d", text: "Speed up puberty" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Contraceptive methods help prevent pregnancy by blocking fertilization or implantation.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text:
        "Sexually transmitted infections (STIs) are primarily spread through:",
      options: [
        { id: "a", text: "Sexual contact" },
        { id: "b", text: "Air" },
        { id: "c", text: "Food only" },
        { id: "d", text: "Sunlight" },
      ],
      correct_option_id: "a",
      explanation_text:
        "STIs are infections primarily transmitted through sexual contact between individuals.",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text:
        "Barrier methods of contraception, such as condoms, work by:",
      options: [
        { id: "a", text: "Physically preventing sperm from reaching the egg" },
        { id: "b", text: "Altering hormone levels" },
        { id: "c", text: "Removing reproductive organs" },
        { id: "d", text: "Increasing fertility" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Barrier methods physically block sperm from reaching the egg, preventing fertilization.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text:
        "Reproductive health awareness is important mainly because it helps:",
      options: [
        {
          id: "a",
          text: "Prevent health complications and make informed choices",
        },
        { id: "b", text: "Guarantee fertility for everyone" },
        { id: "c", text: "Eliminate the need for medical checkups" },
        { id: "d", text: "Speed up puberty" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Awareness of reproductive health allows individuals to prevent complications and make informed decisions.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text:
        "Regular prenatal checkups during pregnancy are important mainly to:",
      options: [
        {
          id: "a",
          text: "Monitor the health of the mother and developing baby",
        },
        { id: "b", text: "Guarantee the baby's gender" },
        { id: "c", text: "Speed up delivery" },
        { id: "d", text: "Replace the need for a balanced diet" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Prenatal checkups help track the health and development of both mother and baby throughout pregnancy.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 10 Batch 1 seed complete: 3 chapters, 9 concepts, 54 questions added.",
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
