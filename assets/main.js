const listNode = document.getElementById("project-list");
const searchNode = document.getElementById("project-search");
const statusFilterNode = document.getElementById("status-filter");
const tagFilterNode = document.getElementById("tag-filter");
const cardTemplate = document.getElementById("project-card-template");

const PROJECT_DATA_PATH = "./data/projects.json";
const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_STATUSES = ["all", "active", "planning", "archived"];

const statsNodes = {
  total: document.getElementById("stat-total"),
  active: document.getElementById("stat-active"),
  maintainers: document.getElementById("stat-maintainers"),
};

const state = {
  projects: [],
  query: "",
  selectedStatus: "all",
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

function collectStatuses(projects) {
  const statuses = unique(projects.map((project) => String(project.status || "").toLowerCase()).filter(Boolean));
  return unique([...DEFAULT_STATUSES, ...statuses]);
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

function createFilterButtons(containerNode, entries, selectedValue, onSelect) {
  containerNode.textContent = "";

  entries.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-btn";
    button.textContent = entry;
    button.setAttribute("aria-pressed", String(entry === selectedValue));
    button.addEventListener("click", () => {
      [...containerNode.querySelectorAll("button")].forEach((node) => {
        node.setAttribute("aria-pressed", String(node.textContent === entry));
      });
      onSelect(entry);
    });
    containerNode.appendChild(button);
  });
}

function createStatusFilters(statuses) {
  createFilterButtons(statusFilterNode, statuses, state.selectedStatus, (status) => {
    state.selectedStatus = status;
    render();
  });
}

function createTagFilters(tags) {
  createFilterButtons(tagFilterNode, ["all", ...tags], state.selectedTag, (tag) => {
    state.selectedTag = tag;
    render();
  });
}

function projectMatches(project, query, status, tag) {
  const normalizedStatus = String(project.status || "").toLowerCase();
  const haystack = [
    project.name,
    project.description,
    project.maintainers?.join(" "),
    project.tags?.join(" "),
    normalizedStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const queryMatch = !query || haystack.includes(query.toLowerCase());
  const statusMatch = status === "all" || normalizedStatus === status;
  const tagMatch = tag === "all" || project.tags?.includes(tag);

  return queryMatch && statusMatch && tagMatch;
}

function renderStats(projects) {
  const active = projects.filter((project) => String(project.status || "").toLowerCase() === "active").length;
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

  statusNode.textContent = project.status || "unknown";
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
    .filter((project) => projectMatches(project, state.query, state.selectedStatus, state.selectedTag))
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
  const tags = unique(
    [
      ...(Array.isArray(repo.topics) ? repo.topics : []),
      repo.language ? String(repo.language).toLowerCase() : null,
    ].filter(Boolean)
  );

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

  return {
    name: project.name || null,
    description: project.description || null,
    status: project.status ? String(project.status).toLowerCase() : null,
    repo: project.repo || (repoKey ? `https://github.com/${repoKey}` : null),
    docs: project.docs || null,
    tags: Array.isArray(project.tags) ? project.tags : [],
    maintainers: Array.isArray(project.maintainers) ? project.maintainers : [],
    lastUpdated: project.lastUpdated ? toIsoDateOrNow(project.lastUpdated) : null,
    _repoKey: repoKey,
  };
}

function materializeManualProject(project) {
  return {
    name: project.name || (project._repoKey ? project._repoKey.split("/")[1] : "Unnamed Project"),
    description: project.description || "No description yet.",
    status: project.status || "planning",
    repo: project.repo || "",
    docs: project.docs || "",
    tags: project.tags,
    maintainers: project.maintainers,
    lastUpdated: project.lastUpdated || toIsoDateOrNow(new Date()),
    _repoKey: project._repoKey,
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
      name: override.name || base.name,
      description: override.description || base.description,
      status: override.status || base.status,
      repo: override.repo || base.repo,
      docs: override.docs || base.docs,
      tags: override.tags.length > 0 ? override.tags : base.tags,
      maintainers: override.maintainers.length > 0 ? override.maintainers : base.maintainers,
      lastUpdated: override.lastUpdated || base.lastUpdated,
      _repoKey: base._repoKey,
    };
  });

  const extraManualProjects = normalizedOverrides
    .filter((project) => !project._repoKey || !usedOverrideKeys.has(project._repoKey))
    .map((project) => materializeManualProject(project));

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
      resolvedProjects = overrideProjects
        .map((project) => normalizeOverrideProject(project, orgName))
        .map((project) => materializeManualProject(project));
    }

    state.projects = resolvedProjects;

    renderStats(state.projects);
    createStatusFilters(collectStatuses(state.projects));
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
