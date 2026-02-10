"use strict";

const fs = require("fs/promises");

const EMPLOYEES_FILE = "./employees.json";
const SHIFTS_FILE = "./shifts.json";
const ASSIGNMENTS_FILE = "./assignments.json";
const CONFIG_FILE = "./config.json";

/**
 * Reads JSON from a file. Returns fallback on error.
 * @param {string} path
 * @param {*} fallback
 * @returns {Promise<*>}
 */
async function readJson(path, fallback) {
  try {
    const raw = await fs.readFile(path, "utf-8");
    const data = JSON.parse(raw);
    return data;
  } catch {
    return fallback;
  }
}

/**
 * Writes JSON to a file (pretty formatted).
 * @param {string} path
 * @param {*} data
 * @returns {Promise<void>}
 */
async function writeJson(path, data) {
  const jsonText = JSON.stringify(data, null, 4);
  await fs.writeFile(path, jsonText, "utf-8");
}

/**
 * Gets config.json (expects { "maxDailyHours": number }).
 * @returns {Promise<{maxDailyHours:number}>}
 */
async function getConfig() {
  const cfg = await readJson(CONFIG_FILE, { maxDailyHours: 9 });
  if (!cfg || typeof cfg !== "object") return { maxDailyHours: 9 };
  if (typeof cfg.maxDailyHours !== "number") return { maxDailyHours: 9 };
  return cfg;
}

/**
 * Returns all employees.
 * @returns {Promise<Array<{employeeId:string,name:string,phone:string}>>}
 */
async function getAllEmployees() {
  const employees = await readJson(EMPLOYEES_FILE, []);
  return Array.isArray(employees) ? employees : [];
}

/**
 * Finds a single employee by employeeId.
 * @param {string} employeeId
 * @returns {Promise<{employeeId:string,name:string,phone:string}|null>}
 */
async function findEmployee(employeeId) {
  const employees = await getAllEmployees();
  for (const e of employees) {
    if (e && e.employeeId === employeeId) return e;
  }
  return null;
}

/**
 * Returns next available employee ID in format E###.
 * @returns {Promise<string>}
 */
async function getNextEmployeeId() {
  const employees = await getAllEmployees();
  let maxNum = 0;

  for (const emp of employees) {
    const id = emp?.employeeId ? String(emp.employeeId) : "";
    if (id.length === 4 && id[0] === "E") {
      const num = parseInt(id.substring(1), 10);
      if (!Number.isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  let numText = String(nextNum);
  while (numText.length < 3) numText = "0" + numText;
  return "E" + numText;
}

/**
 * Inserts a new employee.
 * @param {{employeeId:string,name:string,phone:string}} employee
 * @returns {Promise<void>}
 */
async function insertEmployee(employee) {
  const employees = await getAllEmployees();
  employees.push(employee);
  await writeJson(EMPLOYEES_FILE, employees);
}


/**
 * Finds a shift by shiftId.
 * @param {string} shiftId
 * @returns {Promise<{shiftId:string,date:string,startTime:string,endTime:string}|null>}
 */
async function findShift(shiftId) {
  const shifts = await getAllShifts();
  for (const s of shifts) {
    if (s && s.shiftId === shiftId) return s;
  }
  return null;
}


/**
 * Checks if assignment exists for employeeId+shiftId composite key.
 * @param {string} employeeId
 * @param {string} shiftId
 * @returns {Promise<boolean>}
 */
async function assignmentExists(employeeId, shiftId) {
  const assignments = await getAllAssignments();
  for (const a of assignments) {
    if (a && a.employeeId === employeeId && a.shiftId === shiftId) return true;
  }
  return false;
}

/**
 * Inserts an assignment record.
 * @param {{employeeId:string,shiftId:string}} assignment
 * @returns {Promise<void>}
 */
async function insertAssignment(assignment) {
  const assignments = await getAllAssignments();
  assignments.push(assignment);
  await writeJson(ASSIGNMENTS_FILE, assignments);
}

/**
 * Gets all shifts assigned to an employee for a specific date.
 * (Does the filtering in persistence layer, not business layer.)
 *
 * @param {string} employeeId
 * @param {string} date
 * @returns {Promise<Array<{shiftId:string,date:string,startTime:string,endTime:string}>>}
 */
async function getEmployeeShiftsByDate(employeeId, date) {
  const assignments = await getAllAssignments();
  const shifts = await getAllShifts();

  const shiftIds = [];
  for (const a of assignments) {
    if (a && a.employeeId === employeeId) shiftIds.push(a.shiftId);
  }

  const result = [];
  for (const sid of shiftIds) {
    for (const s of shifts) {
      if (s && s.shiftId === sid && s.date === date) {
        result.push(s);
      }
    }
  }

  return result;
}

/**
 * Gets full schedule (shift records) for one employee.
 * @param {string} employeeId
 * @returns {Promise<Array<{date:string,startTime:string,endTime:string}>>}
 */
async function getEmployeeSchedule(employeeId) {
  const assignments = await getAllAssignments();
  const shifts = await getAllShifts();

  const shiftIds = [];
  for (const a of assignments) {
    if (a && a.employeeId === employeeId) shiftIds.push(a.shiftId);
  }

  const schedule = [];
  for (const sid of shiftIds) {
    for (const s of shifts) {
      if (s && s.shiftId === sid) {
        schedule.push({ date: s.date, startTime: s.startTime, endTime: s.endTime });
      }
    }
  }

  return schedule;
}

/**
 * Returns all shifts.
 * @returns {Promise<Array<{shiftId:string,date:string,startTime:string,endTime:string}>>}
 */
async function getAllShifts() {
  const shifts = await readJson(SHIFTS_FILE, []);
  return Array.isArray(shifts) ? shifts : [];
}

/**
 * Returns all assignments.
 * @returns {Promise<Array<{employeeId:string,shiftId:string}>>}
 */
async function getAllAssignments() {
  const assignments = await readJson(ASSIGNMENTS_FILE, []);
  return Array.isArray(assignments) ? assignments : [];
}

module.exports = {
  // config
  getConfig,

  // employees
  getAllEmployees,
  findEmployee,
  getNextEmployeeId,
  insertEmployee,

  // shifts
  getAllShifts,
  findShift,

  // assignments
  getAllAssignments,
  assignmentExists,
  insertAssignment,

  // schedule helpers
  getEmployeeShiftsByDate,
  getEmployeeSchedule,
};
