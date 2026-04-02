# INFS3201 - Web Technologies II
## Employee Scheduling System

---

## Assignment 1
Console-based Node.js application using JSON files as storage.

## Assignment 2
Introduced a closed 3-tier architecture (presentation, business, persistence) and business rules for shift assignment.

## Assignment 3 - Web Application Refactor
Refactored to Express + Handlebars + MongoDB while preserving business logic.

## Assignment 4 - Scheduling System
- Landing page lists employees.
- Employee detail page shows phone and shifts (sorted; morning shifts highlighted).
- Edit employee form with server-side validation (name non-empty, phone ####-####).
- Sessions last 5 minutes and refresh per request.

## Assignment 5 - Security & File Uploads
- Two-factor authentication: 6-digit code emailed via emailSystem.js, expires after 3 minutes.
- Security rules: email warning after 3 failed attempts; account locked after 10 failed attempts (DB unlock only).
- Session starts only after successful 2FA entry.
- Login, 2FA, and logout routes added; sessions stored in memory with HTTP-only cookie.
- PDF document uploads per employee: max 2MB each, max 5 documents, stored under uploads/ (not exposed statically), protected download route with ownership check.

## Test credentials
- admin / admin123
- staff / staff123

## Running
1. Ensure MongoDB URI is set in config.json or env MONGODB_URI.
2. Install deps: 
npm install
3. Start app: 
npm start, then open http://localhost:3000
