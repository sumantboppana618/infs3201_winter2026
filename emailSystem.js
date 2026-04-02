"use strict";

/**
 * Simple email facade. In production this would integrate with an email API.
 * For the assignment we just log the email contents to the console to mimic delivery.
 * Each function returns a resolved Promise to preserve async calling patterns.
 */
const emailSystem = {
  /**
   * Send a 2FA code to the user.
   * @param {string} to
   * @param {string} code
   * @returns {Promise<void>}
   */
  send2FACode: async function (to, code) {
    console.log("[Email] 2FA code", { to: to, subject: "Your 2FA Code", body: "Your login code is " + code });
  },

  /**
   * Send a suspicious activity warning after repeated failed attempts.
   * @param {string} to
   * @param {number} attempts
   * @returns {Promise<void>}
   */
  sendSuspiciousActivity: async function (to, attempts) {
    console.log("[Email] Suspicious activity", {
      to: to,
      subject: "Suspicious login attempts",
      body: "We noticed " + attempts + " failed login attempts on your account."
    });
  },

  /**
   * Inform the user that their account is locked.
   * @param {string} to
   * @returns {Promise<void>}
   */
  sendAccountLocked: async function (to) {
    console.log("[Email] Account locked", {
      to: to,
      subject: "Account locked",
      body: "Your account has been locked after multiple failed attempts. Contact admin to unlock."
    });
  }
};

module.exports = emailSystem;
