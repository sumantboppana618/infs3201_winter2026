"use strict";

const crypto = require("crypto");
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const business = require("./business");
const persistence = require("./persistence");

const app = express();
const SESSION_COOKIE = "sid";
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const sessions = new Map();

const uploadsRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot);
}

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

function parseCookies(header) {
  const cookies = {};
  if (!header) {
    return cookies;
  }

  const parts = header.split(";");
  for (let i = 0; i < parts.length; i++) {
    const section = parts[i].trim();
    const eqIndex = section.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = section.substring(0, eqIndex);
    const value = section.substring(eqIndex + 1);
    cookies[key] = value;
  }
  return cookies;
}

function setSessionCookie(res, sid) {
  const maxAgeSeconds = Math.floor(SESSION_TIMEOUT_MS / 1000);
  res.setHeader("Set-Cookie", SESSION_COOKIE + "=" + sid + "; HttpOnly; Path=/; Max-Age=" + String(maxAgeSeconds));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", SESSION_COOKIE + "=; HttpOnly; Path=/; Max-Age=0");
}

app.use(async (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[SESSION_COOKIE];
  if (!sid) {
    return next();
  }

  const record = sessions.get(sid);
  if (!record) {
    return next();
  }

  const now = Date.now();
  if (now - record.lastAccess > SESSION_TIMEOUT_MS) {
    sessions.delete(sid);
    return next();
  }

  record.lastAccess = now;
  req.user = { username: record.username };
  return next();
});

function ensureAuth(req, res, next) {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  next();
}

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const employeeId = String(req.params.employeeId || "").trim();
    const dir = path.join(uploadsRoot, employeeId);
    fs.mkdir(dir, { recursive: true }, function (err) {
      cb(err, dir);
    });
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1000000);
    cb(null, unique + ".pdf");
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
      return;
    }
    cb(new Error("PDF_ONLY"));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

async function checkDocLimit(req, res, next) {
  const employeeId = String(req.params.employeeId || "").trim();
  const count = await business.countDocuments(employeeId);
  if (count >= 5) {
    res.status(400).send("Upload limit reached (5 documents).");
    return;
  }
  next();
}

// Login routes
app.get("/login", (req, res) => {
  if (req.user) {
    res.redirect("/");
    return;
  }
  res.render("login", { message: "" });
});

app.post("/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  const result = await business.startLogin(username, password);

  if (result.status === "needs_2fa") {
    res.render("twoFactor", { username: username, message: "A 2FA code was sent to your email." });
    return;
  }

  res.render("login", { message: result.message });
});

app.get("/2fa", (req, res) => {
  if (req.user) {
    res.redirect("/");
    return;
  }
  res.render("twoFactor", { username: "", message: "Enter the code we emailed you." });
});

app.post("/2fa", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const code = String(req.body.code || "").trim();

  const result = await business.verifyTwoFactor(username, code);
  if (result.status === "ok") {
    const sid = crypto.randomBytes(16).toString("hex");
    sessions.set(sid, { username: username, lastAccess: Date.now() });
    setSessionCookie(res, sid);
    res.redirect("/");
    return;
  }

  if (result.status === "locked") {
    clearSessionCookie(res);
  }

  res.render("twoFactor", { username: username, message: result.message });
});

app.get("/logout", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[SESSION_COOKIE];
  if (sid) {
    sessions.delete(sid);
  }
  clearSessionCookie(res);
  res.redirect("/login");
});

// Authenticated routes
app.use(ensureAuth);

/**
 * Landing Page Route
 * Displays a list of all employees.
 */
app.get("/", async (req, res) => {
  const employees = await business.getAllEmployees();
  res.render("landing", { employees });
});

/**
 * Employee Details Route with documents.
 */
app.get("/employee/:employeeId", async (req, res) => {
  const employeeId = String(req.params.employeeId || "").trim();
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
  const docs = await business.getEmployeeDocuments(employeeId);

  const documents = [];
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    documents.push({ id: doc._id.toString(), originalName: doc.originalName, size: doc.size, uploadedAt: doc.uploadedAt });
  }

  const hasDocuments = documents.length > 0;
  res.render("employee", { employee: { ...employee, id: employee._id.toString() }, shifts, documents, hasDocuments });
});

/**
 * Edit Employee Form Route
 */
app.get("/employee/:employeeId/edit", async (req, res) => {
  const employeeId = String(req.params.employeeId || "").trim();
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
  const employeeId = String(req.params.employeeId || "").trim();
  if (employeeId.length === 0) {
    res.status(400).send("Invalid employee id.");
    return;
  }

  const name = (req.body.name || "").trim();
  const phone = (req.body.phone || "").trim();

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

app.post("/employee/:employeeId/docs", checkDocLimit, (req, res) => {
  upload.single("document")(req, res, async function (err) {
    if (err) {
      if (err.message === "PDF_ONLY") {
        res.status(400).send("Only PDF files are allowed.");
        return;
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).send("File too large (max 2MB).");
        return;
      }
      res.status(400).send("Upload failed.");
      return;
    }

    if (!req.file) {
      res.status(400).send("No file uploaded.");
      return;
    }

    const employeeId = String(req.params.employeeId || "").trim();
    const docMeta = {
      employeeId: employeeId,
      storedName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user.username,
    };

    const id = await business.saveDocumentMetadata(docMeta);
    res.redirect("/employee/" + employeeId + "#docs");
  });
});

app.get("/employee/:employeeId/docs/:docId", async (req, res) => {
  const employeeId = String(req.params.employeeId || "").trim();
  const docId = String(req.params.docId || "").trim();

  const doc = await business.getDocumentById(docId);
  if (!doc || doc.employeeId !== employeeId) {
    res.status(404).send("Document not found.");
    return;
  }

  const safePath = path.join(uploadsRoot, employeeId, doc.storedName);
  if (!safePath.startsWith(path.join(uploadsRoot, employeeId))) {
    res.status(400).send("Invalid path.");
    return;
  }

  if (!fs.existsSync(safePath)) {
    res.status(404).send("Document file missing.");
    return;
  }

  res.sendFile(safePath);
});

const port = 3000;
app.listen(port, () => {
  console.log("Server running on http://localhost:" + port);
});
