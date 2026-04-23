#!/usr/bin/env node
/**
 * Simcluster Agent — Ubuntu / Node.js
 * ------------------------------------
 * USAGE:
 *   node simcluster-agent.js setup      # First-time: link account, set name, enable
 *   node simcluster-agent.js run        # Run one daily post cycle
 *   node simcluster-agent.js profile    # Fix name/username/bio if still null
 *   node simcluster-agent.js status     # Check session & clout balance
 *   node simcluster-agent.js cron       # Print cron install instructions
 */

const https    = require("https");
const fs       = require("fs");
const path     = require("path");
const readline = require("readline");

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_DIR     = path.join(process.env.HOME, ".simcluster.ai");
const BEARER_FILE  = path.join(BASE_DIR, "bearer.txt");
const STATE_FILE   = path.join(BASE_DIR, "state.json");
const LOG_FILE     = path.join(BASE_DIR, "agent.log");
const API          = "simcluster.ai";
const CONCEPT_SLUG = "for-profit-not-a-priest";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ensureDir  = () => { if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true }); };
const saveBearer = t  => { ensureDir(); fs.writeFileSync(BEARER_FILE, t, "utf8"); };
const loadBearer = () => fs.existsSync(BEARER_FILE) ? fs.readFileSync(BEARER_FILE, "utf8").trim() : null;
const saveState  = o  => { ensureDir(); fs.writeFileSync(STATE_FILE, JSON.stringify(o, null, 2)); };
const loadState  = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return {}; } };

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch {}
}

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(prompt, a => { rl.close(); r(a.trim()); }));
}

function extractText(body) {
  return body?.result?.content?.[0]?.text
      || body?.content?.[0]?.text
      || (typeof body === "string" ? body : JSON.stringify(body));
}

