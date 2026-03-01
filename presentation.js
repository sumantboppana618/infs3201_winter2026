"use strict";

const express = require("express");
const path = require("path");

const business = require("./business");

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

/**
 * Landing Page Route
 * Displays a list of all employees.
 *
 * @route GET /
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
app.get("/", async (req, res) => {
  const employees = await business.getAllEmployees();
  res.render("landing", { employees });
});

/**
 * Employee Details Route
 * Displays employee information and their sorted shifts.
 *
 * @route GET /employee/:employeeId
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
app.get("/employee/:employeeId", async (req, res) => {
  const employeeId = String(req.params.employeeId ?? "").trim();
  if (employeeId.length === 0) {
    res.status(400).send("Invalid employee id.");
    return;
  }

  const employee = await business.getEmployeeById(employeeId);
  if (!employee) {
    res.status(404).send("Employee not found.");
    return;
  }

  const shifts = await business.getEmployeeShiftsSorted(employeeId);
  res.render("employee", { employee, shifts });
});

/**
 * Edit Employee Form Route
 * Displays the edit form with pre-filled employee data.
 *
 * @route GET /employee/:employeeId/edit
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
app.get("/employee/:employeeId/edit", async (req, res) => {
  const employeeId = String(req.params.employeeId ?? "").trim();
  if (employeeId.length === 0) {
    res.status(400).send("Invalid employee id.");
    return;
  }

  const employee = await business.getEmployeeById(employeeId);
  if (!employee) {
    res.status(404).send("Employee not found.");
    return;
  }

  res.render("editEmployee", { employee });
});

/**
 * Edit Employee Submit Route
 * Validates input, updates the database, and performs PRG redirect.
 *
 * @route POST /employee/:employeeId/edit
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
app.post("/employee/:employeeId/edit", async (req, res) => {
  const employeeId = String(req.params.employeeId ?? "").trim();
  if (employeeId.length === 0) {
    res.status(400).send("Invalid employee id.");
    return;
  }

  const name = (req.body.name ?? "").trim();
  const phone = (req.body.phone ?? "").trim();

  if (name.length === 0) {
    res.status(400).send("Validation error: Name must not be empty.");
    return;
  }

  const phoneRegex = /^\d{4}-\d{4}$/;
  if (!phoneRegex.test(phone)) {
    res.status(400).send("Validation error: Phone must be ####-####.");
    return;
  }

  const ok = await business.updateEmployee(employeeId, name, phone);
  if (!ok) {
    res.status(404).send("Employee not found.");
    return;
  }

  // PRG pattern
  res.redirect("/");
});

/**
 * Starts the Express server.
 *
 * @function
 * @returns {void}
 */
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});