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

  // ---------- CHAPTER 4: Principles of Inheritance and Variation ----------
  const ch4 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Genetics and Evolution",
    title: "Principles of Inheritance and Variation",
    order_index: 4,
  });

  const c4a = await Concept.create({
    chapter_id: ch4._id,
    title: "Mendelian Inheritance and Laws",
    explanation_text:
      "Gregor Mendel's experiments on garden pea plants led to the formulation of the laws of inheritance — the Law of Dominance, Law of Segregation, and Law of Independent Assortment — which explain how traits are passed from parents to offspring.",
  });
  const c4b = await Concept.create({
    chapter_id: ch4._id,
    title: "Chromosomal Theory and Sex Determination",
    explanation_text:
      "The chromosomal theory of inheritance states that genes are located on chromosomes, which explains patterns of inheritance; sex determination in humans is governed by the XY system, where the presence of a Y chromosome determines maleness.",
  });
  const c4c = await Concept.create({
    chapter_id: ch4._id,
    title: "Mendelian Disorders and Chromosomal Disorders",
    explanation_text:
      "Mendelian disorders result from mutations or alterations in a single gene, such as haemophilia and sickle-cell anaemia, while chromosomal disorders result from abnormalities in chromosome number or structure, such as Down's syndrome and Turner's syndrome.",
  });

  await Question.insertMany([
    {
      concept_id: c4a._id,
      question_text: "Gregor Mendel conducted his classic experiments on inheritance using which plant?",
      options: [
        { id: "a", text: "Maize" },
        { id: "b", text: "Garden pea" },
        { id: "c", text: "Fruit fly" },
        { id: "d", text: "Wheat" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Gregor Mendel conducted his pioneering experiments on inheritance using garden pea (Pisum sativum) plants, which had several contrasting, easily observable traits.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text:
        "In a monohybrid cross between a homozygous tall and homozygous dwarf pea plant, the F1 generation phenotype is:",
      options: [
        { id: "a", text: "All dwarf" },
        { id: "b", text: "All tall" },
        { id: "c", text: "3:1 tall to dwarf" },
        { id: "d", text: "1:1 tall to dwarf" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In a monohybrid cross, the F1 generation shows the dominant trait — since tallness is dominant over dwarfness in peas, all F1 plants are tall.",
      difficulty: "easy",
    },
    {
      concept_id: c4a._id,
      question_text: "The Law of Segregation states that:",
      options: [
        { id: "a", text: "Alleles of different genes assort independently" },
        {
          id: "b",
          text: "The two alleles of a gene separate during gamete formation, so each gamete carries only one allele",
        },
        { id: "c", text: "Only dominant traits are passed on" },
        { id: "d", text: "Traits blend together in offspring" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Law of Segregation states that the two alleles for a gene separate (segregate) during gamete formation, so each gamete receives only one allele of each gene pair.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text: "The Law of Independent Assortment applies specifically to the inheritance of:",
      options: [
        { id: "a", text: "A single gene" },
        { id: "b", text: "Two or more genes located on different chromosomes" },
        { id: "c", text: "Only sex-linked genes" },
        { id: "d", text: "Only recessive traits" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Law of Independent Assortment states that alleles of two or more different genes (located on different chromosome pairs) get assorted independently of one another during gamete formation.",
      difficulty: "medium",
    },
    {
      concept_id: c4a._id,
      question_text:
        "In a dihybrid cross between two heterozygous parents (e.g., RrYy x RrYy), the expected phenotypic ratio in the F2 generation is:",
      options: [
        { id: "a", text: "3:1" },
        { id: "b", text: "1:2:1" },
        { id: "c", text: "9:3:3:1" },
        { id: "d", text: "1:1:1:1" },
      ],
      correct_option_id: "c",
      explanation_text:
        "A dihybrid cross between two heterozygous parents for two independently assorting genes typically produces an F2 phenotypic ratio of 9:3:3:1.",
      difficulty: "hard",
    },
    {
      concept_id: c4a._id,
      question_text:
        "Incomplete dominance, as seen in the flower color of Mirabilis jalapa, results in F1 offspring that show:",
      options: [
        { id: "a", text: "Exactly the phenotype of one parent" },
        { id: "b", text: "A blended or intermediate phenotype between the two parents" },
        { id: "c", text: "Only the recessive parent's phenotype" },
        { id: "d", text: "No flower color at all" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In incomplete dominance, neither allele is completely dominant, so the F1 heterozygotes display a phenotype intermediate between the two parental phenotypes, as seen with pink flowers in a cross between red and white-flowered Mirabilis jalapa.",
      difficulty: "hard",
    },

    {
      concept_id: c4b._id,
      question_text: "The chromosomal theory of inheritance proposes that genes are located on:",
      options: [
        { id: "a", text: "Ribosomes" },
        { id: "b", text: "Chromosomes" },
        { id: "c", text: "Cell membranes" },
        { id: "d", text: "Mitochondria only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The chromosomal theory of inheritance, proposed by Sutton and Boveri, states that genes are located on chromosomes, and the behavior of chromosomes during meiosis parallels the inheritance patterns of genes.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text: "In humans, biological sex is primarily determined by which pair of chromosomes?",
      options: [
        { id: "a", text: "Autosomes only" },
        { id: "b", text: "Sex chromosomes (X and Y)" },
        { id: "c", text: "Mitochondrial DNA" },
        { id: "d", text: "Y chromosome alone in females" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In humans, biological sex is determined by the sex chromosomes — XX in females and XY in males — with the presence of a Y chromosome typically leading to male development.",
      difficulty: "easy",
    },
    {
      concept_id: c4b._id,
      question_text:
        "In the human XY sex determination system, a child inherits an X chromosome from the mother and either an X or Y chromosome from the:",
      options: [
        { id: "a", text: "Mother" },
        { id: "b", text: "Father" },
        { id: "c", text: "Grandparents only" },
        { id: "d", text: "Neither parent" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In the XY system, the mother always contributes an X chromosome, while the father contributes either an X or a Y chromosome, determining whether the offspring is female (XX) or male (XY).",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text:
        "Genes located close together on the same chromosome tend to be inherited together, a phenomenon known as:",
      options: [
        { id: "a", text: "Independent assortment" },
        { id: "b", text: "Linkage" },
        { id: "c", text: "Codominance" },
        { id: "d", text: "Polygenic inheritance" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Linkage refers to the tendency of genes located close together on the same chromosome to be inherited together, rather than assorting independently as predicted by Mendel's laws.",
      difficulty: "medium",
    },
    {
      concept_id: c4b._id,
      question_text: "Crossing over, which occurs during meiosis, results in:",
      options: [
        { id: "a", text: "Complete loss of genetic material" },
        { id: "b", text: "Recombination of genes between homologous chromosomes" },
        { id: "c", text: "Prevention of any genetic variation" },
        { id: "d", text: "Duplication of the entire genome" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Crossing over involves the exchange of segments between homologous chromosomes during meiosis, resulting in new combinations of alleles (recombination), which increases genetic variation.",
      difficulty: "hard",
    },
    {
      concept_id: c4b._id,
      question_text:
        "In birds, unlike humans, the sex determination system involves the female being the heterogametic sex, generally referred to as the:",
      options: [
        { id: "a", text: "XY system" },
        { id: "b", text: "ZW system" },
        { id: "c", text: "XO system" },
        { id: "d", text: "No sex chromosome system" },
      ],
      correct_option_id: "b",
      explanation_text:
        "In birds (and some other organisms), sex is determined by the ZW system, in which the female is heterogametic (ZW) and the male is homogametic (ZZ), opposite to the human XY system.",
      difficulty: "hard",
    },

    {
      concept_id: c4c._id,
      question_text: "Haemophilia, a Mendelian disorder affecting blood clotting, is inherited as a:",
      options: [
        { id: "a", text: "Autosomal dominant trait" },
        { id: "b", text: "X-linked recessive trait" },
        { id: "c", text: "Y-linked trait" },
        { id: "d", text: "Mitochondrial trait" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Haemophilia is inherited as an X-linked recessive disorder, meaning it is caused by a mutation on the X chromosome and predominantly affects males.",
      difficulty: "easy",
    },
    {
      concept_id: c4c._id,
      question_text: "Sickle-cell anaemia is caused by a mutation resulting in the production of abnormal:",
      options: [
        { id: "a", text: "Insulin" },
        { id: "b", text: "Haemoglobin" },
        { id: "c", text: "Collagen" },
        { id: "d", text: "Melanin" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Sickle-cell anaemia results from a point mutation in the gene coding for the beta chain of haemoglobin, causing red blood cells to become sickle-shaped under low oxygen conditions.",
      difficulty: "easy",
    },
    {
      concept_id: c4c._id,
      question_text: "Down's syndrome is a chromosomal disorder characterized by:",
      options: [
        { id: "a", text: "Loss of the entire chromosome 21" },
        { id: "b", text: "An extra copy (trisomy) of chromosome 21" },
        { id: "c", text: "Absence of an X chromosome" },
        { id: "d", text: "Extra copies of the Y chromosome only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Down's syndrome results from the presence of an extra copy of chromosome 21 (trisomy 21), leading to characteristic physical and developmental features.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text: "Turner's syndrome, a chromosomal disorder affecting females, is characterized by:",
      options: [
        { id: "a", text: "An extra X chromosome" },
        { id: "b", text: "The presence of only a single X chromosome (45, X)" },
        { id: "c", text: "An extra Y chromosome" },
        { id: "d", text: "Trisomy of chromosome 21" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Turner's syndrome occurs in females who have only a single X chromosome (45, X) instead of the usual two, leading to characteristic developmental and reproductive features.",
      difficulty: "medium",
    },
    {
      concept_id: c4c._id,
      question_text: "Klinefelter's syndrome, affecting males, results from the presence of:",
      options: [
        { id: "a", text: "An extra X chromosome (47, XXY)" },
        { id: "b", text: "Only one X chromosome" },
        { id: "c", text: "An extra chromosome 21" },
        { id: "d", text: "Loss of the Y chromosome" },
      ],
      correct_option_id: "a",
      explanation_text:
        "Klinefelter's syndrome occurs in males with an additional X chromosome (karyotype 47, XXY), often resulting in certain physical and developmental characteristics.",
      difficulty: "hard",
    },
    {
      concept_id: c4c._id,
      question_text: "Sickle-cell anaemia is an example of a Mendelian disorder inherited as an:",
      options: [
        { id: "a", text: "X-linked dominant trait" },
        { id: "b", text: "Autosomal recessive trait" },
        { id: "c", text: "Y-linked trait" },
        { id: "d", text: "Mitochondrial trait" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Sickle-cell anaemia is inherited as an autosomal recessive disorder, meaning an individual must inherit two copies of the mutant allele (one from each parent) to be affected by the disease.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 4 (Principles of Inheritance and Variation) done");

  // ---------- CHAPTER 5: Molecular Basis of Inheritance ----------
  const ch5 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Genetics and Evolution",
    title: "Molecular Basis of Inheritance",
    order_index: 5,
  });

  const c5a = await Concept.create({
    chapter_id: ch5._id,
    title: "DNA Structure and Replication",
    explanation_text:
      "DNA is a double-helical molecule composed of nucleotides, each containing a sugar, phosphate, and nitrogenous base; DNA replication is a semiconservative process in which each strand serves as a template for synthesizing a new complementary strand.",
  });
  const c5b = await Concept.create({
    chapter_id: ch5._id,
    title: "Transcription and the Genetic Code",
    explanation_text:
      "Transcription is the process of synthesizing RNA from a DNA template, carried out by RNA polymerase; the genetic code, consisting of triplet codons, specifies the sequence of amino acids during translation of mRNA into protein.",
  });
  const c5c = await Concept.create({
    chapter_id: ch5._id,
    title: "Gene Expression Regulation and the Human Genome Project",
    explanation_text:
      "Gene expression can be regulated at various levels, such as transcriptional control via operons in prokaryotes (e.g., the lac operon); the Human Genome Project was an international effort to sequence and map the entire human genome.",
  });

  await Question.insertMany([
    {
      concept_id: c5a._id,
      question_text: "The DNA double helix model was proposed by:",
      options: [
        { id: "a", text: "Gregor Mendel" },
        { id: "b", text: "Watson and Crick" },
        { id: "c", text: "Charles Darwin" },
        { id: "d", text: "Louis Pasteur" },
      ],
      correct_option_id: "b",
      explanation_text:
        "James Watson and Francis Crick proposed the double helix structure of DNA in 1953, based on X-ray diffraction data and other research.",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text: "Each nucleotide in DNA is composed of a sugar, a phosphate group, and a:",
      options: [
        { id: "a", text: "Fatty acid" },
        { id: "b", text: "Nitrogenous base" },
        { id: "c", text: "Amino acid" },
        { id: "d", text: "Glycerol molecule" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A nucleotide, the basic building block of DNA, consists of a deoxyribose sugar, a phosphate group, and one of four nitrogenous bases (adenine, thymine, guanine, or cytosine).",
      difficulty: "easy",
    },
    {
      concept_id: c5a._id,
      question_text: "In DNA, adenine pairs specifically with which base, forming two hydrogen bonds?",
      options: [
        { id: "a", text: "Guanine" },
        { id: "b", text: "Cytosine" },
        { id: "c", text: "Thymine" },
        { id: "d", text: "Uracil" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Adenine pairs specifically with thymine through two hydrogen bonds, following the base-pairing rules described by Watson and Crick.",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text:
        'DNA replication is described as "semiconservative" because each new DNA molecule consists of:',
      options: [
        { id: "a", text: "Two entirely new strands" },
        { id: "b", text: "One parental (old) strand and one newly synthesized strand" },
        { id: "c", text: "Two entirely parental strands" },
        { id: "d", text: "RNA and DNA strands combined" },
      ],
      correct_option_id: "b",
      explanation_text:
        "DNA replication is semiconservative, meaning each daughter DNA molecule retains one original (parental) strand and one newly synthesized strand, as demonstrated by the Meselson-Stahl experiment.",
      difficulty: "medium",
    },
    {
      concept_id: c5a._id,
      question_text:
        "The enzyme primarily responsible for synthesizing new DNA strands during replication, by adding nucleotides in the 5' to 3' direction, is:",
      options: [
        { id: "a", text: "RNA polymerase" },
        { id: "b", text: "DNA polymerase" },
        { id: "c", text: "Ligase only" },
        { id: "d", text: "Helicase only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "DNA polymerase is the primary enzyme responsible for synthesizing new DNA strands during replication, adding nucleotides complementary to the template strand in the 5' to 3' direction.",
      difficulty: "hard",
    },
    {
      concept_id: c5a._id,
      question_text:
        "The Meselson-Stahl experiment, conducted using E. coli grown in different nitrogen isotopes, provided experimental proof for which model of DNA replication?",
      options: [
        { id: "a", text: "Conservative model" },
        { id: "b", text: "Dispersive model" },
        { id: "c", text: "Semiconservative model" },
        { id: "d", text: "Random model" },
      ],
      correct_option_id: "c",
      explanation_text:
        "The Meselson-Stahl experiment provided direct experimental evidence supporting the semiconservative model of DNA replication, by tracking the distribution of heavy and light nitrogen isotopes in DNA across generations.",
      difficulty: "hard",
    },

    {
      concept_id: c5b._id,
      question_text: "The process by which RNA is synthesized from a DNA template is called:",
      options: [
        { id: "a", text: "Translation" },
        { id: "b", text: "Transcription" },
        { id: "c", text: "Replication" },
        { id: "d", text: "Transformation" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Transcription is the process by which a segment of DNA is used as a template to synthesize a complementary strand of RNA.",
      difficulty: "easy",
    },
    {
      concept_id: c5b._id,
      question_text:
        "The enzyme primarily responsible for synthesizing mRNA during transcription in eukaryotes is:",
      options: [
        { id: "a", text: "DNA polymerase" },
        { id: "b", text: "RNA polymerase" },
        { id: "c", text: "Ligase" },
        { id: "d", text: "Restriction endonuclease" },
      ],
      correct_option_id: "b",
      explanation_text:
        "RNA polymerase is the enzyme responsible for catalyzing the synthesis of RNA using a DNA template during transcription.",
      difficulty: "easy",
    },
    {
      concept_id: c5b._id,
      question_text: "The genetic code is described as a triplet code because:",
      options: [
        { id: "a", text: "Each amino acid is coded by three nucleotides (a codon)" },
        { id: "b", text: "Each amino acid requires exactly three genes" },
        { id: "c", text: "Only three codons exist" },
        { id: "d", text: "Each protein has only three amino acids" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The genetic code is a triplet code, meaning that each set of three consecutive nucleotides (a codon) in mRNA codes for one specific amino acid.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text: 'The genetic code is described as "degenerate" because:',
      options: [
        { id: "a", text: "It does not work properly in most organisms" },
        { id: "b", text: "Some amino acids are coded for by more than one codon" },
        { id: "c", text: "Only one codon exists for all amino acids" },
        { id: "d", text: "It has no stop codons" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The genetic code is degenerate because most amino acids are specified by more than one codon, providing some redundancy in the coding system.",
      difficulty: "medium",
    },
    {
      concept_id: c5b._id,
      question_text:
        'Which of the following is an example of a "stop" codon that signals the termination of translation?',
      options: [
        { id: "a", text: "AUG" },
        { id: "b", text: "UAA" },
        { id: "c", text: "GUG" },
        { id: "d", text: "AUA" },
      ],
      correct_option_id: "b",
      explanation_text:
        "UAA is one of the three stop (nonsense) codons — along with UAG and UGA — that signal the ribosome to terminate protein synthesis, since they do not code for any amino acid.",
      difficulty: "hard",
    },
    {
      concept_id: c5b._id,
      question_text: 'The genetic code is largely "universal," meaning that:',
      options: [
        { id: "a", text: "It varies completely from species to species" },
        {
          id: "b",
          text: "The same codon generally specifies the same amino acid across most organisms, from bacteria to humans",
        },
        { id: "c", text: "Only humans use the genetic code" },
        { id: "d", text: "Each species has its own unique, unrelated code" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The genetic code is largely universal, meaning that the same codons specify the same amino acids in almost all organisms, from bacteria to humans, reflecting a shared evolutionary origin.",
      difficulty: "hard",
    },

    {
      concept_id: c5c._id,
      question_text:
        "The lac operon, a classic model of gene regulation in bacteria, primarily controls the expression of genes involved in the metabolism of:",
      options: [
        { id: "a", text: "Glucose only" },
        { id: "b", text: "Lactose" },
        { id: "c", text: "Amino acids" },
        { id: "d", text: "Fatty acids" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The lac operon is a set of genes in E. coli that are regulated together to control the metabolism of lactose, being switched on when lactose is present and glucose is scarce.",
      difficulty: "easy",
    },
    {
      concept_id: c5c._id,
      question_text: "In the lac operon, in the absence of lactose, the repressor protein:",
      options: [
        { id: "a", text: "Binds to the operator, blocking transcription of structural genes" },
        { id: "b", text: "Activates transcription strongly" },
        { id: "c", text: "Has no function at all" },
        { id: "d", text: "Binds only to ribosomes" },
      ],
      correct_option_id: "a",
      explanation_text:
        "In the absence of lactose, the lac repressor protein binds to the operator region, physically blocking RNA polymerase from transcribing the structural genes of the lac operon.",
      difficulty: "easy",
    },
    {
      concept_id: c5c._id,
      question_text:
        "The Human Genome Project was a major international scientific effort aimed primarily at:",
      options: [
        { id: "a", text: "Cloning humans" },
        { id: "b", text: "Sequencing and mapping the entire human genome" },
        { id: "c", text: "Developing new antibiotics only" },
        { id: "d", text: "Studying only animal genomes" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Human Genome Project was an international collaborative effort aimed at determining the complete sequence of the human genome and identifying all the genes it contains.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text:
        "One major finding from the Human Genome Project was that the total number of protein-coding genes in humans is:",
      options: [
        { id: "a", text: "Much higher than earlier estimates (over 100,000)" },
        {
          id: "b",
          text: "Surprisingly lower than many earlier estimates (around 20,000-25,000)",
        },
        { id: "c", text: "Exactly equal to the number of chromosomes" },
        { id: "d", text: "Impossible to determine" },
      ],
      correct_option_id: "b",
      explanation_text:
        "A surprising finding of the Human Genome Project was that humans have a relatively modest number of protein-coding genes, estimated at around 20,000-25,000, far fewer than earlier predictions.",
      difficulty: "medium",
    },
    {
      concept_id: c5c._id,
      question_text:
        "DNA fingerprinting, a technique widely used in forensics and paternity testing, relies on analyzing regions of DNA known as:",
      options: [
        { id: "a", text: "Coding exons only" },
        {
          id: "b",
          text: "Satellite DNA / repetitive sequences (VNTRs) that vary between individuals",
        },
        { id: "c", text: "Ribosomal RNA genes" },
        { id: "d", text: "Mitochondrial proteins" },
      ],
      correct_option_id: "b",
      explanation_text:
        "DNA fingerprinting relies on analyzing highly variable, repetitive DNA sequences (such as VNTRs found in satellite DNA), which differ significantly between individuals, allowing for identification.",
      difficulty: "hard",
    },
    {
      concept_id: c5c._id,
      question_text:
        "A key technique that enabled rapid sequencing efforts during the Human Genome Project, allowing amplification of specific DNA segments, is:",
      options: [
        { id: "a", text: "Polymerase Chain Reaction (PCR)" },
        { id: "b", text: "Gel electrophoresis only" },
        { id: "c", text: "Northern blotting only" },
        { id: "d", text: "ELISA" },
      ],
      correct_option_id: "a",
      explanation_text:
        "The Polymerase Chain Reaction (PCR) technique, which allows rapid amplification of specific DNA segments, played a crucial supporting role in enabling large-scale DNA sequencing efforts like the Human Genome Project.",
      difficulty: "hard",
    },
  ]);

  console.log("Chapter 5 (Molecular Basis of Inheritance) done");

  // ---------- CHAPTER 6: Evolution ----------
  const ch6 = await Chapter.create({
    subject_id: subject._id,
    unit_name: "Genetics and Evolution",
    title: "Evolution",
    order_index: 6,
  });

  const c6a = await Concept.create({
    chapter_id: ch6._id,
    title: "Origin of Life and Evidence for Evolution",
    explanation_text:
      "The origin of life is explained by theories such as chemical evolution, proposing that simple organic molecules formed and gradually gave rise to living organisms; evidence for evolution comes from fossils, comparative anatomy (homologous and analogous organs), and embryology.",
  });
  const c6b = await Concept.create({
    chapter_id: ch6._id,
    title: "Mechanisms of Evolution: Natural Selection and Genetic Drift",
    explanation_text:
      "Natural selection, proposed by Charles Darwin, is the process by which organisms with favorable heritable traits survive and reproduce more successfully; genetic drift is a random change in allele frequencies, especially significant in small populations.",
  });
  const c6c = await Concept.create({
    chapter_id: ch6._id,
    title: "Human Evolution",
    explanation_text:
      "Human evolution traces the gradual emergence of modern humans (Homo sapiens) from earlier hominid ancestors through key evolutionary changes including bipedalism, increased brain size, and cultural development, supported by fossil evidence.",
  });

  await Question.insertMany([
    {
      concept_id: c6a._id,
      question_text:
        "The theory proposing that life originated from simple inorganic and organic molecules through a series of chemical reactions is called:",
      options: [
        { id: "a", text: "Special creation theory" },
        { id: "b", text: "Theory of chemical evolution (abiogenesis)" },
        { id: "c", text: "Theory of spontaneous generation of complex life" },
        { id: "d", text: "Panspermia only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The theory of chemical evolution proposes that life originated from simple inorganic and organic molecules that gradually combined and became more complex over millions of years, eventually giving rise to living organisms.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text:
        "The Miller-Urey experiment demonstrated that simple organic molecules, such as amino acids, could form under conditions simulating:",
      options: [
        { id: "a", text: "Modern-day Earth's atmosphere" },
        { id: "b", text: "The primitive Earth's early atmosphere" },
        { id: "c", text: "Outer space only" },
        { id: "d", text: "Deep ocean trenches only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The Miller-Urey experiment simulated the conditions believed to exist in Earth's early atmosphere and demonstrated that simple organic molecules like amino acids could form spontaneously under such conditions.",
      difficulty: "easy",
    },
    {
      concept_id: c6a._id,
      question_text: "Homologous organs, important evidence for evolution, are structures that:",
      options: [
        { id: "a", text: "Have different basic structure and different function" },
        { id: "b", text: "Have similar basic structure/origin but may perform different functions" },
        { id: "c", text: "Have completely unrelated structure and origin" },
        { id: "d", text: "Never exist in vertebrates" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Homologous organs have a similar basic structure and evolutionary origin, even though they may perform different functions in different organisms, as seen in the forelimbs of vertebrates.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text: "Analogous organs, in contrast to homologous organs, are structures that:",
      options: [
        { id: "a", text: "Share the same evolutionary origin but perform different functions" },
        { id: "b", text: "Perform similar functions but have different evolutionary origins/structure" },
        { id: "c", text: "Are identical in structure and origin" },
        { id: "d", text: "Never exist in nature" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Analogous organs perform similar functions in different organisms but have different evolutionary origins and structures, such as the wings of insects and birds, arising through convergent evolution.",
      difficulty: "medium",
    },
    {
      concept_id: c6a._id,
      question_text: "Fossils, an important source of evidence for evolution, provide information about:",
      options: [
        { id: "a", text: "Only currently living species" },
        {
          id: "b",
          text: "Extinct organisms and the sequence of evolutionary changes over geological time",
        },
        { id: "c", text: "Only bacteria" },
        { id: "d", text: "Only recently living species from the last decade" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fossils provide crucial evidence of extinct organisms from various geological periods, helping scientists understand the sequence and pattern of evolutionary changes over long spans of time.",
      difficulty: "hard",
    },
    {
      concept_id: c6a._id,
      question_text:
        "The similarities observed in the early embryonic stages of different vertebrate species, despite differences in their adult forms, are cited as evidence supporting:",
      options: [
        { id: "a", text: "Special creation of each species independently" },
        { id: "b", text: "Common evolutionary ancestry among vertebrates" },
        { id: "c", text: "No relationship among vertebrates" },
        { id: "d", text: "Only convergent evolution" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The striking similarities in early embryonic development among different vertebrate species are cited as evidence supporting a shared common evolutionary ancestry among vertebrates.",
      difficulty: "hard",
    },

    {
      concept_id: c6b._id,
      question_text:
        "The theory of natural selection as a primary mechanism of evolution was proposed by:",
      options: [
        { id: "a", text: "Gregor Mendel" },
        { id: "b", text: "Charles Darwin" },
        { id: "c", text: "James Watson" },
        { id: "d", text: "Jean-Baptiste Lamarck primarily" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Charles Darwin proposed the theory of natural selection, describing how organisms with heritable traits favorable to their environment are more likely to survive and reproduce, driving evolutionary change over generations.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text:
        "According to natural selection, individuals with favorable heritable traits for their environment tend to have:",
      options: [
        { id: "a", text: "Lower survival and reproductive success" },
        { id: "b", text: "Higher survival and reproductive success (differential reproduction)" },
        { id: "c", text: "No effect on survival at all" },
        { id: "d", text: "Guaranteed extinction" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Natural selection favors individuals with heritable traits that improve their chances of survival and reproduction, leading to differential reproductive success and gradual changes in population characteristics over time.",
      difficulty: "easy",
    },
    {
      concept_id: c6b._id,
      question_text: "Genetic drift refers to:",
      options: [
        { id: "a", text: "Directed, non-random change in allele frequencies due to selection" },
        {
          id: "b",
          text: "Random changes in allele frequencies in a population, especially significant in small populations",
        },
        { id: "c", text: "The complete absence of any change in a population" },
        { id: "d", text: "Only mutation-driven changes" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Genetic drift is a random, chance-driven change in allele frequencies within a population, which can have a particularly strong effect in small populations, sometimes independent of natural selection.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text: 'The "founder effect," a specific type of genetic drift, occurs when:',
      options: [
        { id: "a", text: "A large population evolves gradually over time" },
        {
          id: "b",
          text: "A small group of individuals establishes a new population, carrying only a subset of the genetic variation of the original population",
        },
        { id: "c", text: "Natural selection is completely absent" },
        { id: "d", text: "Mutation rates increase dramatically" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The founder effect occurs when a small group of individuals establishes a new, isolated population, carrying only a limited sample of the genetic variation present in the original larger population, leading to genetic drift.",
      difficulty: "medium",
    },
    {
      concept_id: c6b._id,
      question_text:
        "Industrial melanism in peppered moths, where dark-colored moths became more common in polluted, sooty areas, is a classic example of:",
      options: [
        { id: "a", text: "Genetic drift only" },
        { id: "b", text: "Natural selection favoring a trait suited to a changed environment" },
        { id: "c", text: "Special creation" },
        { id: "d", text: "No evolutionary change at all" },
      ],
      correct_option_id: "b",
      explanation_text:
        "The industrial melanism observed in peppered moths, where dark-colored moths became more common in soot-darkened, polluted environments due to better camouflage from predators, is a classic example of natural selection in action.",
      difficulty: "hard",
    },
    {
      concept_id: c6b._id,
      question_text: "A key difference between natural selection and genetic drift is that natural selection is generally:",
      options: [
        { id: "a", text: "Random, while genetic drift is directed by fitness advantages" },
        {
          id: "b",
          text: "A non-random process driven by differential fitness, while genetic drift is largely a random, chance-based process",
        },
        { id: "c", text: "Identical in mechanism to genetic drift" },
        { id: "d", text: "Only relevant in very large populations" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Natural selection is a non-random process where certain heritable traits are favored due to fitness advantages, whereas genetic drift involves random, chance fluctuations in allele frequencies, independent of any fitness advantage.",
      difficulty: "hard",
    },

    {
      concept_id: c6c._id,
      question_text: "Humans belong to which order of mammals, which also includes apes and monkeys?",
      options: [
        { id: "a", text: "Carnivora" },
        { id: "b", text: "Primates" },
        { id: "c", text: "Rodentia" },
        { id: "d", text: "Cetacea" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Humans belong to the order Primates, a group of mammals that also includes apes, monkeys, and lemurs, sharing certain anatomical and evolutionary characteristics.",
      difficulty: "easy",
    },
    {
      concept_id: c6c._id,
      question_text: "The scientific name of modern humans is:",
      options: [
        { id: "a", text: "Homo erectus" },
        { id: "b", text: "Homo habilis" },
        { id: "c", text: "Homo sapiens" },
        { id: "d", text: "Australopithecus" },
      ],
      correct_option_id: "c",
      explanation_text:
        "Modern humans belong to the species Homo sapiens, the only surviving species of the genus Homo.",
      difficulty: "easy",
    },
    {
      concept_id: c6c._id,
      question_text:
        "A key evolutionary trend observed across hominid fossils leading to modern humans is a gradual increase in:",
      options: [
        { id: "a", text: "Body hair only" },
        { id: "b", text: "Cranial capacity (brain size)" },
        { id: "c", text: "Tail length" },
        { id: "d", text: "Number of limbs" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fossil evidence of human evolution shows a gradual trend of increasing cranial capacity (brain size) across various hominid species, culminating in modern Homo sapiens.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Bipedalism, the ability to walk upright on two legs, is considered a key evolutionary adaptation in human ancestors because it:",
      options: [
        { id: "a", text: "Reduced brain size" },
        { id: "b", text: "Freed the hands for tool use and other activities" },
        { id: "c", text: "Prevented any further evolution" },
        { id: "d", text: "Had no evolutionary significance" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Bipedalism freed the hands from locomotion duties, allowing early hominids to use their hands for tool-making, carrying objects, and other activities, considered a major evolutionary advantage.",
      difficulty: "medium",
    },
    {
      concept_id: c6c._id,
      question_text:
        "Australopithecus, an important early hominid genus in the human evolutionary lineage, is believed to have lived approximately how long ago?",
      options: [
        { id: "a", text: "About 1,000 years ago" },
        { id: "b", text: "About 2-4 million years ago" },
        { id: "c", text: "About 4 billion years ago" },
        { id: "d", text: "About 100,000 years ago only" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Fossil evidence suggests that Australopithecus, an important early hominid genus showing bipedal adaptations, existed approximately 2 to 4 million years ago.",
      difficulty: "hard",
    },
    {
      concept_id: c6c._id,
      question_text: "Neanderthals (Homo neanderthalensis), close relatives of modern humans, are believed to have:",
      options: [
        { id: "a", text: "Evolved directly into modern Homo sapiens with no distinct lineage" },
        {
          id: "b",
          text: "Existed as a separate, related hominid species that eventually became extinct",
        },
        { id: "c", text: "Never had any relationship to modern humans" },
        { id: "d", text: "Lived only in the last 500 years" },
      ],
      correct_option_id: "b",
      explanation_text:
        "Neanderthals were a distinct, closely related hominid species that coexisted with early modern humans for a period before eventually becoming extinct, though genetic evidence shows some interbreeding occurred with Homo sapiens.",
      difficulty: "hard",
    },
  ]);

  console.log(
    "Grade 12 Batch 2 seed complete: 3 chapters, 9 concepts, 54 questions added."
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
