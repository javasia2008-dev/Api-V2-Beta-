# API V2 Beta

Deploy ke Vercel:
1. Push ke GitHub
2. Import ke Vercel
3. Tambahkan environment variable `API_KEY`
4. (Opsional) `SOURCE_BASE_URL`, `SEARCH_PATH`, `TOP10_PATH`, `DETAIL_URL_TEMPLATE`

## Test
- `/api/search?query=naruto&apikey=YOUR_KEY`
- `/api/informasi?judul=naruto&apikey=YOUR_KEY`
- `/api/detail?url=URL_ANIME&apikey=YOUR_KEY`
- `/api/top-10?apikey=YOUR_KEY`

## Header utama
`x-api-key: YOUR_KEY`
