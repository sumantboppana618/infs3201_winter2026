"use strict"

const fs = require("fs/promises")
const promptSync = require("prompt-sync")

const prompt = promptSync({ sigint: true })
const EMPLOYEES_FILE = "./employees.json"
const SHIFTS_FILE = "./shifts.json"
const ASSIGNMENTS_FILE = "./assignments.json"


/**
 * Displays a repeating menu and processes user choices until Exit is selected.
 * @returns {Promise<void>}
 */
async function main() {
    var choice = ""

    while (choice !== "5") {
        printMenu()
        choice = prompt("What is your choice> ").trim()
        console.log("")

        if (choice === "1") {
            await listEmployeesAsync()
        } else if (choice === "2") {
            await addEmployee()
        } else if (choice === "3") {
            await assignShift()
        } else if (choice === "4") {
            await viewEmployeeSchedule()
        } else if (choice === "5") {
            console.log("Goodbye!")
        } else {
            console.log("Invalid choice. Please enter a number from 1 to 5.\n")
        }
    }
}

/**
 * Prints the main application menu to the console.
 * @returns {void}
 */
function printMenu() {
    console.log("1. Show all employees")
    console.log("2. Add new employee")
    console.log("3. Assign employee to shift")
    console.log("4. View employee schedule")
    console.log("5. Exit")
}

/**
 * Loads and parses the employees.json file.
 * Returns an empty array if the file cannot be read or parsed.
 *
 * @returns {Promise<Array>} Array of employee objects.
 */
async function loadEmployees() {
    try {
        var data = await fs.readFile(EMPLOYEES_FILE, "utf-8")
        var employees = JSON.parse(data)

        if (!Array.isArray(employees)) {
            return []
        }

        return employees
    } catch (err) {
        console.log("Error: Could not load employees.json.\n")
        return []
    }
}
/**
 * displays all employees in a formatted table
 * loads employee data fresh from the JSON file each time
 * @returns {Promise<void>}
 */
async function listEmployeesAsync() {
    var employees = await loadEmployees()
    console.log("Employee List:\n")
    var nameWidth = 4
    var i = 0
    while (i < employees.length) {
        if (employees[i] && employees[i].name) {
            if (employees[i].name.length > nameWidth) {
                nameWidth = employees[i].name.length
            }
        }
        i = i + 1
    }

    nameWidth = nameWidth + 2

    // prepare name header

    var nameHeader = "Name"
    while (nameHeader.length < nameWidth) {
        nameHeader = nameHeader + " "
    }

    // headers
    console.log("Employee ID " + nameHeader + "Phone")

    // divider
    var divider = ""
    i = 0
    while (i < 11) {
        divider = divider + "-"
        i = i + 1
    }

    divider = divider + " "

    i = 0
    while (i < nameWidth) {
        divider = divider + "-"
        i = i + 1
    }

    divider = divider + "---------"
    console.log(divider)

    // rows
    i = 0
    while (i < employees.length) {
        var emp = employees[i] || {}

        var id = emp.employeeId ? String(emp.employeeId) : ""
        var name = emp.name ? String(emp.name) : ""
        var phone = emp.phone ? String(emp.phone) : ""

        var namePadded = name
        while (namePadded.length < nameWidth) {
            namePadded = namePadded + " "
        }

        console.log(id + " " + namePadded + phone)

        i = i + 1
    }

    console.log("")
}

/**
 * Prompts the user for name and phone, generates the next employee ID,
 * saves the new employee to employees.json, and prints a confirmation message.
 *
 * @returns {Promise<void>}
 */
async function addEmployee() {
    try {
        await addEmployeeAsync()
    } catch (err) {
        console.log("Error: Could not add employee.\n")
    }
}

/**
 * Prompts for employee name and phone number, generates the next employee ID,
 * saves the employee to employees.json, and prints a confirmation message.
 *
 * @returns {Promise<void>}
 */
