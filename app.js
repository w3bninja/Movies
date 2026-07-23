"use strict";

const API_URL = "/api/movies";
const TOKEN_KEY = "moviesEditToken";
const SIDEBAR_KEY = "moviesSidebarCollapsed";
const VIEW_MODE_KEY = "moviesViewMode";

const state = {
  movies: [],
  categories: [],
  activeCategory: "",
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
  state.categories = [...rawCategories];
  syncCategories();
  state.dirty = false;
  enableControls();
  initSidebarState();
  initViewMode();
  refreshCategoryOptions();
  renderCategoryNav();
  render();
}

// Ensures every category actually used by a movie is also present in the
// persisted categories list (e.g. typed directly into the movie form).
function syncCategories() {
  const used = new Set(state.movies.map((m) => m.category).filter(Boolean));
  let changed = false;
  used.forEach((name) => {
    if (!state.categories.includes(name)) {
      state.categories.push(name);
      changed = true;
    }
  });
  if (changed) state.categories.sort((a, b) => a.localeCompare(b));
  return changed;
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

function renderCategoryNav() {
  const counts = {};
  state.movies.forEach((m) => {
    if (m.category) counts[m.category] = (counts[m.category] || 0) + 1;
  });

  const allItem = `
    <div class="category-item ${!state.activeCategory ? "active" : ""}" data-category="">
      <span class="category-label">All Categories</span>
      <span class="category-count">${state.movies.length}</span>
    </div>`;

  const categoryItems = state.categories
    .map((name) => {
      const count = counts[name] || 0;
      const active = state.activeCategory === name ? "active" : "";
      return `
        <div class="category-item ${active}" data-category="${escapeHtml(name)}">
          <span class="category-label">${escapeHtml(name)}</span>
          <span class="category-count">${count}</span>
          <button type="button" class="category-delete" data-delete-category="${escapeHtml(name)}"
            title="${count ? "Move its movies to another category before deleting" : "Delete empty category"}"
            ${count ? "disabled" : ""}>&times;</button>
        </div>`;
    })
    .join("");

  el.categoryNav.innerHTML = allItem + categoryItems;
}

function handleAddCategory(evt) {
  evt.preventDefault();
  const name = el.newCategoryInput.value.trim();
  if (!name) return;
  if (!state.categories.includes(name)) {
    state.categories.push(name);
    state.categories.sort((a, b) => a.localeCompare(b));
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
  state.categories = state.categories.filter((c) => c !== name);
  if (state.activeCategory === name) state.activeCategory = "";
  renderCategoryNav();
  refreshCategoryOptions();
  render();
  saveLibrary();
}

// ---------- Rendering ----------

function refreshCategoryOptions() {
  el.categoryList.innerHTML = state.categories
    .map((c) => `<option value="${escapeHtml(c)}"></option>`)
    .join("");

  const subcategories = [...new Set(state.movies.map((m) => m.subcategory).filter(Boolean))].sort();
  el.subcategoryList.innerHTML = subcategories.map((s) => `<option value="${escapeHtml(s)}"></option>`).join("");
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
  const sortBy = el.sortBy.value;

  let list = state.movies.filter((m) => {
    const matchesQuery =
      !q ||
      m.title.toLowerCase().includes(q) ||
      (m.category || "").toLowerCase().includes(q) ||
      (m.subcategory || "").toLowerCase().includes(q);
    const matchesCategory = !category || m.category === category;
    return matchesQuery && matchesCategory;
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
  el.fieldSubcategory.value = movie ? movie.subcategory : "";
  el.fieldCover.value = movie ? movie.cover : "";
  el.deleteBtn.classList.toggle("hidden", !movie);
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
el.search.addEventListener("input", render);
el.sortBy.addEventListener("change", render);
el.viewGridBtn.addEventListener("click", () => setViewMode("grid"));
el.viewListBtn.addEventListener("click", () => setViewMode("list"));

el.sidebarToggle.addEventListener("click", () => setSidebarCollapsed(true));
el.sidebarOpenBtn.addEventListener("click", () => setSidebarCollapsed(false));

el.addCategoryForm.addEventListener("submit", handleAddCategory);

el.categoryNav.addEventListener("click", (evt) => {
  const delBtn = evt.target.closest(".category-delete");
  if (delBtn) {
    if (delBtn.disabled) return;
    handleDeleteCategory(delBtn.dataset.deleteCategory);
    return;
  }
  const item = evt.target.closest(".category-item");
  if (item) {
    state.activeCategory = item.dataset.category;
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
