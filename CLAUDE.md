# CampusHub Context

Read `AGENTS.md` for the project rules. Keep agent context focused on `src/`,
`client/src/`, `shared/`, and `docs/openapi.yaml`; generated output, dependencies,
lockfiles, source maps, logs, and historical lab artifacts are excluded by
`.cursorignore`.

Preserve the route → controller → service → model layering. Use strict
TypeScript, validate input in controllers, keep API calls in typed client
modules or hooks, and make the smallest change that preserves behavior.
