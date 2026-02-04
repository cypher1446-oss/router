const express = require("express");
const fetch = require("node-fetch");
const app = express();

const SUPABASE_URL = "https://lurbxgmvbmlanmzwhkio.supabase.co";
const SUPABASE_KEY = "sb_publishable_9P9VH5VPeyUhh2gCoqzgJg_7haX2lvi";

async function logClick(pid, vid, uid, status="click") {
  await fetch(`${SUPABASE_URL}/rest/v1/clicks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ pid, vid, uid, status })
  });
}

// START ROUTE (vendor hits this)
app.get("/start", async (req, res) => {
  const { pid, vid, uid } = req.query;

  // get client link from projects table
  const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${pid}&select=client_link`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await r.json();
  const clientLink = data[0].client_link;

  await logClick(pid, vid, uid);

  const complete = `https://router-production-c909.up.railway.app/c?pid=${pid}&vid=${vid}&uid=${uid}`;
  const terminate = `https://router-production-c909.up.railway.app/t?pid=${pid}&vid=${vid}&uid=${uid}`;
  const quota = `https://router-production-c909.up.railway.app/q?pid=${pid}&vid=${vid}&uid=${uid}`;

  const finalUrl = `${clientLink}&complete=${encodeURIComponent(complete)}&terminate=${encodeURIComponent(terminate)}&quota=${encodeURIComponent(quota)}`;

  res.redirect(finalUrl);
});

// END PAGES
app.get("/c", async (req, res) => {
  await logClick(req.query.pid, req.query.vid, req.query.uid, "complete");
  res.send("Complete");
});

app.get("/t", async (req, res) => {
  await logClick(req.query.pid, req.query.vid, req.query.uid, "terminate");
  res.send("Terminate");
});

app.get("/q", async (req, res) => {
  await logClick(req.query.pid, req.query.vid, req.query.uid, "quota_full");
  res.send("Quota Full");
});

app.listen(3000);
