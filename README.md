# Vercel API + API Key

Project ini sudah ditambahkan validasi API key.

## Environment variables
- `API_KEY` = satu key
- atau `API_KEYS` = beberapa key dipisah koma

Contoh:
```env
API_KEYS=key_satu,key_dua,key_admin
```

## Cara pakai
Header:
```bash
x-api-key: key_satu
```

Atau query:
```bash
?apikey=key_satu
```

## Endpoint
- `/api/search?query=naruto&page=1`
- `/api/detail?url=https://...`
- `/api/informasi?judul=naruto`
- `/api/top-10`

## Catatan
File `api/_lib/scraper.js` harus tetap ada dari project asli karena endpoint ini bergantung pada fungsi:
- `searchAnime`
- `getAnimeInfo`
- `getTop10`
