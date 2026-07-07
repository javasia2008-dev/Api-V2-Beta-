module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    success: true,
    name: 'API V2 Beta',
    version: '2.0.0',
    status: 'online',
    endpoints: {
      search: '/api/search?query=naruto',
      informasi: '/api/informasi?judul=naruto',
      detail: '/api/detail?url=LINK_ANIME',
      top10: '/api/top-10'
    },
    auth: {
      header: 'x-api-key',
      query: 'apikey'
    }
  });
};
