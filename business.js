"use strict";

const persistence = require("./persistence");

async function getAllEmployees() {
  return await persistence.getAllEmployees();
}

async function getEmployeeById(employeeId) {
  return await persistence.getEmployeeById(employeeId);
}

async function getEmployeeShiftsSorted(employeeId) {
  const shifts = await persistence.getShiftsForEmployee(employeeId);

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

  for (let k = 0; k < shifts.length; k++) {
    const hour = Number(shifts[k].startTime.substring(0, 2));
    shifts[k].startClass = hour < 12 ? "morning" : "";
  }

  return shifts;
}

async function updateEmployee(employeeId, name, phone) {
  return await persistence.updateEmployee(employeeId, name, phone);
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEmployeeShiftsSorted,
  updateEmployee,
};