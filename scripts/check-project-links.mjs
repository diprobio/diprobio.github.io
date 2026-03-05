import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROJECT_JSON_PATH = path.join(ROOT, "data", "projects.json");

function readProjects() {
  const raw = fs.readFileSync(PROJECT_JSON_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.projects) ? parsed.projects : [];
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateRepoUrl(url) {
  if (!isHttpUrl(url)) {
    return "must be a valid absolute URL";
  }

  const parsed = new URL(url);
  const isGitHubHost = parsed.hostname === "github.com" || parsed.hostname === "www.github.com";
  if (!isGitHubHost) {
    return "must point to github.com";
  }

  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  if (pathSegments.length < 2) {
    return "must include owner and repository name";
  }

  return null;
}

function validateDocsValue(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const docs = value.trim();
  if (docs === "") {
    return null;
  }

  if (docs.startsWith("./") || docs.startsWith("/")) {
    return null;
  }

  if (!isHttpUrl(docs)) {
    return "must be an absolute URL or a relative path";
  }

  return null;
}

let errors = 0;

for (const [index, project] of readProjects().entries()) {
  const prefix = `projects[${index}]`;

  if (typeof project.repo === "string" && project.repo.trim() !== "") {
    const repoError = validateRepoUrl(project.repo.trim());
    if (repoError) {
      console.error(`ERROR: ${prefix}.repo ${repoError}`);
      errors += 1;
    }
  }

  const docsError = validateDocsValue(project.docs);
  if (docsError) {
    console.error(`ERROR: ${prefix}.docs ${docsError}`);
    errors += 1;
  }
}

if (errors > 0) {
  console.error(`\nLink format check failed with ${errors} error(s).`);
  process.exit(1);
}

console.log("Project link format check passed.");
