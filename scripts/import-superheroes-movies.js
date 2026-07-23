// Run this in your browser's dev console while on the live movie site —
// same idea as import-uncategorized-movies.js and import-disney-movies.js,
// for the Superheroes folder listing. Fetches the current library, skips
// titles that already match (title+year, so remakes/reboots aren't
// treated as duplicates of an earlier film with the same name), adds the
// rest, and saves through the same API the Add Movie form uses.
//
// How to run:
//   1. Open the site, F12 (or Cmd+Opt+I) to open dev tools, go to Console.
//   2. Paste this whole file and press Enter.
//   3. Watch the console for a summary of what was added/skipped.
(async () => {
  const CAT = "Superheroes & Blockbusters";

  const NEW_MOVIES = [
    { title: "Hulk", year: 2003, category: CAT, subcategory: "Other Spider-Man & X-Men" },
    { title: "The Incredible Hulk", year: 2008, category: CAT, subcategory: "Marvel Cinematic Universe (MCU)" },
    { title: "The League of Extraordinary Gentlemen", year: 2003, category: CAT, subcategory: "DC Universe & Other Adaptations" },
    { title: "Captain America", year: 1990, category: CAT, subcategory: "Other Spider-Man & X-Men" },
    { title: "Ultraviolet", year: 2006, category: CAT, subcategory: "Sci-Fi & Franchises" },
    { title: "Wanted", year: 2008, category: CAT, subcategory: "Sci-Fi & Franchises" },
  ];

  function genMovieId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function key(title, year) {
    return `${title.trim().toLowerCase()}::${year}`;
  }

  const token = localStorage.getItem("moviesEditToken") || prompt("Enter your edit token:");
  if (!token) {
    console.error("No edit token — aborting.");
    return;
  }

  const res = await fetch("/api/movies", { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/movies failed: ${res.status}`);
  const library = await res.json();
  const movies = Array.isArray(library.movies) ? library.movies : [];
  const categories = Array.isArray(library.categories) ? library.categories : [];

  const existingKeys = new Set(movies.map((m) => key(m.title || "", m.year || "")));
  const toAdd = [];
  const skipped = [];
  for (const m of NEW_MOVIES) {
    if (existingKeys.has(key(m.title, m.year))) {
      skipped.push(`${m.title} (${m.year})`);
      continue;
    }
    toAdd.push({ id: genMovieId(), title: m.title, year: m.year, category: m.category, subcategory: m.subcategory, cover: "" });
    existingKeys.add(key(m.title, m.year));
  }

  const updatedMovies = [...movies, ...toAdd];

  const updatedCategories = categories.map((c) => ({ ...c, subcategories: [...(c.subcategories || [])] }));
  for (const m of toAdd) {
    let cat = updatedCategories.find((c) => c.name === m.category);
    if (!cat) {
      cat = { name: m.category, subcategories: [] };
      updatedCategories.push(cat);
    }
    if (m.subcategory && !cat.subcategories.includes(m.subcategory)) {
      cat.subcategories.push(m.subcategory);
    }
  }

  const putRes = await fetch("/api/movies", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-edit-token": token },
    body: JSON.stringify({ movies: updatedMovies, categories: updatedCategories }),
  });

  if (!putRes.ok) {
    console.error(`Save failed: ${putRes.status} ${putRes.statusText}`);
    return;
  }

  console.log(`Added ${toAdd.length} movies. Skipped ${skipped.length} already-present titles.`);
  if (skipped.length) console.log("Skipped:", skipped);
  console.log("Reload the page to see the new movies.");
})();
