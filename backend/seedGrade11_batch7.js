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

  let subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Biology", grade: 11 });
    console.log("Created new Grade 11 Biology subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- CHAPTER 19: Locomotion and Movement ----------
  const ch19 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Human Physiology",
    title: "Locomotion and Movement",
    order_index: 19,
  });

  const c19a = await Concept.create({
    chapter_id: ch19._id,
    title: "Types of Movement and Skeletal Muscle Structure",
    explanation_text:
      "The human body shows ciliary, flagellar, and muscular movement; skeletal muscle is made of bundles of muscle fibres containing thin actin and thick myosin filaments arranged in repeating units called sarcomeres.",
  });
  const c19b = await Concept.create({
    chapter_id: ch19._id,
    title: "Mechanism of Muscle Contraction",
    explanation_text:
      "Muscle contraction is explained by the sliding filament theory, where actin filaments slide over myosin filaments upon calcium- and ATP-dependent cross-bridge formation, shortening the sarcomere.",
  });
  const c19c = await Concept.create({
    chapter_id: ch19._id,
    title: "Skeletal System, Joints, and Locomotor Disorders",
    explanation_text:
      "The human skeleton, comprising axial and appendicular divisions, along with joints (fibrous, cartilaginous, synovial), enables support and movement; disorders like arthritis, osteoporosis, and myasthenia gravis affect the locomotor system.",
  });

  await Question.insertMany([
    {
      concept_id: c19a._id,
      question_text: "Movement of substances along the respiratory tract lining is an example of:",
      options: [
        { id: "a", text: "Muscular movement" },
        { id: "b", text: "Ciliary movement" },
        { id: "c", text: "Flagellar movement" },
        { id: "d", text: "Amoeboid movement" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ciliary movement, produced by coordinated beating of cilia lining certain tracts like the respiratory tract, helps move particles or mucus along the surface.",
      difficulty: "easy",
    },
    {
      concept_id: c19a._id,
      question_text: "The thick filaments of a skeletal muscle sarcomere are made of the protein:",
      options: [
        { id: "a", text: "Actin" },
        { id: "b", text: "Myosin" },
        { id: "c", text: "Troponin" },
        { id: "d", text: "Tropomyosin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Thick filaments in a sarcomere are composed mainly of the protein myosin, which has projecting heads that interact with thin actin filaments during contraction.",
      difficulty: "easy",
    },
    {
      concept_id: c19a._id,
      question_text: "The thin filaments of a sarcomere are primarily composed of:",
      options: [
        { id: "a", text: "Myosin" },
        { id: "b", text: "Actin, along with troponin and tropomyosin" },
        { id: "c", text: "Collagen" },
        { id: "d", text: "Keratin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Thin filaments are composed of the protein actin, associated with the regulatory proteins troponin and tropomyosin that control the exposure of myosin-binding sites.",
      difficulty: "medium",
    },
    {
      concept_id: c19a._id,
      question_text: "A sarcomere is defined as the repeating unit between two consecutive:",
      options: [
        { id: "a", text: "Z-lines" },
        { id: "b", text: "M-lines only" },
        { id: "c", text: "H-zones" },
        { id: "d", text: "I-bands only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A sarcomere is the functional contractile unit of a muscle fibre, defined as the region between two successive Z-lines within a myofibril.",
      difficulty: "medium",
    },
    {
      concept_id: c19a._id,
      question_text: "Each skeletal muscle fibre is a multinucleate cell enclosed by a membrane called the:",
      options: [
        { id: "a", text: "Sarcolemma" },
        { id: "b", text: "Sarcoplasmic reticulum" },
        { id: "c", text: "Perimysium" },
        { id: "d", text: "Endomysium" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Each skeletal muscle fibre is a long, cylindrical, multinucleate cell enclosed by a plasma membrane called the sarcolemma.",
      difficulty: "hard",
    },
    {
      concept_id: c19a._id,
      question_text:
        "Under a microscope, skeletal muscle appears striated mainly because of the:",
      options: [
        { id: "a", text: "Alternating arrangement of thick and thin filaments creating light and dark bands" },
        { id: "b", text: "Presence of a single nucleus" },
        { id: "c", text: "Absence of any filaments" },
        { id: "d", text: "Random distribution of mitochondria only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The regular, alternating arrangement of thick (myosin) and thin (actin) filaments within sarcomeres creates alternating light (I-band) and dark (A-band) regions, giving skeletal muscle its striated appearance.",
      difficulty: "hard",
    },

    {
      concept_id: c19b._id,
      question_text: "According to the sliding filament theory, muscle contraction occurs when:",
      options: [
        { id: "a", text: "Actin filaments slide over myosin filaments, shortening the sarcomere" },
        { id: "b", text: "Myosin filaments shrink in length" },
        { id: "c", text: "Actin filaments shrink in length" },
        { id: "d", text: "Filaments move apart, lengthening the sarcomere" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The sliding filament theory explains that actin (thin) filaments slide over myosin (thick) filaments, without either filament changing length, causing the sarcomere to shorten during contraction.",
      difficulty: "easy",
    },
    {
      concept_id: c19b._id,
      question_text: "The signal for muscle contraction is directly triggered by the release of:",
      options: [
        { id: "a", text: "Sodium ions from the sarcolemma" },
        { id: "b", text: "Calcium ions from the sarcoplasmic reticulum" },
        { id: "c", text: "Potassium ions from mitochondria" },
        { id: "d", text: "Chloride ions from the nucleus" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A nerve impulse triggers the release of calcium ions from the sarcoplasmic reticulum into the sarcoplasm, initiating the events leading to muscle contraction.",
      difficulty: "easy",
    },
    {
      concept_id: c19b._id,
      question_text: "Calcium ions trigger muscle contraction primarily by binding to:",
      options: [
        { id: "a", text: "Myosin heads directly" },
        { id: "b", text: "Troponin, which shifts tropomyosin to expose myosin-binding sites on actin" },
        { id: "c", text: "ATP molecules" },
        { id: "d", text: "The sarcolemma" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Calcium ions bind to troponin, causing a conformational change that moves tropomyosin away from myosin-binding sites on actin, allowing cross-bridge formation.",
      difficulty: "medium",
    },
    {
      concept_id: c19b._id,
      question_text: "ATP is required during muscle contraction mainly for:",
      options: [
        { id: "a", text: "Providing energy for cross-bridge cycling and detachment of myosin from actin" },
        { id: "b", text: "Only for relaxing the muscle after death" },
        { id: "c", text: "Producing calcium ions" },
        { id: "d", text: "Building new muscle fibres instantly" },
      ],
      correct_option_id: "a",
      explanation_text:
        "ATP hydrolysis powers the movement of myosin heads (the power stroke) and is also needed to detach myosin heads from actin, allowing the cross-bridge cycle to continue.",
      difficulty: "medium",
    },
    {
      concept_id: c19b._id,
      question_text: "During muscle contraction, which of the following bands/zones shortens or disappears?",
      options: [
        { id: "a", text: "A-band" },
        { id: "b", text: "I-band and H-zone" },
        { id: "c", text: "Neither changes" },
        { id: "d", text: "Only the Z-line disappears" },
      ],
      correct_option_id: "b",
      explanation_text:
        "During contraction, the I-band (only thin filaments) and H-zone (only thick filaments) shorten or disappear as actin filaments slide further into the A-band, while the A-band length itself stays constant.",
      difficulty: "hard",
    },
    {
      concept_id: c19b._id,
      question_text:
        "Rigor mortis, the stiffening of muscles after death, occurs largely because:",
      options: [
        { id: "a", text: "ATP is no longer available to detach myosin heads from actin" },
        { id: "b", text: "Calcium ions are completely removed from the body" },
        { id: "c", text: "Muscles gain extra oxygen after death" },
        { id: "d", text: "Sarcomeres permanently lengthen" },
      ],
      correct_option_id: "a",
      explanation_text:
        "After death, ATP production stops, so myosin heads remain locked onto actin filaments (since ATP is needed to detach them), causing the characteristic stiffness of rigor mortis.",
      difficulty: "hard",
    },

    {
      concept_id: c19c._id,
      question_text: "The human skeleton is divided into two main parts: the appendicular skeleton and the:",
      options: [
        { id: "a", text: "Axial skeleton" },
        { id: "b", text: "Cranial skeleton" },
        { id: "c", text: "Peripheral skeleton" },
        { id: "d", text: "Cartilaginous skeleton" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The human skeleton is divided into the axial skeleton (skull, vertebral column, ribs, sternum) and the appendicular skeleton (limb bones and girdles).",
      difficulty: "easy",
    },
    {
      concept_id: c19c._id,
      question_text: "The joint between the bones of the skull, which allows no movement, is an example of a:",
      options: [
        { id: "a", text: "Synovial joint" },
        { id: "b", text: "Fibrous (immovable) joint" },
        { id: "c", text: "Ball and socket joint" },
        { id: "d", text: "Hinge joint" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fibrous joints, such as the sutures between skull bones, are fixed and immovable, providing strong structural support.",
      difficulty: "easy",
    },
    {
      concept_id: c19c._id,
      question_text: "The shoulder joint, which allows movement in almost all directions, is an example of a:",
      options: [
        { id: "a", text: "Hinge joint" },
        { id: "b", text: "Gliding joint" },
        { id: "c", text: "Ball and socket joint" },
        { id: "d", text: "Pivot joint" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The shoulder joint is a ball and socket joint, allowing movement in nearly all directions, more freedom than any other type of joint.",
      difficulty: "medium",
    },
    {
      concept_id: c19c._id,
      question_text: "Osteoporosis is a disorder characterized by:",
      options: [
        { id: "a", text: "Inflammation of joints due to infection only" },
        { id: "b", text: "Decreased bone mass and increased fracture risk, often due to hormonal changes with age" },
        { id: "c", text: "Excess muscle growth" },
        { id: "d", text: "Complete fusion of all joints" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Osteoporosis is an age-related disorder characterized by decreased bone mass and increased bone fragility, often linked to a decline in estrogen levels, particularly in postmenopausal women.",
      difficulty: "medium",
    },
    {
      concept_id: c19c._id,
      question_text: "Myasthenia gravis is a disorder that affects:",
      options: [
        { id: "a", text: "Neuromuscular junctions, causing progressive muscle weakness" },
        { id: "b", text: "Only bone density" },
        { id: "c", text: "Only cartilage in joints" },
        { id: "d", text: "The skull sutures" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Myasthenia gravis is an autoimmune disorder that affects the neuromuscular junction, impairing signal transmission from nerve to muscle and causing progressive muscular weakness.",
      difficulty: "hard",
    },
    {
      concept_id: c19c._id,
      question_text: "Rheumatoid arthritis is best described as:",
      options: [
        { id: "a", text: "A degenerative joint disease seen only with aging" },
        { id: "b", text: "An autoimmune disorder causing inflammation and damage to joints" },
        { id: "c", text: "A bacterial infection of bones only" },
        { id: "d", text: "A muscle contraction disorder unrelated to joints" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Rheumatoid arthritis is an autoimmune disorder in which the immune system attacks the synovial membrane of joints, causing chronic inflammation, pain, and joint damage.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 19 (Locomotion and Movement) done");

  // ---------- CHAPTER 20: Neural Control and Coordination ----------
  const ch20 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Human Physiology",
    title: "Neural Control and Coordination",
    order_index: 20,
  });

  const c20a = await Concept.create({
    chapter_id: ch20._id,
    title: "Neuron Structure and Generation of Nerve Impulse",
    explanation_text:
      "A neuron consists of a cell body, dendrites, and an axon; nerve impulses are generated as electrical signals (action potentials) via changes in membrane permeability to sodium and potassium ions, and transmitted across synapses using neurotransmitters.",
  });
  const c20b = await Concept.create({
    chapter_id: ch20._id,
    title: "Central Nervous System: Brain and Spinal Cord",
    explanation_text:
      "The human central nervous system consists of the brain (forebrain, midbrain, hindbrain) and spinal cord, coordinating sensory input, motor output, and higher cognitive functions, protected by meninges and cerebrospinal fluid.",
  });
  const c20c = await Concept.create({
    chapter_id: ch20._id,
    title: "Peripheral Nervous System and Sensory Reception",
    explanation_text:
      "The peripheral nervous system includes the somatic and autonomic nervous systems that connect the CNS to muscles, glands, and organs; sensory receptors such as the eye and ear convert stimuli into neural signals for perception.",
  });

  await Question.insertMany([
    {
      concept_id: c20a._id,
      question_text: "The basic structural and functional unit of the nervous system is the:",
      options: [
        { id: "a", text: "Neuron" },
        { id: "b", text: "Nephron" },
        { id: "c", text: "Sarcomere" },
        { id: "d", text: "Axon terminal only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The neuron (nerve cell) is the basic structural and functional unit of the nervous system, specialized for receiving, processing, and transmitting information.",
      difficulty: "easy",
    },
    {
      concept_id: c20a._id,
      question_text: "In a resting neuron, the inside of the axonal membrane relative to the outside is:",
      options: [
        { id: "a", text: "More positively charged" },
        { id: "b", text: "More negatively charged" },
        { id: "c", text: "Exactly equal in charge" },
        { id: "d", text: "Highly variable with no pattern" },
      ],
      correct_option_id: "b",
      explanation_text:
        "At resting membrane potential, the inside of the neuron is more negatively charged relative to the outside, primarily due to the distribution of sodium and potassium ions maintained by the sodium-potassium pump.",
      difficulty: "easy",
    },
    {
      concept_id: c20a._id,
      question_text: "An action potential is generated mainly due to a rapid influx of:",
      options: [
        { id: "a", text: "Potassium ions into the axon" },
        { id: "b", text: "Sodium ions into the axon" },
        { id: "c", text: "Calcium ions out of the axon" },
        { id: "d", text: "Chloride ions out of the axon" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A stimulus causes voltage-gated sodium channels to open, allowing a rapid influx of sodium ions into the axon, depolarizing the membrane and generating the action potential.",
      difficulty: "medium",
    },
    {
      concept_id: c20a._id,
      question_text: "At a chemical synapse, the nerve impulse is transmitted from one neuron to the next via:",
      options: [
        { id: "a", text: "Direct electrical contact only" },
        { id: "b", text: "Release of neurotransmitters into the synaptic cleft" },
        { id: "c", text: "Movement of the entire neuron" },
        { id: "d", text: "Direct diffusion of sodium ions between neurons" },
      ],
      correct_option_id: "b",
      explanation_text:
        "At a chemical synapse, an arriving impulse triggers the release of neurotransmitters from the presynaptic neuron, which diffuse across the synaptic cleft and bind to receptors on the postsynaptic neuron.",
      difficulty: "medium",
    },
    {
      concept_id: c20a._id,
      question_text: "Myelin sheath around certain axons primarily functions to:",
      options: [
        { id: "a", text: "Slow down nerve impulse conduction" },
        { id: "b", text: "Increase the speed of nerve impulse conduction" },
        { id: "c", text: "Produce neurotransmitters" },
        { id: "d", text: "Absorb sodium ions permanently" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The myelin sheath insulates the axon and enables saltatory conduction, where the impulse jumps between the gaps (nodes of Ranvier), significantly increasing conduction speed.",
      difficulty: "hard",
    },
    {
      concept_id: c20a._id,
      question_text: "During repolarization of a neuron following an action potential, the membrane becomes more permeable to:",
      options: [
        { id: "a", text: "Sodium ions moving in" },
        { id: "b", text: "Potassium ions moving out" },
        { id: "c", text: "Calcium ions moving in" },
        { id: "d", text: "Chloride ions moving in only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Repolarization occurs as voltage-gated potassium channels open, allowing potassium ions to move out of the axon, restoring the negative resting membrane potential.",
      difficulty: "hard",
    },

    {
      concept_id: c20b._id,
      question_text: "The human central nervous system consists of the brain and the:",
      options: [
        { id: "a", text: "Spinal cord" },
        { id: "b", text: "Sciatic nerve" },
        { id: "c", text: "Vagus nerve" },
        { id: "d", text: "Sympathetic chain only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The central nervous system (CNS) comprises the brain and the spinal cord, which together coordinate and control most body functions.",
      difficulty: "easy",
    },
    {
      concept_id: c20b._id,
      question_text: "The largest and most prominent part of the human forebrain, associated with higher thinking, is the:",
      options: [
        { id: "a", text: "Cerebrum" },
        { id: "b", text: "Cerebellum" },
        { id: "c", text: "Medulla oblongata" },
        { id: "d", text: "Pons" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The cerebrum is the largest part of the human brain, responsible for higher functions such as thinking, memory, reasoning, and voluntary movement control.",
      difficulty: "easy",
    },
    {
      concept_id: c20b._id,
      question_text: "The part of the brain primarily responsible for maintaining balance and coordinating voluntary movements is the:",
      options: [
        { id: "a", text: "Cerebrum" },
        { id: "b", text: "Cerebellum" },
        { id: "c", text: "Hypothalamus" },
        { id: "d", text: "Thalamus" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The cerebellum, part of the hindbrain, is chiefly responsible for maintaining posture, balance, and coordinating precise voluntary movements.",
      difficulty: "medium",
    },
    {
      concept_id: c20b._id,
      question_text: "Vital involuntary functions like heart rate and breathing rate are primarily regulated by the:",
      options: [
        { id: "a", text: "Cerebrum" },
        { id: "b", text: "Medulla oblongata" },
        { id: "c", text: "Cerebellum" },
        { id: "d", text: "Hypothalamus only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The medulla oblongata, part of the hindbrain, contains centres that regulate vital involuntary functions such as heart rate, breathing rate, and blood pressure.",
      difficulty: "medium",
    },
    {
      concept_id: c20b._id,
      question_text: "The brain and spinal cord are protected by three connective tissue membranes collectively called the:",
      options: [
        { id: "a", text: "Meninges" },
        { id: "b", text: "Myelin sheaths" },
        { id: "c", text: "Neuroglia" },
        { id: "d", text: "Ganglia" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The meninges are three protective membranes (dura mater, arachnoid mater, and pia mater) that cover and protect the brain and spinal cord.",
      difficulty: "hard",
    },
    {
      concept_id: c20b._id,
      question_text: "Cerebrospinal fluid, found within and around the brain and spinal cord, primarily functions to:",
      options: [
        { id: "a", text: "Act as a shock absorber and provide nourishment" },
        { id: "b", text: "Generate action potentials" },
        { id: "c", text: "Directly transmit nerve impulses" },
        { id: "d", text: "Digest neurotransmitters" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Cerebrospinal fluid cushions the brain and spinal cord against mechanical shock, maintains uniform pressure, and helps in the exchange of nutrients and waste products.",
      difficulty: "hard",
    },

    {
      concept_id: c20c._id,
      question_text: "The peripheral nervous system is broadly divided into the autonomic nervous system and the:",
      options: [
        { id: "a", text: "Somatic nervous system" },
        { id: "b", text: "Central nervous system" },
        { id: "c", text: "Cerebellar system" },
        { id: "d", text: "Meningeal system" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The peripheral nervous system consists of the somatic nervous system (voluntary control of skeletal muscles) and the autonomic nervous system (involuntary control of internal organs).",
      difficulty: "easy",
    },
    {
      concept_id: c20c._id,
      question_text: "The photoreceptor cells in the human retina responsible for color vision are called:",
      options: [
        { id: "a", text: "Rods" },
        { id: "b", text: "Cones" },
        { id: "c", text: "Ganglion cells" },
        { id: "d", text: "Bipolar cells" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Cone cells in the retina are responsible for color vision and function best in bright light, while rod cells are responsible for vision in dim light.",
      difficulty: "easy",
    },
    {
      concept_id: c20c._id,
      question_text: "Sound waves are converted into nerve impulses in the human ear mainly at the:",
      options: [
        { id: "a", text: "Pinna" },
        { id: "b", text: "Organ of Corti in the cochlea" },
        { id: "c", text: "Eustachian tube" },
        { id: "d", text: "Tympanic membrane only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The organ of Corti, located within the cochlea, contains hair cells that convert mechanical sound vibrations into electrical nerve impulses sent to the brain.",
      difficulty: "medium",
    },
    {
      concept_id: c20c._id,
      question_text: "The autonomic nervous system's sympathetic division generally prepares the body for:",
      options: [
        { id: "a", text: "Rest and digestion" },
        { id: "b", text: "Fight-or-flight responses" },
        { id: "c", text: "Sleep only" },
        { id: "d", text: "Slowing the heart rate only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The sympathetic division of the autonomic nervous system prepares the body for stressful or emergency situations, often described as the fight-or-flight response, by increasing heart rate and redirecting blood flow.",
      difficulty: "medium",
    },
    {
      concept_id: c20c._id,
      question_text: "The three semicircular canals in the inner ear are primarily responsible for detecting:",
      options: [
        { id: "a", text: "Sound frequency" },
        { id: "b", text: "Rotational movements of the head and maintaining balance" },
        { id: "c", text: "Light intensity" },
        { id: "d", text: "Taste sensations" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The semicircular canals detect rotational movements and changes in the position of the head, playing a key role in maintaining balance and equilibrium.",
      difficulty: "hard",
    },
    {
      concept_id: c20c._id,
      question_text: "The parasympathetic division of the autonomic nervous system generally promotes:",
      options: [
        { id: "a", text: "Increased heart rate and blood pressure" },
        { id: "b", text: "Rest, digestion, and conservation of energy" },
        { id: "c", text: "Only pupil dilation" },
        { id: "d", text: "Only sweating" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The parasympathetic division generally promotes rest, digestion, and energy conservation, opposing many of the effects of the sympathetic division.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 20 (Neural Control and Coordination) done");

  // ---------- CHAPTER 21: Chemical Coordination and Integration ----------
  const ch21 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Human Physiology",
    title: "Chemical Coordination and Integration",
    order_index: 21,
  });

  const c21a = await Concept.create({
    chapter_id: ch21._id,
    title: "Endocrine Glands and Hormone Action",
    explanation_text:
      "The endocrine system consists of ductless glands that secrete hormones directly into the blood; hormones act as chemical messengers, binding to specific target-cell receptors to bring about physiological effects.",
  });
  const c21b = await Concept.create({
    chapter_id: ch21._id,
    title: "Pituitary, Thyroid, and Adrenal Glands",
    explanation_text:
      "The pituitary gland (the 'master gland') regulates other endocrine glands via tropic hormones; the thyroid gland regulates metabolic rate via thyroxine; the adrenal glands secrete hormones like adrenaline and cortisol for stress response and metabolism.",
  });
  const c21c = await Concept.create({
    chapter_id: ch21._id,
    title: "Pancreas, Gonads, and Hormonal Disorders",
    explanation_text:
      "The pancreas regulates blood glucose via insulin and glucagon; the gonads (testes and ovaries) secrete sex hormones responsible for reproductive functions; disorders like diabetes mellitus and goitre arise from hormonal imbalance.",
  });

  await Question.insertMany([
    {
      concept_id: c21a._id,
      question_text: "Endocrine glands are also known as ductless glands because they:",
      options: [
        { id: "a", text: "Secrete hormones directly into the bloodstream, without ducts" },
        { id: "b", text: "Have no cells at all" },
        { id: "c", text: "Secrete only into the digestive tract" },
        { id: "d", text: "Never release any secretions" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Endocrine glands lack ducts and secrete their hormones directly into the bloodstream, which then carries them to target organs throughout the body.",
      difficulty: "easy",
    },
    {
      concept_id: c21a._id,
      question_text: "Hormones act on target cells mainly by binding to:",
      options: [
        { id: "a", text: "Specific receptor proteins on or within the target cell" },
        { id: "b", text: "Any random protein in the body" },
        { id: "c", text: "Only DNA in the nucleus of all cells" },
        { id: "d", text: "Water molecules in blood" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Hormones exert their effects by binding to specific receptor proteins, located either on the cell surface or inside the target cell, triggering a specific physiological response.",
      difficulty: "easy",
    },
    {
      concept_id: c21a._id,
      question_text: "Hormones are generally effective in the body even at very:",
      options: [
        { id: "a", text: "High concentrations only" },
        { id: "b", text: "Low concentrations" },
        { id: "c", text: "Constant unchanging levels" },
        { id: "d", text: "Zero concentrations" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Hormones are potent chemical messengers that are effective in the body even at very low concentrations, unlike many other biochemical substances.",
      difficulty: "medium",
    },
    {
      concept_id: c21a._id,
      question_text: "A gland such as the pancreas, which has both hormone-secreting and enzyme-secreting portions, is called a:",
      options: [
        { id: "a", text: "Pure endocrine gland" },
        { id: "b", text: "Pure exocrine gland" },
        { id: "c", text: "Heterocrine (mixed) gland" },
        { id: "d", text: "Non-functional gland" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Glands like the pancreas that have both endocrine (hormone-secreting) and exocrine (enzyme-secreting) functions are termed heterocrine or mixed glands.",
      difficulty: "medium",
    },
    {
      concept_id: c21a._id,
      question_text: "Steroid hormones, unlike protein hormones, typically act on target cells by:",
      options: [
        { id: "a", text: "Binding cell-surface receptors only" },
        { id: "b", text: "Diffusing through the cell membrane and binding intracellular receptors" },
        { id: "c", text: "Never entering the cell" },
        { id: "d", text: "Destroying the target cell" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Being lipid-soluble, steroid hormones can diffuse through the cell membrane and bind to intracellular receptors, often directly influencing gene expression.",
      difficulty: "hard",
    },
    {
      concept_id: c21a._id,
      question_text: "Hormonal control mechanisms, such as regulation of thyroxine secretion, commonly rely on:",
      options: [
        { id: "a", text: "Negative feedback mechanisms" },
        { id: "b", text: "Complete absence of regulation" },
        { id: "c", text: "Only positive feedback in all cases" },
        { id: "d", text: "Random hormone release with no control" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Many hormonal systems, including thyroid hormone regulation, are controlled by negative feedback loops, where rising hormone levels inhibit further release, maintaining homeostasis.",
      difficulty: "hard",
    },

    {
      concept_id: c21b._id,
      question_text: 'The pituitary gland is often called the "master gland" because it:',
      options: [
        { id: "a", text: "Regulates the secretions of many other endocrine glands" },
        { id: "b", text: "Is the largest gland in the body" },
        { id: "c", text: "Produces only digestive enzymes" },
        { id: "d", text: "Has no hormonal function" },
      ],
      correct_option_id: "a",
      explanation_text:
        'The pituitary gland is called the "master gland" because it secretes tropic hormones that regulate the activity of several other endocrine glands in the body.',
      difficulty: "easy",
    },
    {
      concept_id: c21b._id,
      question_text: "The thyroid gland primarily secretes hormones that regulate:",
      options: [
        { id: "a", text: "Basal metabolic rate" },
        { id: "b", text: "Blood clotting only" },
        { id: "c", text: "Muscle contraction only" },
        { id: "d", text: "Vision" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The thyroid gland secretes thyroxine (T4) and triiodothyronine (T3), which regulate the basal metabolic rate and overall metabolism of the body.",
      difficulty: "easy",
    },
    {
      concept_id: c21b._id,
      question_text: "Adrenaline (epinephrine), secreted by the adrenal medulla, is primarily released in response to:",
      options: [
        { id: "a", text: "Stress or emergency situations" },
        { id: "b", text: "Only sleep" },
        { id: "c", text: "Only digestion of food" },
        { id: "d", text: "Only exposure to sunlight" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Adrenaline is secreted by the adrenal medulla in response to stress or emergency situations, increasing heart rate, blood pressure, and blood glucose to prepare the body for action.",
      difficulty: "medium",
    },
    {
      concept_id: c21b._id,
      question_text: "Cortisol, secreted by the adrenal cortex, primarily helps the body by:",
      options: [
        { id: "a", text: "Regulating carbohydrate metabolism and helping the body cope with stress" },
        { id: "b", text: "Controlling only reproductive functions" },
        { id: "c", text: "Regulating only calcium levels" },
        { id: "d", text: "Producing digestive enzymes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Cortisol, a glucocorticoid secreted by the adrenal cortex, helps regulate carbohydrate, protein, and fat metabolism, and helps the body respond to stress.",
      difficulty: "medium",
    },
    {
      concept_id: c21b._id,
      question_text: "Growth hormone, secreted by the anterior pituitary, primarily promotes:",
      options: [
        { id: "a", text: "Growth of the body, especially bones and muscles" },
        { id: "b", text: "Only fat storage" },
        { id: "c", text: "Only blood clotting" },
        { id: "d", text: "Only digestion" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Growth hormone (somatotropin) stimulates overall body growth, particularly of bones and muscles, and plays a key role in protein synthesis and metabolism.",
      difficulty: "hard",
    },
    {
      concept_id: c21b._id,
      question_text: "The posterior pituitary gland releases hormones, including oxytocin and ADH, which are actually synthesized in the:",
      options: [
        { id: "a", text: "Hypothalamus" },
        { id: "b", text: "Thyroid gland" },
        { id: "c", text: "Adrenal cortex" },
        { id: "d", text: "Pancreas" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Oxytocin and antidiuretic hormone (ADH) are synthesized by neurosecretory cells in the hypothalamus and transported to the posterior pituitary, from where they are released into the blood.",
      difficulty: "hard",
    },

    {
      concept_id: c21c._id,
      question_text: "Insulin, secreted by the pancreas, primarily acts to:",
      options: [
        { id: "a", text: "Increase blood glucose levels" },
        { id: "b", text: "Decrease blood glucose levels by promoting its uptake and storage" },
        { id: "c", text: "Stop digestion entirely" },
        { id: "d", text: "Regulate only calcium levels" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Insulin, secreted by the beta cells of the pancreatic islets, lowers blood glucose levels by promoting glucose uptake by cells and its storage as glycogen.",
      difficulty: "easy",
    },
    {
      concept_id: c21c._id,
      question_text: "Glucagon, secreted by the pancreas, primarily acts to:",
      options: [
        { id: "a", text: "Increase blood glucose levels by promoting glycogen breakdown" },
        { id: "b", text: "Decrease blood glucose levels" },
        { id: "c", text: "Digest proteins in the stomach" },
        { id: "d", text: "Regulate heart rate directly" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Glucagon, secreted by the alpha cells of the pancreatic islets, raises blood glucose levels by stimulating the breakdown of glycogen into glucose in the liver.",
      difficulty: "easy",
    },
    {
      concept_id: c21c._id,
      question_text: "Testosterone, the primary male sex hormone, is mainly secreted by the:",
      options: [
        { id: "a", text: "Ovaries" },
        { id: "b", text: "Testes" },
        { id: "c", text: "Adrenal medulla" },
        { id: "d", text: "Thyroid gland" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Testosterone, the primary male sex hormone responsible for the development of male secondary sexual characteristics, is mainly secreted by the Leydig cells of the testes.",
      difficulty: "medium",
    },
    {
      concept_id: c21c._id,
      question_text: "Estrogen and progesterone, key female sex hormones, are primarily secreted by the:",
      options: [
        { id: "a", text: "Ovaries" },
        { id: "b", text: "Testes" },
        { id: "c", text: "Pancreas" },
        { id: "d", text: "Thyroid gland" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Estrogen and progesterone, the primary female sex hormones responsible for regulating the menstrual cycle and female reproductive functions, are mainly secreted by the ovaries.",
      difficulty: "medium",
    },
    {
      concept_id: c21c._id,
      question_text: "Diabetes mellitus is a disorder primarily caused by:",
      options: [
        { id: "a", text: "Excess insulin secretion" },
        { id: "b", text: "Insufficient insulin production or action, leading to high blood glucose" },
        { id: "c", text: "Excess thyroxine secretion" },
        { id: "d", text: "Overproduction of testosterone" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Diabetes mellitus results from insufficient insulin production (Type 1) or the body's cells becoming resistant to insulin's action (Type 2), leading to chronically elevated blood glucose levels.",
      difficulty: "hard",
    },
    {
      concept_id: c21c._id,
      question_text: "Goitre, an enlargement of the thyroid gland, is most commonly associated with a deficiency of:",
      options: [
        { id: "a", text: "Iodine in the diet" },
        { id: "b", text: "Calcium in the diet" },
        { id: "c", text: "Vitamin C" },
        { id: "d", text: "Iron" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Goitre commonly results from dietary iodine deficiency, which impairs thyroxine synthesis and causes the thyroid gland to enlarge in an attempt to compensate.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 11 Batch 7 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
