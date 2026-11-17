## Auto-healing result

This pull request was generated after CI detected a failing Jest suite. The agent received the Jest failure log, the source diff, and production source context. Its patch was restricted to non-test files under `src/` and was committed only after lint, typecheck, build, and Jest all passed.

## Human-in-the-loop audit log

- [ ] Confirm the patch fixes the production bug instead of weakening or changing tests.
- [ ] Review the complete source diff for unrelated behavior changes.
- [ ] Confirm CI is green before accepting the patch.

Reviewer notes: pending human review. Replace this line with a brief description of what you inspected before merging or accepting the patch.
