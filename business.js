"use strict";

const persistence = require("./persistence");
const emailSystem = require("./emailSystem");
const crypto = require("crypto");

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

/**
 * Validate username/password and start the 2FA challenge.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{status:string,message:string,user?:any}>}
 */
async function startLogin(username, password) {
  const user = await persistence.getUserByUsername(username);
  if (!user) {
    return { status: "error", message: "Invalid credentials." };
  }

  if (user.locked) {
    return { status: "locked", message: "Account is locked." };
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const storedHash = user.passwordHash || user.password;
  const passwordMatches = storedHash === passwordHash || storedHash === password;

  if (!passwordMatches) {
    const updated = await persistence.incrementFailedAttempts(username);
    if (updated && updated.failedAttempts === 3) {
      await emailSystem.sendSuspiciousActivity(user.email, updated.failedAttempts);
    }
    if (updated && updated.failedAttempts >= 10) {
      await persistence.lockUser(username);
      await emailSystem.sendAccountLocked(user.email);
      return { status: "locked", message: "Account is locked." };
    }
    return { status: "error", message: "Invalid credentials." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 3 * 60 * 1000;
  await persistence.storeTwoFactor(username, code, expiresAt);
  await emailSystem.send2FACode(user.email, code);
  return { status: "needs_2fa", message: "2FA code sent.", user: user };
}

/**
 * Verify a 2FA code.
 * @param {string} username
 * @param {string} code
 * @returns {Promise<{status:string,message:string,user?:any}>}
 */
async function verifyTwoFactor(username, code) {
  const user = await persistence.getUserByUsername(username);
  if (!user) {
    return { status: "error", message: "Invalid code." };
  }
  if (user.locked) {
    return { status: "locked", message: "Account is locked." };
  }

  const twoFactor = user.twoFactor || {};
  const now = Date.now();

  if (!twoFactor.code || twoFactor.consumed) {
    return { status: "error", message: "No active code. Please log in again." };
  }
  if (twoFactor.expiresAt && now > twoFactor.expiresAt) {
    const updatedExpired = await persistence.incrementFailedAttempts(username);
    if (updatedExpired && updatedExpired.failedAttempts === 3) {
      await emailSystem.sendSuspiciousActivity(user.email, updatedExpired.failedAttempts);
    }
    if (updatedExpired && updatedExpired.failedAttempts >= 10) {
      await persistence.lockUser(username);
      await emailSystem.sendAccountLocked(user.email);
      return { status: "locked", message: "Account is locked." };
    }
    return { status: "error", message: "Code expired. Please log in again." };
  }
  if (twoFactor.code !== code) {
    const updated = await persistence.incrementFailedAttempts(username);
    if (updated && updated.failedAttempts === 3) {
      await emailSystem.sendSuspiciousActivity(user.email, updated.failedAttempts);
    }
    if (updated && updated.failedAttempts >= 10) {
      await persistence.lockUser(username);
      await emailSystem.sendAccountLocked(user.email);
      return { status: "locked", message: "Account is locked." };
    }
    return { status: "error", message: "Incorrect code." };
  }

  await persistence.consumeTwoFactor(username);
  await persistence.resetFailedAttempts(username);
  return { status: "ok", message: "Authenticated.", user: user };
}

/**
 * Get documents metadata for an employee.
 * @param {string} employeeId
 * @returns {Promise<Array<any>>}
 */
async function getEmployeeDocuments(employeeId) {
  return await persistence.getDocumentsForEmployee(employeeId);
}

/**
 * Record a document upload.
 * @param {object} doc
 * @returns {Promise<void>}
 */
async function saveDocumentMetadata(doc) {
  return await persistence.insertDocumentMetadata(doc);
}

async function countDocuments(employeeId) {
  return await persistence.countDocumentsForEmployee(employeeId);
}

async function getDocumentById(docId) {
  return await persistence.getDocumentById(docId);
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEmployeeShiftsSorted,
  updateEmployee,
  startLogin,
  verifyTwoFactor,
  getEmployeeDocuments,
  saveDocumentMetadata,
  countDocuments,
  getDocumentById,
};