async function addEmployeeAsync() {
    var employees = await loadEmployees()

    var name = prompt("Enter employee name: ").trim()
    var phone = prompt("Enter phone number: ").trim()

    if (name.length === 0) {
        console.log("Error: Name cannot be empty.\n")
        return
    }

    if (phone.length === 0) {
        console.log("Error: Phone number cannot be empty.\n")
        return
    }

    var nextId = getNextEmployeeId(employees)

    var newEmployee = {
        employeeId: nextId,
        name: name,
        phone: phone
    }

    employees.push(newEmployee)

    await saveEmployees(employees)

    console.log("Employee added...\n")
}

/**
 * Determines the next available employee ID in the format E###
 * @param {Array} employees Array of employee objects
 * @returns {string} Newly generated employee ID
 */
function getNextEmployeeId(employees) {
    var maxNum = 0
    var i = 0

    while (i < employees.length) {
        var emp = employees[i]
        if (emp && emp.employeeId) {
            var id = String(emp.employeeId)

            if (id.length === 4 && id[0] === "E") {
                var numPart = id.substring(1)
                var num = parseInt(numPart, 10)

                if (!isNaN(num) && num > maxNum) {
                    maxNum = num
                }
            }
        }
        i = i + 1
    }

    var nextNum = maxNum + 1

    // zero pad to 3 digits
    var numText = String(nextNum)
    while (numText.length < 3) {
        numText = "0" + numText
    }

    return "E" + numText
}

/**
 * Saves the employees array back to employees.json.
 * @param {Array} employees Array of employee objects.
 * @returns {Promise<void>}
 */
async function saveEmployees(employees) {
    try {
        var jsonText = JSON.stringify(employees, null, 4)
        await fs.writeFile(EMPLOYEES_FILE, jsonText, "utf-8")
    } catch (err) {
        console.log("Error: Could not write to employees.json.\n")
        throw err
    }
}

/** 
 * wrapper to assign a shift with error handling
 * @returns {Promise<void>}
 */
async function assignShift() {
    try {
        await assignShiftAsync()
    } catch (err) {
        console.log("Error: Could not assign shift.\n")
    }
}

/**
 * Prompts for employee ID and shift ID, validates referential integrity,
 * enforces composite key uniqueness, and records the assignment.
 *
 * @returns {Promise<void>}
 */
async function assignShiftAsync() {
    var employees = await loadEmployees()
    var shifts = await loadShifts()
    var assignments = await loadAssignments()

    var employeeId = prompt("Enter employee ID: ").trim().toUpperCase()
    var shiftId = prompt("Enter shift ID: ").trim().toUpperCase()

    if (!employeeExists(employees, employeeId)) {
        console.log("Employee does not exist\n")
        return
    }

    if (!shiftExists(shifts, shiftId)) {
        console.log("Shift does not exist\n")
        return
    }

    if (assignmentExists(assignments, employeeId, shiftId)) {
        console.log("Employee already assigned to shift\n")
        return
    }

    var newAssignment = {
        employeeId: employeeId,
        shiftId: shiftId
    }

    assignments.push(newAssignment)
    await saveAssignments(assignments)

    console.log("Shift Recorded...\n")
}

/**
 * Loads and parses the shifts.json file.
 * Returns an empty array if the file cannot be read or parsed.
 *
 * @returns {Promise<Array>} Array of shift objects.
 */
async function loadShifts() {
    try {
        var data = await fs.readFile(SHIFTS_FILE, "utf-8")
        var shifts = JSON.parse(data)

        if (!Array.isArray(shifts)) {
            return []
        }

        return shifts
    } catch (err) {
        console.log("Error: Could not load shifts.json.\n")
        return []
    }
}

/**
 * Loads and parses the assignments.json file.
 * Returns an empty array if the file cannot be read or parsed.
 *
 * @returns {Promise<Array>} Array of assignment objects.
 */
async function loadAssignments() {
    try {
        var data = await fs.readFile(ASSIGNMENTS_FILE, "utf-8")
        var assignments = JSON.parse(data)

        if (!Array.isArray(assignments)) {
            return []
        }

        return assignments
    } catch (err) {
        console.log("Error: Could not load assignments.json.\n")
        return []
    }
}

