# Asuka Pet Current Runtime Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the currently running Asuka Pet product version to `https://github.com/yuan-know/asuka-pet.git` without committing local runtime state or temporary debug files.

**Architecture:** This is a release hygiene and Git publishing plan, not a feature implementation. The workflow validates the existing Electron/TypeScript app, stages only product files, excludes runtime artifacts, commits one publish commit, and pushes it to GitHub.

**Tech Stack:** Git, GitHub remote, npm, TypeScript, Electron, Electron Vite, Vitest, Bash on Windows.

---

## File Structure and Responsibilities

- `package.json` — npm scripts, Electron Builder config, app metadata.
- `package-lock.json` — reproducible dependency lockfile.
- `.gitignore` — repository hygiene; should prevent runtime state and build output from appearing as untracked publish candidates.
- `README.md` — public installation and usage documentation.
- `settings.example.json` — safe public example for Claude Code hook configuration if present in the worktree.
- `scripts/hook-pet.sh` — Claude Code hook entrypoint.
- `scripts/install-claude-hook.ps1` — Windows helper for hook installation if present in the worktree.
- `scripts/show-claude-terminal.ps1` — product script if it is referenced by source/docs; exclude if it is only local debugging.
- `src/main/*` — Electron main process behavior, including tray icon, lifecycle monitoring, window hit testing, and IPC handlers.
- `src/preload/index.ts` — safe renderer-to-main bridge for drag and desktop-pet actions.
- `src/renderer/*` — React UI, pet stage, styles, and renderer-side types/assets.
- `src/shared/eventTypes.ts` — shared event protocol.
- `src/bridge/*` — Claude Code hook/event bridge.
- `tests/*` — Vitest regression coverage.
- `public/assets/*` — public runtime assets included in the built Electron app.
- `docs/superpowers/specs/2026-06-06-asuka-pet-current-runtime-publish-design.md` — approved design for this publish.
- `docs/superpowers/plans/2026-06-06-asuka-pet-current-runtime-publish.md` — this implementation plan.

Files intentionally excluded from staging:

- `events/claude-session.json` — local live-session state.
- `tmp-test-observation.md` — local debug note.
- `tmp-test-pet.md` — local debug note.
- `dist/`, `release/`, `out/`, `build/` — generated outputs.
- `node_modules/` — dependency install directory.

---

### Task 1: Preflight Repository and Tool Check

**Files:**
- Read/check: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/package.json`
- Read/check: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/.gitignore`
- Read/check: git remote and branch state

- [ ] **Step 1: Confirm the worktree and branch**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp status --short --branch
```

Expected:

```text
## desktop-pet-mvp
```

Additional modified/untracked files are expected because the product publish has not been committed yet.

- [ ] **Step 2: Confirm the GitHub remote**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp remote -v
```

Expected lines include:

```text
origin	https://github.com/yuan-know/asuka-pet.git (fetch)
origin	https://github.com/yuan-know/asuka-pet.git (push)
```

If the remote differs, stop and ask the user before changing or pushing.

