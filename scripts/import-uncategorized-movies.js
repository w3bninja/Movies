// Run this in your browser's dev console while on the live movie site
// (the one you use to add/edit movies). It fetches the current library,
// skips anything whose title already matches (case-insensitive), adds the
// rest, and saves back through the same API the Add Movie form uses.
//
// How to run:
//   1. Open the site, F12 (or Cmd+Opt+I) to open dev tools, go to Console.
//   2. Paste this whole file and press Enter.
//   3. Watch the console for a summary of what was added/skipped.
(async () => {
  const NEW_MOVIES = [
    { "title": "A Kid in King Arthur's Court", "year": 1995, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Angels & Demons", "year": 2009, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Anger Management", "year": 2003, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Beverly Hills Chihuahua", "year": 2008, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Big Daddy", "year": 1999, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Blankman", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Butterfly Effect", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Camp Nowhere", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Cannonball Run", "year": 1981, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Casper", "year": 1995, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Cat in the Hat", "year": 2003, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Chamber", "year": 1996, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "A Christmas Story", "year": 1983, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Chronicles of Riddick", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Clue", "year": 1985, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Confessions of a Shopaholic", "year": 2009, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Cool Runnings", "year": 1993, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Count of Monte Cristo", "year": 2002, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Creed", "year": 2015, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Da Vinci Code", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Despicable Me", "year": 2010, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Devil Wears Prada", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Diary of a Mad Black Woman", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Disturbia", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Django Unchained", "year": 2012, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Dreamer: Inspired by a True Story", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Drumline", "year": 2002, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Edward Scissorhands", "year": 1990, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Family Stone", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Fast and the Furious", "year": 2001, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Fireproof", "year": 2008, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Flashdance", "year": 1983, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Fracture", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Fun with Dick and Jane", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Gods and Generals", "year": 2003, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Good Burger", "year": 1997, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Great Balls of Fire!", "year": 1989, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Hacksaw Ridge", "year": 2016, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Hardball", "year": 2001, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Heavyweights", "year": 1995, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Heist", "year": 2001, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Hitch", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Holiday Inn", "year": 1942, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Hunt for Red October", "year": 1990, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "I Am Legend", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "I Now Pronounce You Chuck & Larry", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "I, Robot", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "In the Army Now", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Jumanji", "year": 1995, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Jungle 2 Jungle", "year": 1997, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Kingdom of Heaven", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Lady in the Water", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Leatherheads", "year": 2008, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Legend of Zorro", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Les Misérables", "year": 2012, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Lincoln", "year": 2012, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Little Big League", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Lone Ranger", "year": 2013, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Lucky Number Slevin", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Lucy", "year": 2014, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Madea's Family Reunion", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Magnificent Seven", "year": 2016, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Mahogany", "year": 1975, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Major Payne", "year": 1995, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Man of the House", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Man on Fire", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Matilda", "year": 1996, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Maverick", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Meet Joe Black", "year": 1998, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Memoirs of a Geisha", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Minority Report", "year": 2002, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Mirror Mirror", "year": 2012, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "MirrorMask", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Monty Python and the Holy Grail", "year": 1975, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Mr. Smith Goes to Washington", "year": 1939, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Napoleon Dynamite", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "National Treasure", "year": 2004, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "National Treasure: Book of Secrets", "year": 2007, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "No Reservations", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Ocean's Eleven", "year": 2001, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Only Yesterday", "year": 1991, "category": "Studio Ghibli & Pre-Ghibli", "subcategory": "Studio Ghibli Features" },
    { "title": "The Order", "year": 2003, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Oz the Great and Powerful", "year": 2013, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Pan's Labyrinth", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Passion of the Christ", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Pitch Black", "year": 2000, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "The Pursuit of Happyness", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Ready Player One", "year": 2018, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Rebound", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Reign of Fire", "year": 2002, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Reign Over Me", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Remember the Titans", "year": 2000, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Richie Rich", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Rise of the Planet of the Apes", "year": 2011, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "Robin Hood: Prince of Thieves", "year": 1991, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Rocky", "year": 1976, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "Rocky Balboa", "year": 2006, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "The Rookie", "year": 2002, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Sherlock Holmes", "year": 2009, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "Sherlock Holmes: A Game of Shadows", "year": 2011, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "Shooter", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Sixth Sense", "year": 1999, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Skulls", "year": 2000, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Stomp the Yard", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe", "year": 2005, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "The Distinguished Gentleman", "year": 1992, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Last of the Mohicans", "year": 1992, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Mask of Zorro", "year": 1998, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Mighty Ducks", "year": 1992, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Pelican Brief", "year": 1993, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Perfect Holiday", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Adventures of Huckleberry Finn", "year": 1993, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Book of Eli", "year": 2010, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Bucket List", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Cell", "year": 2000, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Day After Tomorrow", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Departed", "year": 2006, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Fifth Element", "year": 1997, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Goonies", "year": 1985, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "How the Grinch Stole Christmas", "year": 2000, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Indian in the Cupboard", "year": 1995, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Island", "year": 2005, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Last Samurai", "year": 2003, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Mask", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Odd Life of Timothy Green", "year": 2012, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Russians Are Coming, the Russians Are Coming", "year": 1966, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Toy", "year": 1982, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Warrior's Way", "year": 2010, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Firm", "year": 1993, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Timecop", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Hard Target", "year": 1993, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "A Time to Kill", "year": 1996, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Tom and Huck", "year": 1995, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Lara Croft: Tomb Raider", "year": 2001, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "Lara Croft Tomb Raider: The Cradle of Life", "year": 2003, "category": "Uncategorized Root", "subcategory": "Major Collections & Franchises" },
    { "title": "Total Recall", "year": 1990, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Troy", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Welcome to Marwen", "year": 2018, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Wild America", "year": 1997, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Wiz", "year": 1978, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Wyatt Earp", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "You Got Served", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Young Guns", "year": 1988, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Zodiac", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Rush Hour 3", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Seabiscuit", "year": 2003, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Street Fighter", "year": 1994, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Taxi", "year": 2004, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Karate Kid", "year": 1984, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "The Quest", "year": 1996, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Willy Wonka & the Chocolate Factory", "year": 1971, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "2012", "year": 2009, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
    { "title": "Jeff Dunham: Spark of Insanity", "year": 2007, "category": "Uncategorized Root", "subcategory": "Standalone Films" },
  ];

  function genMovieId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

  const existingTitles = new Set(movies.map((m) => (m.title || "").trim().toLowerCase()));
  const toAdd = [];
  const skipped = [];
  for (const m of NEW_MOVIES) {
    if (existingTitles.has(m.title.trim().toLowerCase())) {
      skipped.push(m.title);
      continue;
    }
    toAdd.push({ id: genMovieId(), title: m.title, year: m.year, category: m.category, subcategory: m.subcategory, cover: "" });
    existingTitles.add(m.title.trim().toLowerCase());
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
