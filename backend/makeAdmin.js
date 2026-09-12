require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node makeAdmin.js <email>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email "${email}". They need to sign up first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`${email} is already an admin.`);
  } else {
    const previousRole = user.role;
    user.role = "admin";
    await user.save();
    console.log(`Promoted ${email} from "${previousRole}" to "admin".`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
