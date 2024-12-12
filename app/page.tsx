"use client";

import { useState } from "react";
import Image from "next/image";

interface Movie {
  title: string;
  url: string;
  description: string;
  poster?: string;
  score?: number;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Movie[]>([]);
  const [error, setError] = useState<string>("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Error searching:", error);
      setError("Failed to perform search. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Christmas Movie Matcher</h1>
          <p className="text-xl text-gray-300">Find your perfect Christmas movie match!</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter query..."
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-white/40 text-white placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Searching..." : "Match"}
            </button>
          </div>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="max-w-2xl mx-auto mb-8 text-center text-gray-400">
            Loading movies... This might take a moment for the first search.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results && results.map((movie, index) => (
            <div
              key={index}
              className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all"
            >
              {movie.poster && (
                <div className="relative h-48 w-full">
                  <Image
                    src={movie.poster}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{movie.title}</h3>
                <p className="text-gray-400 text-sm mb-3">{movie.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-400">
                    Match Score: {(movie.score ? movie.score * 100 : 0).toFixed(1)}%
                  </span>
                  {movie.url && (
                    <a
                      href={movie.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Learn More →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
