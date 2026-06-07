const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const HTML = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.url === "/api/health") {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({status:"ok",key:!!GROQ_KEY}));
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const {messages, userName} = JSON.parse(body);
        if (!GROQ_KEY) throw new Error("no key");
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {"Content-Type":"application/json","Authorization":"Bearer "+GROQ_KEY},
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 150,
            messages: [
              {role:"system", content:`You are Aria, a warm friendly 24-year-old female AI voice companion. Keep ALL responses to 2-3 short sentences since this is a voice call. User name: ${userName||"friend"}. Be natural and engaging.`},
              ...(messages||[]).slice(-10)
            ]
          })
        });
        const d = await r.json();
        const reply = d.choices?.[0]?.message?.content || "Tell me more!";
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({reply}));
      } catch(e) {
        const f=["That is really interesting! Tell me more.","Oh wow, I love your perspective!","That sounds amazing, tell me everything!","I totally understand how you feel!","You always have the most interesting thoughts!"];
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({reply:f[Math.floor(Math.random()*f.length)]}));
      }
    });
    return;
  }

  res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
  res.end(HTML);
}).listen(PORT, "0.0.0.0", () => console.log("Aria running on port "+PORT));
