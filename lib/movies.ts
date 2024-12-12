import fs from "fs";
import path from "path";

// Get your Jina AI API key for free: https://jina.ai/?sui=apikey
const JINA_API_KEY = process.env.JINA_API_KEY;

interface Movie {
  title: string;
  wikipedia_link: string;
}

interface ProcessedMovie extends Movie {
  embedding: number[];
}

let processedMoviesCache: ProcessedMovie[] | null = null;

async function fetchMovieContent(url: string): Promise<string> {
  try {
    const response = await fetch("https://r.jina.ai/", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie content: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.content || "";
  } catch (error) {
    console.error(`Error fetching content for ${url}:`, error);
    return "";
  }
}

async function getEmbedding(text: string): Promise<number[]> {
    let shortText = text.slice(0, 15000);
    try {
        // Log the request for debugging
        const requestBody = {
            model: "jina-embeddings-v3",
            input: [shortText]
        };
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch("https://api.jina.ai/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${JINA_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Full error response:', errorText);
            throw new Error(`Failed to get embedding: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));
        
        if (!data.data || !data.data[0] || !data.data[0].embedding) {
            console.error("Unexpected API response structure:", JSON.stringify(data, null, 2));
            throw new Error("Invalid API response structure");
        }

        return data.data[0].embedding;
    } catch (error) {
        console.error("Error getting embedding:", error);
        throw error;
    }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0 || b.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

export async function processMovies(): Promise<ProcessedMovie[]> {
  if (processedMoviesCache) {
    return processedMoviesCache;
  }

  try {
    // Try to load from cache first
    const cacheDir = path.join(process.cwd(), ".cache");
    const cachePath = path.join(cacheDir, "processed_movies.json");
    
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      processedMoviesCache = cached;
      return cached;
    }

    // Load movies from local data
    const moviesPath = path.join(process.cwd(), "data", "movies.json");
    if (!fs.existsSync(moviesPath)) {
      throw new Error("Movies data file not found");
    }

    const movies: Movie[] = JSON.parse(fs.readFileSync(moviesPath, "utf-8"));

    // Process each movie
    const processedMovies: ProcessedMovie[] = [];
    
    // Process movies in parallel with a concurrency limit
    const CONCURRENCY_LIMIT = 50; // Avoid overwhelming the APIs
    const chunks = [];
    
    for (let i = 0; i < movies.length; i += CONCURRENCY_LIMIT) {
      const chunk = movies.slice(i, i + CONCURRENCY_LIMIT);
      const chunkResults = await Promise.all(
        chunk.map(async (movie) => {
          console.log(`Processing movie: ${movie.title}`);
          
          // Get movie content using Reader API
          const content = await fetchMovieContent(movie.wikipedia_link);
          
          // Get embedding for the movie content
          const embedding = await getEmbedding(
            `${movie.title}. ${content}`
          );
          
          if (embedding.length > 0) {
            return {
              ...movie,
              embedding,
            };
          }
          return null;
        })
      );
      
      chunks.push(...chunkResults.filter(result => result !== null));
    }
    
    processedMovies.push(...chunks);

    // Cache the results
    processedMoviesCache = processedMovies;
    
    // Save to disk for persistence
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
    fs.writeFileSync(cachePath, JSON.stringify(processedMovies));

    return processedMovies;
  } catch (error) {
    console.error("Error processing movies:", error);
    throw new Error("Failed to process movies");
  }
}

export async function searchMovies(query: string, movies: ProcessedMovie[]): Promise<Movie[]> {
  try {
    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query);
    
    if (queryEmbedding.length === 0) {
      throw new Error("Failed to generate query embedding");
    }

    // Calculate similarity scores
    const moviesWithScores = movies.map(movie => ({
      ...movie,
      score: cosineSimilarity(queryEmbedding, movie.embedding),
    }));

    // Sort by similarity score
    moviesWithScores.sort((a, b) => b.score - a.score);

    // Return top 6 results
    return moviesWithScores.slice(0, 6);
  } catch (error) {
    console.error("Error searching movies:", error);
    throw error;
  }
} 