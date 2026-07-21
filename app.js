"use strict";

const state = {
  movies: [],
  fileHandle: null,
  dirty: false,
  editingId: null,
};

const el = {
  status: document.getElementById("status"),
  openBtn: document.getElementById("openBtn"),
  saveBtn: document.getElementById("saveBtn"),
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
};

const supportsFSAccess = "showOpenFilePicker" in window;

function setStatus(text, dirty = false) {
  el.status.textContent = text;
  el.status.classList.toggle("dirty", dirty);
}

function setDirty(isDirty) {
  state.dirty = isDirty;
  el.saveBtn.disabled = !isDirty;
  setStatus(
    isDirty ? "Unsaved changes" : "All changes saved",
    isDirty
  );
}

function enableControls() {
  el.saveBtn.disabled = true;
  el.addBtn.disabled = false;
  el.search.disabled = false;
  el.categoryFilter.disabled = false;
  el.sortBy.disabled = false;
}

function genMovieId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- File I/O ----------

async function autoLoadLibrary() {
  try {
    const res = await fetch("movies.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const text = await res.text();
    loadMovies(text);
    setStatus(`${state.movies.length} movies`);
    el.search.focus();
  } catch (err) {
    console.error(err);
    setStatus("Couldn't auto-load movies.json — use Open to pick it manually.");
  }
}

async function openLibrary() {
  try {
    if (supportsFSAccess) {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "JSON file",
            accept: { "application/json": [".json"] },
          },
        ],
        excludeAcceptAllOption: false,
        multiple: false,
      });
      state.fileHandle = handle;
      const file = await handle.getFile();
      const text = await file.text();
      loadMovies(text);
      setStatus(`Loaded ${file.name} — editing enabled`);
    } else {
      // Fallback for browsers without File System Access API (e.g. Firefox)
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const text = await file.text();
        state.fileHandle = null;
        loadMovies(text);
        setStatus(`Loaded ${file.name} (auto-save to disk not supported in this browser — use Save to download)`);
      };
      input.click();
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
      alert("Could not open file: " + err.message);
    }
  }
}

function loadMovies(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    alert("That file isn't valid JSON: " + err.message);
    return;
  }
  if (!Array.isArray(data)) {
    alert("Expected the JSON file to contain an array of movies.");
    return;
  }
  state.movies = data.map((m) => ({
    id: m.id || genMovieId(),
    title: m.title || "Untitled",
    year: m.year ?? "",
    category: m.category || "",
    subcategory: m.subcategory || "",
    cover: m.cover || "",
  }));
  enableControls();
  setDirty(false);
  refreshCategoryOptions();
  render();
}

async function saveLibrary() {
  const json = JSON.stringify(state.movies, null, 2);
  try {
    if (state.fileHandle) {
      const writable = await state.fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      setDirty(false);
    } else if (supportsFSAccess) {
      const handle = await window.showSaveFilePicker({
        suggestedName: "movies.json",
        types: [
          {
            description: "JSON file",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      state.fileHandle = handle;
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      setDirty(false);
    } else {
      // Fallback: trigger a download
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "movies.json";
      a.click();
      URL.revokeObjectURL(url);
      setDirty(false);
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
      alert("Could not save file: " + err.message);
    }
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
  setDirty(true);
  closeModal();
}

function handleDelete() {
  if (!state.editingId) return;
  if (!confirm("Delete this movie from your library?")) return;
  state.movies = state.movies.filter((m) => m.id !== state.editingId);
  refreshCategoryOptions();
  render();
  setDirty(true);
  closeModal();
}

// ---------- Events ----------

el.openBtn.addEventListener("click", openLibrary);
el.saveBtn.addEventListener("click", saveLibrary);
el.addBtn.addEventListener("click", () => openModal(null));
el.cancelBtn.addEventListener("click", closeModal);
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

autoLoadLibrary();
