# Task 3 Report: Apply Data Scope to Department tree query

## Status
DONE

## Commits
- `80308ee`: feat(dept): integrate DataScopeInterceptor and filter in department query

## Test Summary
- Integrated `DataScopeInterceptor` and `@UserScope()` param decorator on `DeptController.getTree`.
- Applied scope filters in `DeptRepository.findAll` to restrict the list of returned departments.
- Created `dept.data-scope.spec.ts` unit tests.
- 16 test suites (101 tests total) passed.
- Typecheck passed.

## Concerns
None.
