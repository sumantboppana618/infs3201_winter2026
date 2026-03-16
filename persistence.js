"use strict";

const { MongoClient } = require("mongodb");
const config = require("./config.json");

const DB_NAME = "infs3201_winter2026";

let mongoClient = null;

/**
 * Get (and cache) a connected MongoClient.
 * @returns {Promise<MongoClient>}
 */
async function getClient() {
  if (mongoClient) {
    return mongoClient;
  }

  const uri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  return mongoClient;
}

/**
 * Get DB handle.
 * @returns {Promise<import("mongodb").Db>}
 */
async function getDb() {
  const client = await getClient();
  return client.db(DB_NAME);
}

/**
 * Get all employees (for landing page).
 * @returns {Promise<Array<{employeeId:string,name:string,phone:string}>>}
 */
async function getAllEmployees() {
  const db = await getDb();
  return await db.collection("employees").find({}).toArray();
}

/**
 * Get one employee by employeeId.
 * @param {string} employeeId
 * @returns {Promise<{employeeId:string,name:string,phone:string} | null>}
 */
async function getEmployeeById(employeeId) {
  const db = await getDb();
  return await db.collection("employees").findOne({ employeeId: employeeId });
}

/**
 * Get shifts for an employee by:
 * 1) finding assignments for the employee
 * 2) fetching each shift by shiftId (no loading full shifts collection)
 *
 * @param {string} employeeId
 * @returns {Promise<Array<{date:string,startTime:string,endTime:string}>>}
 */
async function getShiftsForEmployee(employeeId) {
  const db = await getDb();

  const assignmentDocs = await db
    .collection("assignments")
    .find({ employeeId: employeeId })
    .toArray();

  const result = [];

  for (let i = 0; i < assignmentDocs.length; i++) {
    const shiftId = assignmentDocs[i].shiftId;

    // fetch only the one needed shift (efficient)
    const shiftDoc = await db.collection("shifts").findOne({ shiftId: shiftId });

    if (shiftDoc) {
      result.push({
        date: shiftDoc.date,
        startTime: shiftDoc.startTime,
        endTime: shiftDoc.endTime,
      });
    }
  }

  return result;
}

/**
 * Update one employee's name and phone.
 * @param {string} employeeId
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<boolean>} true if updated, false if no employee matched
 */
async function updateEmployee(employeeId, name, phone) {
  const db = await getDb();
  const r = await db.collection("employees").updateOne(
    { employeeId: employeeId },
    { $set: { name: name, phone: phone } }
  );
  return r.matchedCount === 1;
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getShiftsForEmployee,
  updateEmployee,
};