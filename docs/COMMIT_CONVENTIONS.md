# Commit Conventions

Use a Conventional Commit subject for repository changes:

```text
type(scope): imperative message
```

Keep `type` lowercase and choose a useful scope such as `tasks`, `ui`,
`docs`, or `release`. Use an imperative, concise message without a period.
Common types are `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`,
`ci`, and `perf`.

Examples:

```text
feat(tasks): extend task scheduling contract
docs(ui): record mockup validation evidence
fix(auth): preserve password recovery errors
```
