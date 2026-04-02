"use strict";

const { MongoClient } = require("mongodb");
const config = require("./config.json");

const uri = process.env.MONGODB_URI || config.MONGODB_URI;
const DB = process.env.DB_NAME || config.dbName || "infs3201_winter2026";

async function main() {
  if (!uri) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(DB).collection("users");

  await col.updateOne(
    { username: "admin" },
    {
      $set: {
        username: "admin",
        password: "admin123",
        email: "admin@example.com",
        failedAttempts: 0,
        locked: false,
      },
      $unset: { passwordHash: "", twoFactor: "" },
    },
    { upsert: true }
  );

  await col.updateOne(
    { username: "staff" },
    {
      $set: {
        username: "staff",
        password: "staff123",
        email: "staff@example.com",
        failedAttempts: 0,
        locked: false,
      },
      $unset: { passwordHash: "", twoFactor: "" },
    },
    { upsert: true }
  );

  const users = await col.find({}).toArray();
  console.log("Users now:", users);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
