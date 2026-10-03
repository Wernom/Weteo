---
name: commit-message
description: Draft an English git commit message for the current changes. Use when the user asks for a commit message ("message de commit", "rédige le commit", "/commit-message").
---

# Commit message

Draft a commit message for the pending changes. **Do not commit or push** — only propose the message.

## Steps

1. Run `git status` and `git diff HEAD` (staged + unstaged). If something is staged, describe only `git diff --cached`.
2. Run `git log --oneline -10` to match the repo's existing style.
3. Read changed files only if the diff alone doesn't explain *why*.

## Format

- **Always in English**, even if the conversation is in French.
- Subject: imperative mood, lowercase, no trailing period, ≤ 72 chars (e.g. `add weather forecast screen`).
- Body (optional, only if the subject isn't enough): blank line, then wrapped at 72 chars, explaining *why* rather than *what*. Bullet points with `-` for several distinct changes.
- No emojis, no file-by-file listing, no filler ("this commit…").
- End with the co-author trailer from the current attribution guidance, if any.

## Output

Give the message in a single fenced `text` block, ready to copy. If the changes mix unrelated concerns, say so in one line and suggest how to split them.
