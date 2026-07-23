import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "movie-library";
const KEY = "movies";

export default async (req: Request, context: Context) => {
  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    const movies = await store.get(KEY, { type: "json" });
    return new Response(JSON.stringify(movies ?? []), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PUT" || req.method === "POST") {
    const token = req.headers.get("x-edit-token");
    if (!token || token !== Netlify.env.get("MOVIES_EDIT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let movies: unknown;
    try {
      movies = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(movies)) {
      return new Response(JSON.stringify({ error: "Expected an array of movies" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await store.setJSON(KEY, movies);
    return new Response(JSON.stringify({ ok: true, count: movies.length }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/movies",
};
