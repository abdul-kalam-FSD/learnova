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

  let subject = await Subject.findOne({ grade: 12, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Biology", grade: 12 });
    console.log("Created new Grade 12 Biology subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  // ---------- CHAPTER 1: Sexual Reproduction in Flowering Plants ----------
  const ch1 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Reproduction",
    title: "Sexual Reproduction in Flowering Plants",
    order_index: 1,
  });

  const c1a = await Concept.create({
    chapter_id: ch1._id,
    title: "Flower Structure and Pollination",
    explanation_text:
      "The flower is the reproductive organ of angiosperms, bearing the androecium (male) and gynoecium (female) whorls; pollination is the transfer of pollen grains from anther to stigma, occurring via self-pollination or cross-pollination, aided by various pollinating agents.",
  });
  const c1b = await Concept.create({
    chapter_id: ch1._id,
    title: "Fertilization and Post-fertilization Events",
    explanation_text:
      "Following pollination, the pollen tube delivers two male gametes into the embryo sac, where double fertilization occurs — one gamete fuses with the egg to form the zygote, and the other fuses with the polar nuclei to form the triploid endosperm.",
  });
  const c1c = await Concept.create({
    chapter_id: ch1._id,
    title: "Apomixis and Polyembryony",
    explanation_text:
      "Apomixis is a form of asexual reproduction that mimics sexual reproduction, producing seeds without fertilization, while polyembryony refers to the occurrence of more than one embryo within a single seed.",
  });

  await Question.insertMany([
    {
      concept_id: c1a._id,
      question_text: "The male reproductive part of a flower is called the:",
      options: [
        { id: "a", text: "Gynoecium" },
        { id: "b", text: "Androecium" },
        { id: "c", text: "Calyx" },
        { id: "d", text: "Corolla" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The androecium, consisting of stamens, is the male reproductive whorl of a flower, producing pollen grains.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text:
        "The female reproductive part of a flower, consisting of one or more carpels, is called the:",
      options: [
        { id: "a", text: "Androecium" },
        { id: "b", text: "Gynoecium" },
        { id: "c", text: "Corolla" },
        { id: "d", text: "Calyx" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The gynoecium, made up of one or more carpels, is the female reproductive part of the flower, containing the ovary, style, and stigma.",
      difficulty: "easy",
    },
    {
      concept_id: c1a._id,
      question_text:
        "Transfer of pollen grains from the anther of one flower to the stigma of another flower on the same plant is called:",
      options: [
        { id: "a", text: "Autogamy" },
        { id: "b", text: "Geitonogamy" },
        { id: "c", text: "Xenogamy" },
        { id: "d", text: "Apomixis" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Geitonogamy is the transfer of pollen from the anther of one flower to the stigma of another flower on the same plant, genetically similar to self-pollination but requiring a pollinating agent.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "Xenogamy refers to the transfer of pollen grains between:",
      options: [
        { id: "a", text: "Two flowers of the same plant" },
        { id: "b", text: "Anther and stigma of the same flower" },
        { id: "c", text: "Two flowers on genetically different plants of the same species" },
        { id: "d", text: "Two different species" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Xenogamy is cross-pollination, involving the transfer of pollen from the anther of one plant to the stigma of a flower on a genetically different plant of the same species.",
      difficulty: "medium",
    },
    {
      concept_id: c1a._id,
      question_text: "Flowers pollinated by wind (anemophily) typically show adaptations such as:",
      options: [
        { id: "a", text: "Brightly colored petals and strong fragrance" },
        { id: "b", text: "Light, non-sticky pollen and well-exposed stamens" },
        { id: "c", text: "Nectar production only" },
        { id: "d", text: "Large, sticky pollen grains" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Wind-pollinated flowers typically produce light, non-sticky pollen in large quantities, have well-exposed stamens, and often lack showy petals or fragrance, since they don't rely on animal pollinators.",
      difficulty: "hard",
    },
    {
      concept_id: c1a._id,
      question_text: "The evolutionary significance of cross-pollination (xenogamy) is that it:",
      options: [
        { id: "a", text: "Reduces genetic variation" },
        { id: "b", text: "Promotes genetic variation by combining genetic material from different plants" },
        { id: "c", text: "Prevents fertilization entirely" },
        { id: "d", text: "Only occurs in self-incompatible plants" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Cross-pollination promotes genetic variation by combining genetic material from two different plants, offering greater adaptability and evolutionary advantage compared to self-pollination.",
      difficulty: "hard",
    },

    {
      concept_id: c1b._id,
      question_text:
        "In flowering plants, after pollination, the structure that grows down the style toward the ovule, carrying the male gametes, is the:",
      options: [
        { id: "a", text: "Style" },
        { id: "b", text: "Pollen tube" },
        { id: "c", text: "Stigma" },
        { id: "d", text: "Filament" },
      ],
      correct_option_id: "b",
      explanation_text:
        "After pollination, the pollen grain germinates on the stigma and the pollen tube grows down through the style, carrying the male gametes toward the ovule.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text: "Double fertilization in angiosperms involves the fusion of two male gametes with:",
      options: [
        { id: "a", text: "Only the egg cell" },
        { id: "b", text: "The egg cell and the two polar nuclei/secondary nucleus" },
        { id: "c", text: "Only the synergids" },
        { id: "d", text: "Only the antipodal cells" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Double fertilization involves one male gamete fusing with the egg cell to form the zygote, while the second male gamete fuses with the two polar nuclei (or secondary nucleus) to form the triploid primary endosperm nucleus.",
      difficulty: "easy",
    },
    {
      concept_id: c1b._id,
      question_text:
        "The fusion of a male gamete with the two polar nuclei, forming a typically triploid nucleus, is termed:",
      options: [
        { id: "a", text: "Syngamy" },
        { id: "b", text: "Triple fusion" },
        { id: "c", text: "Apomixis" },
        { id: "d", text: "Parthenocarpy" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Triple fusion is the fusion of one male gamete with the two polar nuclei (or the secondary nucleus), resulting in the formation of the triploid primary endosperm nucleus.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "After fertilization, the ovule develops into the:",
      options: [
        { id: "a", text: "Fruit" },
        { id: "b", text: "Seed" },
        { id: "c", text: "Flower" },
        { id: "d", text: "Pollen grain" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Following fertilization, the ovule develops into the seed, while the surrounding ovary typically develops into the fruit.",
      difficulty: "medium",
    },
    {
      concept_id: c1b._id,
      question_text: "The endosperm formed after triple fusion primarily functions to:",
      options: [
        { id: "a", text: "Provide nutrition to the developing embryo" },
        { id: "b", text: "Directly become the seed coat" },
        { id: "c", text: "Function as the male gamete" },
        { id: "d", text: "Prevent germination" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The endosperm, formed from triple fusion, serves as a nutritive tissue that provides nourishment to the developing embryo within the seed.",
      difficulty: "hard",
    },
    {
      concept_id: c1b._id,
      question_text:
        "In most dicot seeds, the endosperm is largely consumed during seed development because its nutrients are transferred to the:",
      options: [
        { id: "a", text: "Seed coat" },
        { id: "b", text: "Cotyledons of the embryo" },
        { id: "c", text: "Pericarp" },
        { id: "d", text: "Stigma" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In many dicot seeds, the nutrients from the endosperm are absorbed and stored in the cotyledons of the developing embryo, so the mature seed may lack a distinct endosperm layer.",
      difficulty: "hard",
    },

    {
      concept_id: c1c._id,
      question_text: "Apomixis is best described as a process where seeds are produced:",
      options: [
        { id: "a", text: "Only through normal fertilization" },
        { id: "b", text: "Without the fusion of gametes (asexually)" },
        { id: "c", text: "Only through pollen germination without any embryo" },
        { id: "d", text: "Exclusively in animals" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Apomixis is a form of asexual reproduction that mimics sexual reproduction, in which seeds are formed without the actual fusion of male and female gametes.",
      difficulty: "easy",
    },
    {
      concept_id: c1c._id,
      question_text: "Apomixis is of great interest to plant breeders mainly because it can help:",
      options: [
        { id: "a", text: "Produce genetically variable offspring" },
        { id: "b", text: "Fix hybrid vigor by producing genetically uniform (clonal) seeds" },
        { id: "c", text: "Prevent seed formation entirely" },
        { id: "d", text: "Eliminate the need for pollination research" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Since apomictic seeds are genetically identical to the parent plant, apomixis is valuable to plant breeders as it can help fix hybrid vigor across generations without the need for repeated crossing.",
      difficulty: "easy",
    },
    {
      concept_id: c1c._id,
      question_text: "Polyembryony refers to the occurrence of:",
      options: [
        { id: "a", text: "More than one embryo within a single seed" },
        { id: "b", text: "Only one embryo per fruit" },
        { id: "c", text: "No embryo formation at all" },
        { id: "d", text: "Multiple flowers on a single plant" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Polyembryony is the phenomenon in which a single seed contains more than one embryo, sometimes observed naturally in citrus and other species.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text:
        "In some citrus seeds, polyembryony occurs commonly through the development of embryos from:",
      options: [
        { id: "a", text: "Nucellar cells surrounding the embryo sac" },
        { id: "b", text: "Only the fertilized egg cell" },
        { id: "c", text: "Pollen grains directly" },
        { id: "d", text: "Petals" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In citrus and certain other plants, polyembryony often occurs because some of the diploid nucellar cells surrounding the embryo sac start dividing to give rise to additional embryos.",
      difficulty: "medium",
    },
    {
      concept_id: c1c._id,
      question_text:
        "Apomixis is significant in agriculture because hybrid seeds produced through cross-breeding are expensive to generate each season, whereas apomictic reproduction would allow:",
      options: [
        { id: "a", text: "Farmers to save and replant hybrid seeds without losing hybrid vigor" },
        { id: "b", text: "Hybrid seeds to become sterile" },
        { id: "c", text: "Farmers to avoid growing hybrids altogether" },
        { id: "d", text: "Only wind pollination to occur" },
      ],
      correct_option_id: "a",
      explanation_text:
        "If hybrid varieties could reproduce apomictically, farmers could save seeds from a hybrid crop and replant them without losing hybrid vigor, eliminating the need to purchase costly hybrid seeds each season.",
      difficulty: "hard",
    },
    {
      concept_id: c1c._id,
      question_text: "The key distinction between apomixis and normal sexual reproduction is that apomixis:",
      options: [
        { id: "a", text: "Requires two parents and fertilization" },
        { id: "b", text: "Bypasses meiosis and/or fertilization, producing genetically identical offspring" },
        { id: "c", text: "Always involves cross-pollination" },
        { id: "d", text: "Only occurs in animals" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Apomixis is essentially a form of asexual reproduction that bypasses the normal processes of meiosis and/or fertilization, resulting in offspring that are genetically identical to the parent plant.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 1 (Sexual Reproduction in Flowering Plants) done");

  // ---------- CHAPTER 2: Human Reproduction ----------
  const ch2 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Reproduction",
    title: "Human Reproduction",
    order_index: 2,
  });

  const c2a = await Concept.create({
    chapter_id: ch2._id,
    title: "Male and Female Reproductive Systems",
    explanation_text:
      "The male reproductive system consists of testes, accessory ducts, and glands that produce and deliver sperm, while the female reproductive system comprises ovaries, fallopian tubes, uterus, and vagina, responsible for producing ova and supporting pregnancy.",
  });
  const c2b = await Concept.create({
    chapter_id: ch2._id,
    title: "Gametogenesis and the Menstrual Cycle",
    explanation_text:
      "Gametogenesis is the process of formation of male and female gametes (spermatogenesis and oogenesis) through meiosis; the menstrual cycle is a recurring hormonal cycle in females involving the menstrual, follicular, ovulatory, and luteal phases.",
  });
  const c2c = await Concept.create({
    chapter_id: ch2._id,
    title: "Fertilization, Pregnancy, and Parturition",
    explanation_text:
      "Fertilization results in a diploid zygote that undergoes cleavage, implants in the uterus, and develops through pregnancy supported by the placenta; parturition is the process of childbirth, triggered by hormonal signals including oxytocin.",
  });

  await Question.insertMany([
    {
      concept_id: c2a._id,
      question_text: "The primary male reproductive organs, responsible for producing sperm, are the:",
      options: [
        { id: "a", text: "Ovaries" },
        { id: "b", text: "Testes" },
        { id: "c", text: "Epididymis only" },
        { id: "d", text: "Prostate gland only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The testes are the primary male reproductive organs, responsible for producing sperm (spermatozoa) and the hormone testosterone.",
      difficulty: "easy",
    },
    {
      concept_id: c2a._id,
      question_text:
        "In females, the primary reproductive organs responsible for producing ova (eggs) are the:",
      options: [
        { id: "a", text: "Ovaries" },
        { id: "b", text: "Fallopian tubes" },
        { id: "c", text: "Uterus" },
        { id: "d", text: "Vagina" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The ovaries are the primary female reproductive organs, responsible for producing ova (eggs) and secreting hormones like estrogen and progesterone.",
      difficulty: "easy",
    },
    {
      concept_id: c2a._id,
      question_text:
        "Sperm cells are transported from the testes and undergo maturation while passing through the:",
      options: [
        { id: "a", text: "Vas deferens only" },
        { id: "b", text: "Epididymis" },
        { id: "c", text: "Urethra only" },
        { id: "d", text: "Prostate only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "After production in the testes, sperm move into the epididymis, a long coiled tube where they undergo maturation and gain motility before being transported further.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text: "Fertilization of the egg by sperm normally occurs in the:",
      options: [
        { id: "a", text: "Uterus" },
        { id: "b", text: "Ampullary region of the fallopian tube" },
        { id: "c", text: "Vagina" },
        { id: "d", text: "Ovary" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fertilization typically occurs in the ampullary region of the fallopian tube (oviduct), where the sperm meets and fertilizes the egg.",
      difficulty: "medium",
    },
    {
      concept_id: c2a._id,
      question_text:
        "The muscular, pear-shaped organ in females where the fertilized egg implants and develops during pregnancy is the:",
      options: [
        { id: "a", text: "Uterus" },
        { id: "b", text: "Cervix" },
        { id: "c", text: "Vagina" },
        { id: "d", text: "Ovary" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The uterus is a muscular, pear-shaped organ where implantation of the blastocyst occurs and where the developing foetus is nourished and protected throughout pregnancy.",
      difficulty: "hard",
    },
    {
      concept_id: c2a._id,
      question_text:
        "Accessory glands in the male reproductive system, such as the seminal vesicles and prostate, primarily function to:",
      options: [
        { id: "a", text: "Produce sperm directly" },
        {
          id: "b",
          text: "Contribute secretions that form seminal plasma, nourishing and aiding the movement of sperm",
        },
        { id: "c", text: "Store ova" },
        { id: "d", text: "Regulate menstruation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The seminal vesicles and prostate gland contribute fluid secretions that combine with sperm to form semen, providing nutrients and a suitable medium for sperm survival and motility.",
      difficulty: "hard",
    },

    {
      concept_id: c2b._id,
      question_text: "The process of sperm formation in the testes is called:",
      options: [
        { id: "a", text: "Oogenesis" },
        { id: "b", text: "Spermatogenesis" },
        { id: "c", text: "Fertilization" },
        { id: "d", text: "Ovulation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Spermatogenesis is the process by which male germ cells undergo meiosis in the seminiferous tubules of the testes to produce mature sperm cells.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text: "The process of formation of a mature female gamete (egg) is called:",
      options: [
        { id: "a", text: "Spermatogenesis" },
        { id: "b", text: "Oogenesis" },
        { id: "c", text: "Menstruation" },
        { id: "d", text: "Implantation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Oogenesis is the process by which a diploid oogonium develops into a mature haploid ovum (egg) within the ovary.",
      difficulty: "easy",
    },
    {
      concept_id: c2b._id,
      question_text: "A typical human menstrual cycle lasts approximately how many days?",
      options: [
        { id: "a", text: "7 days" },
        { id: "b", text: "14 days" },
        { id: "c", text: "28 days" },
        { id: "d", text: "60 days" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The human menstrual cycle typically lasts about 28 days, though it can vary among individuals, encompassing menstrual, follicular, ovulatory, and luteal phases.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text:
        "Ovulation, the release of a mature egg from the ovary, typically occurs around which day of a standard 28-day menstrual cycle?",
      options: [
        { id: "a", text: "Day 1" },
        { id: "b", text: "Day 14" },
        { id: "c", text: "Day 28" },
        { id: "d", text: "Day 5" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In a typical 28-day menstrual cycle, ovulation, triggered by a surge in luteinizing hormone (LH), occurs around day 14.",
      difficulty: "medium",
    },
    {
      concept_id: c2b._id,
      question_text:
        "The corpus luteum, formed after ovulation, primarily secretes which hormone to maintain the uterine lining?",
      options: [
        { id: "a", text: "Estrogen only" },
        { id: "b", text: "Progesterone" },
        { id: "c", text: "FSH" },
        { id: "d", text: "LH only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The corpus luteum, formed from the ruptured follicle after ovulation, secretes progesterone, which is essential for maintaining the uterine lining in preparation for potential implantation.",
      difficulty: "hard",
    },
    {
      concept_id: c2b._id,
      question_text:
        "If fertilization does not occur, the corpus luteum degenerates, hormone levels fall, and this leads to:",
      options: [
        { id: "a", text: "Continued growth of the uterine lining indefinitely" },
        { id: "b", text: "Menstruation, i.e., shedding of the uterine lining" },
        { id: "c", text: "Immediate ovulation of a new egg" },
        { id: "d", text: "Permanent cessation of the menstrual cycle" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In the absence of fertilization, the corpus luteum degenerates, causing a drop in progesterone and estrogen levels, which triggers the breakdown and shedding of the uterine lining as menstruation.",
      difficulty: "hard",
    },

    {
      concept_id: c2c._id,
      question_text:
        "The fusion of a haploid sperm and haploid egg to form a diploid zygote is called:",
      options: [
        { id: "a", text: "Cleavage" },
        { id: "b", text: "Fertilization" },
        { id: "c", text: "Implantation" },
        { id: "d", text: "Parturition" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fertilization is the process by which a haploid sperm fuses with a haploid egg to form a diploid zygote, restoring the normal chromosome number.",
      difficulty: "easy",
    },
    {
      concept_id: c2c._id,
      question_text: "The attachment of the developing blastocyst to the wall of the uterus is called:",
      options: [
        { id: "a", text: "Ovulation" },
        { id: "b", text: "Implantation" },
        { id: "c", text: "Menstruation" },
        { id: "d", text: "Gestation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Implantation is the process by which the developing blastocyst attaches to and embeds itself into the endometrial lining of the uterus.",
      difficulty: "easy",
    },
    {
      concept_id: c2c._id,
      question_text:
        "The structure that forms the vital connection between the developing foetus and the mother, facilitating exchange of nutrients, gases, and waste, is the:",
      options: [
        { id: "a", text: "Amnion" },
        { id: "b", text: "Placenta" },
        { id: "c", text: "Chorion" },
        { id: "d", text: "Cervix" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The placenta is a specialized structure that connects the developing foetus to the uterine wall, allowing exchange of nutrients, oxygen, and waste products between mother and foetus.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text: "The average duration of human pregnancy (gestation period) is approximately:",
      options: [
        { id: "a", text: "1 month" },
        { id: "b", text: "9 months (about 40 weeks)" },
        { id: "c", text: "3 months" },
        { id: "d", text: "18 months" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The average duration of human pregnancy, or gestation period, is approximately 9 months, or about 40 weeks, from fertilization to childbirth.",
      difficulty: "medium",
    },
    {
      concept_id: c2c._id,
      question_text:
        "The process of childbirth, involving strong uterine contractions that expel the foetus, is called:",
      options: [
        { id: "a", text: "Implantation" },
        { id: "b", text: "Parturition" },
        { id: "c", text: "Ovulation" },
        { id: "d", text: "Menstruation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Parturition is the process of childbirth, involving rhythmic and strong contractions of the uterus that lead to the expulsion of the foetus.",
      difficulty: "hard",
    },
    {
      concept_id: c2c._id,
      question_text: "Parturition is primarily triggered by signals involving increased levels of:",
      options: [
        { id: "a", text: "Only estrogen, with no role for other hormones" },
        { id: "b", text: "Oxytocin, released from both the foetus and the mother's pituitary" },
        { id: "c", text: "Only progesterone" },
        { id: "d", text: "Only FSH" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Parturition is triggered by a complex interplay of hormonal signals, with the hormone oxytocin, released from the foetal and maternal pituitary, playing a key role in inducing strong uterine contractions.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 2 (Human Reproduction) done");

  // ---------- CHAPTER 3: Reproductive Health ----------
  const ch3 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Reproduction",
    title: "Reproductive Health",
    order_index: 3,
  });

  const c3a = await Concept.create({
    chapter_id: ch3._id,
    title: "Reproductive Health and Contraceptive Methods",
    explanation_text:
      "Reproductive health refers to overall well-being in all aspects of reproduction; contraceptive methods such as barrier methods, hormonal pills, IUDs, and surgical methods are used to prevent unwanted pregnancies.",
  });
  const c3b = await Concept.create({
    chapter_id: ch3._id,
    title: "Medical Termination of Pregnancy, STDs, and Infertility",
    explanation_text:
      "Medical Termination of Pregnancy (MTP) is the intentional or voluntary ending of pregnancy under legal and medical supervision; sexually transmitted diseases (STDs) spread through sexual contact, and infertility refers to the inability to conceive despite unprotected intercourse.",
  });
  const c3c = await Concept.create({
    chapter_id: ch3._id,
    title: "Assisted Reproductive Technologies (ART)",
    explanation_text:
      "Assisted Reproductive Technologies (ART) are medical techniques used to help infertile couples conceive, including in vitro fertilization (IVF), gamete intra-fallopian transfer (GIFT), and intracytoplasmic sperm injection (ICSI).",
  });

  await Question.insertMany([
    {
      concept_id: c3a._id,
      question_text: "Reproductive health, in the context of national programs, refers to:",
      options: [
        { id: "a", text: "Only the absence of reproductive diseases" },
        {
          id: "b",
          text: "Total well-being in all aspects of reproduction — physical, emotional, behavioral, and social",
        },
        { id: "c", text: "Only successful childbirth" },
        { id: "d", text: "Only population control" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Reproductive health refers to a total state of well-being in all aspects related to the reproductive system, encompassing physical, emotional, behavioral, and social dimensions, not just the absence of disease.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text: "Condoms are an example of which type of contraceptive method?",
      options: [
        { id: "a", text: "Hormonal method" },
        { id: "b", text: "Barrier method" },
        { id: "c", text: "Surgical method" },
        { id: "d", text: "Natural method only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Condoms are barrier contraceptives that physically prevent sperm from reaching the egg, and also help prevent the spread of sexually transmitted infections.",
      difficulty: "easy",
    },
    {
      concept_id: c3a._id,
      question_text: "Oral contraceptive pills primarily work by:",
      options: [
        { id: "a", text: "Physically blocking sperm" },
        { id: "b", text: "Inhibiting ovulation through hormonal action" },
        { id: "c", text: "Destroying sperm cells chemically" },
        { id: "d", text: "Removing the uterus" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Oral contraceptive pills contain hormones (estrogen and/or progesterone analogues) that primarily work by inhibiting ovulation, thereby preventing pregnancy.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text: "Intrauterine devices (IUDs) function as a contraceptive method primarily by:",
      options: [
        {
          id: "a",
          text: "Being inserted into the uterus to prevent implantation or alter the uterine environment",
        },
        { id: "b", text: "Blocking sound waves" },
        { id: "c", text: "Increasing fertility" },
        { id: "d", text: "Acting as an oral pill substitute" },
      ],
      correct_option_id: "a",
      explanation_text:
        "IUDs are devices inserted into the uterus that primarily prevent implantation and can also release hormones or copper ions that create an environment unfavorable for fertilization.",
      difficulty: "medium",
    },
    {
      concept_id: c3a._id,
      question_text: "Vasectomy, a surgical method of contraception in males, involves:",
      options: [
        { id: "a", text: "Removal of the testes" },
        { id: "b", text: "Cutting and sealing the vas deferens to prevent sperm transport" },
        { id: "c", text: "Removal of the prostate gland" },
        { id: "d", text: "Blocking blood flow to the penis" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Vasectomy is a surgical contraceptive procedure in males that involves cutting and sealing a small part of the vas deferens, preventing sperm from being included in the ejaculate.",
      difficulty: "hard",
    },
    {
      concept_id: c3a._id,
      question_text: "Tubectomy, the surgical contraceptive method in females, involves:",
      options: [
        { id: "a", text: "Removal of the ovaries" },
        { id: "b", text: "Cutting and sealing a small part of the fallopian tubes to block the passage of eggs" },
        { id: "c", text: "Removal of the uterus" },
        { id: "d", text: "Blocking the vagina" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Tubectomy involves cutting and sealing a small part of the fallopian tubes (oviducts), preventing the egg from meeting sperm and thus preventing fertilization.",
      difficulty: "hard",
    },

    {
      concept_id: c3b._id,
      question_text: "MTP stands for:",
      options: [
        { id: "a", text: "Male Testosterone Production" },
        { id: "b", text: "Medical Termination of Pregnancy" },
        { id: "c", text: "Menstrual Timing Process" },
        { id: "d", text: "Multiple Twin Pregnancy" },
      ],
      correct_option_id: "b",
      explanation_text:
        "MTP stands for Medical Termination of Pregnancy, referring to the intentional ending of a pregnancy under medical and legal supervision.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text: "Sexually transmitted diseases (STDs) are infections that spread primarily through:",
      options: [
        { id: "a", text: "Air only" },
        { id: "b", text: "Sexual contact" },
        { id: "c", text: "Drinking water only" },
        { id: "d", text: "Sunlight exposure" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Sexually transmitted diseases (STDs) or infections (STIs) are infections that are primarily transmitted through sexual contact with an infected partner.",
      difficulty: "easy",
    },
    {
      concept_id: c3b._id,
      question_text:
        "Among common STDs, which one, if untreated, can progress to a severe stage affecting the immune system?",
      options: [
        { id: "a", text: "Gonorrhea" },
        { id: "b", text: "HIV/AIDS" },
        { id: "c", text: "Common cold" },
        { id: "d", text: "Malaria" },
      ],
      correct_option_id: "b",
      explanation_text:
        "HIV infection, if untreated, can progress to AIDS (Acquired Immunodeficiency Syndrome), severely compromising the immune system and making the body vulnerable to opportunistic infections.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text:
        "A couple is generally considered to be facing infertility if they are unable to conceive despite unprotected intercourse for a period of about:",
      options: [
        { id: "a", text: "1 week" },
        { id: "b", text: "1 month" },
        { id: "c", text: "About 1-2 years" },
        { id: "d", text: "10 years" },
      ],
      correct_option_id: "c",
      explanation_text:
        "A couple is generally considered to be facing infertility if they are unable to conceive despite regular, unprotected intercourse over a period of about one to two years.",
      difficulty: "medium",
    },
    {
      concept_id: c3b._id,
      question_text: "Among the following, a common cause of infertility in either partner can be:",
      options: [
        {
          id: "a",
          text: "Physical, congenital, hormonal, or psychological factors affecting reproductive function",
        },
        { id: "b", text: "Only lifestyle choices related to diet" },
        { id: "c", text: "Only environmental temperature" },
        { id: "d", text: "Only age below 18" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Infertility can result from a variety of causes in either partner, including physical or congenital abnormalities, hormonal imbalances, infections, or psychological factors affecting reproductive function.",
      difficulty: "hard",
    },
    {
      concept_id: c3b._id,
      question_text:
        "Early detection and treatment of STDs is emphasized in reproductive health education mainly because untreated STDs can lead to:",
      options: [
        { id: "a", text: "No complications at all" },
        { id: "b", text: "Complications such as infertility and pelvic inflammatory disease" },
        { id: "c", text: "Immediate cure without treatment" },
        { id: "d", text: "Only cosmetic issues" },
      ],
      correct_option_id: "b",
      explanation_text:
        "If left untreated, STDs can lead to serious complications, including pelvic inflammatory disease, infertility, and in some cases increased risk of certain cancers, highlighting the importance of early detection and treatment.",
      difficulty: "hard",
    },

    {
      concept_id: c3c._id,
      question_text: "In Vitro Fertilization (IVF) involves fertilization of the egg by sperm:",
      options: [
        { id: "a", text: "Inside the mother's fallopian tube naturally" },
        { id: "b", text: "Outside the body, in a laboratory setting" },
        { id: "c", text: "Inside the testes" },
        { id: "d", text: "Inside the ovary directly" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In Vitro Fertilization (IVF) involves fertilizing an egg with sperm outside the body, in a laboratory dish, before transferring the resulting embryo into the uterus.",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text:
        "After fertilization in an IVF-related procedure, an embryo with up to 8 blastomeres may be transferred into the:",
      options: [
        { id: "a", text: "Fallopian tube (a technique known as ZIFT)" },
        { id: "b", text: "Ovary" },
        { id: "c", text: "Cervix only" },
        { id: "d", text: "Vagina without further transfer" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In IVF-related procedures, an embryo with up to 8 blastomeres may be transferred into the fallopian tube, a technique known as Zygote Intra-Fallopian Transfer (ZIFT), while later-stage embryos are transferred into the uterus.",
      difficulty: "easy",
    },
    {
      concept_id: c3c._id,
      question_text: "GIFT, one of the assisted reproductive technologies, stands for:",
      options: [
        { id: "a", text: "Gamete Intra-Fallopian Transfer" },
        { id: "b", text: "General In-vitro Fertility Treatment" },
        { id: "c", text: "Genetic Infertility Fixing Technique" },
        { id: "d", text: "Gonadal Implantation and Fertility Test" },
      ],
      correct_option_id: "a",
      explanation_text:
        "GIFT stands for Gamete Intra-Fallopian Transfer, a procedure in which an ovum collected from a donor is transferred into the fallopian tube of another female who cannot produce her own eggs, to facilitate fertilization.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text: "ICSI, used to overcome certain male infertility issues, involves:",
      options: [
        { id: "a", text: "Directly injecting a sperm into the ovum to facilitate fertilization" },
        { id: "b", text: "Removing the sperm entirely" },
        { id: "c", text: "Transferring eggs into the testes" },
        { id: "d", text: "Blocking the fallopian tubes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Intracytoplasmic Sperm Injection (ICSI) is a technique in which a single sperm is directly injected into the cytoplasm of an ovum to induce fertilization, often used in cases of low sperm count or motility.",
      difficulty: "medium",
    },
    {
      concept_id: c3c._id,
      question_text:
        "A woman who carries and delivers a baby for another couple, often used in ART when the intended mother cannot carry a pregnancy herself, is referred to as a:",
      options: [
        { id: "a", text: "Donor" },
        { id: "b", text: "Surrogate mother" },
        { id: "c", text: "Recipient only" },
        { id: "d", text: "Egg donor exclusively" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A surrogate mother is a woman who carries and delivers a baby for another couple, often used in ART cases where the intended mother is unable to carry a pregnancy to term herself.",
      difficulty: "hard",
    },
    {
      concept_id: c3c._id,
      question_text: "Artificial insemination, another reproductive technology, primarily involves:",
      options: [
        {
          id: "a",
          text: "Introducing collected semen into the vagina or uterus artificially, bypassing certain natural barriers to conception",
        },
        { id: "b", text: "Removing eggs from the body entirely" },
        { id: "c", text: "Only surgical repair of the uterus" },
        { id: "d", text: "Directly transferring a foetus between mothers" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Artificial insemination involves introducing semen (from the husband or a donor) into the vagina or uterus using an instrument, helping couples conceive when natural insemination is not possible due to certain fertility issues.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 12 Batch 1 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