// ── Plain REST call ───────────────────────────────────────────────────────────
function restCall(method, pathStr, body, bearer) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json", "Accept": "application/json" };
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    if (data)   headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request({ hostname: API, path: pathStr, method, headers }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── MCP call over Streamable HTTP (SSE) ───────────────────────────────────────
function mcpRaw(toolName, params, bearer) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: "2.0", id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: params || {} },
    });
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Content-Length": Buffer.byteLength(body),
    };
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    const req = https.request({ hostname: API, path: "/mcp", method: "POST", headers }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { return resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch {}
        const events = raw.split("\n")
          .filter(l => l.startsWith("data:"))
          .map(l => { try { return JSON.parse(l.slice(5).trim()); } catch { return null; } })
          .filter(Boolean);
        if (events.length) return resolve({ status: res.statusCode, body: events[events.length - 1] });
        resolve({ status: res.statusCode, body: raw });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function mcp(tool, params, token) {
  const res  = await mcpRaw(tool, params, token);
  const text = extractText(res.body);
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  const ok = res.status === 200 && !text.toLowerCase().includes('"error"');
  return { ok, text, parsed, raw: res.body };
}

// ── Crypto alpha content pool ─────────────────────────────────────────────────
const CRYPTO_POSTS = [
  `On-chain doesn't lie. Exchange outflows spiking while long-term holder supply hits ATH simultaneously — that's conviction, not noise. Watch the wallets, not the headlines. #ForProfitNotAPriest`,
  `Funding rates went negative overnight on perps. Historically that's a reset, not capitulation. Spot buyers accumulating while futures traders panic-short is a divergence worth tracking. #ForProfitNotAPriest`,
  `L2 TVL crossed a new threshold quietly while everyone argued about price. Real adoption is boring — it shows up in gas fees, sequencer revenue and bridge volume. That's your alpha. #ForProfitNotAPriest`,
  `Next cycle's winners aren't the loudest tokens right now. Look at GitHub commits, protocol revenue vs token inflation, whether the team builds in the bear. Signal over noise. #ForProfitNotAPriest`,
  `Stablecoin dominance rising = risk-off rotation, not necessarily bearish. Dry powder is building. When that flips back into BTC and ETH, the move tends to be violent. Position before the narrative. #ForProfitNotAPriest`,
  `Wallets that bought the 2022 bottom are still holding. On-chain cohort analysis shows diamond hands at specific bands. Those become structural support — not TA, but cost basis psychology. #ForProfitNotAPriest`,
  `Protocol revenue > token price. Always. Find projects where fees grow QoQ and the token hasn't reflected it yet. That gap is the trade. #ForProfitNotAPriest`,
  `Most airdrops get dumped in 48 hours. The ones that hold price post-TGE signal genuine demand from new holders, not farmers. Retention rate is an underrated metric. #ForProfitNotAPriest`,
  `Liquidity is everything. Thin order books + leveraged longs = magnified moves both ways. When open interest diverges from spot volume, someone is about to be very wrong. #ForProfitNotAPriest`,
  `CT sells the narrative. The blockchain sells the truth. Cross-reference what influencers are hyping with actual on-chain transfer volume before you move size. #ForProfitNotAPriest`,
  `Best risk management in crypto is position sizing, not stop losses. Stops get hunted. Sizing means you survive the wick and still hold through the real move. #ForProfitNotAPriest`,
  `Altseason doesn't start until BTC dominance peaks and rotates. Watch BTC.D on the weekly. That chart tells you more about cycle position than any price target. #ForProfitNotAPriest`,
];

function getTodaysPost() {
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return CRYPTO_POSTS[day % CRYPTO_POSTS.length];
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
async function setup() {
  const G = "\x1b[32m", R = "\x1b[0m", B = "\x1b[1m";
  const W = 42;
  const line = "═".repeat(W);
  const pad  = (s, w) => { const v = s.replace(/\x1b\[[0-9;]*m/g, ""); return s + " ".repeat(Math.max(0, w - v.length)); };

  console.log(`\n╔${line}╗`);
  console.log(`║${pad("   Simcluster Agent  v2.0", W)}║`);
  console.log(`╠${line}╣`);
  console.log(`║${pad(`   By ${G}${B}HALLENJART${R} on X  ${G}${B}(@HALLENJART)${R}`, W)}║`);
  console.log(`╚${line}╝\n`);

  let token = loadBearer();

  if (token) {
    const reuse = await ask("Bearer token found. Re-link account? (y/N): ");
    if (reuse.toLowerCase() !== "y") {
      log("Using existing token.");
      await setupProfile(token);
      await runOnboarding(token);
      return;
    }
  }

  console.log("  1. Visit: https://simcluster.ai/agent/connect");
  console.log("  2. Sign in and copy the one-time code.\n");
  const code = await ask("Paste your one-time code: ");
  if (!code) { log("❌ No code entered."); process.exit(1); }

  log("Exchanging code...");
  const res = await restCall("POST", "/api/agent/session/exchange-code", { code });
  token = res.body?.token || res.body?.bearerToken || res.body?.access_token;
  if (!token) { log("❌ Exchange failed: " + JSON.stringify(res.body)); process.exit(1); }
  saveBearer(token);
  log("✅ Token saved.");

  log("Verifying session...");
  const sess = await mcp("agent.sessionStatus", {}, token);
  log("Session: " + sess.text.slice(0, 300));

  const accountEnabled     = sess.parsed?.session?.user?.accountEnabled;
  const requiresEnablement = sess.parsed?.session?.user?.requiresAccountEnablement;
  if (accountEnabled === false && requiresEnablement === true) {
    log("⚠️  Account not enabled — activating for free via email link...");
    const email = sess.parsed?.session?.user?.email || await ask("Enter your account email: ");
    const enableRes = await mcp("agent.enableBrowserAccess", { email }, token);
    log("Enable result: " + enableRes.text.slice(0, 200));
    console.log("\n📧 Check your email and click the sign-in link to activate your account.");
    console.log("   Then run: node simcluster-agent.js profile\n");
  }

  await setupProfile(token);
  await runOnboarding(token);

  console.log("\n✅ Setup complete!");
  console.log("   Test a run:  node simcluster-agent.js run");
  console.log("   Schedule it: node simcluster-agent.js cron\n");
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
async function setupProfile(token) {
  console.log("\n── Set agent character profile ──────────────");
  const name     = await ask("Display name        (e.g. AlphaNode): ");
  const username = await ask("Username 3-15 chars (e.g. alphanode_): ");
  const bio      = await ask("Bio max 180 chars   (e.g. On-chain alpha. For profit, not a priest.): ");

  if (name)     { const r = await mcp("me.char.setName",     { value: name },     token); log("Name: "     + r.text.slice(0, 120)); }
  if (username) { const r = await mcp("me.char.setUsername", { value: username }, token); log("Username: " + r.text.slice(0, 120)); }
  if (bio)      { const r = await mcp("me.char.setBio",      { value: bio },      token); log("Bio: "      + r.text.slice(0, 120)); }

  const check = await mcp("agent.sessionStatus", {}, token);
  const p = check.parsed || {};
  const agentName     = p?.session?.activeCharacter?.name     || p?.agent?.name || "(not found)";
  const agentUsername = p?.session?.activeCharacter?.username || "";
  log(`✅ Profile confirmed — Name: ${agentName} | Username: @${agentUsername}`);
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
async function runOnboarding(token) {
  log("Running onboarding...");
  const onboard = await mcp("agent.onboarding", {}, token);
  log("Onboarding: " + onboard.text.slice(0, 400));
}

// ── RUN ───────────────────────────────────────────────────────────────────────
async function run() {
  log("═══════════════════════════════════════");
  log("Simcluster Agent — daily run");

  const token = loadBearer();
  if (!token) { log("❌ Run setup first."); process.exit(1); }
  const state = loadState();

  // 1. Session check
  log("Checking session...");
  const sess = await mcp("agent.sessionStatus", {}, token);
  if (!sess.ok) { log("❌ Session failed: " + sess.text); process.exit(1); }

  const postsRemaining = sess.parsed?.player?.dailyPosts?.remaining ?? 5;
  const charName       = sess.parsed?.session?.activeCharacter?.name || "agent";
  log(`Character: ${charName} | Posts remaining: ${postsRemaining}`);

  if (postsRemaining <= 0) { log("⚠️ Daily limit reached."); return; }

  const today = new Date().toISOString().slice(0, 10);
  if (state.lastPostDate === today) { log("ℹ️ Already posted today."); return; }

  // 2. Resolve concept
  log(`Resolving concept: ${CONCEPT_SLUG}`);
  const conceptRes = await mcp("create.getConceptShortIds", { slugs: [CONCEPT_SLUG] }, token);
  let conceptShortId = null;
  try {
    const p = conceptRes.parsed;
    conceptShortId = Array.isArray(p) ? p[0] : Object.values(p || {})[0];
  } catch {}
  if (!conceptShortId) { log("❌ Failed to resolve concept."); return; }
  log(`Concept shortId: ${conceptShortId}`);

  // 3. Generate text
  log("Generating text...");
  const textRes = await mcp("create.text", {
    conceptShortIds: [conceptShortId],
    mediaShortIds: [],
  }, token);
  log("Text gen result: " + textRes.text.slice(0, 300));

  let textCompletionShortId = null;
  try {
    const rawText = textRes.raw?.result?.content?.[0]?.text;
    if (rawText) textCompletionShortId = JSON.parse(rawText).shortId;
  } catch (e) { log("Parse error: " + e.message); }

  if (!textCompletionShortId) {
    log("❌ Could not extract shortId. Raw: " + JSON.stringify(textRes.raw, null, 2).slice(0, 400));
    return;
  }
  log(`textCompletionShortId: ${textCompletionShortId}`);

  // 4. Publish post
  log("Publishing post...");
  const postRes = await mcp("create.post", {
    textCompletionShortId,
    mediaShortIds: [],
  }, token);
  log("Post result: " + postRes.text.slice(0, 300));

  const failed = ["error", "invalid", "unrecognized", "failed"].some(w => postRes.text.toLowerCase().includes(w));
  if (failed) { log("❌ Post failed."); return; }

  log("✅ Post successful!");
  state.lastPostDate = today;
  state.lastPost     = new Date().toISOString();
  saveState(state);

  // 5. Check bounties
  log("Checking bounties...");
  const bounties = await mcp("user-bounties.list", { limit: 5, sort: "reward", sortDir: "desc", includeExpired: false }, token);
  log("Bounties: " + bounties.text.slice(0, 300));

  log("Run complete.");
  log("═══════════════════════════════════════\n");
}

// ── REPLY ─────────────────────────────────────────────────────────────────────
async function reply(targetUsername) {
  log("═══════════════════════════════════════");
  log(`Simcluster Agent — replying to @${targetUsername}`);

  const token = loadBearer();
  if (!token) { log("❌ Run setup first."); process.exit(1); }
  if (!targetUsername) {
    log("❌ Usage: node simcluster-agent.js reply <username>");
    return;
  }

  // ── 1. Session check ─────────────────────────────
  const sess = await mcp("agent.sessionStatus", {}, token);
  if (!sess.ok) { log("❌ Session failed."); return; }

  const postsRemaining = sess.parsed?.player?.dailyPosts?.remaining ?? 5;
  log(`Posts remaining: ${postsRemaining}`);
  if (postsRemaining <= 0) {
    log("⚠️ Daily limit reached.");
    return;
  }

  // ── 2. Resolve concept ───────────────────────────
  log(`Resolving concept: ${CONCEPT_SLUG}`);
  const conceptRes = await mcp("create.getConceptShortIds", { slugs: [CONCEPT_SLUG] }, token);

  let conceptShortId = null;
  try {
    const p = conceptRes.parsed;
    conceptShortId = Array.isArray(p) ? p[0] : Object.values(p || {})[0];
  } catch {}

  if (!conceptShortId) {
    log("❌ Failed to resolve concept.");
    return;
  }

  log(`Concept shortId: ${conceptShortId}`);

  // ── 3. Search user (best effort) ─────────────────
  log(`Searching for user: ${targetUsername}`);
  const searchRes = await mcp("search.search", { query: targetUsername }, token);

  let charShortId = null;

  try {
    const rawText = searchRes.raw?.result?.content?.[0]?.text;
    const parsed = rawText ? JSON.parse(rawText) : searchRes.parsed;

    const users = Array.isArray(parsed) ? parsed : [];

    const match = users.find(u =>
      (u.username || "").toLowerCase() === targetUsername.toLowerCase()
    );

    charShortId =
      match?.shortId ||
      match?.charShortId ||
      match?.id ||
      match?.userId ||
      null;

  } catch (e) {
    log("Search parse error: " + e.message);
  }

  if (charShortId) {
    log(`Found charShortId: ${charShortId}`);
  } else {
    log("⚠️ Could not extract charShortId — using fallback.");
  }

  // ── 4. Get latest post ───────────────────────────
  let latestPostShortId = null;

  // ✅ PRIMARY: timeline (if ID exists)
  if (charShortId) {
    log("Fetching user timeline...");
    const timelineRes = await mcp("posts.getCharacterTimelineFeed", {
      charShortIds: [charShortId],
      limit: 1
    }, token);

    log("Timeline raw: " + timelineRes.text.slice(0, 200));

    try {
      const rawText = timelineRes.raw?.result?.content?.[0]?.text;
      const parsed = rawText ? JSON.parse(rawText) : timelineRes.parsed;

      const posts = Array.isArray(parsed)
        ? parsed
        : (parsed?.posts || parsed?.items || []);

      if (posts.length > 0) {
        latestPostShortId =
          posts[0]?.shortId ||
          posts[0]?.short_id ||
          posts[0]?.id;
      }

    } catch (e) {
      log("Timeline parse error: " + e.message);
    }
  }

  // ⚠️ FALLBACK: global feed
  if (!latestPostShortId) {
    log("Fallback: scanning global feed...");
    const feedRes = await mcp("posts.getPostFeed", {
      limit: 50,
      orderBy: "created_at"
    }, token);

    log("Feed raw: " + feedRes.text.slice(0, 200));

    try {
      const rawText = feedRes.raw?.result?.content?.[0]?.text;
      const parsed = rawText ? JSON.parse(rawText) : feedRes.parsed;

      const posts = Array.isArray(parsed)
        ? parsed
        : (parsed?.posts || parsed?.items || []);

      log(`Fetched ${posts.length} posts. Scanning for @${targetUsername}...`);

      const match = posts.find(p => {
        const possibleNames = [
          p?.author?.username,
          p?.author?.name,
          p?.character?.username,
          p?.char?.username,
          p?.username
        ]
          .filter(Boolean)
          .map(v => v.toLowerCase());

        return possibleNames.includes(targetUsername.toLowerCase());
      });

      if (match) {
        latestPostShortId =
          match.shortId ||
          match.short_id ||
          match.id;
      }

    } catch (e) {
      log("Feed parse error: " + e.message);
    }
  }

  if (!latestPostShortId) {
    log("❌ Could not find a post to reply to.");
    return;
  }

  log(`Replying to post: ${latestPostShortId}`);

  // ── 5. Generate reply ────────────────────────────
  log("Generating reply...");
  const replyRes = await mcp("create.replyCompletion", {
    replyToShortId: latestPostShortId,
    conceptShortIds: [conceptShortId]
  }, token);

  log("Reply raw: " + replyRes.text.slice(0, 200));

  let replyTextShortId = null;

  try {
    const rawText = replyRes.raw?.result?.content?.[0]?.text;

    if (rawText) {
      replyTextShortId = JSON.parse(rawText).shortId;
    }

    if (!replyTextShortId) {
      replyTextShortId =
        replyRes.parsed?.shortId ||
        replyRes.parsed?.textCompletionShortId;
    }

  } catch (e) {
    log("Reply parse error: " + e.message);
  }

  if (!replyTextShortId) {
    log("❌ Could not extract reply shortId.");
    return;
  }

  log(`replyTextShortId: ${replyTextShortId}`);

  // ── 6. Post reply ────────────────────────────────
  log("Posting reply...");
  const postRes = await mcp("create.createPostReply", {
    replyToShortId: latestPostShortId,
    textCompletionShortId: replyTextShortId
  }, token);

  log("Post result: " + postRes.text.slice(0, 200));

  const failed = ["error", "invalid", "unrecognized", "failed"].some(w =>
    postRes.text.toLowerCase().includes(w)
  );

  if (failed) {
    log("❌ Reply failed.");
    return;
  }

  log(`✅ Reply posted to @${targetUsername}!`);
  log("═══════════════════════════════════════\n");
}

// ── STATUS ────────────────────────────────────────────────────────────────────
async function status() {
  const token = loadBearer();
  if (!token) { console.log("Run setup first."); return; }
  const res = await mcp("agent.sessionStatus", {}, token);
  try { console.log(JSON.stringify(JSON.parse(res.text), null, 2)); }
  catch { console.log(res.text); }
}

// ── CRON ──────────────────────────────────────────────────────────────────────
function installCron() {
  const script   = path.resolve(process.argv[1]);
  const cronLine = `0 9 * * * /usr/bin/node ${script} run >> ${LOG_FILE} 2>&1`;
  console.log("\nPosts daily at 9am. Add to crontab:\n");
  console.log("  " + cronLine);
  console.log("\nAuto-install:");
  console.log(`  (crontab -l 2>/dev/null; echo "${cronLine}") | crontab -\n`);
}


// ── TIME CONSTANTS ─────────────────────────────────────────────
const SIX_HOURS = 6 * 60 * 60 * 1000;

// ── SAFE SLEEP WRAPPER ─────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── ASK WITH TIMEOUT ───────────────────────────────────────────
function askWithTimeout(prompt, timeoutMs = 60000) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      rl.close();
      log("⏱️ No input — auto-skipping...");
      resolve(null);
    }, timeoutMs);

    rl.question(prompt, answer => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── SAFE RUN WRAPPER ───────────────────────────────────────────
async function safeRun(fn, label) {
  try {
    log(`▶️ Running: ${label}`);
    await fn();
    log(`✅ Completed: ${label}`);
  } catch (e) {
    log(`❌ Failed: ${label} → ${e.message}`);
  }
}

// ── AUTO LOOP ──────────────────────────────────────────────────
async function auto() {
  log("═══════════════════════════════════════");
  log("Simcluster Agent — AUTO MODE (6-hour cycle)");

  while (true) {
    try {
      // STEP 1: SETUP
      const setupAns = await askWithTimeout("Run setup? (y/N): ");
      if (setupAns?.toLowerCase() === "y") {
        await safeRun(setup, "setup");
      } else {
        log("⏭️ Skipping setup...");
      }

      // STEP 2: PROFILE
      const token = loadBearer();
      if (token) {
        const profileAns = await askWithTimeout("Update profile? (y/N): ");
        if (profileAns?.toLowerCase() === "y") {
          await safeRun(() => setupProfile(token), "profile");
        } else {
          log("⏭️ Skipping profile...");
        }
      }

      // STEP 3: MAIN POST
      await safeRun(run, "run");

      // STEP 4: AUTO REPLY (hardcoded)
      await safeRun(() => reply("mztacat"), "reply @mztacat");

      // STEP 5: STATUS CHECK
      await safeRun(status, "status");

    } catch (err) {
      log("❌ Auto loop error: " + err.message);
    }

    // ── CLEAN 6 HOUR SLEEP ─────────────────────────────────────
    log("⏳ Sleeping for 6 hours...");
    await sleep(SIX_HOURS);
  }
}
// ── Entry ─────────────────────────────────────────────────────────────────────
(async () => {
  const cmd = process.argv[2];
  switch (cmd) {
    case "auto": await auto(); break;
    case "setup":   await setup(); break;
    case "run":     await run(); break;
    case "reply":   await reply(process.argv[3]); break;
    case "profile": { const t = loadBearer(); if (!t) log("Run setup first."); else await setupProfile(t); break; }
    case "status":  await status(); break;
    case "cron":    installCron(); break;
    default:
      console.log(`
Simcluster Agent — Usage:
  node simcluster-agent.js setup            Link account, set name, enable
  node simcluster-agent.js run              Daily post cycle
  node simcluster-agent.js reply <username> Reply to a user's latest post
  node simcluster-agent.js profile          Fix name / username / bio
  node simcluster-agent.js status           Check session & clout
  node simcluster-agent.js cron             Print cron install instructions
      `);
  }
})().catch(e => { log("Fatal: " + e.message); process.exit(1); });
