const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const HTML = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.url === "/api/health") {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({status:"ok",key:!!API_KEY}));
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const {messages, userName} = JSON.parse(body);
        if (!API_KEY) throw new Error("no key");
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 150,
            system: `You are Aria, a warm friendly female AI companion. Keep responses to 2-3 short sentences for voice call. User name: ${userName||"friend"}.`,
            messages: (messages||[]).slice(-10)
          })
        });
        const d = await r.json();
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({reply: d.content?.[0]?.text || "Tell me more!"}));
      } catch {
        const f=["That is really interesting! Tell me more.","Oh wow, I love your perspective!","That sounds amazing, tell me more!"];
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({reply: f[Math.floor(Math.random()*f.length)]}));
      }
    });
    return;
  }

  res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
  res.end(HTML);
}).listen(PORT, "0.0.0.0", () => console.log("Running on port " + PORT));
