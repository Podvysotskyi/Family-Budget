# Testing

The workspace uses Vitest for both applications. Tests are split by purpose so fast
unit tests can run independently from framework and infrastructure-backed feature
tests.

## Test suites

- `apps/api/tests/unit`: database-free backend unit tests for services and pure
  business logic.
- `apps/api/tests/feature`: Nest HTTP tests and PostgreSQL-backed integration tests.
- `apps/web/test/unit`: fast tests for framework-independent frontend logic.
- `apps/web/test/nuxt`: Nuxt runtime component and user-flow feature tests.

Run all suites:

```bash
pnpm test
```

Run only one test level:

```bash
pnpm test:unit
pnpm test:feature
```

Generate HTML and terminal coverage reports under `coverage/apps`:

```bash
pnpm test:coverage
```

The usual app-specific Nx commands are also available, such as
`pnpm nx test:unit api` and `pnpm nx test:feature web`.

## Test database

Database-backed API feature tests use Testcontainers and PostgreSQL 17. Docker must
be running before `api:test:feature` or the complete test suite is executed. Each
run starts an isolated database, applies the production TypeORM migrations, and
removes the container afterward.

SQLite is intentionally not used for database-backed feature tests. The production
schema depends on PostgreSQL native enums, UUIDs, `timestamptz`, numeric semantics,
extensions, and PostgreSQL migration SQL. Using SQLite would require a second test
schema and could allow PostgreSQL regressions to pass. Unit tests should mock
repository boundaries when they do not need to verify persistence.

## Test placement

Prefer the smallest suite that proves the behavior:

- Put date calculations, mapping, validation, and isolated service behavior in unit
  tests.
- Put Nest routes, dependency wiring, migrations, constraints, repository queries,
  rendered Nuxt components, and multi-step UI behavior in feature tests.
- Keep external providers such as Google OAuth mocked unless their sandbox is the
  behavior under test.

## Test organization

- Name each spec after one production subject, such as
  `users.repository.spec.ts`, `budgets-store.feature.spec.ts`, or
  `subscription-modals.feature.spec.ts`.
- Keep different domains in separate files even when they use the same testing
  framework or infrastructure.
- Put reusable fixtures and mock builders in a nearby `support` directory. Support
  files must not use a `.spec.ts` or `.feature-spec.ts` suffix, so Vitest does not
  treat them as independent suites.
- Keep framework-hoisted Nuxt mocks in the spec that owns them. Share ordinary
  fixture data and helper functions instead.
- A service with several related scenarios may keep them together when the service
  is the single subject under test; split mixed repository, store, component, and
  modal catch-all suites by their owning feature.
