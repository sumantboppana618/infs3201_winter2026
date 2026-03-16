"use strict";

const { MongoClient, ObjectId } = require("mongodb");
const config = require("./config.json");

const DB_NAME = "infs3201_winter2026";

/**
 * One-time transformation program to migrate Assignment 3 schema to Assignment 4 schema.
 * 1. Adds 'employees' array in shifts.
 * 2. Embeds assigned employee _ids from assignments into shift documents.
 * 3. Removes employeeId/shiftId fields and drops assignments collection.
 * @returns {Promise<void>}
 */
async function main() {
  const uri = config.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required in config.json");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log("Connected to", DB_NAME);

  // Step 1: Add empty employees array to each shift if missing.
  console.log("Step 1: Adding employees array to shifts...");
  await db.collection("shifts").updateMany(
    { employees: { $exists: false } },
    { $set: { employees: [] } }
  );

  // Step 2: Embed employees in shifts based on assignments.
  console.log("Step 2: Embedding employees in shifts from assignments...");
  const assignments = await db.collection("assignments").find({}).toArray();

  for (const assignment of assignments) {
    const employeeIdValue = assignment.employeeId;
    const shiftIdValue = assignment.shiftId;

    const employee = await db.collection("employees").findOne({ employeeId: employeeIdValue });
    const shift = await db.collection("shifts").findOne({ shiftId: shiftIdValue });

    if (!employee || !shift) {
      continue;
    }

    await db.collection("shifts").updateOne(
      { _id: shift._id },
      { $addToSet: { employees: employee._id } }
    );
  }

  // Step 3: Remove unnecessary fields and collection.
  console.log("Step 3: Removing employeeId and shiftId fields...");

  await db.collection("employees").updateMany({}, { $unset: { employeeId: "" } });
  await db.collection("shifts").updateMany({}, { $unset: { shiftId: "" } });

  const assignmentExists = await db.listCollections({ name: "assignments" }).hasNext();
  if (assignmentExists) {
    console.log("Dropping assignments collection...");
    await db.collection("assignments").drop();
  }

  console.log("Migration complete.");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});