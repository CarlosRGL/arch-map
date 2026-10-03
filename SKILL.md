---
name: arch-map
description: Use for "map the architecture", "arch map", "show how this app works", "visualize the codebase", "explain the flow of the app". Produces an interactive architecture view (.arch/index.html) with a guided tour.
---

# Arch map

`<skill-dir>` below is the directory that contains this SKILL.md (for example `~/.claude/skills/arch-map` or `~/.agents/skills/arch-map`).

Turn the current project into an interactive architecture diagram: grouped components, real runtime connections, and a "How it works" tour that walks through the main user-visible flows. Output is one self-contained HTML file; nothing gets installed in the project.

You write `.arch/architecture.json`; a prebuilt viewer (React Flow, dark UI) renders it. The viewer is `assets/viewer.html` (styled with the @crdg loniar theme, light and dark), its source is in `viewer/`.

## Steps

1. **Check for a previous map.** If `.arch/architecture.json` exists, read it and its `commit`; run `git log --oneline <commit>..HEAD` and `git diff --stat <commit>..HEAD` to see what moved, then update the file instead of starting over. Otherwise start fresh.

2. **Survey the project.** Read, in this order, whatever exists: `AGENTS.md` / `CLAUDE.md`, `README.md`, `docs/`, the manifest (`package.json`, `composer.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`), the top two levels of the tree, and the entry points (routes, main files, plugin bootstrap, CLI commands, cron/queue registrations). If the project has a code graph (`.codegraph/` or codebase-memory-mcp), use it for call paths instead of grepping. Done when you can name each runtime process or layer and what it talks to.

3. **Decide the model.** Follow `references/schema.md` for sizes and rules. Components are things with a role at runtime (UI, API, service, job, store, external system, actor), not files or classes. Group them by layer or domain (4-8 groups). Connections are initiated calls or data pushes (label = short lowercase verb phrase). Add actors (`user`, an AI agent, cron) so flows have a start. Done when every component has exactly one group and at least one connection.

4. **Write the tour.** 4-7 steps, one user-visible flow each, ordered for a newcomer: first the thing the main user does, last the safety nets (tests, backups, error paths). Each step names the components and connections it lights up: at most 8 components, only the ones that act in that flow. Descriptions are plain language, 1-3 sentences, and say what happens and why, not which function.

5. **Verify against the code.** Every path in `files` must exist (`test -e`). Every connection must exist in the code: a call, query, HTTP request, hook, or schedule you actually saw. Drop or fix anything you inferred without evidence.

6. **Write and build.**
   ```bash
   mkdir -p .arch
   # write .arch/architecture.json, then:
   node <skill-dir>/scripts/build.mjs .arch/architecture.json
   ```
   The script validates ids, references and enums and exits non-zero with a list of problems. Fix them and rerun until it prints `wrote .../index.html`. Set `commit` to `git rev-parse --short HEAD` and `generatedAt` to the current ISO time.

7. **Look at it.** Open `.arch/index.html` with `agent-browser` (`file://` URL), take a screenshot, and check: nodes do not overlap, group labels are readable, the tour step 1 highlights something sensible. Fix the JSON, not the viewer, unless the viewer is actually broken.

8. **Report** the path (`open .arch/index.html`), the counts, and the 2-3 things you were least sure about. Do not edit `.gitignore`; say that `.arch/` is untracked and let the user decide whether to commit it.

## Editing the viewer

Only when the viewer itself needs to change. Source is `viewer/` (Vite + React + `@xyflow/react` + Tailwind v4). Run `pnpm install && pnpm build` there, then copy `viewer/dist/index.html` to `assets/viewer.html`. Keep the `<script id="arch-data" type="application/json">null</script>` marker intact: `scripts/build.mjs` replaces it.
