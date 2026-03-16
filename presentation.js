"use strict";

const crypto = require("crypto");
const express = require("express");
const path = require("path");

const business = require("./business");
const persistence = require("./persistence");

const app = express();
const SESSION_COOKIE = "sid";
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const sessions = new Map();

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, pair) => {
    const index = pair.indexOf("=");
    if (index === -1) return acc;
    const key = pair.slice(0, index).trim();
    const val = pair.slice(index + 1).trim();
    acc[key] = decodeURIComponent(val);
    return acc;
  }, {});
}

function createSession(username) {
  const sessionId = crypto.randomBytes(20).toString("hex");
  sessions.set(sessionId, {
    username,
    expiresAt: Date.now() + SESSION_TIMEOUT_MS,
  });
  return sessionId;
}

function getSession(req) {
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE];
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(sid);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
  return { sid, ...session };
}

async function securityLogMiddleware(req, res, next) {
  const session = getSession(req);
  const username = session ? session.username : "unknown";
  await persistence.insertSecurityLog(username, req.originalUrl, req.method);
  next();
}

app.use(securityLogMiddleware);

function authMiddleware(req, res, next) {
  if (req.path === "/login" || req.path === "/logout") {
    return next();
  }

  const session = getSession(req);
  if (!session) {
    res.redirect("/login?message=" + encodeURIComponent("Please login to continue."));
    return;
  }

  req.username = session.username;
  next();
}

app.use(authMiddleware);

app.get("/login", (req, res) => {
  const message = String(req.query.message ?? "").trim();
  res.render("login", { message });
});

app.post("/login", async (req, res) => {
  const username = String(req.body.username ?? "").trim();
  const password = String(req.body.password ?? "");

  const user = await persistence.getUserByUsername(username);
  const hashed = crypto.createHash("sha256").update(password).digest("hex");

  if (!user || user.passwordHash !== hashed) {
    res.redirect("/login?message=" + encodeURIComponent("Invalid username or password."));
    return;
  }

  const sid = createSession(user.username);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${sid}; HttpOnly; Path=/; Max-Age=${SESSION_TIMEOUT_MS / 1000}`);
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE];
  if (sid) {
    sessions.delete(sid);
  }
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.redirect("/login?message=" + encodeURIComponent("You have logged out."));
});

app.get("/", async (req, res) => {
  const employees = await business.getAllEmployees();
  res.render("landing", { employees });
});

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
  res.render("employee", { employee: { ...employee, id: employee._id.toString() }, shifts });
});

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

  res.render("editEmployee", { employee: { ...employee, id: employee._id.toString() } });
});

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

  res.redirect("/");
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});