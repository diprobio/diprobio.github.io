const listNode = document.getElementById("project-list");
const searchNode = document.getElementById("project-search");
const tagFilterNode = document.getElementById("tag-filter");
const cardTemplate = document.getElementById("project-card-template");

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

function createTagFilters(tags) {
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

async function bootstrap() {
  try {
    const response = await fetch("./data/projects.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.projects = data.projects || [];

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
    empty.textContent = "Failed to load projects.json. Check file path and JSON format.";
    listNode.appendChild(empty);
    console.error(error);
  }
}

bootstrap();