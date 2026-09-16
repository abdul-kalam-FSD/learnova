require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Diagnosis coverage for "Reproductive Health". Content follows the
// NCERT chapter: the RCH programme's aims, STI prevention as public
// health, and what ART actually addresses. Scenarios stay clinical and
// factual, matching the level the textbook itself pitches.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 12 Biology subject not found — run seedGrade12_batch1.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Reproductive Health" });
  if (!chapter) {
    console.error("Chapter 'Reproductive Health' not found — run seedGrade12_batch1.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptTitles = [
    "Reproductive Health and Contraceptive Methods",
    "Medical Termination of Pregnancy, STDs, and Infertility",
    "Assisted Reproductive Technologies (ART)",
  ];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade12_batch1.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const allChallenges = [
    {
      concept: concepts["Reproductive Health and Contraceptive Methods"],
      levels: [
        {
          title: "Evaluating a Public Health Programme",
          difficulty: "medium",
          order_index: 1,
          payload: {
            scenario:
              "A district reviews its Reproductive and Child Health Care programme. Select only the outcomes that show the programme is meeting its stated public health aims.",
            evidence: [
              { id: "ev1", label: "Maternal and infant mortality rates have fallen", detail: "Better antenatal care and assisted delivery reduce deaths during pregnancy and infancy." },
              { id: "ev2", label: "More people have accurate information about reproductive health", detail: "Awareness programmes and school education reduce myths and misinformation." },
              { id: "ev3", label: "Early detection and treatment of reproductive tract infections has increased", detail: "Screening and treatment services prevent complications and further transmission." },
              { id: "ev4", label: "The district's average rainfall increased this year", detail: "An environmental statistic with no connection to reproductive health services." },
              { id: "ev5", label: "Sex determination tests before birth have increased", detail: "Prenatal sex determination is illegal in India and works directly against the programme's aims." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3"],
            diagnosis: "RCH programme meeting its aims",
            explanation:
              "The RCH programme aims at lower maternal and infant mortality, better awareness and education, and detection and treatment of reproductive tract infections. Rainfall is unrelated, and an increase in prenatal sex determination indicates a legal and ethical failure rather than a success.",
            hint: "Three options describe the programme's actual goals; one is unrelated data and one describes something the law prohibits.",
          },
        },
      ],
    },
    {
      concept: concepts["Medical Termination of Pregnancy, STDs, and Infertility"],
      levels: [
        {
          title: "Preventing Transmission",
          difficulty: "medium",
          order_index: 1,
          payload: {
            scenario:
              "A health worker prepares a talk on preventing sexually transmitted infections. Select only the measures that genuinely reduce transmission risk.",
            evidence: [
              { id: "ev1", label: "Using sterile needles and syringes every time", detail: "Infections such as hepatitis B and HIV can spread through contaminated needles." },
              { id: "ev2", label: "Screening blood thoroughly before transfusion", detail: "Transfusion of unscreened blood can transmit HIV and hepatitis B." },
              { id: "ev3", label: "Seeking early diagnosis and completing full treatment", detail: "Early treatment cures many STIs and stops onward transmission to others." },
              { id: "ev4", label: "Avoiding sharing a classroom with an infected person", detail: "STIs do not spread through ordinary social contact; this reflects stigma, not science." },
              { id: "ev5", label: "Taking vitamin supplements daily", detail: "General nutrition does not prevent transmission of a sexually transmitted infection." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3"],
            diagnosis: "Effective STI prevention measures",
            explanation:
              "Transmission is reduced by avoiding contaminated needles, screening donated blood, and getting early diagnosis with complete treatment. STIs do not spread through casual social contact, so avoiding an infected person's company is stigmatising and medically baseless, and vitamins have no preventive effect.",
            hint: "Keep the measures that break a real route of transmission, and discard the two that reflect myth rather than mechanism.",
          },
        },
        {
          title: "Investigating Infertility",
          difficulty: "hard",
          order_index: 2,
          payload: {
            scenario:
              "A couple has been unable to conceive after two years. A clinician explains that infertility has many possible causes. Select only the statements that are medically accurate.",
            evidence: [
              { id: "ev1", label: "The cause may lie with either partner", detail: "Infertility can arise from male factors, female factors, or both together." },
              { id: "ev2", label: "Causes may be physical, congenital, or due to infection", detail: "Blocked tubes, hormonal disorders, congenital conditions, and past infections can all contribute." },
              { id: "ev3", label: "Proper diagnosis requires specialised medical testing", detail: "Only clinical investigation can identify which factor is responsible." },
              { id: "ev4", label: "Infertility is always the woman's responsibility", detail: "A common social misconception; male factors account for a large share of cases." },
              { id: "ev5", label: "Infertility can be cured by changing diet alone", detail: "Nutrition matters for general health but is not a treatment for most causes of infertility." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3"],
            diagnosis: "Accurate understanding of infertility",
            explanation:
              "Infertility may originate with either partner and has physical, congenital, hormonal, immunological, or infection-related causes, which is why proper clinical diagnosis is essential. Blaming the woman is a social misconception the NCERT chapter explicitly addresses, and diet alone does not treat infertility.",
            hint: "Two of these are social beliefs rather than medical facts — keep only what a clinician could demonstrate.",
          },
        },
      ],
    },
    {
      concept: concepts["Assisted Reproductive Technologies (ART)"],
      levels: [
        {
          title: "Choosing the Right Technique",
          difficulty: "hard",
          order_index: 1,
          payload: {
            scenario:
              "A clinic explains assisted reproductive technologies to trainee health workers. Select only the statements that correctly describe what these techniques do.",
            evidence: [
              { id: "ev1", label: "IVF involves fertilisation outside the body, followed by transfer of the embryo", detail: "Ova and sperm are combined in the laboratory and the resulting embryo is transferred to the uterus." },
              { id: "ev2", label: "ZIFT transfers a zygote or early embryo into the fallopian tube", detail: "The early-stage embryo is placed in the tube rather than directly into the uterus." },
              { id: "ev3", label: "GIFT transfers an ovum into the fallopian tube of a recipient", detail: "Used where a woman cannot produce an ovum but can provide a suitable environment for fertilisation." },
              { id: "ev4", label: "ART guarantees a successful pregnancy in every case", detail: "No assisted technique has a hundred per cent success rate." },
              { id: "ev5", label: "ART removes the need for any medical supervision", detail: "These procedures require specialist clinical teams and careful monitoring throughout." },
            ],
            correct_piece_ids: ["ev1", "ev2", "ev3"],
            diagnosis: "Correct description of ART techniques",
            explanation:
              "IVF fertilises ova outside the body before embryo transfer, ZIFT places a zygote or early embryo into the fallopian tube, and GIFT transfers an ovum into a recipient's tube. No ART technique guarantees pregnancy, and all of them depend on close specialist supervision.",
            hint: "Three options define a specific technique; two make sweeping promises no medical procedure can make.",
          },
        },
      ],
    },
  ];

  for (const { concept, levels } of allChallenges) {
    for (const level of levels) {
      const exists = await GameContent.findOne({
        game_type: "BIO_DIAGNOSIS",
        title: level.title,
      });
      if (!exists) {
        const created = await GameContent.create({
          game_type: "BIO_DIAGNOSIS",
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
