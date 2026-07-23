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
  reconnectBtn: document.getElementById("reconnectBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
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

function enableControls() {
  el.addBtn.disabled = false;
  el.search.disabled = false;
  el.categoryFilter.disabled = false;
  el.sortBy.disabled = false;
}

function genMovieId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- IndexedDB (remembers the linked file handle across reloads) ----------

const DB_NAME = "movie-library-db";
const STORE_NAME = "handles";
const HANDLE_KEY = "moviesFileHandle";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSetHandle(handle) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetHandle() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ---------- File I/O ----------

async function init() {
  if (!supportsFSAccess) {
    autoLoadLibrary();
    return;
  }
  try {
    const handle = await idbGetHandle();
    if (!handle) {
      autoLoadLibrary();
      return;
    }
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") {
      await connectHandle(handle, false);
    } else {
      await autoLoadLibrary();
      offerReconnect(handle);
    }
  } catch (err) {
    console.error(err);
    autoLoadLibrary();
  }
}

function offerReconnect(handle) {
  el.reconnectBtn.classList.remove("hidden");
  el.reconnectBtn.onclick = async () => {
    try {
      const perm = await handle.requestPermission({ mode: "readwrite" });
      if (perm === "granted") {
        el.reconnectBtn.classList.add("hidden");
        await connectHandle(handle, false);
      }
    } catch (err) {
      console.error(err);
    }
  };
}

async function connectHandle(handle, requestIfNeeded) {
  if (requestIfNeeded) {
    const perm = await handle.requestPermission({ mode: "readwrite" });
    if (perm !== "granted") throw new Error("Permission not granted");
  }
  const file = await handle.getFile();
  const text = await file.text();
  loadMovies(text);
  state.fileHandle = handle;
  el.reconnectBtn.classList.add("hidden");
  el.openBtn.textContent = "Change File";
  setStatus(`${state.movies.length} movies — auto-saving to ${file.name}`);
  el.search.focus();
}

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
    setStatus("Couldn't auto-load movies.json — use Connect to pick it manually.");
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
      await idbSetHandle(handle);
      await connectHandle(handle, true);
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
        setStatus(`Loaded ${file.name} — this browser can't auto-save; use Download after making changes`);
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
  state.dirty = false;
  enableControls();
  refreshCategoryOptions();
  render();
}

async function autoSave() {
  if (!state.fileHandle) {
    state.dirty = true;
    setStatus(
      supportsFSAccess
        ? "Unsaved — click Connect movies.json to enable auto-save"
        : "Unsaved — click Download movies.json to export your changes",
      true
    );
    if (!supportsFSAccess) el.downloadBtn.classList.remove("hidden");
    return;
  }
  setStatus("Saving…");
  const json = JSON.stringify(state.movies, null, 2);
  try {
    const writable = await state.fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    state.dirty = false;
    setStatus(`${state.movies.length} movies — saved`);
  } catch (err) {
    console.error(err);
    state.dirty = true;
    setStatus("Couldn't save automatically — check file permissions", true);
  }
}

function downloadLibrary() {
  const json = JSON.stringify(state.movies, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "movies.json";
  a.click();
  URL.revokeObjectURL(url);
  state.dirty = false;
  setStatus(`${state.movies.length} movies — downloaded`);
  el.downloadBtn.classList.add("hidden");
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
  autoSave();
}

function handleDelete() {
  if (!state.editingId) return;
  if (!confirm("Delete this movie from your library?")) return;
  state.movies = state.movies.filter((m) => m.id !== state.editingId);
  refreshCategoryOptions();
  render();
  closeModal();
  autoSave();
}

// ---------- Events ----------

el.openBtn.addEventListener("click", openLibrary);
el.downloadBtn.addEventListener("click", downloadLibrary);
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

init();
