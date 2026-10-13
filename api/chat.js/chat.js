import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(503).json({
      error: "La clé API Gemini n'est pas configurée sur le serveur."
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Écris un message." });
    }

    const valid = messages
      .filter(m =>
        m &&
        typeof m.content === "string" &&
        ["user", "assistant"].includes(m.role)
      )
      .slice(-20);

    if (!valid.length || valid[valid.length - 1].role !== "user") {
      return res.status(400).json({ error: "Message invalide." });
    }

    const ai = new GoogleGenerativeAI(key);
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      systemInstruction:
        "Tu es ALIOU META AI, un assistant utile et honnête. Réponds en français par défaut."
    });

    const history = valid.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, 8000) }]
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(
      valid[valid.length - 1].content.slice(0, 8000)
    );

    return res.status(200).json({
      reply: result.response.text()
    });
  } catch (error) {
    console.error("Erreur IA :", error);
    return res.status(500).json({
      error: "Erreur du service IA. Réessaie plus tard."
    });
  }
}
