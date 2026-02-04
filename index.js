<!DOCTYPE html>
<html>
<head>
  <title>Opinion Insights Admin</title>
  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
  <style>
    body { font-family: Arial; padding: 20px; background:#f4f6f8; }
    .card { background:#fff; padding:15px 25px; margin:10px; display:inline-block;
            border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); font-size:18px;}
    table { border-collapse: collapse; width:100%; margin-top:20px; background:#fff;}
    th, td { border:1px solid #ddd; padding:8px; text-align:left;}
    th { background:#eee; }
  </style>
</head>
<body>

<h2>Opinion Insights — Survey Dashboard</h2>
<div id="stats"></div>

<table>
  <thead>
    <tr>
      <th>PID</th>
      <th>UID</th>
      <th>Status</th>
      <th>Time</th>
    </tr>
  </thead>
  <tbody id="tbody"></tbody>
</table>

<script>
const { createClient } = window.supabase;

const supabase = createClient(
  "https://lurbxgmvbmlanmzwhkio.supabase.co",
  "sb_publishable_9P9VH5VPeyUhh2gCoqzgJg_7haX2lvi"
);

async function load() {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .order('created_at', { ascending: false });

  if(error){
    console.log(error);
    return;
  }

  let c=0,t=0,q=0,d=0;
  let rows = "";

  data.forEach(r=>{
    if(r.status==="complete") c++;
    if(r.status==="terminate") t++;
    if(r.status==="quota_full") q++;
    if(r.status==="duplicate") d++;

    rows += `<tr>
      <td>${r.pid}</td>
      <td>${r.uid}</td>
      <td>${r.status}</td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
    </tr>`;
  });

  document.getElementById("stats").innerHTML = `
    <div class="card">Complete: ${c}</div>
    <div class="card">Terminate: ${t}</div>
    <div class="card">Quota Full: ${q}</div>
    <div class="card">Duplicate: ${d}</div>
  `;

  document.getElementById("tbody").innerHTML = rows;
}

load();
setInterval(load, 5000);
</script>

</body>
</html>
