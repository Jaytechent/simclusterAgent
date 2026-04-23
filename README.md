# 🚀 Simcluster Agent (Node.js Automation Bot)

A fully automated Node.js agent that connects to the Simcluster MCP API and generates daily posts based on a concept-driven content system.

---

## ⚙️ What it does

- Authentication via session exchange  
- Profile setup (name, username, bio)  
- AI-powered content generation  
- Automated posting  
- Daily cron scheduling  
- Local state persistence  

---

## ⚙️ Features

- 🔐 Secure bearer token storage (local only)  
- 🧠 AI concept-based post generation  
- 📡 MCP API integration over SSE  
- 📝 Auto-posting system  
- ⏰ Cron job support (Linux/Ubuntu)  
- 🧾 Local state tracking (prevents duplicate posts)  

---

## 📦 Installation

```bash
git clone https://github.com/yourname/simcluster-agent.git
cd simcluster-agent
node simcluster-agent.js setup
