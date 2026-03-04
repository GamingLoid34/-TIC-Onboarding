# Ötic Onboarding – Östgötatrafiken

Webbapp för onboarding av nya medarbetare på trafikledningscentralen (Östgötatrafiken Ötic).

## Teknikstack

- **Next.js** (App Router)
- **React** + **TypeScript**
- **Tailwind CSS** (mobile-first)
- **Prisma** + **PostgreSQL** (Supabase)

## Kom igång

```bash
npm install
npx prisma generate
# Sätt DATABASE_URL och DIRECT_URL i .env (se .env.example)
npx prisma db push
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Testmiljö (innan skarpt)

Kör mot en **separat testdatabas** så att produktion inte påverkas:

1. Skapa ett eget Supabase-projekt för test (t.ex. "Ötic Onboarding Test").
2. Kopiera `.env.test.example` till `.env.test` och fyll i testprojektets connection strings (DATABASE_URL + DIRECT_URL).
3. Skapa tabeller och seed i test:

   ```bash
   npm run db:push:test
   npm run db:seed:test
   ```

4. Starta appen mot testdatabasen:

   ```bash
   npm run dev:test
   ```

5. Öppna [http://localhost:3000](http://localhost:3000) – all data kommer nu från test-Supabase.

| Kommando | Beskrivning |
|----------|-------------|
| `npm run dev:test` | Startar Next.js med `.env.test` (test-DB) |
| `npm run db:push:test` | Skickar schema till testdatabasen |
| `npm run db:seed:test` | Kör seed mot testdatabasen |
| `npm run db:studio:test` | Öppnar Prisma Studio mot testdatabasen |
| `npm run build:test` | Bygger Next.js med testmiljöns env |

### Publicera i testmiljön (Vercel)

Så här publicerar du appen till testmiljön igen:

1. **Uppdatera testdatabasen** (om schema eller seed har ändrats):
   ```bash
   npm run db:push:test
   npm run db:seed:test
   ```

2. **Vercel – testprojekt**
   - Skapa ett eget Vercel-projekt för test (t.ex. "otic-onboarding-test") eller använd samma repo med en egen miljö.
   - I Vercel: **Project → Settings → Environment Variables** lägger du in för **Preview** (och ev. Production om det är testprojektet):
     - `DATABASE_URL` = test-Supabase connection string (pooler, port 6543)
     - `DIRECT_URL` = test-Supabase direct connection (db.xxx.supabase.co, port 5432)
   - Spara.

3. **Deploy**
   - **Alternativ A:** Pusha till din test-branch (t.ex. `test` eller `staging`). Om Vercel är kopplat till repot deployas Preview automatiskt med Preview-env vars.
   - **Alternativ B:** Lokal deploy mot testprojektet:
     ```bash
     npx vercel --env-file .env.test
     ```
     (Kräver att projektet redan är länkat till rätt Vercel-projekt, eller välj testprojektet när du kör kommandot.)

Efter deploy: öppna testlänken (Preview-URL eller din testdomän). Appen använder då test-Supabase.

**Snabbkommando lokalt (uppdatera test-DB + seed):**
```bash
npm run deploy:test
```

Om `db:push:test` ger "Tenant or user not found": kontrollera att `.env.test` har rätt **DIRECT_URL** (Supabase → Direct connection, host `db.xxx.supabase.co`). Om Prisma ändå läser från `.env` kan du tillfälligt döpa om `.env` till t.ex. `.env.production` och bara ha `.env.test` när du kör test-kommandon.

## Roller

1. **Arbetsledare** – Lägger upp nyanställda, IT-beställningar, dashboard med procentuell framgång.
2. **Mentor** – Checklistor, bockar "Visad"/"Kan", anteckningar, IT-status (mobilvänlig).
3. **Nyanställd** – Egen framfart, rutiner, systemkonton.

## Felsökning (Supabase)

**P1001 "Can't reach database server"** vid `prisma db push`:

1. **Projekt pausat?** (Free tier) – Öppna Supabase Dashboard och starta projektet om det är pausat.
2. **Port 5432 blockerad?** (t.ex. företagsnät, skola) – Prova att sätta `DIRECT_URL` till **Session-poolern** istället (samma värd som DATABASE_URL, port 6543). I `.env`:
   ```env
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"
   ```
   Använd samma projekt-ref och lösenord som i din DATABASE_URL. Kör sedan `npx prisma db push` igen.
3. **IP bannad?** Efter många felaktiga lösenord kan Supabase banna din IP. I Supabase: **Database → Settings → Banned IPs** – ta bort din IP om den listas.

**`db push` hänger (när du använder pooler som DIRECT_URL):**

När du tvingas använda poolern (port 6543) istället för Direct kan `prisma db push` hänga eftersom poolern inte klarar alla migreringsanrop. Gör ett av följande:

1. **Lägg timeout i DIRECT_URL** så att det inte hänger för evigt. I `.env`:
   ```env
   DIRECT_URL="postgresql://...@...pooler.supabase.com:6543/postgres?connect_timeout=10&statement_timeout=60000"
   ```
   (60000 = 60 sekunder.) Då får du ett fel istället för att vänta i onödan.

2. **Kör `db push` från ett nät där Direct fungerar** (port 5432):
   - T.ex. **mobil hotspot** eller annat nät, med `DIRECT_URL` satt till Supabase **Direct connection** (`db.xxx.supabase.co:5432`), sedan: `npx prisma db push`.
   - Eller **en gång från Vercel**: Lägg in `DATABASE_URL` och `DIRECT_URL` (Direct) i Vercel → Settings → Environment Variables. Lägg till ett build-script som kör push en gång, t.ex. i `package.json`: `"db:push:vercel": "prisma db push"`, och kör det manuellt från Vercel (Dashboard → Deployments → …) eller via CLI: `vercel env pull && npx prisma db push`.

3. **Skapa tabellerna med SQL i Supabase** (fungerar alltid): Kör lokalt `npm run db:sql` – kommandot skriver ut SQL för hela schemat. Kopiera utskriften, öppna Supabase → **SQL Editor**, klistra in och kör. Kör därefter `npm run db:seed` (seed använder bara DATABASE_URL/poolern och hänger inte).

## Databas

- Schema: `prisma/schema.prisma` (PostgreSQL)
- `.env` = skarp/produktion, `.env.test` = testmiljö (använd separat Supabase-projekt)
- Prisma Studio: `npm run db:studio` (skarp) eller `npm run db:studio:test` (test)

## Färgkoder (IT-system)

- **Röd** – Ej beställd  
- **Gul** – Beställd  
- **Grön** – Klar  
