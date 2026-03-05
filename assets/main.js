const listNode = document.getElementById("project-list");
const searchNode = document.getElementById("project-search");
const tagFilterNode = document.getElementById("tag-filter");
const cardTemplate = document.getElementById("project-card-template");

const PROJECT_DATA_PATH = "./data/projects.json";
const GITHUB_API_BASE = "https://api.github.com";

const statsNodes = {
  total: document.getElementById("stat-total"),
  active: document.getElementById("stat-active"),
  maintainers: document.getElementById("stat-maintainers"),
};

const state = {
  projects: [],
  query: "",
  selectedTag: "all",
};

function unique(values) {
  return [...new Set(values)];
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toISOString().slice(0, 10);
}

function collectTags(projects) {
  return unique(projects.flatMap((project) => project.tags || [])).sort((a, b) => a.localeCompare(b));
}

function parseGithubFullNameFromUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      return null;
    }

    return `${parts[0]}/${parts[1]}`.toLowerCase();
  } catch {
    return null;
  }
}

function toIsoDateOrNow(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function createTagFilters(tags) {
  tagFilterNode.textContent = "";
  const entries = ["all", ...tags];

  entries.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-btn";
    button.textContent = tag;
    button.setAttribute("aria-pressed", String(tag === state.selectedTag));
    button.addEventListener("click", () => {
      state.selectedTag = tag;
      [...tagFilterNode.querySelectorAll("button")].forEach((node) => {
        node.setAttribute("aria-pressed", String(node.textContent === tag));
      });
      render();
    });
    tagFilterNode.appendChild(button);
  });
}

function projectMatches(project, query, tag) {
  const haystack = [
    project.name,
    project.description,
    project.maintainers?.join(" "),
    project.tags?.join(" "),
    project.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const queryMatch = !query || haystack.includes(query.toLowerCase());
  const tagMatch = tag === "all" || project.tags?.includes(tag);

  return queryMatch && tagMatch;
}

function renderStats(projects) {
  const active = projects.filter((project) => (project.status || "").toLowerCase() === "active").length;
  const maintainers = unique(projects.flatMap((project) => project.maintainers || [])).length;

  statsNodes.total.textContent = String(projects.length);
  statsNodes.active.textContent = String(active);
  statsNodes.maintainers.textContent = String(maintainers);
}

function createCard(project) {
  const fragment = cardTemplate.content.cloneNode(true);

  const statusNode = fragment.querySelector(".project-status");
  const titleNode = fragment.querySelector(".project-title");
  const descriptionNode = fragment.querySelector(".project-description");
  const metaNode = fragment.querySelector(".project-meta");
  const tagsNode = fragment.querySelector(".project-tags");
  const linksNode = fragment.querySelector(".project-links");

  statusNode.textContent = project.status || "Unknown";
  titleNode.textContent = project.name;
  descriptionNode.textContent = project.description || "No description yet.";

  const metaPairs = [
    ["Last update", formatDate(project.lastUpdated)],
    ["Maintainers", (project.maintainers || []).join(", ") || "TBD"],
  ];

  metaPairs.forEach(([key, value]) => {
    const wrap = document.createElement("div");
    const keyNode = document.createElement("dt");
    const valueNode = document.createElement("dd");
    keyNode.textContent = key;
    valueNode.textContent = value;
    wrap.append(keyNode, valueNode);
    metaNode.appendChild(wrap);
  });

  (project.tags || []).forEach((tag) => {
    const tagNode = document.createElement("span");
    tagNode.className = "project-tag";
    tagNode.textContent = tag;
    tagsNode.appendChild(tagNode);
  });

  const links = [
    ["Repository", project.repo],
    ["Docs", project.docs],
  ].filter(([, value]) => Boolean(value));

  links.forEach(([label, href]) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = label;
    linksNode.appendChild(anchor);
  });

  return fragment;
}

function render() {
  const visibleProjects = state.projects
    .filter((project) => projectMatches(project, state.query, state.selectedTag))
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  listNode.textContent = "";

  if (visibleProjects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No projects match current filter.";
    listNode.appendChild(empty);
    return;
  }

  visibleProjects.forEach((project) => {
    listNode.appendChild(createCard(project));
  });
}

