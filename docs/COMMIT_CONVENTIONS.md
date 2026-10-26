# Commit Conventions

This project follows Conventional Commits, as defined in `IMPLEMENTATION_ROADMAP.md` (Final Deliverable 5).

## Format

```
type(scope): summary (Mx.y)

body (optional)

footer (optional)
```

| Part        | Rule                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| **type**    | `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `security`             |
| **scope**   | `client`, `server`, `repo`, or omitted when a change spans both                          |
| **summary** | Imperative, lower case, under about 72 characters. A milestone commit ends with `(Mx.y)` |
| **body**    | Why the change was made and any trade-off, where not obvious                             |
| **footer**  | References to decisions or documents, for example `Refs: TD-016`                         |

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

## Local checks and the commit message check

Two local hooks run through Husky:

| Hook         | What it does                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | Formats the staged files with Prettier, then lints the staged code with the ESLint configuration of its own area. A lint error, including a layer-boundary violation, blocks the commit |
| `pre-push`   | Runs the type check in both areas                                                                                                                                                       |

The hooks are local only. Continuous integration is Milestone 6.1.

A check that validates the commit message format is optional in the roadmap, and none is installed. The format above is verified when the pull request is reviewed. If the check is wanted later, add commitlint with the conventional configuration and a `.husky/commit-msg` hook, and record the dependency in `TECHNICAL_DECISIONS.md` (TD-038).
