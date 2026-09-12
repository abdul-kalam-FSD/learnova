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
        experiment: {
          prompt: "Test the Airway",
          clue_text:
            "Simulate how wide her airway is and observe how easily air passes through.",
          variable_name: "Airway Diameter",
          min: 1,
          max: 10,
          unit: "mm (relative)",
          threshold: 5,
          good_outcome_text:
            "At this width, air flows freely — breathing feels normal.",
          bad_outcome_text:
            "The airway is too narrow here — air struggles to pass, matching her breathlessness.",
        },
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