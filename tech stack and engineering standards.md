# Vehicle Rental Booking Portal
## Technology Stack & Engineering Standards

Version: 1.0

---

# Project Objective

Develop a full-stack Vehicle Rental Booking Portal capable of handling:

- Customer Registration & Authentication
- Vehicle Search & Filtering
- Vehicle Booking & Reservation
- Concurrent Booking Management
- Rental Transactions
- Payment Processing
- Invoice Generation
- Admin Dashboard
- Reports & Analytics

The project must demonstrate concepts from:

- Object-Oriented Programming
- Data Structures & Algorithms
- Database Management Systems
- Operating Systems
- Computer Networks
- Software Engineering

---

# Technology Stack

## Frontend

Framework
- React.js

Build Tool
- Vite

Styling
- Tailwind CSS

Routing
- React Router DOM

HTTP Client
- Axios

State Management
- React Context API

Icons
- React Icons

Notifications
- React Toastify

Form Validation
- React Hook Form

---

## Backend

Runtime
- Node.js

Framework
- Express.js

Authentication
- JWT (JSON Web Tokens)

Password Encryption
- bcrypt

Environment Variables
- dotenv

Input Validation
- express-validator

File Uploads (if required)
- Multer

CORS
- cors

API Testing
- Postman

---

## Database

Database
- MySQL

Database Client
- mysql2

ORM
- None (Raw SQL Queries)

Reason:
To demonstrate DBMS concepts through manual SQL queries rather than relying on an ORM.

---

## API Architecture

Architecture Style

REST API

Request Format

JSON

Response Format

JSON

Authentication

JWT Bearer Token

---

## Version Control

Git

Repository Hosting

GitHub

Branch Strategy

main

develop

feature/<feature-name>

bugfix/<bug-name>

release/<version>

---

## Documentation

Markdown

Swagger (OpenAPI)

Draw.io

StarUML / Visual Paradigm

---

## Testing

Frontend

Manual Testing

Backend

Postman

Database

SQL Testing

---

# Recommended Development Environment

IDE

Visual Studio Code

Database Tool

MySQL Workbench

API Tool

Postman

Version Control

Git

Browser

Google Chrome

---

# Folder Structure

VehicleRentalPortal/

frontend/

backend/

database/

docs/

postman/

assets/

README.md

.gitignore

---

# Backend Structure

backend/

src/

config/

controllers/

middlewares/

models/

routes/

services/

utils/

validators/

database/

app.js

server.js

---

# Frontend Structure

frontend/

src/

assets/

components/

layouts/

pages/

routes/

services/

hooks/

context/

utils/

styles/

App.jsx

main.jsx

---

# Naming Conventions

## Variables

camelCase

Example

userName

bookingDate

vehicleId

---

## Functions

camelCase

Examples

createBooking()

loginUser()

calculateRent()

---

## Classes

PascalCase

Vehicle

BookingService

PaymentController

---

## Components

PascalCase

Navbar.jsx

BookingCard.jsx

VehicleTable.jsx

---

## Database Tables

snake_case

vehicles

users

bookings

payments

customer_profiles

rental_agreements

---

## Database Columns

snake_case

vehicle_id

booking_date

payment_status

customer_name

---

## API Routes

Lowercase

/api/auth/login

/api/bookings

/api/payments

/api/users

---

# API Standards

Use proper HTTP methods.

GET

Read

POST

Create

PUT

Update

DELETE

Delete

PATCH

Partial Update

---

# Standard Response Format

Success

{
    "success": true,
    "message": "Vehicle booked successfully",
    "data": {}
}

Error

{
    "success": false,
    "message": "Vehicle unavailable",
    "error": {}
}

---

# HTTP Status Codes

200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error

---

# Authentication Standards

Passwords must never be stored in plain text.

Use bcrypt hashing.

Authentication must use JWT.

Protected APIs must validate JWT.

Role Based Access Control (RBAC) must be implemented.

Roles

Admin

Customer

---

# Database Standards

Every table must have

Primary Key

Appropriate Foreign Keys

NOT NULL constraints

Unique constraints wherever applicable

Indexes on searchable columns

Transactions for critical operations

No duplicate data

Normalization up to 3NF

---

# SQL Standards

Never concatenate SQL queries.

Always use parameterized queries.

Always validate input before executing SQL.

Use transactions wherever multiple tables are updated.

Rollback on failure.

Commit only on success.

---

# Code Quality Rules

## General

Write readable code.

Avoid duplicate logic.

Keep functions short.

Avoid deeply nested conditions.

Write meaningful variable names.

One responsibility per function.

Follow DRY.

Follow SOLID wherever applicable.

---

## Comments

Do not comment obvious code.

Comment only

Business logic

Complex algorithms

Concurrency logic

SQL optimization

---

# Error Handling

Never expose internal errors.

Always return meaningful messages.

Use centralized error handling middleware.

Log server errors.

---

# Logging

Log

Application Start

Application Shutdown

Login Attempts

Booking Requests

Payment Requests

Server Errors

Database Errors

---

# Security Standards

Validate every input.

Sanitize user input.

Never trust frontend validation.

Use HTTPS in production.

Store secrets in .env.

Never commit secrets to GitHub.

Enable CORS properly.

Prevent SQL Injection.

Prevent XSS.

Prevent CSRF wherever applicable.

---

# Performance Standards

Avoid unnecessary API calls.

Implement pagination.

Lazy load frontend pages.

Optimize SQL queries.

Use indexes.

Minimize repeated database access.

---

# Git Commit Convention

feat:

fix:

docs:

style:

refactor:

test:

chore:

Examples

feat: add vehicle booking module

fix: prevent duplicate reservations

docs: update API documentation

---

# Pull Request Rules

Every PR must

Compile successfully

Pass testing

Contain meaningful commit history

Have a clear description

Be reviewed before merging

---

# Coding Principles

Prefer composition over inheritance.

Avoid global variables.

Avoid hardcoded values.

Use environment variables.

Separate business logic from routing.

Controllers should only handle requests and responses.

Business logic belongs in Services.

Database logic belongs in Models.

---

# AI Code Generation Rules

Every ai conversation used for development must follow these rules.

The AI should:

- Generate modular code.
- Follow the defined folder structure.
- Never generate monolithic files.
- Prefer reusable components.
- Use ES6+ syntax.
- Follow REST conventions.
- Validate all inputs.
- Return consistent API responses.
- Handle errors gracefully.
- Write production-quality code.
- Avoid placeholder implementations unless explicitly requested.
- Explain architectural decisions when introducing new patterns.
- Ensure compatibility with the existing project structure.
- Preserve backward compatibility unless a breaking change is approved.
- Generate code that is readable, maintainable, and scalable.

---

# Project Philosophy

This project is intended to simulate a real-world software engineering workflow.

The priority is:

1. Correct Architecture
2. Clean Code
3. Maintainability
4. Security
5. Scalability
6. Performance
7. User Experience

Every implementation decision should align with these principles rather than taking shortcuts.