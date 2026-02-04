const express = require("express");
const fetch = require("node-fetch");

const app = express();

const SUPABASE_URL = "https://lurbxgmvbmlanmzwhkio.supabase.co";
const SUPABASE_KEY = "sb_publishable_9P9VH5VPeyUhh2gCoqzgJg_7haX2lvi";

async function logStatus(pid, uid, status, req) {
  await fetch(`${SUPABASE_URL}/rest/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      pid: pid || "0",
      uid: uid || "no_uid",
      status: status,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      useragent: req.headers["user-agent"],
    }),
  });
}

app.get("/c", async (req, res) => {
  await logStatus(req.query.pid, req.query.uid, "complete", req);
  res.send("Thank you. Survey complete.");
});

app.get("/t", async (req, res) => {
  await logStatus(req.query.pid, req.query.uid, "terminate", req);
  res.send("You did not qualify.");
});

app.get("/q", async (req, res) => {
  await logStatus(req.query.pid, req.query.uid, "quota_full", req);
  res.send("Quota full.");
});

app.get("/dq", async (req, res) => {
  await logStatus(req.query.pid, req.query.uid, "duplicate", req);
  res.send("Duplicate / blocked.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
