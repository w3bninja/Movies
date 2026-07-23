"use strict";

const API_URL = "/api/movies";
const TOKEN_KEY = "moviesEditToken";
const SIDEBAR_KEY = "moviesSidebarCollapsed";
const VIEW_MODE_KEY = "moviesViewMode";

const state = {
  movies: [],
  categories: [], // [{ name, subcategories: [] }]
  activeCategory: "",
  activeSubcategory: "",
  expandedCategories: new Set(),
  viewMode: "grid",
  dirty: false,
  editingId: null,
};

const el = {
  status: document.getElementById("status"),
  addBtn: document.getElementById("addBtn"),
  search: document.getElementById("search"),
  sortBy: document.getElementById("sortBy"),
  viewGridBtn: document.getElementById("viewGridBtn"),
  viewListBtn: document.getElementById("viewListBtn"),
  empty: document.getElementById("empty"),
  grid: document.getElementById("grid"),
  sidebar: document.getElementById("sidebar"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebarOpenBtn: document.getElementById("sidebarOpenBtn"),
  categoryNav: document.getElementById("categoryNav"),
  addCategoryForm: document.getElementById("addCategoryForm"),
  newCategoryInput: document.getElementById("newCategoryInput"),
  modalOverlay: document.getElementById("modalOverlay"),
  modalTitle: document.getElementById("modalTitle"),
  movieForm: document.getElementById("movieForm"),
  fieldTitle: document.getElementById("fieldTitle"),
  fieldYear: document.getElementById("fieldYear"),
  fieldCategory: document.getElementById("fieldCategory"),
  fieldSubcategory: document.getElementById("fieldSubcategory"),
  fieldCover: document.getElementById("fieldCover"),
  categoryList: document.getElementById("categoryList"),
  subcategoryList: document.getElementById("subcategoryList"),
  deleteBtn: document.getElementById("deleteBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
};

function setStatus(text, dirty = false) {
  el.status.textContent = text;
  el.status.classList.toggle("dirty", dirty);
}

function enableControls() {
  el.addBtn.disabled = false;
  el.search.disabled = false;
  el.sortBy.disabled = false;
  el.viewGridBtn.disabled = false;
  el.viewListBtn.disabled = false;
  el.newCategoryInput.disabled = false;
  el.addCategoryForm.querySelector("button").disabled = false;
}

function initViewMode() {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  setViewMode(stored === "list" ? "list" : "grid");
}

function setViewMode(mode) {
  state.viewMode = mode;
  el.grid.classList.toggle("list-view", mode === "list");
  el.viewGridBtn.classList.toggle("active", mode === "grid");
  el.viewListBtn.classList.toggle("active", mode === "list");
  localStorage.setItem(VIEW_MODE_KEY, mode);
}

function genMovieId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getEditToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function promptForToken() {
  const token = prompt("Enter your edit token to enable saving:");
  if (token) localStorage.setItem(TOKEN_KEY, token.trim());
  return token ? token.trim() : null;
}

// ---------- Data loading ----------

async function loadLibrary() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    if (data && Array.isArray(data.movies) && data.movies.length > 0) {
      applyLibrary(data);
      setStatus(`${state.movies.length} movies`);
      el.search.focus();
      return;
    }
    // API reachable but empty — fall back to the bundled snapshot so the
    // page isn't blank before the store has ever been seeded.
    await loadStaticFallback();
  } catch (err) {
    console.error(err);
    await loadStaticFallback();
  }
}

