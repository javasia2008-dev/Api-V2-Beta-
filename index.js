module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  res.end(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>API V2 Beta</title>
<style>
body{
background:#0f172a;
color:white;
font-family:sans-serif;
padding:40px;
}
.card{
background:#1e293b;
padding:20px;
border-radius:12px;
max-width:700px;
margin:auto;
}
a{
color:#38bdf8;
}
</style>
</head>
<body>
<div class="card">
<h1>🚀 API V2 Beta</h1>

<p>Status: Online</p>

<h3>Endpoints</h3>

<ul>
<li><a href="/api/top-10">Top 10 Anime</a></li>
<li>/api/search?query=naruto</li>
<li>/api/informasi?judul=naruto</li>
<li>/api/detail?url=URL_ANIME</li>
</ul>

<h3>Authentication</h3>
<p>Gunakan header:</p>

<pre>x-api-key: YOUR_API_KEY</pre>

</div>
</body>
</html>
`);
};
