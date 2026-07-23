import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "movie-library";
const KEY = "movies";

const EMPTY_LIBRARY = { movies: [], categories: [] };

export default async (req: Request, context: Context) => {
  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    const library = await store.get(KEY, { type: "json" });
    return new Response(JSON.stringify(library ?? EMPTY_LIBRARY), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (req.method === "PUT" || req.method === "POST") {
    const token = req.headers.get("x-edit-token");
    if (!token || token !== Netlify.env.get("MOVIES_EDIT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const library = body as { movies?: unknown; categories?: unknown };
    if (
      typeof body !== "object" ||
      body === null ||
      !Array.isArray(library.movies) ||
      !Array.isArray(library.categories)
    ) {
      return new Response(
        JSON.stringify({ error: "Expected { movies: [], categories: [] }" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await store.setJSON(KEY, { movies: library.movies, categories: library.categories });
    return new Response(
      JSON.stringify({ ok: true, movieCount: library.movies.length, categoryCount: library.categories.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/movies",
};
