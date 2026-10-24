# Commit Conventions

This project follows Conventional Commits, as defined in `IMPLEMENTATION_ROADMAP.md` (Final Deliverable 5).

## Format

```
type(scope): summary (Mx.y)

body (optional)

footer (optional)
```

| Part | Rule |
| --- | --- |
| **type** | `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `security` |
| **scope** | `client`, `server`, `repo`, or omitted when a change spans both |
| **summary** | Imperative, lower case, under about 72 characters. A milestone commit ends with `(Mx.y)` |
| **body** | Why the change was made and any trade-off, where not obvious |
| **footer** | References to decisions or documents, for example `Refs: TD-016` |

Example: `feat(server): sign-in with attempt limiting (M5.2)`

## Branches and merging

- Trunk-based. `main` is protected: no direct pushes, no force-push, linear history.
- One short-lived branch per milestone, named `m<phase>-<milestone>-<short-name>`, for example `m2-4-middleware-layer`.
- Commit freely on the branch. Squash-merge to `main` as one commit per milestone, when its Definition of Done is met.
- Open a pull request for every milestone. The description holds the self-review checklist and the Definition of Done.
- A document change that precedes code goes in its own `docs:` commit, merged before the milestone that depends on it.
- Revert with a new commit. Never rewrite history.

## What a milestone commit contains

- The code, tests, and documentation for that milestone, and nothing else.
- No unrelated formatting or refactoring.
- No secrets, personal data, or generated files.
