const ALLOWED_ORIGINS = new Set([
  "https://zaidshafi.github.io",
  "http://localhost:3000",
]);

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/translate" || request.method !== "POST") {
      return Response.json({ error: "Not found" }, { status: 404, headers });
    }
    if (!ALLOWED_ORIGINS.has(origin)) {
      return Response.json(
        { error: "Origin not allowed" },
        { status: 403, headers },
      );
    }

    try {
      const { text, direction } = await request.json();
      if (typeof text !== "string" || !text.trim() || text.length > 500) {
        return Response.json(
          { error: "Enter between 1 and 500 characters." },
          { status: 400, headers },
        );
      }

      const task =
        direction === "toEnglish"
          ? "Translate the Kashmiri input into natural English. The input may use Perso-Arabic Kashmiri script or informal Roman Kashmiri typed in English letters."
          : "Translate the English input into natural, conversational Kashmiri as spoken in the Kashmir Valley.";
      const messages = [
        {
          role: "system",
          content:
            "You are an expert Kashmiri (Koshur) translator. Preserve names, tone, and meaning. Never answer the text as a question; only translate it. Always provide Kashmiri in Perso-Arabic script, a simple Latin pronunciation, and natural English. Return only a JSON object with the keys kashmiri, latin, and english.",
        },
        { role: "user", content: `${task}\n\nText: ${text.trim()}` },
      ];

      if (direction !== "toEnglish") {
        const result = await env.AI.run(
          "@cf/ai4bharat/indictrans2-en-indic-1B",
          {
            text: text.trim(),
            source_lang: "eng_Latn",
            target_lang: "kas_Arab",
            target_language: "kas_Arab",
          },
        );
        const translated =
          result?.translations?.[0]?.translated_text ||
          result?.translations?.[0]?.translation ||
          result?.translations?.[0] ||
          result?.translated_text ||
          result?.translation;
        if (!translated || typeof translated !== "string") {
          throw new Error("Incomplete translation");
        }
        return Response.json(
          {
            kashmiri: translated,
            latin: "",
            english: text.trim(),
          },
          { headers: { ...headers, "Cache-Control": "no-store" } },
        );
      }

      const result = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
        messages,
        max_tokens: 180,
        temperature: 0.1,
      });

      const raw =
        result?.response || result?.choices?.[0]?.message?.content || "";
      if (direction === "toEnglish" && raw.trim()) {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        let english = raw.trim();
        if (jsonMatch) {
          try {
            english = JSON.parse(jsonMatch[0]).english || english;
          } catch {
            // Fall back to the model's plain-text translation.
          }
        }
        return Response.json(
          {
            kashmiri: text.trim(),
            latin: text.trim(),
            english: english
              .trim()
              .replace(/^["']|["']$/g, "")
              .replace(/^English:\s*/i, ""),
          },
          { headers: { ...headers, "Cache-Control": "no-store" } },
        );
      }
      const match = raw.match(/\{[\s\S]*\}/);
      const translation = JSON.parse(match ? match[0] : raw);
      if (
        !translation.kashmiri ||
        !translation.latin ||
        !translation.english
      ) {
        throw new Error("Incomplete translation");
      }
      return Response.json(translation, {
        headers: { ...headers, "Cache-Control": "no-store" },
      });
    } catch (error) {
      console.error(error);
      return Response.json(
        { error: "I could not translate that yet. Please try again." },
        { status: 500, headers },
      );
    }
  },
};
