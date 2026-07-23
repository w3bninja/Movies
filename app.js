"use strict";

const API_URL = "/api/movies";
const TOKEN_KEY = "moviesEditToken";

const state = {
  movies: [],
  dirty: false,
  editingId: null,
};

const el = {
  status: document.getElementById("status"),
  addBtn: document.getElementById("addBtn"),
  search: document.getElementById("search"),
  categoryFilter: document.getElementById("categoryFilter"),
  sortBy: document.getElementById("sortBy"),
  empty: document.getElementById("empty"),
  grid: document.getElementById("grid"),
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
  el.categoryFilter.disabled = false;
  el.sortBy.disabled = false;
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
    if (Array.isArray(data) && data.length > 0) {
      applyMovies(data);
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
    applyMovies(data);
    setStatus(`${state.movies.length} movies (offline snapshot — edits may not save)`, true);
    el.search.focus();
  } catch (err) {
    console.error(err);
    setStatus("Couldn't load the movie library.");
  }
}

function applyMovies(data) {
  state.movies = data.map((m) => ({
    id: m.id || genMovieId(),
    title: m.title || "Untitled",
    year: m.year ?? "",
    category: m.category || "",
    subcategory: m.subcategory || "",
    cover: m.cover || "",
  }));
  state.dirty = false;
  enableControls();
  refreshCategoryOptions();
  render();
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
      body: JSON.stringify(state.movies),
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

// ---------- Rendering ----------

function refreshCategoryOptions() {
  const categories = [...new Set(state.movies.map((m) => m.category).filter(Boolean))].sort();
  const currentFilter = el.categoryFilter.value;
  el.categoryFilter.innerHTML = '<option value="">All categories</option>' +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  el.categoryFilter.value = categories.includes(currentFilter) ? currentFilter : "";

  el.categoryList.innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");

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
  const category = el.categoryFilter.value;
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
  el.fieldCategory.value = movie ? movie.category : "";
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

  refreshCategoryOptions();
  render();
  closeModal();
  saveLibrary();
}

function handleDelete() {
  if (!state.editingId) return;
  if (!confirm("Delete this movie from your library?")) return;
  state.movies = state.movies.filter((m) => m.id !== state.editingId);
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
el.categoryFilter.addEventListener("change", render);
el.sortBy.addEventListener("change", render);

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
