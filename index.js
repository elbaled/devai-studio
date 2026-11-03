const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    }
    if (!env.AI_API_KEY || !env.AI_BASE_URL || !env.AI_MODEL) {
      return Response.json({ error: "AI provider is not configured. Set AI_API_KEY, AI_BASE_URL and AI_MODEL as Worker secrets/variables." }, { status: 503, headers: corsHeaders });
    }
    try {
      const body = await request.json();
      if (!body.message || typeof body.message !== "string") {
        return Response.json({ error: "A text message is required." }, { status: 400, headers: corsHeaders });
      }
      const project = body.project || { name: "Untitled", files: [] };
      const safeFiles = Array.isArray(project.files) ? project.files.slice(0, 40).map(f => ({
        path: String(f.path || "").slice(0, 180),
        content: String(f.content || "").slice(0, 18000)
      })) : [];

      const system = `You are DevAI Studio, a senior full-stack coding assistant. The user may write Arabic or English. Respond in the user's language.
You receive a project and must make concrete code changes when requested.
Return ONLY valid JSON with this exact shape:
{"message":"short explanation in user's language","files":[{"path":"relative/file/path","content":"COMPLETE file content"}]}
If no file change is needed, return files: [].
Rules:
- Return complete contents for every changed/new file, never snippets or placeholders.
- Only include files that should be created or changed. Preserve unrelated files.
- Use safe relative paths. Never use absolute paths, ../, secrets, credentials, or executable server-side commands.
- Prefer plain HTML/CSS/JS unless the user explicitly requests another stack.
- For a basic website, ensure index.html references style.css and script.js when appropriate.
- Keep code consistent across all returned files. Explain any manual setup or external service requirements in message.
- Never claim deployment, Firebase account access, API connection, or tests that were not actually performed.
- For Firebase, use client config placeholders and explain that client config is not a server secret. Never create open database rules.
- Do not include markdown fences around the JSON.`;

      const messages = [
        { role: "system", content: system },
        { role: "user", content: `Current project: ${project.name}\nExisting files:\n${JSON.stringify(safeFiles)}\n\nTask mode: ${body.mode || "code"}\nUser request: ${body.message}` }
      ];
      const endpoint = env.AI_BASE_URL.replace(/\/$/, "") + "/chat/completions";
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.AI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.AI_MODEL,
          messages,
          temperature: 0.2,
          response_format: { type: "json_object" }
        }),
        signal: AbortSignal.timeout(90000)
      });
      const raw = await upstream.text();
      if (!upstream.ok) {
        return Response.json({ error: `AI provider error (${upstream.status}): ${raw.slice(0, 500)}` }, { status: 502, headers: corsHeaders });
      }
      const completion = JSON.parse(raw);
      const content = completion.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI provider");
      let result;
      try {
        result = JSON.parse(content);
      } catch {
        const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
        result = JSON.parse(cleaned);
      }
      if (!result || typeof result.message !== "string" || !Array.isArray(result.files)) {
        throw new Error("AI returned an unexpected response format");
      }
      const files = result.files.slice(0, 20).filter(f =>
        f && typeof f.path === "string" && typeof f.content === "string" &&
        !f.path.startsWith("/") && !f.path.split("/").includes("..")
      ).map(f => ({ path: f.path, content: f.content }));
      return Response.json({ message: result.message, files }, { headers: corsHeaders });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      return Response.json({ error: message }, { status: 500, headers: corsHeaders });
    }
  }
};
