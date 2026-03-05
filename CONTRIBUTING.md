# Contributing to diprobio.github.io

This site is deployed by GitHub Pages from the `main` branch.

## How project data works

- Public repositories are auto-loaded from GitHub API for organization `diprobio`.
- `data/projects.json` is used to override or enrich repo cards (status, maintainers, docs, tags, etc.).
- `data/projects.json` can include manual entries for planning items that do not exist as repositories yet.

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
4. Run `npm run validate`.
5. Submit a pull request.

## Validation rules

- Schema reference: `data/projects.schema.json`
- Structural/data validation: `scripts/validate-projects.mjs`
- Link format validation: `scripts/check-project-links.mjs`

## Templates and ownership

- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- Issue templates: `.github/ISSUE_TEMPLATE/`
- Default reviewers: `.github/CODEOWNERS`

## Suggested branch naming

- `feat/add-project-<slug>`
- `docs/update-project-<slug>`

## Review checklist

- Data format is valid.
- Metadata matches repository reality.
- Maintainer usernames are accurate.
- No sensitive or private links are included.
