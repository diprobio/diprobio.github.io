# Contributing to diprobio.github.io

This site is deployed by GitHub Pages from the `main` branch.

## How project data works

- Public repositories are auto-loaded from GitHub API for organization `diprobio`.
- `data/projects.json` is used to override or enrich repo cards (status, maintainers, docs, tags, etc.).
- `data/projects.json` can also include manual entries (for planning items not yet created as repos).

## Add or update project metadata

1. Open `data/projects.json`.
2. Add or edit one object under `projects`.
3. Recommended fields:
   - `repo` or `repoName` (for matching an organization repo)
   - `name`
   - `description`
   - `status` (`active`, `planning`, or `archived`)
   - `docs`
   - `tags` (array)
   - `maintainers` (array of GitHub usernames)
   - `lastUpdated` (format: `YYYY-MM-DD`)
4. Submit a pull request.

## Validate before PR

- Confirm JSON is valid (no trailing commas).
- Confirm links open correctly.
- Update `lastUpdated` when making meaningful changes.

## Suggested branch naming

- `feat/add-project-<slug>`
- `docs/update-project-<slug>`

## Review checklist

- Data format is valid.
- Metadata matches repository reality.
- Maintainer usernames are accurate.
- No sensitive or private links are included.
