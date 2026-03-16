"use strict";

const { MongoClient, ObjectId } = require("mongodb");
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
  const docs = await db
    .collection("employees")
    .find({}, { projection: { name: 1, phone: 1, photo: 1 } })
    .toArray();
  return docs.map((doc) => ({ id: doc._id.toString(), name: doc.name, phone: doc.phone, photo: doc.photo }));
}

/**
 * Get one employee by _id string.
 * @param {string} id
 * @returns {Promise<{_id: import("mongodb").ObjectId,name:string,phone:string,photo?:string} | null>}
 */
async function getEmployeeById(id) {
  const db = await getDb();
  let objectId;
  try {
    objectId = new ObjectId(id);
  } catch (e) {
    return null;
  }
  return await db.collection("employees").findOne({ _id: objectId });
}

/**
 * Get shifts assigned to an employee _id string.
 * @param {string} id
 * @returns {Promise<Array<{date:string,startTime:string,endTime:string}>>}
 */
async function getShiftsForEmployee(id) {
  const db = await getDb();
  let objectId;
  try {
    objectId = new ObjectId(id);
  } catch (e) {
    return [];
  }

  const shiftDocs = await db
    .collection("shifts")
    .find({ employees: objectId }, { projection: { date: 1, startTime: 1, endTime: 1 } })
    .toArray();

  return shiftDocs.map((shiftDoc) => ({
    date: shiftDoc.date,
    startTime: shiftDoc.startTime,
    endTime: shiftDoc.endTime,
  }));
}

/**
 * Update one employee's name and phone by _id.
 * @param {string} employeeId
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<boolean>} true if updated, false if no employee matched
 */
async function updateEmployee(employeeId, name, phone) {
  const db = await getDb();
  let objectId;
  try {
    objectId = new ObjectId(employeeId);
  } catch (e) {
    return false;
  }

  const r = await db.collection("employees").updateOne(
    { _id: objectId },
    { $set: { name: name, phone: phone } }
  );
  return r.matchedCount === 1;
}

async function getUserByUsername(username) {
  const db = await getDb();
  return await db.collection("users").findOne({ username: username });
}

async function insertSecurityLog(username, url, method) {
  const db = await getDb();
  await db.collection("security_log").insertOne({
    timestamp: new Date(),
    username: username || "unknown",
    url,
    method,
  });
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getShiftsForEmployee,
  updateEmployee,
  getUserByUsername,
  insertSecurityLog,
};