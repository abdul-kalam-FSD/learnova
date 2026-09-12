require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Stream = require("./src/models/Stream");

// Wires the previously-unused Stream model into real data. Grade
// 11/12 subjects were all being shown as one flat list regardless of
// stream (PCM and PCB students saw the exact same subject list,
// which is wrong per the platform's own Grade 11-12 spec: "Do NOT
// force every Grade 11 or Grade 12 student to study every subject").
//
// Only streams for which *content actually exists* are created here
// (Rule 13: don't invent curriculum facts). Grade 12 originally had
// no Mathematics/Computer Science content, so a Grade 12 PCM stream
// would have been empty/misleading — seedMathGrade12.js and
// seedCSGrade12.js filled that gap, so PCM is now created for both
// grades.
//
//   Grade 11 -> Science (PCM): Math/Physics/Chemistry core, CS elective
//   Grade 11 -> Science (PCB): Biology/Physics/Chemistry core
//   Grade 12 -> Science (PCM): Math/Physics/Chemistry core, CS elective
//   Grade 12 -> Science (PCB): Biology/Physics/Chemistry core
//
// Run seedMathGrade12.js and seedCSGrade12.js BEFORE this script (or
// re-run this script after them) — upsertStream() below only adds a
// subject to core_subject_ids if it can actually find it, so running
// this first would just create a PCM stream missing Math/CS until
// you re-run it.

async function findSubject(grade, nameRegex) {
  const subject = await Subject.findOne({ grade, name: nameRegex });
  if (!subject) {
    console.warn(
      `  ! No grade ${grade} subject matching ${nameRegex} — skipping it from this stream.`,
    );
  }
  return subject;
}

async function upsertStream({ name, grade, board, coreNames, electiveNames }) {
  const core = (
    await Promise.all(coreNames.map((n) => findSubject(grade, n)))
  ).filter(Boolean);
  const elective = (
    await Promise.all((electiveNames || []).map((n) => findSubject(grade, n)))
  ).filter(Boolean);

  if (core.length === 0) {
    console.warn(`Skipping "${name}" (Grade ${grade}) — none of its core subjects exist yet.`);
    return;
  }

  const existing = await Stream.findOne({ name, grade });
  if (existing) {
    existing.board = board;
    existing.core_subject_ids = core.map((s) => s._id);
    existing.elective_subject_ids = elective.map((s) => s._id);
    await existing.save();
    console.log(`Updated stream: ${name} (Grade ${grade}) — core: ${core.map((s) => s.name).join(", ")}`);
  } else {
    await Stream.create({
      name,
      grade,
      board,
      core_subject_ids: core.map((s) => s._id),
      elective_subject_ids: elective.map((s) => s._id),
    });
    console.log(`Created stream: ${name} (Grade ${grade}) — core: ${core.map((s) => s.name).join(", ")}`);
  }
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding grade 11/12 streams...");

  await upsertStream({
    name: "Science (PCM)",
    grade: 11,
    board: "CBSE",
    coreNames: [/mathematics|math/i, /physics/i, /chemistry/i],
    electiveNames: [/computer science/i],
  });

  await upsertStream({
    name: "Science (PCB)",
    grade: 11,
    board: "CBSE",
    coreNames: [/biology|science/i, /physics/i, /chemistry/i],
  });

  await upsertStream({
    name: "Science (PCM)",
    grade: 12,
    board: "CBSE",
    coreNames: [/mathematics|math/i, /physics/i, /chemistry/i],
    electiveNames: [/computer science/i],
  });

  await upsertStream({
    name: "Science (PCB)",
    grade: 12,
    board: "CBSE",
    coreNames: [/biology|science/i, /physics/i, /chemistry/i],
  });

  // Commerce stream added alongside Science (PCM/PCB) — see
  // seedCommerceAccountancyGrade11.js and its five sibling seed
  // files for the Accountancy/Business Studies/Economics content
  // that makes this stream non-empty. Same "only create a stream if
  // its core subjects actually exist" rule as above.
  await upsertStream({
    name: "Commerce",
    grade: 11,
    board: "CBSE",
    coreNames: [/accountancy/i, /business studies/i, /economics/i],
  });

  await upsertStream({
    name: "Commerce",
    grade: 12,
    board: "CBSE",
    coreNames: [/accountancy/i, /business studies/i, /economics/i],
  });

  console.log("Done seeding streams.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
