"use strict";

const persistence = require("./persistence");

/**
 * Get all employees for landing page.
 * @returns {Promise<Array<{employeeId:string,name:string,phone:string}>>}
 */
async function getAllEmployees() {
  return await persistence.getAllEmployees();
}

/**
 * Get one employee by employeeId.
 * @param {string} employeeId
 * @returns {Promise<{employeeId:string,name:string,phone:string} | null>}
 */
async function getEmployeeById(employeeId) {
  return await persistence.getEmployeeById(employeeId);
}

/**
 * Get employee shifts (from assignments + shifts), sorted by date/time,
 * and add startClass="morning" if startTime is before 12:00.
 * @param {string} employeeId
 * @returns {Promise<Array<{date:string,startTime:string,endTime:string,startClass:string}>>}
 */
async function getEmployeeShiftsSorted(employeeId) {
  const shifts = await persistence.getShiftsForEmployee(employeeId);

  // Bubble sort (no callback array methods)
  for (let i = 0; i < shifts.length; i++) {
    for (let j = 0; j < shifts.length - 1; j++) {
      const aKey = shifts[j].date + " " + shifts[j].startTime;
      const bKey = shifts[j + 1].date + " " + shifts[j + 1].startTime;

      if (aKey > bKey) {
        const tmp = shifts[j];
        shifts[j] = shifts[j + 1];
        shifts[j + 1] = tmp;
      }
    }
  }

  // Add highlight class for start time before 12:00
  for (let k = 0; k < shifts.length; k++) {
    const hour = Number(shifts[k].startTime.substring(0, 2));
    shifts[k].startClass = hour < 12 ? "morning" : "";
  }

  return shifts;
}

/**
 * Update employee details.
 * @param {string} employeeId
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<boolean>} true if updated, false if not found
 */
async function updateEmployee(employeeId, name, phone) {
  return await persistence.updateEmployee(employeeId, name, phone);
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEmployeeShiftsSorted,
  updateEmployee,
};