async function loadStaticFallback() {
  try {
    const res = await fetch("movies.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    applyLibrary(data);
    setStatus(`${state.movies.length} movies (offline snapshot — edits may not save)`, true);
    el.search.focus();
  } catch (err) {
    console.error(err);
    setStatus("Couldn't load the movie library.");
  }
}

function applyLibrary(data) {
  // Accepts either the current { movies, categories } shape or a bare
  // array (older snapshot format) for backwards compatibility.
  const rawMovies = Array.isArray(data) ? data : data.movies || [];
  const rawCategories = Array.isArray(data) ? [] : data.categories || [];

  state.movies = rawMovies.map((m) => ({
    id: m.id || genMovieId(),
    title: m.title || "Untitled",
    year: m.year ?? "",
    category: m.category || "",
    subcategory: m.subcategory || "",
    cover: m.cover || "",
  }));
  state.categories = normalizeCategories(rawCategories);
  syncCategories();
  state.dirty = false;
  enableControls();
  initSidebarState();
  initViewMode();
  refreshCategoryOptions();
  renderCategoryNav();
  render();
}

// Accepts either the current [{name, subcategories}] shape or a bare
// string array (older format) for backwards compatibility.
function normalizeCategories(raw) {
  return raw.map((c) =>
    typeof c === "string"
      ? { name: c, subcategories: [] }
      : { name: c.name, subcategories: Array.isArray(c.subcategories) ? [...c.subcategories] : [] }
  );
}

function findCategory(name) {
  return state.categories.find((c) => c.name === name);
}

function getOrCreateCategory(name) {
  let cat = findCategory(name);
  if (!cat) {
    cat = { name, subcategories: [] };
    state.categories.push(cat);
    state.categories.sort((a, b) => a.name.localeCompare(b.name));
  }
  return cat;
}

// Ensures every category/subcategory actually used by a movie is also
// present in the persisted categories list (e.g. typed directly into the
// movie form) — so nothing typed on a movie gets silently lost.
function syncCategories() {
  state.movies.forEach((m) => {
    if (!m.category) return;
    const cat = getOrCreateCategory(m.category);
    if (m.subcategory && !cat.subcategories.includes(m.subcategory)) {
      cat.subcategories.push(m.subcategory);
      cat.subcategories.sort((a, b) => a.localeCompare(b));
    }
  });
}

async function saveLibrary() {
  let token = getEditToken();
  if (!token) {
    token = promptForToken();
    if (!token) {
      state.dirty = true;
      setStatus("Unsaved — an edit token is required to save", true);
      return;
    }
  }

  setStatus("Saving…");
  try {
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-edit-token": token,
      },
      body: JSON.stringify({ movies: state.movies, categories: state.categories }),
    });

    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      state.dirty = true;
      setStatus("Wrong edit token — click any edit to try again", true);
      return;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    state.dirty = false;
    setStatus(`${state.movies.length} movies — saved`);
  } catch (err) {
    console.error(err);
    state.dirty = true;
    setStatus("Couldn't save — check your connection", true);
  }
}

// ---------- Auto-enrichment (fills blank year/cover from Wikipedia) ----------

async function lookupOnWikipedia(title, year) {
  const query = year ? `${title} ${year} film` : `${title} film`;
  const searchUrl =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=" +
    encodeURIComponent(query);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const hit = searchData?.query?.search?.[0];
  if (!hit) return null;

  const summaryUrl =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(hit.title.replace(/ /g, "_"));
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) return null;
  const summary = await summaryRes.json();

  const looksLikeFilm = /(?:^|\s)(film|movie)(?:\s|$)/i.test(summary.description || "");
  if (!looksLikeFilm) return null;

  const yearMatch = (summary.extract || "").match(/\b(19\d{2}|20\d{2})\b/);

  return {
    year: yearMatch ? Number(yearMatch[1]) : null,
    cover: summary.thumbnail?.source || null,
  };
}

async function maybeEnrichMovie(id) {
  const movie = state.movies.find((m) => m.id === id);
  if (!movie) return;
  const needsYear = !movie.year;
  const needsCover = !movie.cover;
  if (!needsYear && !needsCover) return;

  try {
    const result = await lookupOnWikipedia(movie.title, movie.year);
    if (!result) return;

    // Re-fetch the movie in case it was edited/deleted while the lookup was in flight.
    const current = state.movies.find((m) => m.id === id);
    if (!current) return;

    let changed = false;
    if (needsYear && result.year) {
      current.year = result.year;
      changed = true;
    }
    if (needsCover && result.cover) {
      current.cover = result.cover;
      changed = true;
    }

    if (changed) {
      render();
      setStatus(`Filled in details for "${current.title}" from Wikipedia`);
      await saveLibrary();
    }
  } catch (err) {
    console.error("Auto-enrich failed:", err);
  }
}

// ---------- Sidebar / category nav ----------

function initSidebarState() {
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === "1";
  setSidebarCollapsed(collapsed);
}

function setSidebarCollapsed(collapsed) {
  el.sidebar.classList.toggle("collapsed", collapsed);
  el.sidebarOpenBtn.classList.toggle("hidden", !collapsed);
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
}

