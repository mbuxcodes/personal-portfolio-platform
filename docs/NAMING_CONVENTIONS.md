# Naming Conventions

These rules come from `TECHNICAL_DECISIONS.md` Section 6 (Consistent naming) and TD-049. They make the same concept carry the same name in the database, the API, the server, the client, and the documents.

## Principles

- Use English and meaningful names. Avoid abbreviations unless they are industry standard.
- Fields match `DATABASE_DESIGN.md` and `API_DESIGN.md` exactly.
- The same concept has the same name on the client and the server. A client feature and the server module for the same entity share a name.

## Code

| Kind                                         | Style                                                                        | Example                             |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| Types, interfaces, classes, React components | PascalCase                                                                   | `ProjectCard`, `ValidationError`    |
| Functions, variables, parameters, properties | camelCase                                                                    | `getPublishedProjects`, `isExpired` |
| React hooks                                  | camelCase starting with `use`                                                | `useSession`                        |
| Booleans                                     | Start with `is`, `has`, or `can`. Derived values follow the documented names | `isCurrent`, `isInProgress`         |
| Environment variables                        | UPPER_SNAKE_CASE                                                             | `ACCESS_TOKEN_SECRET`               |

## Files and folders

Files use one style everywhere: **kebab-case**, in lower case. The exceptions are names that tools or convention fix: `README.md`, `LICENSE`, the planning documents in `docs/`, and dotfiles.

| Kind                           | Pattern                                                         | Example                            |
| ------------------------------ | --------------------------------------------------------------- | ---------------------------------- |
| Client component               | `<name>.tsx`                                                    | `project-card.tsx`                 |
| Client module, hook, or helper | `<name>.ts`                                                     | `use-session.ts`, `format-date.ts` |
| Server module file             | `<module>.<layer>.ts`                                           | `projects.service.ts`              |
| Test                           | `<file>.test.ts` or `<file>.test.tsx`, beside the file it tests | `project-card.test.tsx`            |
| Folder                         | kebab-case                                                      | `shared-ui`, `data-access`         |

Server layers in a module file name are `routes`, `controller`, `service`, `repository`, `model`, `mappers`, and `schema`. The lint rules classify a file by this suffix (TD-049), so a file with the wrong suffix is not checked.

Why lower-case kebab-case: two files that differ only by letter case collide on case-insensitive systems (Windows, macOS) but not on the case-sensitive servers the project deploys to. One lower-case style removes that class of defect.

## Git

Branch names and commit messages follow `COMMIT_CONVENTIONS.md`.
