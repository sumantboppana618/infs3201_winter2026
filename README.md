# INFS3201 – Web Technologies II  
## Employee Scheduling System

---

## Assignment 1
A console-based Node.js application to manage employees and assign shifts using JSON files, implemented as a single-file program.  
Focused on core functionality without architectural separation.

---

## Assignment 2
Refactored the system into a closed 3-tier architecture:

- Presentation Layer
- Business Logic Layer
- Persistence Layer

Added configurable daily hour limits and enforced business rules during shift assignment.

---

## Assignment 3 – Web Application Refactor

The application was refactored from a terminal-based system into a multi-page web application using:

- **ExpressJS** (Server)
- **Handlebars (hbs)** (Presentation Layer)
- **MongoDB** (Persistence Layer)

The business logic and domain concepts remain unchanged from Assignment 2.  
Only the presentation and persistence layers were modified.

---

## Architecture

The project follows a layered architecture:

- **presentation.js** → Express routes and HTTP handling  
- **business.js** → Business logic and validation rules  
- **persistence.js** → MongoDB data access  

This ensures proper separation of concerns.

---

## Database

- Database Name: `infs3201_winter2026`
- Collections:
  - `employees`
  - `shifts`
  - `assignments`

MongoDB Atlas is configured to allow access from all IP addresses for grading.

---

## Features

### Landing Page
- Displays a list of employee names.
- Each employee links to their details page.

### Employee Details Page
- Displays employee name and phone number.
- Displays assigned shifts sorted by date and start time.
- Shifts starting before 12:00pm are highlighted in yellow.

### Edit Employee
- Form is prefilled with current values.
- Server-side validation only (no client-side JavaScript):
  - Name must not be empty.
  - Phone must match format `####-####`.
- Uses PRG (Post/Redirect/Get) pattern.

### Login
- Username/password login with server-side sha256 hash check.
- Sessions last 5 minutes and refresh on each request.
- Security logs are recorded in `security_log` collection.

### Test credentials
- admin / admin123
- staff / staff123

