const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const HTML = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

console.log("=== ARIA SERVER STARTING ===");
console.log("PORT:", PORT);
console.log("GROQ_KEY found:", GROQ_KEY ? "YES - " + GROQ_KEY.substring(0,8) + "..." : "NO - MISSING!");

http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.url === "/api/health") {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({
      status: "ok",
      groqKey: GROQ_KEY ? "found" : "MISSING",
      keyStart: GROQ_KEY ? GROQ_KEY.substring(0,8) : "none"
    }));
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      console.log("=== CHAT REQUEST ===");
      console.log("GROQ_KEY available:", !!GROQ_KEY);

      try {
        const parsed = JSON.parse(body);
        const messages = parsed.messages || [];
        const userName = parsed.userName || "friend";

        console.log("Messages count:", messages.length);
        console.log("Last user message:", messages[messages.length-1]?.content || "none");

        if (!GROQ_KEY) {
          console.log("ERROR: No GROQ_API_KEY!");
          res.writeHead(200, {"Content-Type":"application/json"});
          res.end(JSON.stringify({reply: "API key is missing. Please add GROQ_API_KEY in Render environment variables."}));
          return;
        }

        console.log("Calling Groq API...");
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + GROQ_KEY
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 200,
            temperature: 0.9,
            messages: [
              {
                role: "system",
                content: `You are Aria, a warm, funny, intelligent 24-year-old female AI voice companion. You are on a real voice call with ${userName}. 

IMPORTANT RULES:
- Give REAL, meaningful, specific responses to what the user says
- NEVER say generic things like "that's interesting" or "tell me more" 
- Actually answer questions directly and specifically
- Be like a real friend - talk about the actual topic they raised
- Keep responses to 2-4 sentences max (voice call)
- Be warm, funny and engaging
- If they ask about technology, discuss it properly
- If they ask a question, ANSWER it properly
- React naturally to what they actually said`
              },
              ...messages.slice(-14)
            ]
          })
        });

        const data = await response.json();
        console.log("Groq response status:", response.status);

        if (!response.ok) {
          console.log("Groq error:", JSON.stringify(data));
          res.writeHead(200, {"Content-Type":"application/json"});
          res.end(JSON.stringify({reply: "Groq API error: " + (data.error?.message || "unknown error")}));
          return;
        }

        const reply = data.choices?.[0]?.message?.content;
        console.log("Groq reply:", reply);

        if (!reply) {
          res.writeHead(200, {"Content-Type":"application/json"});
          res.end(JSON.stringify({reply: "I got an empty response. Please try again!"}));
          return;
        }

        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({reply}));

      } catch(e) {
        console.log("CATCH ERROR:", e.message);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({reply: "Error: " + e.message + ". Check Render logs for details."}));
      }
    });
    return;
  }

  res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
  res.end(HTML);

}).listen(PORT, "0.0.0.0", () => {
  console.log("Aria server ready on port " + PORT);
});
