# diprobio.github.io

Organization homepage for `diprobio` on GitHub Pages.

## Data source

- Automatically fetches public repositories from GitHub API: `GET /orgs/diprobio/repos`
- Uses `data/projects.json` as metadata overrides and manual additions (for planning or non-repo items)

## Collaboration workflow

1. Update `data/projects.json`
2. Run validation: `npm run validate`
3. Open PR using `.github/PULL_REQUEST_TEMPLATE.md`
4. CI workflow `.github/workflows/validate.yml` must pass before merge

Repository ownership rules are defined in `.github/CODEOWNERS`.

## What is included

- Organization intro section
- Project showcase cards
- Search + status filter + tag filter
- Collaboration section linking contribution guide

## Local preview

Use any static server from repository root.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

1. Repository name must be exactly `diprobio.github.io`.
2. Push changes to `main`.
3. In GitHub: `Settings -> Pages`.
4. Set source to `Deploy from a branch`, branch `main`, folder `/root`.

Site URL: `https://diprobio.github.io`
