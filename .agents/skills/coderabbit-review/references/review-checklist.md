# CodeRabbit Review — Deep Inspection Checklist

This reference provides concrete auditing rules for each inspection category in **ResearchMind AI 2.0**.

---

## 1. Bugs & Logical Errors
- Check for off-by-one errors in loops, pagination, or chunking algorithms.
- Verify null / undefined handling in React props and state.
- Ensure type conversions (e.g., string query params to integers/UUIDs) validate format before usage.
- Verify regex patterns for denial of service (ReDoS) or unintended greedy matching.

## 2. Security Vulnerabilities
- **Injection**: Ensure SQL queries use SQLModel/SQLAlchemy ORM parameters, never f-string query formatting.
- **Path Traversal**: Validate file paths for uploads and downloads against `os.path.commonpath` or resolved canonical paths.
- **CORS & Headers**: Check for wildcard origins in production and verify security headers (CSP, HSTS, X-Content-Type-Options).

## 3. Authentication & Authorization
- Verify that every protected route depends on `get_current_user` or equivalent auth dependency.
- Ensure password hashing uses strong algorithms (PBKDF2/bcrypt) with secure salt.
- Verify JWT expiration (`exp` claim) and algorithm verification (prevent `none` algorithm attack).
- Verify object-level authorization: ensure users can only access their own documents, quizzes, and chat histories.

## 4. Input Validation & Error Handling
- Validate all incoming API request payloads with Pydantic schemas.
- Ensure sensitive internal error messages and tracebacks are never leaked in API response bodies.
- Avoid bare `except:` or swallowing exceptions without logging.

## 5. API Key & Secret Exposure
- Verify zero hardcoded keys, tokens, or credentials in codebase.
- Check that `.env` files are ignored and documented in `.env.example`.
- Ensure logs do not print request headers or authorization tokens.

## 6. Database Access & Data Integrity
- Check for unclosed sessions or connections in async tasks.
- Verify transactions are properly committed or rolled back on failure.
- Ensure unique constraints and foreign key constraints prevent orphan records.

## 7. Performance & Scalability
- Identify N+1 query patterns when loading relationships (use `selectinload` / `joinedload`).
- Verify vector database queries (Qdrant/Chroma) use proper filters and batch sizes.
- Ensure heavy document parsing (PDF, PPTX) runs asynchronously or in background workers.

## 8. Race Conditions & Concurrency
- Inspect shared in-memory dictionaries or global variables for race conditions under concurrent async requests.
- Verify database updates on shared resources use atomic increment operations or row-level locking.

## 9. Regression Risks & Test Coverage
- Check if changes alter existing function signatures, return types, or schemas used by callers.
- Ensure new endpoints or modified business logic have corresponding tests in `backend/tests/`.

## 10. Maintainability & Code Quality
- Identify duplicated code blocks that should be extracted into shared utilities.
- Avoid deeply nested conditionals (favor early returns).
- Keep component responsibilities focused and maintain clean separation of concerns.
