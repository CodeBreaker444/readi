export async function webSearch(query: string) {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
        throw new Error("SERP_API_KEY not found in environment variables");
    }

    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const results = data.organic_results?.slice(0, 3).map((r: any) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet
        })) || [];

        return results;
    }
    catch (err) {
        console.error("Web search failed:", err);
        return [];
    }
}
