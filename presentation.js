"use strict";

const promptSync = require("prompt-sync");
const business = require("./business");

const prompt = promptSync({ sigint: true });



/**
 * Prints employees in a formatted table (no raw JSON output).
 * @param {Array<{employeeId:string,name:string,phone:string}>} employees
 * @returns {void}
 */
function printEmployeesTable(employees) {
  console.log("Employee List:\n");

  let nameWidth = 4;
  for (let e of employees) {
    if (e && e.name && e.name.length > nameWidth) nameWidth = e.name.length;
  }
  nameWidth += 2;

  let nameHeader = "Name";
  while (nameHeader.length < nameWidth) nameHeader += " ";

  console.log("Employee ID " + nameHeader + "Phone");

  let divider = "";
  for (let i = 0; i < 11; i++) divider += "-";
  divider += " ";
  for (let i = 0; i < nameWidth; i++) divider += "-";
  divider += "---------";
  console.log(divider);

  for (let emp of employees) {
    const id = emp?.employeeId ? String(emp.employeeId) : "";
    const name = emp?.name ? String(emp.name) : "";
    const phone = emp?.phone ? String(emp.phone) : "";

    let namePadded = name;
    while (namePadded.length < nameWidth) namePadded += " ";

    console.log(id + " " + namePadded + phone);
  }

  console.log("");
}

/**
 * Displays a repeating menu and processes user choices until Exit is selected.
 * @returns {Promise<void>}
 */
async function main() {
  let choice = "";

  while (choice !== "5") {
    printMenu();
    choice = prompt("What is your choice> ").trim();
    console.log("");

    if (choice === "1") {
      const employees = await business.listEmployees();
      printEmployeesTable(employees);
    } else if (choice === "2") {
      const name = prompt("Enter employee name: ").trim();
      const phone = prompt("Enter phone number: ").trim();

      const result = await business.addEmployee(name, phone);
      if (!result.ok) {
        console.log(result.message + "\n");
      } else {
        console.log("Employee added...\n");
      }
    } else if (choice === "3") {
      const employeeId = prompt("Enter employee ID: ").trim().toUpperCase();
      const shiftId = prompt("Enter shift ID: ").trim().toUpperCase();

      const result = await business.assignShift(employeeId, shiftId);
      console.log(result.message + "\n");
    } else if (choice === "4") {
      const employeeId = prompt("Enter employee ID: ").trim().toUpperCase();
      const result = await business.getEmployeeSchedule(employeeId);

      console.log("date,startTime,endTime");
      if (!result.ok) {
        console.log(""); 
        console.log("");
      } else {
        for (const s of result.schedule) {
          console.log(`${s.date},${s.startTime},${s.endTime}`);
        }
        console.log("");
      }
    } else if (choice === "5") {
      console.log("Goodbye!");
    } else {
      console.log("Invalid choice. Please enter a number from 1 to 5.\n");
    }
  }
}

/**
 * Prints the main application menu to the console.
 * @returns {void}
 */
function printMenu() {
  console.log("1. Show all employees");
  console.log("2. Add new employee");
  console.log("3. Assign employee to shift");
  console.log("4. View employee schedule");
  console.log("5. Exit");
}

main().catch(function (err) {
  console.error("Application error:", err.message);
});
