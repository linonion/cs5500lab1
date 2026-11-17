# Lab 8: Auto-Healing CI/CD

## What the workflow does

The workflow in `.github/workflows/ci.yml` runs for pushes and pull requests targeting `main`. Its `test` job installs locked dependencies, lints, typechecks, builds, and runs Jest while saving the complete output in `test-results.log`.

If and only if Jest fails, the `auto-fix` job downloads that log and sends it to GitHub Copilot together with the current source diff and TypeScript production source. The generated patch is rejected unless every changed file is a non-test file under `src/`. The workflow then reruns lint, typecheck, build, and Jest before it creates `fix/auto-heal-<run-id>` and opens a pull request.

## One-time GitHub setup

1. Confirm that the repository owner has access to GitHub Copilot. The workflow uses the short-lived built-in `GITHUB_TOKEN`; no API key or long-lived personal access token is stored.
2. Optionally add an Actions variable named `COPILOT_MODEL`. If omitted, Copilot selects a model available to the repository owner's plan.
3. Open **Repository Settings → Actions → General → Workflow permissions**. Select **Read and write permissions** and enable **Allow GitHub Actions to create and approve pull requests**.
4. Push the Lab 8 workflow to `main` and confirm the baseline CI run is green.

The auto-fix job grants `copilot-requests: write` only to that job. Copilot usage is billed against the repository owner's Copilot entitlement for a personally owned repository.

## Break-and-fix validation

Perform this only after the workflow and repository settings are present on `main`:

1. Create the branch `test/breaking-reservation-change` from the updated `main`.
2. In `src/services/reservation.service.ts`, intentionally break the overlap predicate. For example, change `start_time < $3` to `start_time > $3`.
3. Commit and push the branch, then open a pull request into `main`.
4. Confirm the `test` job fails and the `auto-fix` job starts.
5. Review the generated `fix/auto-heal-<run-id>` pull request. The auto-fix PR targets the intentionally broken branch so that its diff contains only the remediation.
6. In the generated PR description, check the audit boxes and replace the pending reviewer note with what was inspected. Do not merge the intentionally broken PR into `main`.

Keep exactly one generated auto-fix pull request open or merged for grading, as required by the lab.

## Human review criteria

- The fix changes production code, not tests or assertions.
- The diff is limited to the reservation overlap defect.
- The verification commands all pass in the auto-fix job.
- No token, `.env` file, build output, or dependency directory is committed.
