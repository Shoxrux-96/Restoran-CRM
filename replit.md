# RestoCRM

Restoran va kafe uchun CRM va POS tizimi (O'zbek tilida).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server ishga tushirish (8080 port)
- `pnpm --filter @workspace/pos-crm run dev` — Frontend ishga tushirish
- `pnpm run typecheck` — barcha paketlarni typecheck qilish
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI spesifikatsiyasidan hooklar va Zod schemalarini qayta generatsiya qilish
- `pnpm --filter @workspace/db run push` — DB schemani push qilish (dev only)
- Kerakli env: `DATABASE_URL` — Postgres connection string

## Demo Kredensiallar

| Foydalanuvchi | Parol     | Rol   | Filial           |
|---------------|-----------|-------|------------------|
| owner         | admin123  | Egasi | —                |
| cafe_admin    | admin123  | Admin | Choyxona Markaz  |
| rest_admin    | admin123  | Admin | Royal Restaurant |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter routing
- Auth: JWT (jsonwebtoken + bcrypt)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spesifikatsiyasi (source of truth)
- `lib/api-client-react/src/generated/` — Generatsiya qilingan React Query hooklar
- `lib/api-zod/src/generated/` — Generatsiya qilingan Zod schemalar
- `lib/db/src/schema/index.ts` — Barcha DB jadvallari
- `artifacts/api-server/src/routes/` — Backend routelar
- `artifacts/pos-crm/src/pages/` — Frontend sahifalar
  - `owner/` — Egasi dashboardi, filiallar, foydalanuvchilar
  - `admin/` — Admin boshqaruv, POS terminal, mahsulotlar, mijozlar, qarz daftar

## Architecture decisions

- Contract-first API: OpenAPI → orval → React Query hooks va Zod schemalar
- JWT tokenlar `Authorization: Bearer` header orqali yuboriladi va localStorage'da saqlanadi
- Qarz (debt) avtomatik yaratiladi, agar buyurtma "qarzga" to'lansa
- Owner barcha filiallarga ega, adminlar faqat o'z filiallarini boshqaradi
- Sidebar navigatsiya rolga qarab dinamik ko'rsatiladi (owner vs admin)

## Product

- **Login**: JWT autentifikatsiya, rol asosida yo'naltirish
- **Owner panel**: Barcha filiallar ko'rinishi, yangi filial qo'shish, admin tayinlash, foydalanuvchi qo'shish
- **Admin panel**: O'z filiali uchun boshqaruv paneli
- **POS Terminal**: Mahsulotlarni savatga qo'shish, naqd yoki qarzga sotish, chek ko'rsatish
- **Mahsulotlar**: CRUD, kategoriya bo'yicha ko'rsatish, mavjudlik holati
- **Mijozlar**: Qo'shish, qidiruv, qarz holati ko'rsatish
- **Qarz Daftar**: Barcha qarzlar, qisman yoki to'liq to'lash imkoniyati

## User preferences

- Interfeys O'zbek tilida
- Dark theme (zinc rang palitasi)

## Gotchas

- Bcrypt hash generatsiya qilish uchun: `node -e "const bcrypt = require('/home/runner/workspace/artifacts/api-server/node_modules/bcrypt'); bcrypt.hash('parol', 10).then(console.log)"`
- `pnpm --filter @workspace/db run push` dan keyin API server restart qilish kerak
- `setAuthTokenGetter` ni `@workspace/api-client-react` dan import qilish kerak (subpath emas, asosiy export)

## Pointers

- `pnpm-workspace` skill: workspace strukturasi, TypeScript setup
