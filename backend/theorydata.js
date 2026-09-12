require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
const Case = require("./src/models/Case");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const result = await Case.updateOne(
    { title: "Why Can't She Breathe?" },
    {
      $set: {
        theory_prompt: "Why is she struggling to breathe near the pond?",
        theory_options: [
          {
            text: "Low oxygen due to fewer trees around the pond",
            correct: true,
            feedback:
              "This matches your evidence — trace the breathing pathway again if unsure.",
          },
          {
            text: "She is simply unfit",
            correct: false,
            feedback:
              "This doesn't explain the air-quality clue you found near the pond.",
          },
          {
            text: "The water itself is toxic",
            correct: false,
            feedback:
              "Your evidence pointed to air, not water quality — review the pond-tree clue.",
          },
        ],
      },
    },
  );

  console.log("Matched:", result.matchedCount, "Modified:", result.modifiedCount);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});