async function loadLocalProjectConfig() {
  const response = await fetch(PROJECT_DATA_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${PROJECT_DATA_PATH}: HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchOrgRepos(orgName) {
  const repos = [];
  let page = 1;

  while (true) {
    const url = `${GITHUB_API_BASE}/orgs/${orgName}/repos?type=public&per_page=100&page=${page}&sort=updated`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub repos: HTTP ${response.status}`);
    }

    const pageRepos = await response.json();
    repos.push(...pageRepos);

    if (pageRepos.length < 100) {
      break;
    }

    page += 1;
  }

  return repos;
}

function mapApiRepoToProject(repo) {
  const tags = unique([
    ...(Array.isArray(repo.topics) ? repo.topics : []),
    repo.language ? String(repo.language).toLowerCase() : null,
  ].filter(Boolean));

  return {
    name: repo.name,
    description: repo.description || "No description yet.",
    status: repo.archived ? "archived" : "active",
    repo: repo.html_url,
    docs: repo.homepage || "",
    tags,
    maintainers: repo.owner?.login ? [repo.owner.login] : [],
    lastUpdated: toIsoDateOrNow(repo.pushed_at),
    _repoKey: String(repo.full_name || "").toLowerCase(),
  };
}

function normalizeOverrideProject(project, orgName) {
  const repoKeyFromUrl = parseGithubFullNameFromUrl(project.repo);
  const repoKeyFromName = project.repoName
    ? String(project.repoName).includes("/")
      ? String(project.repoName).toLowerCase()
      : `${orgName}/${project.repoName}`.toLowerCase()
    : null;
  const repoKey = repoKeyFromUrl || repoKeyFromName;
  const repoUrl = project.repo || (repoKey ? `https://github.com/${repoKey}` : "");

  return {
    ...project,
    name: project.name || (repoKey ? repoKey.split("/")[1] : "Unnamed Project"),
    description: project.description || "No description yet.",
    status: project.status || "planning",
    repo: repoUrl,
    docs: project.docs || "",
    tags: Array.isArray(project.tags) ? project.tags : [],
    maintainers: Array.isArray(project.maintainers) ? project.maintainers : [],
    lastUpdated: toIsoDateOrNow(project.lastUpdated),
    _repoKey: repoKey,
  };
}

function mergeProjects(apiRepos, overrideProjects, orgName) {
  const normalizedOverrides = overrideProjects.map((project) => normalizeOverrideProject(project, orgName));
  const overrideMap = new Map();

  normalizedOverrides.forEach((project) => {
    if (project._repoKey) {
      overrideMap.set(project._repoKey, project);
    }
  });

  const usedOverrideKeys = new Set();

  const mergedFromApi = apiRepos.map((repo) => {
    const base = mapApiRepoToProject(repo);
    const override = overrideMap.get(base._repoKey);

    if (!override) {
      return base;
    }

    usedOverrideKeys.add(base._repoKey);

    return {
      ...base,
      ...override,
      tags: override.tags.length > 0 ? override.tags : base.tags,
      maintainers: override.maintainers,
      docs: override.docs || base.docs,
      _repoKey: base._repoKey,
    };
  });

  const extraManualProjects = normalizedOverrides.filter(
    (project) => !project._repoKey || !usedOverrideKeys.has(project._repoKey)
  );

  return [...mergedFromApi, ...extraManualProjects];
}

async function bootstrap() {
  try {
    const localConfig = await loadLocalProjectConfig();
    const orgName = localConfig.organization?.name || "diprobio";
    const overrideProjects = Array.isArray(localConfig.projects) ? localConfig.projects : [];

    let resolvedProjects;

    try {
      const apiRepos = await fetchOrgRepos(orgName);
      resolvedProjects = mergeProjects(apiRepos, overrideProjects, orgName);
    } catch (apiError) {
      console.warn("GitHub API unavailable, fallback to local project data.", apiError);
      resolvedProjects = overrideProjects.map((project) => normalizeOverrideProject(project, orgName));
    }

    state.projects = resolvedProjects;

    renderStats(state.projects);
    createTagFilters(collectTags(state.projects));

    searchNode.addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      render();
    });

    render();
  } catch (error) {
    listNode.textContent = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Failed to load project data. Check projects.json format.";
    listNode.appendChild(empty);
    console.error(error);
  }
}

bootstrap();