- [ ] **Step 3: Confirm required commands are available**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp && node --version && npm --version && git --version
```

Expected:

```text
v18.x.x or newer
npm version prints successfully
git version prints successfully
```

If `node`, `npm`, or `git` is unavailable, stop and report the missing command.

---

### Task 2: Repository Hygiene Before Staging

**Files:**
- Modify if needed: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/.gitignore`
- Inspect only: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/events/claude-session.json`
- Inspect only: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/tmp-test-observation.md`
- Inspect only: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/tmp-test-pet.md`

- [ ] **Step 1: Check whether `.gitignore` already excludes runtime/debug artifacts**

Read `.gitignore` and confirm it contains these exact entries:

```gitignore
events/*.jsonl
events/claude-session.json
tmp-test-*.md
```

`events/*.jsonl` may already be present. If `events/claude-session.json` or `tmp-test-*.md` is missing, add them near the existing `events/*.jsonl` entry.

- [ ] **Step 2: Apply the minimal `.gitignore` update if needed**

If the current block is:

```gitignore
events/*.jsonl
!events/.gitkeep
npm-debug.log*
```

replace it with:

```gitignore
events/*.jsonl
events/claude-session.json
!events/.gitkeep
tmp-test-*.md
npm-debug.log*
```

- [ ] **Step 3: Confirm excluded files remain unstaged**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp status --short -- events/claude-session.json tmp-test-observation.md tmp-test-pet.md
```

Expected after the `.gitignore` update:

```text
```

An empty output means these files are not staged and are either ignored or absent. If any line starts with `A`, `M`, or `??`, do not stage it.

---

### Task 3: Validate Current Runtime Version

**Files:**
- Read/execute from: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/package.json`
- Test: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp/tests/*.test.ts`

- [ ] **Step 1: Run TypeScript typecheck**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp && npm run typecheck
```

Expected:

```text
> claude-code-desktop-pet@0.1.0 typecheck
> tsc --noEmit
```

The command exits with status 0. If it fails, stop and report the error output.

- [ ] **Step 2: Run the test suite**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp && npm test
```

Expected:

```text
> claude-code-desktop-pet@0.1.0 test
> vitest run
```

Vitest reports all tests passing. The known healthy baseline is 32 passing tests. If the count differs but all tests pass, report the exact count. If any test fails, stop and report the failure output.

- [ ] **Step 3: Run production build**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp && npm run build
```

Expected:

```text
> claude-code-desktop-pet@0.1.0 build
> tsc --noEmit && electron-vite build
```

The command exits with status 0 and emits build output under ignored generated directories. If it fails, stop and report the error output.

---

### Task 4: Stage Product Files Only

**Files:**
- Stage product files from repository root.
- Do not stage excluded runtime/debug files.

- [ ] **Step 1: Clear any accidental staged state**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp reset
```

Expected:

```text
Unstaged changes after reset:
```

or no output. This ensures the final staging set is deliberate.

- [ ] **Step 2: Stage known product and documentation paths**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp && \
git add \
  .gitignore \
  README.md \
  package.json \
  package-lock.json \
  electron.vite.config.ts \
  settings.example.json \
  scripts/hook-pet.sh \
  scripts/install-claude-hook.ps1 \
  scripts/show-claude-terminal.ps1 \
  src \
  tests \
  public/assets \
  docs/architecture.md \
  docs/event-protocol.md \
  docs/mvp-roadmap.md \
  docs/decisions.md \
  docs/superpowers/specs \
  docs/superpowers/plans
```

If `settings.example.json` or a script path does not exist, remove that missing path from the command and rerun with the existing paths only. Do not use `git add .`.

- [ ] **Step 3: Explicitly unstage excluded files**

Run:

```bash
cd /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp && \
git restore --staged events/claude-session.json tmp-test-observation.md tmp-test-pet.md docs/handoff.md 2>/dev/null || true
```

Expected: command exits successfully. `docs/handoff.md` is intentionally unstaged because it is a local handoff file unless the user explicitly asks to publish it.

- [ ] **Step 4: Inspect staged names**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp diff --cached --name-status
```

Expected: staged files are limited to product source, assets, tests, docs, package/config files, and scripts. The output must not include:

```text
events/claude-session.json
tmp-test-observation.md
tmp-test-pet.md
docs/handoff.md
node_modules/
dist/
release/
out/
build/
```

If any excluded path appears, unstage it before continuing.

- [ ] **Step 5: Inspect staged diff summary**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp diff --cached --stat
```

Expected: summary includes product code, tests, docs, and assets. Large image assets under `public/assets` or `src/renderer/assets` are expected.

---

### Task 5: Commit the Publish Set

**Files:**
- Commit staged files only.

- [ ] **Step 1: Confirm there is a staged diff**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp diff --cached --quiet; echo $?
```

Expected:

```text
1
```

Exit marker `1` means there are staged changes. If it prints `0`, nothing is staged; return to Task 4.

- [ ] **Step 2: Commit staged product files**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp commit -m "feat: publish current Asuka pet runtime version"
```

Expected:

```text
[desktop-pet-mvp <hash>] feat: publish current Asuka pet runtime version
```

If Git reports nothing to commit, return to Task 4 and inspect the staging set.

- [ ] **Step 3: Record the commit hash**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp rev-parse --short HEAD
```

Expected: a short commit hash such as:

```text
abc1234
```

Use the actual hash in the final report.

---

### Task 6: Push to GitHub

**Files:**
- Remote branch: `origin desktop-pet-mvp` unless repository configuration indicates a different upstream.

- [ ] **Step 1: Check upstream branch configuration**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp branch -vv
```

Expected: current branch is `desktop-pet-mvp`. If it already tracks an upstream branch, push to that upstream. If it does not track an upstream, push with `-u origin desktop-pet-mvp`.

- [ ] **Step 2: Push the branch**

If no upstream exists, run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp push -u origin desktop-pet-mvp
```

If an upstream exists, run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp push
```

Expected: Git reports the branch was pushed to `https://github.com/yuan-know/asuka-pet.git`. If authentication fails, stop and ask the user to run the authentication command Git suggests.

- [ ] **Step 3: Confirm remote contains the new commit**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp ls-remote origin HEAD refs/heads/desktop-pet-mvp
```

Expected: output includes the pushed branch. If the repository default branch is not `desktop-pet-mvp`, report which branch was pushed and ask the user whether they want a PR or branch/default-branch merge.

---

### Task 7: Final Verification and Report

**Files:**
- Inspect: repository status.
- Update memory after successful push.

- [ ] **Step 1: Show final working tree status**

Run:

```bash
git -C /c/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp status --short --branch
```

Expected: no staged changes. Remaining unstaged/untracked files may include intentionally excluded local files such as `docs/handoff.md`, `events/claude-session.json`, `tmp-test-observation.md`, or `tmp-test-pet.md`.

- [ ] **Step 2: Prepare final report**

Report these exact fields to the user:

```text
Published branch: <branch name>
Commit: <short hash> <commit subject>
Remote: https://github.com/yuan-know/asuka-pet.git
Verification: npm run typecheck PASS; npm test PASS; npm run build PASS
Excluded local files: events/claude-session.json, tmp-test-observation.md, tmp-test-pet.md, docs/handoff.md if still modified locally
Follow-up: no GitHub Release/tag created unless requested
```

Use the actual branch name, hash, and test counts.

- [ ] **Step 3: Update project memory**

Update `C:/Users/yuan/.claude/projects/C--Users-yuan/memory/claude-code-desktop-pet.md` with a dated note that the current runtime product version was pushed, including branch, commit hash, verification results, and intentionally excluded local files.

---

## Self-Review

- Spec coverage: The plan covers product-code publish, explicit exclusions, verification before push, deliberate staging, commit, push, and final report.
- Placeholder scan: No `TBD`, `TODO`, `implement later`, or unspecified edge-handling instructions remain.
- Type/command consistency: Paths consistently target `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp`; branch and remote names match the inspected repository context.
