"use strict";

const persistence = require("./persistence");

/**
 * Lists all employees (passthrough).
 * @returns {Promise<Array<{employeeId:string,name:string,phone:string}>>}
 */
async function listEmployees() {
  return await persistence.getAllEmployees();
}

/**
 * Adds an employee after validating inputs and generating next ID.
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<{ok:boolean,message:string}>}
 */
async function addEmployee(name, phone) {
  if (!name || name.trim().length === 0) {
    return { ok: false, message: "Error: Name cannot be empty." };
  }
  if (!phone || phone.trim().length === 0) {
    return { ok: false, message: "Error: Phone number cannot be empty." };
  }

  const nextId = await persistence.getNextEmployeeId();
  await persistence.insertEmployee({
    employeeId: nextId,
    name: name.trim(),
    phone: phone.trim(),
  });

  return { ok: true, message: "Employee added." };
}

/**
 * Assigns a shift with:
 * - referential integrity checks
 * - composite key uniqueness
 * - maxDailyHours rule from config.json
 *
 * @param {string} employeeId
 * @param {string} shiftId
 * @returns {Promise<{ok:boolean,message:string}>}
 */
async function assignShift(employeeId, shiftId) {
  // 1) validate employee exists
  const emp = await persistence.findEmployee(employeeId);
  if (!emp) return { ok: false, message: "Employee does not exist" };

  // 2) validate shift exists
  const shift = await persistence.findShift(shiftId);
  if (!shift) return { ok: false, message: "Shift does not exist" };

  // 3) uniqueness (employeeId, shiftId)
  const alreadyAssigned = await persistence.assignmentExists(employeeId, shiftId);
  if (alreadyAssigned) return { ok: false, message: "Employee already assigned to shift" };

  // 4) maxDailyHours rule
  const config = await persistence.getConfig();
  const maxDailyHours = typeof config.maxDailyHours === "number" ? config.maxDailyHours : 9;

  const shiftsForDay = await persistence.getEmployeeShiftsByDate(employeeId, shift.date);

  let currentHours = 0;
  for (const s of shiftsForDay) {
    currentHours += computeShiftDuration(s.startTime, s.endTime);
  }

  const newShiftHours = computeShiftDuration(shift.startTime, shift.endTime);
  const totalIfAdded = currentHours + newShiftHours;

  if (totalIfAdded > maxDailyHours) {
    return {
      ok: false,
      message:
        `Cannot assign shift: daily hour limit exceeded ` +
        `(current=${currentHours.toFixed(2)}, new=${newShiftHours.toFixed(2)}, ` +
        `limit=${maxDailyHours}).`,
    };
  }
  await persistence.insertAssignment({ employeeId, shiftId });
  return { ok: true, message: "Shift Recorded..." };
}


/**
 * Computes the number of hours between startTime and endTime in 24-hour "HH:MM" format.
 * Returns 0 for invalid inputs or if endTime is not after startTime.
 *
 * @param {string} startTime - Start time in "HH:MM" 24-hour format.
 * @param {string} endTime - End time in "HH:MM" 24-hour format.
 * @returns {number} Duration in hours (can be fractional).
 */
function computeShiftDuration(startTime, endTime) {
  if (typeof startTime !== "string" || typeof endTime !== "string") {
    return 0;
  }

  const startParts = startTime.split(":");
  const endParts = endTime.split(":");
  if (startParts.length !== 2 || endParts.length !== 2) {
    return 0;
  }

  const sh = parseInt(startParts[0], 10);
  const sm = parseInt(startParts[1], 10);
  const eh = parseInt(endParts[0], 10);
  const em = parseInt(endParts[1], 10);

  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  if (sh < 0 || sh > 23 || eh < 0 || eh > 23) return 0;
  if (sm < 0 || sm > 59 || em < 0 || em > 59) return 0;

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  const diff = endMinutes - startMinutes;
  if (diff <= 0) return 0;

  return diff / 60;
}

/**
 * Returns an employee schedule as an array of shift objects.
 * @param {string} employeeId
 * @returns {Promise<{ok:boolean,schedule?:Array<{date:string,startTime:string,endTime:string}>,message?:string}>}
 */
async function getEmployeeSchedule(employeeId) {
  const emp = await persistence.findEmployee(employeeId);
  if (!emp) return { ok: false, message: "Employee does not exist" };

  const schedule = await persistence.getEmployeeSchedule(employeeId);


  schedule.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    return 0;
  });

  return { ok: true, schedule };
}

module.exports = {
  listEmployees,
  addEmployee,
  assignShift,
  getEmployeeSchedule,
  computeShiftDuration, 
};
