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

  // ---------- CHAPTER 16: Breathing and Exchange of Gases ----------
  const ch16 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Human Physiology",
    title: "Breathing and Exchange of Gases",
    order_index: 16,
  });

  const c16a = await Concept.create({
    chapter_id: ch16._id,
    title: "Human Respiratory System and Mechanism of Breathing",
    explanation_text:
      "The human respiratory system consists of the nostrils, pharynx, larynx, trachea, bronchi, and lungs; breathing (pulmonary ventilation) involves inspiration and expiration driven by changes in thoracic volume caused by the diaphragm and intercostal muscles.",
  });
  const c16b = await Concept.create({
    chapter_id: ch16._id,
    title: "Exchange and Transport of Gases",
    explanation_text:
      "Oxygen and carbon dioxide diffuse across the alveolar membrane down their partial pressure gradients; oxygen is mainly transported bound to haemoglobin as oxyhaemoglobin, while CO2 is transported mostly as bicarbonate ions in the plasma.",
  });
  const c16c = await Concept.create({
    chapter_id: ch16._id,
    title: "Regulation of Respiration and Respiratory Disorders",
    explanation_text:
      "Breathing rate is primarily regulated by the respiratory rhythm centre in the medulla, which is highly sensitive to CO2 concentration in blood; disorders such as asthma, emphysema, and occupational respiratory diseases impair normal gas exchange.",
  });

  await Question.insertMany([
    {
      concept_id: c16a._id,
      question_text: "The exchange of gases in humans occurs in the:",
      options: [
        { id: "a", text: "Trachea" },
        { id: "b", text: "Alveoli" },
        { id: "c", text: "Bronchi" },
        { id: "d", text: "Larynx" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Alveoli are the tiny air sacs in the lungs where actual gas exchange between air and blood takes place.",
      difficulty: "easy",
    },
    {
      concept_id: c16a._id,
      question_text: "During inspiration (inhalation), the diaphragm:",
      options: [
        { id: "a", text: "Relaxes and moves upward" },
        { id: "b", text: "Contracts and moves downward" },
        { id: "c", text: "Remains stationary" },
        { id: "d", text: "Contracts and moves upward" },
      ],
      correct_option_id: "b",
      explanation_text:
        "During inspiration, the diaphragm contracts and flattens, moving downward, which increases the volume of the thoracic cavity and draws air into the lungs.",
      difficulty: "easy",
    },
    {
      concept_id: c16a._id,
      question_text: "The trachea is kept from collapsing because its wall contains:",
      options: [
        { id: "a", text: "Muscle fibers only" },
        { id: "b", text: "Cartilaginous rings" },
        { id: "c", text: "Bone plates" },
        { id: "d", text: "No supporting structures" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The trachea is supported by C-shaped cartilaginous rings that prevent it from collapsing and keep the airway open.",
      difficulty: "medium",
    },
    {
      concept_id: c16a._id,
      question_text: "The volume of air inspired or expired during normal, quiet breathing is called:",
      options: [
        { id: "a", text: "Vital capacity" },
        { id: "b", text: "Tidal volume" },
        { id: "c", text: "Residual volume" },
        { id: "d", text: "Inspiratory reserve volume" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Tidal volume is the volume of air breathed in or out during a single normal breath, roughly 500 mL in a healthy adult.",
      difficulty: "medium",
    },
    {
      concept_id: c16a._id,
      question_text: "Vital capacity is defined as:",
      options: [
        { id: "a", text: "Total lung volume including residual air" },
        { id: "b", text: "The maximum volume of air that can be exhaled after maximum inspiration" },
        { id: "c", text: "Only the tidal volume" },
        { id: "d", text: "The volume of dead space air" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Vital capacity is the maximum volume of air that can be forcibly exhaled after taking the deepest possible breath, and is the sum of tidal volume, inspiratory reserve volume, and expiratory reserve volume.",
      difficulty: "hard",
    },
    {
      concept_id: c16a._id,
      question_text:
        "During expiration, the intercostal muscles and diaphragm relax, causing the thoracic volume to:",
      options: [
        { id: "a", text: "Increase, pushing air in" },
        { id: "b", text: "Decrease, pushing air out" },
        { id: "c", text: "Remain unchanged" },
        { id: "d", text: "Increase, pulling air out" },
      ],
      correct_option_id: "b",
      explanation_text:
        "On expiration, relaxation of the diaphragm and intercostal muscles decreases the thoracic volume, raising pulmonary pressure and pushing air out of the lungs.",
      difficulty: "hard",
    },

    {
      concept_id: c16b._id,
      question_text: "The exchange of O2 and CO2 across the alveolar membrane occurs by:",
      options: [
        { id: "a", text: "Active transport" },
        { id: "b", text: "Simple diffusion" },
        { id: "c", text: "Osmosis" },
        { id: "d", text: "Facilitated transport only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Gas exchange between alveolar air and blood occurs by simple diffusion, driven by differences in partial pressures of O2 and CO2.",
      difficulty: "easy",
    },
    {
      concept_id: c16b._id,
      question_text: "Most oxygen in the blood is transported:",
      options: [
        { id: "a", text: "Dissolved in plasma" },
        { id: "b", text: "Bound to haemoglobin as oxyhaemoglobin" },
        { id: "c", text: "As bicarbonate ions" },
        { id: "d", text: "Bound to carbonic anhydrase" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Around 97% of oxygen is transported in the blood bound to haemoglobin in red blood cells, forming oxyhaemoglobin.",
      difficulty: "easy",
    },
    {
      concept_id: c16b._id,
      question_text: "The majority of carbon dioxide is transported in the blood in the form of:",
      options: [
        { id: "a", text: "Dissolved CO2 in plasma" },
        { id: "b", text: "Carbaminohaemoglobin" },
        { id: "c", text: "Bicarbonate ions (HCO3-)" },
        { id: "d", text: "Carbonic acid crystals" },
      ],
      correct_option_id: "c",
      explanation_text:
        "About 70% of CO2 is transported in the blood as bicarbonate ions, formed with the help of the enzyme carbonic anhydrase present in red blood cells.",
      difficulty: "medium",
    },
    {
      concept_id: c16b._id,
      question_text:
        "The enzyme that catalyzes the conversion of CO2 and water into carbonic acid within red blood cells is:",
      options: [
        { id: "a", text: "Amylase" },
        { id: "b", text: "Carbonic anhydrase" },
        { id: "c", text: "Catalase" },
        { id: "d", text: "Peroxidase" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Carbonic anhydrase, present abundantly in red blood cells, rapidly catalyzes the reversible reaction between CO2 and water to form carbonic acid, which dissociates into bicarbonate and hydrogen ions.",
      difficulty: "medium",
    },
    {
      concept_id: c16b._id,
      question_text: "Oxygen dissociation from haemoglobin is favored by conditions of:",
      options: [
        { id: "a", text: "High pO2, low pCO2" },
        { id: "b", text: "Low pO2, high pCO2, low pH" },
        { id: "c", text: "High pH, low temperature" },
        { id: "d", text: "Low CO2, high pH" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Lower oxygen partial pressure, higher CO2 partial pressure, and lower pH (as in actively respiring tissues) favor the dissociation of oxygen from haemoglobin, releasing O2 to tissues.",
      difficulty: "hard",
    },
    {
      concept_id: c16b._id,
      question_text: "The oxygen-haemoglobin dissociation curve is sigmoid (S-shaped) mainly because:",
      options: [
        { id: "a", text: "Haemoglobin binds oxygen with a constant affinity throughout" },
        {
          id: "b",
          text: "The binding of one oxygen molecule increases haemoglobin's affinity for subsequent oxygen molecules",
        },
        { id: "c", text: "Oxygen never binds cooperatively" },
        { id: "d", text: "It only reflects plasma-dissolved oxygen" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The sigmoid shape arises from the cooperative binding of oxygen to haemoglobin's four subunits — binding of one O2 molecule increases the affinity of the remaining subunits for oxygen.",
      difficulty: "hard",
    },

    {
      concept_id: c16c._id,
      question_text: "The primary center that regulates the rhythm of breathing in humans is located in the:",
      options: [
        { id: "a", text: "Cerebrum" },
        { id: "b", text: "Medulla oblongata" },
        { id: "c", text: "Cerebellum" },
        { id: "d", text: "Spinal cord only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The respiratory rhythm centre, located in the medulla oblongata, is primarily responsible for generating and regulating the basic rhythm of breathing.",
      difficulty: "easy",
    },
    {
      concept_id: c16c._id,
      question_text: "The respiratory center is most sensitive to changes in the concentration of:",
      options: [
        { id: "a", text: "Oxygen" },
        { id: "b", text: "Carbon dioxide" },
        { id: "c", text: "Nitrogen" },
        { id: "d", text: "Water vapor" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The respiratory centre is highly sensitive to CO2 concentration and hydrogen ion (pH) levels in the blood, which is the primary stimulus for regulating breathing rate.",
      difficulty: "easy",
    },
    {
      concept_id: c16c._id,
      question_text: "Asthma is a respiratory disorder characterized by:",
      options: [
        { id: "a", text: "Permanent destruction of alveolar walls" },
        {
          id: "b",
          text: "Difficulty in breathing due to inflammation and narrowing of bronchi and bronchioles",
        },
        { id: "c", text: "Excess oxygen in the blood" },
        { id: "d", text: "Complete collapse of the trachea" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Asthma causes difficulty in breathing due to inflammation of bronchi and bronchioles, leading to wheezing and constriction of the airways.",
      difficulty: "medium",
    },
    {
      concept_id: c16c._id,
      question_text: "Emphysema is a chronic respiratory disorder in which:",
      options: [
        { id: "a", text: "Alveolar walls are damaged, reducing surface area for gas exchange" },
        { id: "b", text: "The trachea becomes cartilaginous" },
        { id: "c", text: "Blood oxygen levels rise abnormally" },
        { id: "d", text: "Breathing rate slows to zero" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Emphysema, often caused by cigarette smoking, involves damage to alveolar walls, decreasing the surface area available for gas exchange and causing breathlessness.",
      difficulty: "medium",
    },
    {
      concept_id: c16c._id,
      question_text:
        "Occupational respiratory disorders, such as those seen in workers exposed to excessive dust, are commonly grouped under:",
      options: [
        { id: "a", text: "Asthma only" },
        { id: "b", text: "Pneumoconiosis" },
        { id: "c", text: "Emphysema only" },
        { id: "d", text: "Bronchitis only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Pneumoconiosis refers to a group of occupational lung disorders caused by long-term inhalation of dust particles (e.g., silica, asbestos), leading to fibrosis of lung tissue.",
      difficulty: "hard",
    },
    {
      concept_id: c16c._id,
      question_text:
        "A rise in blood CO2 concentration triggers an increase in breathing rate primarily through its effect on:",
      options: [
        {
          id: "a",
          text: "Chemoreceptors sensitive to CO2/H+ levels, which stimulate the medullary respiratory centre",
        },
        { id: "b", text: "Direct action on alveoli only" },
        { id: "c", text: "The heart's pacemaker" },
        { id: "d", text: "Skeletal muscles directly, bypassing the brain" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A rise in CO2 (and consequent fall in pH) is detected by chemosensitive areas near the respiratory centre and by peripheral chemoreceptors, which signal the medulla to increase the rate and depth of breathing.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 16 (Breathing and Exchange of Gases) done");

  // ---------- CHAPTER 17: Body Fluids and Circulation ----------
  const ch17 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Human Physiology",
    title: "Body Fluids and Circulation",
    order_index: 17,
  });

  const c17a = await Concept.create({
    chapter_id: ch17._id,
    title: "Blood Composition and Blood Groups",
    explanation_text:
      "Blood is a fluid connective tissue composed of plasma and formed elements (RBCs, WBCs, platelets); the ABO and Rh blood group systems are based on antigens present on the surface of red blood cells.",
  });
  const c17b = await Concept.create({
    chapter_id: ch17._id,
    title: "Human Heart and Cardiac Cycle",
    explanation_text:
      "The human heart is a four-chambered muscular organ that pumps blood through a double circulatory system; the cardiac cycle consists of coordinated events of atrial and ventricular systole and diastole, regulated by the sinoatrial node.",
  });
  const c17c = await Concept.create({
    chapter_id: ch17._id,
    title: "Lymph and Circulatory Disorders",
    explanation_text:
      "Lymph is a colorless fluid derived from blood plasma that circulates through lymphatic vessels, aiding in fat absorption and immune defense; circulatory disorders such as hypertension, coronary artery disease, and atherosclerosis affect the heart and blood vessels.",
  });

  await Question.insertMany([
    {
      concept_id: c17a._id,
      question_text: "Blood is classified as a type of:",
      options: [
        { id: "a", text: "Epithelial tissue" },
        { id: "b", text: "Fluid connective tissue" },
        { id: "c", text: "Muscular tissue" },
        { id: "d", text: "Nervous tissue" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Blood is a specialized fluid connective tissue, consisting of a fluid matrix called plasma along with formed elements such as RBCs, WBCs, and platelets.",
      difficulty: "easy",
    },
    {
      concept_id: c17a._id,
      question_text: "The most abundant formed elements in human blood are:",
      options: [
        { id: "a", text: "White blood cells" },
        { id: "b", text: "Platelets" },
        { id: "c", text: "Red blood cells (erythrocytes)" },
        { id: "d", text: "Plasma proteins" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Red blood cells (erythrocytes) are the most numerous formed elements in blood, primarily responsible for transporting oxygen via haemoglobin.",
      difficulty: "easy",
    },
    {
      concept_id: c17a._id,
      question_text: "In the ABO blood group system, a person with blood group AB has:",
      options: [
        { id: "a", text: "Neither A nor B antigens" },
        { id: "b", text: "Both A and B antigens on RBCs" },
        { id: "c", text: "Only Rh antigen" },
        { id: "d", text: "Only antibodies against A and B" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A person with blood group AB has both A and B antigens present on the surface of their red blood cells, and lacks antibodies against either antigen in plasma.",
      difficulty: "medium",
    },
    {
      concept_id: c17a._id,
      question_text: 'A person with blood group O is often called a "universal donor" because their RBCs:',
      options: [
        { id: "a", text: "Lack both A and B antigens" },
        { id: "b", text: "Have both A and B antigens" },
        { id: "c", text: "Have only Rh antigen" },
        { id: "d", text: "Have antibodies against all antigens" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Blood group O red blood cells lack both A and B antigens, so they generally do not trigger an immune response when transfused into recipients of other ABO groups.",
      difficulty: "medium",
    },
    {
      concept_id: c17a._id,
      question_text:
        "Erythroblastosis foetalis, a condition affecting a foetus, is primarily related to incompatibility of:",
      options: [
        { id: "a", text: "ABO blood groups only" },
        { id: "b", text: "Rh factor between an Rh-negative mother and Rh-positive foetus" },
        { id: "c", text: "White blood cell counts" },
        { id: "d", text: "Platelet counts" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Erythroblastosis foetalis occurs when an Rh-negative mother, sensitized to Rh antigen, develops antibodies that cross the placenta and destroy the RBCs of an Rh-positive foetus in a subsequent pregnancy.",
      difficulty: "hard",
    },
    {
      concept_id: c17a._id,
      question_text: "Plasma, the fluid matrix of blood, primarily consists of:",
      options: [
        { id: "a", text: "Water along with dissolved proteins, salts, and other substances" },
        { id: "b", text: "Pure water only" },
        { id: "c", text: "Only red blood cells" },
        { id: "d", text: "Only clotting factors" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Plasma is about 90-92% water, with the remainder consisting of dissolved proteins (like albumin, globulins, fibrinogen), salts, nutrients, hormones, and waste products.",
      difficulty: "hard",
    },

    {
      concept_id: c17b._id,
      question_text: "The human heart has how many chambers?",
      options: [
        { id: "a", text: "Two" },
        { id: "b", text: "Three" },
        { id: "c", text: "Four" },
        { id: "d", text: "Six" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The human heart has four chambers — two atria (upper) and two ventricles (lower) — enabling separation of oxygenated and deoxygenated blood.",
      difficulty: "easy",
    },
    {
      concept_id: c17b._id,
      question_text: "The natural pacemaker of the human heart is the:",
      options: [
        { id: "a", text: "Atrioventricular node" },
        { id: "b", text: "Sinoatrial node" },
        { id: "c", text: "Purkinje fibers" },
        { id: "d", text: "Bundle of His" },
      ],
      correct_option_id: "b",
      explanation_text:
        'The sinoatrial (SA) node, located in the wall of the right atrium, generates the electrical impulses that initiate each heartbeat, earning it the name "natural pacemaker."',
      difficulty: "easy",
    },
    {
      concept_id: c17b._id,
      question_text: "Oxygenated blood from the lungs enters the heart through the:",
      options: [
        { id: "a", text: "Superior vena cava" },
        { id: "b", text: "Pulmonary vein" },
        { id: "c", text: "Pulmonary artery" },
        { id: "d", text: "Inferior vena cava" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The pulmonary veins carry oxygenated blood from the lungs back to the left atrium of the heart, which is then pumped to the rest of the body.",
      difficulty: "medium",
    },
    {
      concept_id: c17b._id,
      question_text: "During ventricular systole, the ventricles contract and:",
      options: [
        { id: "a", text: "Pump blood into the atria" },
        { id: "b", text: "Pump blood out into the pulmonary artery and aorta" },
        { id: "c", text: "Relax completely" },
        { id: "d", text: "Fill passively with blood" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ventricular systole is the contraction phase where the ventricles pump blood out — the right ventricle into the pulmonary artery and the left ventricle into the aorta.",
      difficulty: "medium",
    },
    {
      concept_id: c17b._id,
      question_text: "The lub-dub sounds heard during a heartbeat correspond to the closing of the:",
      options: [
        { id: "a", text: "Atrioventricular and semilunar valves respectively" },
        { id: "b", text: "Only the semilunar valves" },
        { id: "c", text: "Only the SA node firing" },
        { id: "d", text: "Only the atrioventricular valves opening" },
      ],
      correct_option_id: "a",
      explanation_text:
        'The first heart sound ("lub") is produced by the closing of the atrioventricular valves, and the second sound ("dub") by the closing of the semilunar valves.',
      difficulty: "hard",
    },
    {
      concept_id: c17b._id,
      question_text:
        "A cardiac cycle, including all events of one complete heartbeat, takes approximately how long at a normal resting heart rate?",
      options: [
        { id: "a", text: "0.1 second" },
        { id: "b", text: "0.8 second" },
        { id: "c", text: "3 seconds" },
        { id: "d", text: "10 seconds" },
      ],
      correct_option_id: "b",
      explanation_text:
        "At a normal resting heart rate of about 72 beats per minute, one complete cardiac cycle takes approximately 0.8 seconds.",
      difficulty: "hard",
    },

    {
      concept_id: c17c._id,
      question_text: "Lymph is primarily formed from:",
      options: [
        { id: "a", text: "Fluid that leaks out of blood capillaries into intercellular spaces" },
        { id: "b", text: "Digested food only" },
        { id: "c", text: "Bile from the liver" },
        { id: "d", text: "Urine filtrate" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Lymph is formed when plasma fluid leaks out of blood capillaries into the surrounding tissue spaces and is then collected by the lymphatic vessels.",
      difficulty: "easy",
    },
    {
      concept_id: c17c._id,
      question_text: "A key function of the lymphatic system, besides fluid balance, is:",
      options: [
        { id: "a", text: "Producing red blood cells only" },
        { id: "b", text: "Aiding in immune defense by transporting lymphocytes" },
        { id: "c", text: "Regulating heart rate" },
        { id: "d", text: "Producing bile" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The lymphatic system plays a key role in immune defense, transporting lymphocytes and other immune cells that help fight infection.",
      difficulty: "easy",
    },
    {
      concept_id: c17c._id,
      question_text: "Hypertension refers to a condition of:",
      options: [
        { id: "a", text: "Abnormally low blood pressure" },
        { id: "b", text: "Persistently elevated blood pressure" },
        { id: "c", text: "Irregular heartbeat only" },
        { id: "d", text: "Reduced RBC count" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Hypertension is a chronic medical condition characterized by persistently elevated blood pressure in the arteries, increasing the risk of heart disease and stroke.",
      difficulty: "medium",
    },
    {
      concept_id: c17c._id,
      question_text: "Atherosclerosis is the condition in which:",
      options: [
        { id: "a", text: "Arteries harden and narrow due to fatty deposits (plaques) on their walls" },
        { id: "b", text: "Veins become abnormally wide" },
        { id: "c", text: "Red blood cells decrease in number" },
        { id: "d", text: "The heart rate becomes abnormally slow" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Atherosclerosis involves the deposition of fatty plaques (containing cholesterol) on the inner walls of arteries, causing them to harden and narrow, restricting blood flow.",
      difficulty: "medium",
    },
    {
      concept_id: c17c._id,
      question_text:
        "Coronary artery disease primarily affects the blood vessels that supply blood to the:",
      options: [
        { id: "a", text: "Brain" },
        { id: "b", text: "Kidneys" },
        { id: "c", text: "Heart muscle itself" },
        { id: "d", text: "Lungs" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Coronary artery disease involves narrowing or blockage of the coronary arteries, which supply oxygenated blood to the heart muscle itself, potentially leading to a heart attack.",
      difficulty: "hard",
    },
    {
      concept_id: c17c._id,
      question_text: "A heart attack (myocardial infarction) occurs when:",
      options: [
        {
          id: "a",
          text: "Blood supply to a part of the heart muscle is severely reduced or blocked, causing tissue damage",
        },
        { id: "b", text: "The heart beats too slowly for a short time" },
        { id: "c", text: "Lymph nodes become swollen" },
        { id: "d", text: "Blood pressure drops briefly during exercise" },
      ],
      correct_option_id: "a",
      explanation_text:
        "A myocardial infarction, or heart attack, occurs when blood flow to a part of the heart muscle is blocked, usually by a clot, depriving that tissue of oxygen and causing damage or death of heart muscle cells.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 17 (Body Fluids and Circulation) done");

  // ---------- CHAPTER 18: Excretory Products and their Elimination ----------
  const ch18 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Human Physiology",
    title: "Excretory Products and their Elimination",
    order_index: 18,
  });

  const c18a = await Concept.create({
    chapter_id: ch18._id,
    title: "Human Excretory System and Nephron Structure",
    explanation_text:
      "The human excretory system consists of a pair of kidneys, ureters, urinary bladder, and urethra; each kidney contains millions of structural and functional units called nephrons, responsible for filtering blood and forming urine.",
  });
  const c18b = await Concept.create({
    chapter_id: ch18._id,
    title: "Urine Formation",
    explanation_text:
      "Urine formation occurs through three sequential processes — glomerular filtration, tubular reabsorption, and tubular secretion — which together determine the final composition and volume of urine excreted.",
  });
  const c18c = await Concept.create({
    chapter_id: ch18._id,
    title: "Regulation of Kidney Function and Excretory Disorders",
    explanation_text:
      "Kidney function is regulated by hormones such as ADH, aldosterone, and the renin-angiotensin system to maintain water and electrolyte balance; disorders of the excretory system include uraemia, renal failure, and kidney stones, sometimes managed through dialysis.",
  });

  await Question.insertMany([
    {
      concept_id: c18a._id,
      question_text: "The structural and functional unit of the kidney is the:",
      options: [
        { id: "a", text: "Nephron" },
        { id: "b", text: "Neuron" },
        { id: "c", text: "Alveolus" },
        { id: "d", text: "Ureter" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The nephron is the structural and functional unit of the kidney, responsible for filtering blood and forming urine.",
      difficulty: "easy",
    },
    {
      concept_id: c18a._id,
      question_text: "Urine formed in the kidneys is carried to the urinary bladder through the:",
      options: [
        { id: "a", text: "Urethra" },
        { id: "b", text: "Ureter" },
        { id: "c", text: "Renal artery" },
        { id: "d", text: "Renal vein" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Ureters are muscular tubes that carry urine from each kidney down to the urinary bladder for temporary storage.",
      difficulty: "easy",
    },
    {
      concept_id: c18a._id,
      question_text: "The initial filtration of blood in the nephron occurs at the:",
      options: [
        { id: "a", text: "Loop of Henle" },
        { id: "b", text: "Glomerulus" },
        { id: "c", text: "Collecting duct" },
        { id: "d", text: "Distal convoluted tubule" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The glomerulus, a network of capillaries within the Bowman's capsule, is the site of initial filtration of blood plasma to form the glomerular filtrate.",
      difficulty: "medium",
    },
    {
      concept_id: c18a._id,
      question_text:
        "The cup-shaped structure that surrounds the glomerulus and collects the filtrate is called the:",
      options: [
        { id: "a", text: "Loop of Henle" },
        { id: "b", text: "Bowman's capsule" },
        { id: "c", text: "Proximal convoluted tubule" },
        { id: "d", text: "Collecting duct" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bowman's capsule is the cup-shaped structure that surrounds the glomerulus and collects the filtrate produced during glomerular filtration.",
      difficulty: "medium",
    },
    {
      concept_id: c18a._id,
      question_text:
        "The part of the nephron primarily responsible for creating the concentration gradient in the medulla, essential for concentrating urine, is the:",
      options: [
        { id: "a", text: "Proximal convoluted tubule" },
        { id: "b", text: "Loop of Henle" },
        { id: "c", text: "Bowman's capsule" },
        { id: "d", text: "Afferent arteriole" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Loop of Henle, through a countercurrent mechanism, helps establish the osmotic concentration gradient in the kidney medulla, which is crucial for producing concentrated urine.",
      difficulty: "hard",
    },
    {
      concept_id: c18a._id,
      question_text:
        "Nephrons with long loops of Henle that extend deep into the medulla are called:",
      options: [
        { id: "a", text: "Cortical nephrons" },
        { id: "b", text: "Juxtamedullary nephrons" },
        { id: "c", text: "Superficial nephrons" },
        { id: "d", text: "Collecting nephrons" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Juxtamedullary nephrons have long loops of Henle that extend deep into the renal medulla, playing a major role in concentrating urine, unlike cortical nephrons with shorter loops.",
      difficulty: "hard",
    },

    {
      concept_id: c18b._id,
      question_text: "The three sequential steps involved in urine formation are:",
      options: [
        { id: "a", text: "Filtration, reabsorption, secretion" },
        { id: "b", text: "Digestion, absorption, egestion" },
        { id: "c", text: "Inspiration, exchange, expiration" },
        { id: "d", text: "Diffusion, osmosis, active transport only" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Urine formation involves glomerular filtration, followed by selective tubular reabsorption of useful substances, and tubular secretion of additional waste substances into the filtrate.",
      difficulty: "easy",
    },
    {
      concept_id: c18b._id,
      question_text: "Glomerular filtration rate (GFR) in a healthy adult human is approximately:",
      options: [
        { id: "a", text: "1 mL/minute" },
        { id: "b", text: "125 mL/minute" },
        { id: "c", text: "1000 mL/minute" },
        { id: "d", text: "10 mL/minute" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The glomerular filtration rate, the amount of filtrate formed by the kidneys per minute, is approximately 125 mL/minute in a healthy adult.",
      difficulty: "easy",
    },
    {
      concept_id: c18b._id,
      question_text:
        "Most of the useful substances like glucose and amino acids are reabsorbed from the filtrate mainly in the:",
      options: [
        { id: "a", text: "Distal convoluted tubule" },
        { id: "b", text: "Proximal convoluted tubule" },
        { id: "c", text: "Collecting duct" },
        { id: "d", text: "Loop of Henle only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The proximal convoluted tubule reabsorbs the majority of essential substances such as glucose, amino acids, and a large proportion of water and ions from the glomerular filtrate.",
      difficulty: "medium",
    },
    {
      concept_id: c18b._id,
      question_text: "Tubular secretion in the nephron primarily helps to:",
      options: [
        { id: "a", text: "Add additional waste substances like H+ and K+ ions into the filtrate" },
        { id: "b", text: "Reabsorb water only" },
        { id: "c", text: "Filter blood cells" },
        { id: "d", text: "Store urine" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Tubular secretion involves the active transport of substances like hydrogen ions, potassium ions, and certain drugs from blood into the filtrate, helping maintain ion and pH balance.",
      difficulty: "medium",
    },
    {
      concept_id: c18b._id,
      question_text:
        "The counter-current mechanism in the nephron and vasa recta is primarily important for:",
      options: [
        { id: "a", text: "Filtering red blood cells" },
        { id: "b", text: "Concentrating urine by maintaining an osmotic gradient in the medulla" },
        { id: "c", text: "Preventing filtration entirely" },
        { id: "d", text: "Increasing GFR only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The countercurrent mechanism, involving the Loop of Henle and vasa recta, maintains an increasing osmotic gradient in the medulla, allowing the kidney to produce concentrated urine.",
      difficulty: "hard",
    },
    {
      concept_id: c18b._id,
      question_text:
        "Nearly what percentage of the glomerular filtrate is normally reabsorbed by the renal tubules, with only a small fraction excreted as urine?",
      options: [
        { id: "a", text: "About 1%" },
        { id: "b", text: "About 25%" },
        { id: "c", text: "About 99%" },
        { id: "d", text: "About 50%" },
      ],
      correct_option_id: "c",
      explanation_text:
        "About 99% of the glomerular filtrate is reabsorbed by the renal tubules and collecting duct, with only about 1% forming the final urine that is excreted.",
      difficulty: "hard",
    },

    {
      concept_id: c18c._id,
      question_text: "Antidiuretic hormone (ADH) primarily acts on the kidney to:",
      options: [
        { id: "a", text: "Increase water reabsorption, reducing urine volume" },
        { id: "b", text: "Decrease water reabsorption, increasing urine volume" },
        { id: "c", text: "Stop urine formation entirely" },
        { id: "d", text: "Increase glucose excretion" },
      ],
      correct_option_id: "a",
      explanation_text:
        "ADH (vasopressin) increases the permeability of the distal convoluted tubule and collecting duct to water, promoting water reabsorption and reducing urine volume.",
      difficulty: "easy",
    },
    {
      concept_id: c18c._id,
      question_text: "Aldosterone, a hormone involved in kidney regulation, primarily promotes:",
      options: [
        { id: "a", text: "Sodium reabsorption and potassium excretion" },
        { id: "b", text: "Glucose reabsorption only" },
        { id: "c", text: "Complete water loss" },
        { id: "d", text: "Protein excretion" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Aldosterone acts on the kidney tubules to promote reabsorption of sodium ions and water, along with excretion of potassium ions, helping regulate blood pressure and electrolyte balance.",
      difficulty: "easy",
    },
    {
      concept_id: c18c._id,
      question_text: "The renin-angiotensin system is activated in response to:",
      options: [
        { id: "a", text: "High blood pressure only" },
        { id: "b", text: "A fall in glomerular blood flow/blood pressure" },
        { id: "c", text: "Excess water intake" },
        { id: "d", text: "High glucose levels" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A fall in glomerular blood flow or blood pressure stimulates the release of renin from the juxtaglomerular apparatus, activating the renin-angiotensin system to help restore blood pressure and GFR.",
      difficulty: "medium",
    },
    {
      concept_id: c18c._id,
      question_text: "Uraemia refers to a condition of:",
      options: [
        { id: "a", text: "Excess glucose in urine" },
        { id: "b", text: "Accumulation of urea and other nitrogenous wastes in the blood" },
        { id: "c", text: "Excess protein in urine" },
        { id: "d", text: "Low blood pressure only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Uraemia is a serious condition resulting from kidney failure, characterized by an abnormal accumulation of urea and other nitrogenous waste products in the blood.",
      difficulty: "medium",
    },
    {
      concept_id: c18c._id,
      question_text:
        "In haemodialysis, used to treat renal failure, blood is passed through a machine to:",
      options: [
        { id: "a", text: "Add more red blood cells" },
        {
          id: "b",
          text: "Remove nitrogenous wastes using a dialysing fluid across a selectively permeable membrane",
        },
        { id: "c", text: "Increase blood pressure directly" },
        { id: "d", text: "Replace all blood plasma" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Haemodialysis removes nitrogenous wastes and excess substances from the blood by passing it through a dialysing fluid across a selectively permeable membrane, mimicking kidney function.",
      difficulty: "hard",
    },
    {
      concept_id: c18c._id,
      question_text: "Kidney stones (renal calculi) are commonly formed due to the crystallization of:",
      options: [
        { id: "a", text: "Glucose in the renal pelvis" },
        { id: "b", text: "Substances like calcium oxalate in the urinary tract" },
        { id: "c", text: "Only red blood cells" },
        { id: "d", text: "Only proteins" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Kidney stones typically form due to the crystallization and accumulation of substances such as calcium oxalate, uric acid, or struvite within the kidney or urinary tract.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 11 Batch 6 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
