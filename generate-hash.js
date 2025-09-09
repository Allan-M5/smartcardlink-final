// C:\Users\ADMIN\Desktop\smartcardlink-app\generate-hash.js

const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the password to hash: ", async (password) => {
  if (!password) {
    console.error("❌ Password cannot be empty. Aborting.");
    rl.close();
    process.exit(1);
  }

  const saltRounds = 10;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("\n✅ Hashed password generated successfully:");
    console.log(`\n${hashedPassword}\n`);
    console.log(
      "👉 Copy this hash and paste it as the value for ADMIN_PASSWORD_HASH in your .env file."
    );
  } catch (err) {
    console.error("❌ Error hashing password:", err);
  } finally {
    rl.close();
  }
});