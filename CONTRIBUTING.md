# Contributing to diprobio.github.io

This site is deployed by GitHub Pages from the `main` branch.

## Add or update a project

1. Open `data/projects.json`.
2. Add or edit one object under `projects`.
3. Keep required fields:
   - `name`
   - `description`
   - `status` (`active`, `planning`, or `archived`)
   - `repo`
   - `tags` (array)
   - `maintainers` (array of GitHub usernames)
   - `lastUpdated` (format: `YYYY-MM-DD`)
4. If docs exist, set `docs` to a URL or relative path.
5. Submit a pull request.

## Validate before PR

- Confirm JSON is valid (no trailing commas).
- Confirm links open correctly.
- Update `lastUpdated` to today when making meaningful changes.

## Suggested branch naming

- `feat/add-project-<slug>`
- `docs/update-project-<slug>`

## Review checklist

- Data format is valid.
- Project status is correct.
- Maintainer usernames are accurate.
- No sensitive or private links are included.