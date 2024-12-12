import { NextResponse } from "next/server";
import { processMovies, searchMovies } from "@/lib/movies";

// Get your Jina AI API key for free: https://jina.ai/?sui=apikey
const JINA_API_KEY = process.env.JINA_API_KEY;

export async function POST(req: Request) {
  if (!JINA_API_KEY) {
    return NextResponse.json(
      { error: "JINA_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Get processed movies (this will cache the results)
    const movies = await processMovies();
    
    // Search movies using the query
    const results = await searchMovies(query, movies);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to process search request" },
      { status: 500 }
    );
  }
} 