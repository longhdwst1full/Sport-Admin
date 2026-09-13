# Admin rule maintenance

Rules in `.agent/rules/` are authoritative; `.claude/rules/` is a byte-identical mirror.

## When a gap is found

```
Pattern hit during a task?
├── grep .agent/rules/ — already covered? -> follow the existing rule
└── not covered?
    ├── one-off edge case      -> note it in the feature README only
    └── repeatable pattern     -> create .agent/.pending-rules/<name>.md
```

## Pending rule template

```markdown
# RULE-<AREA>-<NN>: <short name>

## Context
<what task exposed the gap>

## Rule
❌ wrong example / ✅ correct example

## Target
Merge into: .agent/rules/<file>.md
```

The user reviews `.agent/.pending-rules/`; approved rules are merged, rejected ones deleted. Never write straight into `.agent/rules/` during an unrelated task.

## Quality bar

- One rule = one concern, 5–10 lines, `RULE-XXX-NN` id.
- Every rule carries a ✅/❌ code example. No "be careful".
- Tables over paragraphs.

## Mirroring and versioning

- After editing `.agent/rules/<f>.md`, copy it to `.claude/rules/<f>.md` in the same change.
- `.cursor/rules/always/*.mdc` only points at `.agent/rules`; it needs no per-rule edit.
- A meaningful rule change bumps the version block in `00-document-versioning.md`.