function movieCounts() {
  const counts = {};
  state.movies.forEach((m) => {
    if (!m.category) return;
    counts[m.category] = (counts[m.category] || 0) + 1;
    if (m.subcategory) {
      const key = m.category + " " + m.subcategory;
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return counts;
}

function renderCategoryNav() {
  const counts = movieCounts();

  const allItem = `
    <div class="category-item ${!state.activeCategory ? "active" : ""}" data-category="">
      <span class="category-expand"></span>
      <span class="category-label">All Categories</span>
      <span class="category-count">${state.movies.length}</span>
    </div>`;

  const categoryItems = state.categories
    .map((cat) => {
      const count = counts[cat.name] || 0;
      const isActive = state.activeCategory === cat.name && !state.activeSubcategory;
      const isExpanded = state.expandedCategories.has(cat.name);
      const chevron = isExpanded ? "&#9662;" : "&#9656;";

      const subRows = cat.subcategories
        .map((sub) => {
          const subCount = counts[cat.name + " " + sub] || 0;
          const subActive = state.activeCategory === cat.name && state.activeSubcategory === sub;
          return `
            <div class="subcategory-item ${subActive ? "active" : ""}"
              data-category="${escapeHtml(cat.name)}" data-subcategory="${escapeHtml(sub)}">
              <span class="category-label">${escapeHtml(sub)}</span>
              <span class="category-count">${subCount}</span>
              <button type="button" class="category-edit" data-edit-subcategory="${escapeHtml(sub)}"
                data-parent-category="${escapeHtml(cat.name)}" title="Rename subcategory">&#9998;</button>
              <button type="button" class="category-delete" data-delete-subcategory="${escapeHtml(sub)}"
                data-parent-category="${escapeHtml(cat.name)}"
                title="${subCount ? "Move its movies to another subcategory before deleting" : "Delete empty subcategory"}"
                ${subCount ? "disabled" : ""}>&times;</button>
            </div>`;
        })
        .join("");

      const subForm = `
        <form class="add-subcategory-form" data-parent-category="${escapeHtml(cat.name)}">
          <input type="text" class="new-subcategory-input" placeholder="New subcategory…" />
          <button type="submit" class="btn btn-small">+</button>
        </form>`;

      return `
        <div class="category-group">
          <div class="category-item ${isActive ? "active" : ""}" data-category="${escapeHtml(cat.name)}">
            <span class="category-expand" data-expand-category="${escapeHtml(cat.name)}">${chevron}</span>
            <span class="category-label">${escapeHtml(cat.name)}</span>
            <span class="category-count">${count}</span>
            <button type="button" class="category-delete" data-delete-category="${escapeHtml(cat.name)}"
              title="${count ? "Move its movies to another category before deleting" : "Delete empty category"}"
              ${count ? "disabled" : ""}>&times;</button>
          </div>
          ${isExpanded ? `<div class="subcategory-list">${subRows}${subForm}</div>` : ""}
        </div>`;
    })
    .join("");

  el.categoryNav.innerHTML = allItem + categoryItems;
}

function handleAddCategory(evt) {
  evt.preventDefault();
  const name = el.newCategoryInput.value.trim();
  if (!name) return;
  if (!findCategory(name)) {
    getOrCreateCategory(name);
    renderCategoryNav();
    refreshCategoryOptions();
    saveLibrary();
  }
  el.newCategoryInput.value = "";
}

function handleDeleteCategory(name) {
  const inUse = state.movies.some((m) => m.category === name);
  if (inUse) return;
  if (!confirm(`Delete the empty category "${name}"?`)) return;
  state.categories = state.categories.filter((c) => c.name !== name);
  state.expandedCategories.delete(name);
  if (state.activeCategory === name) {
    state.activeCategory = "";
    state.activeSubcategory = "";
  }
  renderCategoryNav();
  refreshCategoryOptions();
  render();
  saveLibrary();
}

function handleAddSubcategory(parentName, input) {
  const name = input.value.trim();
  if (!name) return;
  const cat = findCategory(parentName);
  if (!cat) return;
  if (!cat.subcategories.includes(name)) {
    cat.subcategories.push(name);
    cat.subcategories.sort((a, b) => a.localeCompare(b));
    renderCategoryNav();
    refreshCategoryOptions();
    saveLibrary();
  }
  input.value = "";
}

function handleDeleteSubcategory(parentName, subName) {
  const inUse = state.movies.some((m) => m.category === parentName && m.subcategory === subName);
  if (inUse) return;
  if (!confirm(`Delete the empty subcategory "${subName}"?`)) return;
  const cat = findCategory(parentName);
  if (!cat) return;
  cat.subcategories = cat.subcategories.filter((s) => s !== subName);
  if (state.activeCategory === parentName && state.activeSubcategory === subName) {
    state.activeSubcategory = "";
  }
  renderCategoryNav();
  refreshCategoryOptions();
  render();
  saveLibrary();
}

function handleRenameSubcategory(parentName, oldName) {
  const cat = findCategory(parentName);
  if (!cat) return;
  const newName = prompt(`Rename subcategory "${oldName}" to:`, oldName);
  if (!newName) return;
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;
  if (cat.subcategories.includes(trimmed)) {
    alert(`"${trimmed}" already exists under "${parentName}".`);
    return;
  }

  cat.subcategories = cat.subcategories.filter((s) => s !== oldName);
  cat.subcategories.push(trimmed);
  cat.subcategories.sort((a, b) => a.localeCompare(b));

  state.movies.forEach((m) => {
    if (m.category === parentName && m.subcategory === oldName) m.subcategory = trimmed;
  });
  if (state.activeCategory === parentName && state.activeSubcategory === oldName) {
    state.activeSubcategory = trimmed;
  }

  renderCategoryNav();
  refreshCategoryOptions();
  render();
  saveLibrary();
}

// ---------- Rendering ----------

function refreshCategoryOptions() {
  el.categoryList.innerHTML = state.categories
    .map((c) => `<option value="${escapeHtml(c.name)}"></option>`)
    .join("");
  updateSubcategoryOptions(el.fieldCategory.value.trim());
}

function updateSubcategoryOptions(categoryName) {
  const cat = findCategory(categoryName);
  const subs = cat
    ? cat.subcategories
    : [...new Set(state.categories.flatMap((c) => c.subcategories))].sort((a, b) => a.localeCompare(b));
  el.subcategoryList.innerHTML = subs.map((s) => `<option value="${escapeHtml(s)}"></option>`).join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getFilteredSorted() {
  const q = el.search.value.trim().toLowerCase();
  const category = state.activeCategory;
  const subcategory = state.activeSubcategory;
  const sortBy = el.sortBy.value;

  let list = state.movies.filter((m) => {
    const matchesQuery =
      !q ||
      m.title.toLowerCase().includes(q) ||
      (m.category || "").toLowerCase().includes(q) ||
      (m.subcategory || "").toLowerCase().includes(q);
    const matchesCategory = !category || m.category === category;
    const matchesSubcategory = !subcategory || m.subcategory === subcategory;
    return matchesQuery && matchesCategory && matchesSubcategory;
  });

  list = list.slice().sort((a, b) => {
    if (sortBy === "year") return (a.year || 0) - (b.year || 0);
    if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
    return (a.title || "").localeCompare(b.title || "");
  });

  return list;
}

function render() {
  const list = getFilteredSorted();
  el.empty.classList.toggle("hidden", state.movies.length > 0);
  el.grid.classList.toggle("hidden", state.movies.length === 0);

  el.grid.innerHTML = list
    .map((m) => {
      const cover = m.cover
        ? `<img class="card-cover" src="${escapeHtml(m.cover)}" alt="${escapeHtml(m.title)} cover" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'card-cover placeholder',textContent:'🎬'}))" />`
        : `<div class="card-cover placeholder">🎬</div>`;
      return `
        <div class="card" data-id="${m.id}">
          ${cover}
          <div class="card-body">
            <p class="card-title">${escapeHtml(m.title)}</p>
            <div class="card-meta">
              <span>${escapeHtml(m.year || "")}</span>
              <span>${escapeHtml(m.category || "")}</span>
            </div>
            ${m.subcategory ? `<p class="card-sub">${escapeHtml(m.subcategory)}</p>` : ""}
          </div>
        </div>`;
    })
    .join("");
}

// ---------- Modal ----------

function openModal(movie) {
  state.editingId = movie ? movie.id : null;
  el.modalTitle.textContent = movie ? "Edit Movie" : "Add Movie";
  el.fieldTitle.value = movie ? movie.title : "";
  el.fieldYear.value = movie ? movie.year : "";
  el.fieldCategory.value = movie ? movie.category : state.activeCategory;
  el.fieldSubcategory.value = movie ? movie.subcategory : state.activeSubcategory;
  el.fieldCover.value = movie ? movie.cover : "";
  el.deleteBtn.classList.toggle("hidden", !movie);
  updateSubcategoryOptions(el.fieldCategory.value.trim());
  el.modalOverlay.classList.remove("hidden");
  el.fieldTitle.focus();
}

function closeModal() {
  el.modalOverlay.classList.add("hidden");
  state.editingId = null;
}

function handleFormSubmit(evt) {
  evt.preventDefault();
  const movie = {
    id: state.editingId || genMovieId(),
    title: el.fieldTitle.value.trim(),
    year: el.fieldYear.value ? Number(el.fieldYear.value) : "",
    category: el.fieldCategory.value.trim(),
    subcategory: el.fieldSubcategory.value.trim(),
    cover: el.fieldCover.value.trim(),
  };
  if (!movie.title) return;

  if (state.editingId) {
    const idx = state.movies.findIndex((m) => m.id === state.editingId);
    if (idx !== -1) state.movies[idx] = movie;
  } else {
    state.movies.push(movie);
  }

  syncCategories();
  renderCategoryNav();
  refreshCategoryOptions();
  render();
  closeModal();
  saveLibrary().then(() => maybeEnrichMovie(movie.id));
}

function handleDelete() {
  if (!state.editingId) return;
  if (!confirm("Delete this movie from your library?")) return;
  state.movies = state.movies.filter((m) => m.id !== state.editingId);
  renderCategoryNav();
  refreshCategoryOptions();
  render();
  closeModal();
  saveLibrary();
}

// ---------- Events ----------

el.addBtn.addEventListener("click", () => openModal(null));
el.cancelBtn.addEventListener("click", closeModal);
el.modalCloseBtn.addEventListener("click", closeModal);
el.deleteBtn.addEventListener("click", handleDelete);
el.movieForm.addEventListener("submit", handleFormSubmit);
el.modalOverlay.addEventListener("click", (evt) => {
  if (evt.target === el.modalOverlay) closeModal();
});
el.fieldCategory.addEventListener("input", () => updateSubcategoryOptions(el.fieldCategory.value.trim()));
el.search.addEventListener("input", render);
el.sortBy.addEventListener("change", render);
el.viewGridBtn.addEventListener("click", () => setViewMode("grid"));
el.viewListBtn.addEventListener("click", () => setViewMode("list"));

el.sidebarToggle.addEventListener("click", () => setSidebarCollapsed(true));
el.sidebarOpenBtn.addEventListener("click", () => setSidebarCollapsed(false));

el.addCategoryForm.addEventListener("submit", handleAddCategory);

el.categoryNav.addEventListener("submit", (evt) => {
  const form = evt.target.closest(".add-subcategory-form");
  if (!form) return;
  evt.preventDefault();
  const input = form.querySelector(".new-subcategory-input");
  handleAddSubcategory(form.dataset.parentCategory, input);
});

el.categoryNav.addEventListener("click", (evt) => {
  const editBtn = evt.target.closest(".category-edit");
  if (editBtn) {
    handleRenameSubcategory(editBtn.dataset.parentCategory, editBtn.dataset.editSubcategory);
    return;
  }

  const delBtn = evt.target.closest(".category-delete");
  if (delBtn) {
    if (delBtn.disabled) return;
    if (delBtn.dataset.deleteSubcategory) {
      handleDeleteSubcategory(delBtn.dataset.parentCategory, delBtn.dataset.deleteSubcategory);
    } else {
      handleDeleteCategory(delBtn.dataset.deleteCategory);
    }
    return;
  }

  const expandBtn = evt.target.closest(".category-expand");
  if (expandBtn && expandBtn.dataset.expandCategory) {
    const name = expandBtn.dataset.expandCategory;
    if (state.expandedCategories.has(name)) {
      state.expandedCategories.delete(name);
    } else {
      state.expandedCategories.add(name);
    }
    renderCategoryNav();
    return;
  }

  const subItem = evt.target.closest(".subcategory-item");
  if (subItem) {
    state.activeCategory = subItem.dataset.category;
    state.activeSubcategory = subItem.dataset.subcategory;
    renderCategoryNav();
    render();
    return;
  }

  const item = evt.target.closest(".category-item");
  if (item) {
    state.activeCategory = item.dataset.category;
    state.activeSubcategory = "";
    renderCategoryNav();
    render();
  }
});

el.grid.addEventListener("click", (evt) => {
  const card = evt.target.closest(".card");
  if (!card) return;
  const movie = state.movies.find((m) => m.id === card.dataset.id);
  if (movie) openModal(movie);
});

window.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && !el.modalOverlay.classList.contains("hidden")) {
    closeModal();
  }
});

window.addEventListener("beforeunload", (evt) => {
  if (state.dirty) {
    evt.preventDefault();
    evt.returnValue = "";
  }
});

loadLibrary();
