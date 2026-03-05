import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROJECT_JSON_PATH = path.join(ROOT, "data", "projects.json");

const allowedStatus = new Set(["active", "planning", "archived"]);

function fail(message) {
  console.error(`ERROR: ${message}`);
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isGitHubRepoUrl(value) {
  if (!isHttpUrl(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return false;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length >= 2;
  } catch {
    return false;
  }
}

function readProjects() {
  try {
    const raw = fs.readFileSync(PROJECT_JSON_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    fail(`Cannot read ${PROJECT_JSON_PATH}: ${error.message}`);
    process.exit(1);
  }
}

const data = readProjects();
let errors = 0;

if (!data || typeof data !== "object") {
  fail("Root value must be a JSON object.");
  process.exit(1);
}

if (!data.organization || typeof data.organization !== "object") {
  fail("organization must be an object.");
  errors += 1;
} else if (typeof data.organization.name !== "string" || data.organization.name.trim() === "") {
  fail("organization.name is required and must be a non-empty string.");
  errors += 1;
}

if (!Array.isArray(data.projects)) {
  fail("projects must be an array.");
  errors += 1;
} else {
  const seenKeys = new Set();

  data.projects.forEach((project, index) => {
    const prefix = `projects[${index}]`;

    if (!project || typeof project !== "object" || Array.isArray(project)) {
      fail(`${prefix} must be an object.`);
      errors += 1;
      return;
    }

    if (typeof project.name !== "string" || project.name.trim() === "") {
      fail(`${prefix}.name is required and must be a non-empty string.`);
      errors += 1;
    }

    if (typeof project.status !== "string" || !allowedStatus.has(project.status)) {
      fail(`${prefix}.status must be one of: active, planning, archived.`);
      errors += 1;
    }

    if (!Array.isArray(project.tags)) {
      fail(`${prefix}.tags must be an array.`);
      errors += 1;
    }

    if (!Array.isArray(project.maintainers)) {
      fail(`${prefix}.maintainers must be an array.`);
      errors += 1;
    }

    if (typeof project.lastUpdated !== "string" || !isValidDateString(project.lastUpdated)) {
      fail(`${prefix}.lastUpdated must be a valid YYYY-MM-DD date.`);
      errors += 1;
    }

    const hasRepo = typeof project.repo === "string" && project.repo.trim() !== "";
    const hasRepoName = typeof project.repoName === "string" && project.repoName.trim() !== "";

    if (!hasRepo && !hasRepoName) {
      fail(`${prefix} requires at least one of repo or repoName.`);
      errors += 1;
    }

    if (hasRepo && !isGitHubRepoUrl(project.repo)) {
      fail(`${prefix}.repo must be a valid GitHub repository URL.`);
      errors += 1;
    }

    if (hasRepoName && !/^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?$/.test(project.repoName)) {
      fail(`${prefix}.repoName must look like repo-name or org/repo-name.`);
      errors += 1;
    }

    if (typeof project.docs === "string" && project.docs.trim() !== "") {
      const docsValue = project.docs.trim();
      const docsIsRelative = docsValue.startsWith("./") || docsValue.startsWith("/");
      if (!docsIsRelative && !isHttpUrl(docsValue)) {
        fail(`${prefix}.docs must be an absolute URL or a relative path.`);
        errors += 1;
      }
    }

    const repoKey = hasRepoName ? String(project.repoName).toLowerCase() : String(project.repo).toLowerCase();
    if (seenKeys.has(repoKey)) {
      warn(`${prefix} duplicates repository key: ${repoKey}`);
    }
    seenKeys.add(repoKey);
  });
}

if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
}

console.log("projects.json validation passed.");
