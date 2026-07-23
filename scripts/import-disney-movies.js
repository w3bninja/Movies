// Run this in your browser's dev console while on the live movie site —
// same idea as import-uncategorized-movies.js, but for the Disney folder
// listing. Fetches the current library, skips titles that already match
// (title+year, so remakes like the 2017 Beauty and the Beast aren't
// treated as duplicates of the 1991 original), adds the rest, and saves
// through the same API the Add Movie form uses.
//
// How to run:
//   1. Open the site, F12 (or Cmd+Opt+I) to open dev tools, go to Console.
//   2. Paste this whole file and press Enter.
//   3. Watch the console for a summary of what was added/skipped.
(async () => {
  const CAT = "Disney & Classic Animation";
  const SUB = "Walt Disney & Pixar Feature Films";

  const NEW_MOVIES = [
    { title: "A Goofy Movie", year: 1995, category: CAT, subcategory: SUB },
    { title: "Beauty and the Beast", year: 2017, category: CAT, subcategory: SUB },
    { title: "The Castaway Cowboy", year: 1974, category: CAT, subcategory: SUB },
    { title: "Davy Crockett, King of the Wild Frontier", year: 1955, category: CAT, subcategory: SUB },
    { title: "Big Red", year: 1962, category: CAT, subcategory: SUB },
    { title: "Enchanted", year: 2007, category: CAT, subcategory: SUB },
    { title: "Make Mine Music", year: 1946, category: CAT, subcategory: SUB },
    { title: "Maleficent", year: 2014, category: CAT, subcategory: SUB },
    { title: "Mary Poppins", year: 1964, category: CAT, subcategory: SUB },
    { title: "Mary Poppins Returns", year: 2018, category: CAT, subcategory: SUB },
    { title: "Melody Time", year: 1948, category: CAT, subcategory: SUB },
    { title: "Old Yeller", year: 1957, category: CAT, subcategory: SUB },
    { title: "Savage Sam", year: 1963, category: CAT, subcategory: SUB },
    { title: "Pirates of the Caribbean: The Curse of the Black Pearl", year: 2003, category: CAT, subcategory: SUB },
    { title: "Pirates of the Caribbean: Dead Man's Chest", year: 2006, category: CAT, subcategory: SUB },
    { title: "Pirates of the Caribbean: At World's End", year: 2007, category: CAT, subcategory: SUB },
    { title: "Pirates of the Caribbean: On Stranger Tides", year: 2011, category: CAT, subcategory: SUB },
    { title: "Song of the South", year: 1946, category: CAT, subcategory: SUB },
    { title: "Swiss Family Robinson", year: 1960, category: CAT, subcategory: SUB },
    { title: "Tall Tale", year: 1995, category: CAT, subcategory: SUB },
    { title: "The Nightmare Before Christmas", year: 1993, category: CAT, subcategory: SUB },
    { title: "The Big Green", year: 1995, category: CAT, subcategory: SUB },
    { title: "TRON: Legacy", year: 2010, category: CAT, subcategory: SUB },
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
