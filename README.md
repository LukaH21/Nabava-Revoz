# Nabava · Revoz

Interna nabavna aplikacija. MVP pokriva modul **Analiza ponudb** (zamenjava Excel primerjav ponudb) z bazo dobaviteljev in samodejnim izračunom posredništva.

## Kaj je narejeno

- **Baza dobaviteljev** — uvožena iz "2026 DOBAVITELJI kontakti in nabavniki" (386 dobaviteljev: kontakti, e-maili, nabavnik, promet, boniteta).
- **Posredništvo** — 3 sheme provizij (Standard SLO, Plačilo z avansom, Pagras nadzor delovišč) uvožene iz Excela, samodejni izračun glede na znesek.
- **Analiza ponudb** — projekti → krogi povpraševanja (podpira več krogov ob spremembi tehničnih zahtev) → ponudbe po dobavitelju s fleksibilnimi postavkami (dimenzije, cena/m², montaža ipd.), samodejni izračun skupaj + provizije, oznaka tehnično/komercialno potrjeno, končna cena, izbira zmagovalca.
- **ESDC opozorilo** — projekt se samodejno označi, če končna cena presega 5.000 € (potrebna potrditev izbora dobavitelja).
- **Prijava z geslom** — cel app je zaščiten (samo ti ga uporabljaš).

## Kar še ni narejeno (naslednji koraki)

- AI iskanje dobaviteljev/konkurentov po družinskih kodah + samodejno pisanje mailov (potreben Anthropic API ključ).
- Uvoz ZZN/PHF tedenske tabele in pregled statusa naročil na zalogi.
- Povezava z družinskimi kodami (`DRUZINSKE KODE po nabavnikih 2026.xlsx`) — shema (`family_codes`, `family_suppliers`) je pripravljena, uvoz še ni napisan.
- Vlečenje podatkov iz SAP/Click2Buy (trenutno ročni Excel uvoz).

## Lokalni razvoj

```bash
npm install
npm run dev
```

Zahteva `.env` z:
```
DATABASE_URL="file:./dev.db"
DATABASE_PATH="./dev.db"      # pot do SQLite datoteke
APP_PASSWORD="tvoje-geslo"
```

Uvoz podatkov (enkratno, ali po vsaki posodobitvi Excela):
```bash
npx tsx scripts/seed-brokerage-tiers.ts
npx tsx scripts/import-suppliers.ts "/pot/do/2026 DOBAVITELJI kontaki in nabavniki  URADNA TABELA-dodani prometi.xlsx"
```

## Deploy na Vercel

Aplikacija lokalno teče na SQLite, ker je preprosto za razvoj. Vercelove serverless funkcije nimajo trajnega diska, zato za produkcijo potrebuješ gostovano Postgres bazo.

1. **Ustvari Postgres bazo.** V Vercel dashboardu: Storage → Create Database → Postgres (ali poveži Neon). Vercel ti da `DATABASE_URL`.
2. **Preklopi shemo na Postgres** (pripravljene datoteke so v `postgres-migration/`, izključene iz TS preverjanja, da ne motijo lokalnega razvoja):
   ```bash
   mv src/db/schema.ts src/db/schema.sqlite.ts
   mv postgres-migration/schema.ts src/db/schema.ts
   mv src/db/index.ts src/db/index.sqlite.ts
   mv postgres-migration/index.ts src/db/index.ts
   mv drizzle.config.ts drizzle.config.sqlite.ts
   mv postgres-migration/drizzle.config.ts drizzle.config.ts
   npm install pg
   npm install -D @types/pg
   ```
3. **Poženi migracije proti Postgresu:**
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```
4. **Uvozi podatke** (`seed-brokerage-tiers.ts`, `import-suppliers.ts`) z `DATABASE_URL` nastavljenim na produkcijsko bazo.
5. **Push na GitHub, poveži repo v Vercelu.** Nastavi env spremenljivke v Vercel (Settings → Environment Variables): `DATABASE_URL`, `APP_PASSWORD`, kasneje `ANTHROPIC_API_KEY` za AI funkcije.
6. Deploy.

## Znane omejitve / opombe

- Stopnje provizije so prepisane iz Excela po najboljši interpretaciji nejasno formatirane tabele (merged celice) — preveri jih pred prvo uporabo (`brokerage_tiers` tabela, kasneje UI za urejanje).
- Nekaj vrstic v Excelu dobaviteljev je bilo dejansko oznak razdelkov ne pravih dobaviteljev — te so izločene pri uvozu (`NEHOMOLOGIRAN`, `NOVA HOMOLOGACIJA`, ipd.), a preveri seznam za druge podobne primere.
- Geslo je eno samo (shared), ni ločenih uporabniških računov — dovolj za enega nabavnika, ne za tim.
