import { api, ApiError } from "@/lib/api";

type SearchResults = {
  boards: { id: string; name: string; status: string }[];
  tasks: { id: string; name: string; status: string; list: { board: { id: string } } }[];
  teams: { id: string; name: string }[];
};

// Same-origin proxy for the backend /search endpoint so the browser can
// search without needing CORS or direct access to the backend container.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  try {
    const results = await api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
    return Response.json(results);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Search failed" }, { status: 502 });
  }
}
