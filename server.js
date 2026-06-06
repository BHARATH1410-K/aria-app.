require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userName, personality } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "No API key" });

    const personalityMap = {
      friendly: "You are warm and supportive.",
      professional: "You are calm and professional.",
      playful: "You are fun and witty.",
      calm: "You are gentle and soothing.",
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        system: `You are Aria, a friendly 24-year-old female AI voice companion. ${personalityMap[personality] || personalityMap.friendly} Keep responses to 1-3 short sentences. The user's name is ${userName || "friend"}.`,
        messages: messages.slice(-10),
      }),
    });

    const data = await response.json();
    res.json({ reply: data.content?.[0]?.text || "Sorry, I could not respond." });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasApiKey: !!process.env.ANTHROPIC_API_KEY });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
