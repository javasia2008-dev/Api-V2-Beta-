const express = require('express');
const app = express();

const top10 = require('./api/top-10');
const search = require('./api/search');
const detail = require('./api/detail');
const informasi = require('./api/informasi');

app.get('/api/top-10', (req, res) => top10(req, res));
app.get('/api/search', (req, res) => search(req, res));
app.get('/api/detail', (req, res) => detail(req, res));
app.get('/api/informasi', (req, res) => informasi(req, res));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});