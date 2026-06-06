# Asuka Pet Current Runtime Publish Design

Date: 2026-06-06

## Goal

Publish the GitHub repository `yuan-know/asuka-pet` from the currently running local worktree version, while keeping the public repository clean and reproducible.

The chosen approach is **product-code publish**: include the current working product code, assets, tests, hooks, and documentation that are needed to reproduce the running desktop pet, but exclude local runtime state and temporary debugging notes.

## Repository Context

- Local worktree: `C:/Users/yuan/projects/claude-code-desktop-pet/.worktrees/desktop-pet-mvp`
- Remote: `https://github.com/yuan-know/asuka-pet.git`
- App type: Electron + TypeScript + React desktop pet for Claude Code
- Current package version: `0.1.0`

## Publish Scope

### Include

The publish should include product files that are required for the current runtime behavior:

- Electron main-process changes for startup, lifecycle binding, tray behavior, and transparent-window hit testing
- Renderer and preload changes needed for drag handling, bubbles, states, and interactivity
- Bridge and hook scripts for Claude Code integration
- Shared event protocol changes
- Tests covering event protocol, file drop, hook behavior, and lifecycle behavior
- Asuka sprite assets and tray icon assets used by the app
- README, package metadata, lockfile, and relevant project documentation/specs/plans

### Exclude

The publish should not include files that only describe this machine's live session or temporary debugging observations:

- `events/claude-session.json`
- `tmp-test-observation.md`
- `tmp-test-pet.md`
- generated build output such as `dist/`, `release/`, `out/`, and `build/`
- dependency directories such as `node_modules/`

If a file looks ambiguous, default to excluding it unless it is clearly needed to build, run, test, or understand the public project.

## Verification

Before pushing, run the standard validation commands from the project root:

```bash
npm run typecheck
npm test
npm run build
```

Only commit and push the product publish commit if these commands pass. If any command fails, stop and report the failing command and output instead of publishing.

## Git Workflow

1. Inspect the working tree and remote branch state.
2. Stage only the product files in the include scope.
3. Confirm the staged diff does not include excluded runtime or temporary files.
4. Commit with a message such as:

   ```text
   feat: publish current Asuka pet runtime version
   ```

5. Push to the configured GitHub remote.
6. After push, report the commit hash, branch, verification commands, and any files intentionally excluded.

## Release Tag

Do not create a GitHub Release or tag by default. The current request is to update the repository from the running version. A tag such as `v0.1.0` can be created later if the user explicitly asks for a versioned release artifact.

## Success Criteria

- GitHub contains the current running product version.
- The repository remains free of local runtime state and temporary debugging files.
- Typecheck, tests, and build pass before push.
- The final report clearly states what was published and what was excluded.
