# Requirements Document

## Introduction

A backend system for a finance dashboard that supports financial record management, user role-based access control, and summary-level analytics. Different users interact with financial records based on their assigned role, with clear enforcement of permissions at the API level.

## Glossary

- **System**: The finance backend API
- **User**: A registered account with an assigned role
- **Role**: A permission level assigned to a user (Viewer, Analyst, Admin)
- **Financial_Record**: A single financial entry (transaction) with amount, type, category, date, and notes
- **Dashboard**: Aggregated summary data derived from financial records
- **Auth_Token**: A JWT or session token used to authenticate requests
- **Validator**: The component responsible for validating incoming request data
- **Access_Controller**: The middleware/guard that enforces role-based permissions

## Requirements

### Requirement 1: User Management

**User Story:** As an admin, I want to create and manage users, so that I can control who has access to the system.

#### Acceptance Criteria

1. WHEN a POST request is made to create a user with valid name, email, password, and role, THE System SHALL create the user and return the created user object with a unique ID
2. WHEN a POST request is made to create a user with a duplicate email, THE System SHALL return a 409 Conflict error
3. WHEN a GET request is made to list users, THE System SHALL return a paginated list of all users
4. WHEN a PATCH request is made to update a user's role or status, THE System SHALL update the user and return the updated user object
5. WHEN a PATCH request is made to set a user's status to inactive, THE System SHALL prevent that user from authenticating
6. IF a request is made to create or modify a user by a non-Admin role, THEN THE Access_Controller SHALL reject the request with a 403 Forbidden response

### Requirement 2: Authentication

**User Story:** As a user, I want to authenticate with my credentials, so that I can receive a token to access protected endpoints.

#### Acceptance Criteria

1. WHEN a POST request is made to the login endpoint with valid email and password, THE System SHALL return a signed Auth_Token
2. WHEN a POST request is made to the login endpoint with invalid credentials, THE System SHALL return a 401 Unauthorized error
3. WHEN a request is made to a protected endpoint without an Auth_Token, THE System SHALL return a 401 Unauthorized error
4. WHEN a request is made to a protected endpoint with an expired or invalid Auth_Token, THE System SHALL return a 401 Unauthorized error
5. WHILE a user's status is inactive, THE System SHALL reject login attempts with a 401 Unauthorized error

### Requirement 3: Financial Records Management

**User Story:** As an analyst or admin, I want to create, view, update, and delete financial records, so that I can manage the financial data in the system.

#### Acceptance Criteria

1. WHEN a POST request is made with valid amount, type, category, and date fields, THE System SHALL create a financial record and return it with a unique ID
2. WHEN a GET request is made to list records, THE System SHALL return a paginated list of financial records
3. WHEN a GET request is made with filter parameters (date range, category, type), THE System SHALL return only records matching all provided filters
4. WHEN a PATCH request is made to update a record with valid fields, THE System SHALL update and return the modified record
5. WHEN a DELETE request is made for an existing record, THE System SHALL soft-delete the record and exclude it from future list responses
6. IF a request is made to create, update, or delete a record by a Viewer role, THEN THE Access_Controller SHALL reject the request with a 403 Forbidden response
7. IF a request references a record ID that does not exist, THEN THE System SHALL return a 404 Not Found error

### Requirement 4: Dashboard Summary APIs

**User Story:** As a viewer, analyst, or admin, I want to retrieve aggregated financial summaries, so that I can understand the overall financial state.

#### Acceptance Criteria

1. WHEN a GET request is made to the summary endpoint, THE System SHALL return total income, total expenses, and net balance computed from all non-deleted records
2. WHEN a GET request is made to the category summary endpoint, THE System SHALL return totals grouped by category
3. WHEN a GET request is made to the trends endpoint with a period parameter (monthly or weekly), THE System SHALL return aggregated totals grouped by the specified time period
4. WHEN a GET request is made to the recent activity endpoint, THE System SHALL return the most recent financial records ordered by date descending
5. IF a request is made to any summary endpoint by an unauthenticated user, THEN THE Access_Controller SHALL reject the request with a 401 Unauthorized error

### Requirement 5: Access Control

**User Story:** As a system architect, I want role-based access control enforced at the API layer, so that users can only perform actions permitted by their role.

#### Acceptance Criteria

1. THE Access_Controller SHALL enforce that Viewer role users can only access GET endpoints for records and dashboard summaries
2. THE Access_Controller SHALL enforce that Analyst role users can access GET endpoints and create financial records but cannot manage users
3. THE Access_Controller SHALL enforce that Admin role users have full access to all endpoints
4. WHEN an authenticated user attempts an action outside their role's permissions, THE Access_Controller SHALL return a 403 Forbidden response with a descriptive message
5. THE System SHALL apply access control checks before any business logic is executed

### Requirement 6: Validation and Error Handling

**User Story:** As a developer consuming this API, I want consistent validation and error responses, so that I can reliably handle errors in client applications.

#### Acceptance Criteria

1. WHEN a request body is missing required fields, THE Validator SHALL return a 400 Bad Request response listing the missing fields
2. WHEN a financial record is submitted with a non-numeric amount or an invalid date format, THE Validator SHALL return a 400 Bad Request response with a descriptive message
3. WHEN a financial record is submitted with a negative amount, THE Validator SHALL return a 400 Bad Request response
4. WHEN an unhandled server error occurs, THE System SHALL return a 500 Internal Server Error response without exposing internal stack traces
5. THE System SHALL return all error responses in a consistent JSON structure containing a status code, error type, and message

### Requirement 7: Data Persistence

**User Story:** As a system operator, I want financial records and users to be persisted to a database, so that data survives server restarts.

#### Acceptance Criteria

1. THE System SHALL persist all user and financial record data to a relational database
2. WHEN a financial record is soft-deleted, THE System SHALL set a deleted_at timestamp rather than removing the row
3. THE System SHALL store passwords as hashed values and never return them in API responses
4. WHEN the server restarts, THE System SHALL retain all previously created users and financial records
