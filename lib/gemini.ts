import { GoogleGenAI } from "@google/genai";
import { MatchResult } from "./matching";

export async function narrateStageMatch(
  query: string,
  topMatch: MatchResult
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback if no Gemini API key is configured
  if (!apiKey) {
    return `MongoDB graph traversal matched "${topMatch.name}" (@${topMatch.handle}) for "${query}". Shared domains: ${topMatch.sharedTopics.join(", ") || "Full-stack engineering"}. Verified via repo: ${topMatch.proofRepo?.name || "public activity"}. Connect via ${topMatch.contact}.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the onstage AI matchmaker for a fast-paced builder conference.
The audience asked: "${query}"
MongoDB Graph Traversal found this exact unblocker:
- Candidate Name: ${topMatch.name} (@${topMatch.handle})
- Contact: ${topMatch.contact}
- Candidate Ask / Bio: ${topMatch.description}
- Matched Topics / Skills: ${topMatch.sharedTopics.join(", ")}
- Matched Languages: ${topMatch.sharedLanguages.join(", ")}
- Proof Repository: ${topMatch.proofRepo?.name || "active repositories"} (${topMatch.proofRepo?.description || "verified code"})

Task: Deliver a punchy, high-energy 2-sentence onstage introduction explaining EXACTLY why ${topMatch.name} is the perfect person in the room to talk to, citing their specific repository proof and contact handle. Be direct, authoritative, and concise.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Match found and verified on GitHub.";
  } catch (error) {
    console.error("[gemini] Error generating narrative:", error);
    return `MongoDB graph matched ${topMatch.name} (@${topMatch.handle}) based on proven work in ${topMatch.sharedTopics.join(", ") || topMatch.proofRepo?.name}. Connect at ${topMatch.contact}.`;
  }
}
