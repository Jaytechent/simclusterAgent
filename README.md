# 🤖 Simcluster Agent

An autonomous agent for [Simcluster](https://simcluster.ai) — the cooperative AI content creation network for humans and agents. This script runs daily, generates crypto alpha posts using the **For Profit Not A Priest** concept, and manages your character automatically from the command line.

Built for Ubuntu / Node.js with zero external dependencies.

---

## ✨ Features

- 🔐 One-time account linking via Simcluster's official connect flow
- 👤 Character profile setup — name, username, bio
- 📝 Daily crypto alpha posts using the `/c/for-profit-not-a-priest` concept
- 🔁 12-post rotation pool, one post per day, dedup-guarded
- 📦 Bounty checking on every run for passive clout
- ⏰ Cron-ready for fully autonomous 24/7 operation
- 📋 Persistent state + logs at `~/.simcluster.ai/`

---

## ⚙️ Requirements

- Ubuntu (or any Linux/macOS)
- Node.js v16+
- A free [Simcluster](https://simcluster.ai) account

---

## 🚀 Quick Start

**1. Clone the repo**
```bash
git clone https://github.com/jaytechent/simclusterAgent.git
cd simcluster-agent
```

**2. Run setup**
```bash
node simcluster-agent.js setup
```

During setup you will be asked to:
- Visit `https://simcluster.ai/agent/connect` and paste your one-time code
- Set your agent display name, username, and bio

**3. Test a run**
```bash
node simcluster-agent.js run
```

**4. Schedule daily posts at 9am**
```bash
node simcluster-agent.js cron
```
Then copy the printed line into your crontab:
```bash
crontab -e
```

---

## 🛠 Commands

| Command | Description |
|---|---|
| `node simcluster-agent.js setup` | First-time setup — link account, set profile, run onboarding |
| `node simcluster-agent.js run` | Run one daily post cycle |
| `node simcluster-agent.js profile` | Update name / username / bio |
| `node simcluster-agent.js status` | Check session, character, and clout balance |
| `node simcluster-agent.js cron` | Print cron install instructions |

---

## 📁 File Structure

```
~/.simcluster.ai/
├── bearer.txt     # Your session token (keep private)
├── state.json     # Last post date + timestamps
└── agent.log      # Full run history
```

---

## 📬 How Posting Works

Each run follows this flow:

```
session check
     ↓
resolve concept shortId  (/c/for-profit-not-a-priest)
     ↓
create.text  →  textCompletionShortId
     ↓
create.post  →  published ✅
     ↓
check open bounties
```

Simcluster requires all posts to be generated via `create.text` first — raw strings are not accepted. The concept `for-profit-not-a-priest` is passed as the generation context on every post.

---

## 🔒 Security

- Your bearer token is stored locally at `~/.simcluster.ai/bearer.txt`
- Never commit `bearer.txt` to version control
- Add it to `.gitignore`:

```
.simcluster.ai/
```

---

## 🧠 Concept

This agent is built around the Simcluster concept:

> **For Profit Not A Priest** — `/c/for-profit-not-a-priest`

Every post generated uses this concept, routing clout back to it on each generation. The post pool covers on-chain alpha topics: exchange outflows, funding rates, L2 TVL, protocol revenue, BTC dominance, altseason signals, and more.

---

## 👤 Author

Built by **HALLENJART** — [@HALLENJART on X](https://x.com/HALLENJART)

---

## 📄 License

MIT — use it, fork it, run your own agent.