/**
 * Saves the assignments array back to assignments.json.
 * @param {Array} assignments Array of assignment objects.
 * @returns {Promise<void>}
 */
async function saveAssignments(assignments) {
    try {
        var jsonText = JSON.stringify(assignments, null, 4)
        await fs.writeFile(ASSIGNMENTS_FILE, jsonText, "utf-8")
    } catch (err) {
        console.log("Error: Could not write to assignments.json.\n")
        throw err
    }
}

/**
 * Checks whether an employee exists with the given employee ID
 * @param {Array} employees Array of employee objects
 * @param {string} employeeId Employee ID to search for
 * @returns {boolean} True if employee exists, otherwise false
 */
function employeeExists(employees, employeeId) {
    var i = 0
    while (i < employees.length) {
        if (employees[i] && employees[i].employeeId === employeeId) {
            return true
        }
        i = i + 1
    }
    return false
}

/**
 * checks if a shift exists by shift ID
 * @param {Array} shifts Array of shift objects
 * @param {string} shiftId Shift ID to check
 * @returns {boolean} True if shift exists, otherwise false
 */
function shiftExists(shifts, shiftId) {
    var i = 0
    while (i < shifts.length) {
        if (shifts[i] && shifts[i].shiftId === shiftId) {
            return true
        }
        i = i + 1
    }
    return false
}

/**
 * checks if an assignment exists for the given employee ID and shift ID
 * @param {Array} assignments Array of assignment objects   
 * @param {string} employeeId Employee ID to check
 * @param {string} shiftId Shift ID to check
 * @returns {boolean} True if assignment exists, otherwise false
 */
function assignmentExists(assignments, employeeId, shiftId) {
    var i = 0
    while (i < assignments.length) {
        if (assignments[i]) {
            if (assignments[i].employeeId === employeeId && assignments[i].shiftId === shiftId) {
                return true
            }
        }
        i = i + 1
    }
    return false
}

/**
 * wrapper to view an employee schedule with error handling
 * @returns {Promise<void>}
 */
async function viewEmployeeSchedule() {
    try {
        await viewEmployeeScheduleAsync()
    } catch (err) {
        console.log("Error: Could not view employee schedule.\n")
    }
}

/** 
 * prompts for employee ID and displays their schedule in CSV format
 * @returns {Promise<void>}
 */
async function viewEmployeeScheduleAsync() {
    var employees = await loadEmployees()
    var shifts = await loadShifts()
    var assignments = await loadAssignments()

    var employeeId = prompt("Enter employee ID: ").trim().toUpperCase()

    // print header
    console.log("date,startTime,endTime")

    if (!employeeExists(employees, employeeId)) {
        console.log("")
        return
    }

    // collect shiftIds assigned to this employee
    var shiftIds = []
    var i = 0
    while (i < assignments.length) {
        var a = assignments[i]
        if (a && a.employeeId === employeeId) {
            shiftIds.push(a.shiftId)
        }
        i = i + 1
    }

    if (shiftIds.length === 0) {
        console.log("")
        return
    }

    // for each shiftId, find matching shift record and print it
    i = 0
    while (i < shiftIds.length) {
        var shiftId = shiftIds[i]
        var shift = findShiftById(shifts, shiftId)

        if (shift) {
            console.log(shift.date + "," + shift.startTime + "," + shift.endTime)
        }

        i = i + 1
    }

    console.log("")
}

/**
 * Finds and returns a shift object by shiftId.
 *
 * @param {Array} shifts Array of shift objects.
 * @param {string} shiftId Shift ID to find.
 * @returns {object|null} Shift object if found, otherwise null.
 */  
function findShiftById(shifts, shiftId) {
    var i = 0
    while (i < shifts.length) {
        if (shifts[i] && shifts[i].shiftId === shiftId) {
            return shifts[i]
        }
        i = i + 1
    }
    return null
}


main().catch(function (err) {
    console.error("Application error:", err.message)
})
