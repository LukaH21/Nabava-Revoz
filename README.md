# Nabava · Revoz

Interna nabavna aplikacija. Pokriva modul **Analiza ponudb** (zamenjava Excel primerjav ponudb), **Aktivnosti** (pregled kje je kateri projekt in kaj potrebuje pozornost) in **ZZN PHF** (tedenska tabela naročil na zalogo z delovnim tokom povpraševanj), z bazo dobaviteljev in samodejnim izračunom posredništva. V produkciji teče na Vercelu z Neon Postgres bazo (glej `nabava-revoz.vercel.app`).

## Kaj je narejeno

- **Baza dobaviteljev** — uvožena iz "2026 DOBAVITELJI kontakti in nabavniki" (382 dobaviteljev: kontakti, e-maili, nabavnik, promet, boniteta).
- **Posredništvo** — 3 sheme provizij (Standard SLO, Plačilo z avansom, Pagras nadzor delovišč) uvožene iz Excela, samodejni izračun glede na znesek.
- **Analiza ponudb** — projekti → krogi povpraševanja (podpira več krogov ob spremembi tehničnih zahtev) → ponudbe po dobavitelju s fleksibilnimi postavkami, samodejni izračun skupaj + provizije, oznaka tehnično/komercialno potrjeno, končna cena, izbira zmagovalca, izvoz primerjave v CSV, sprotna vizualna primerjava cen (bar chart, posodablja se med tipkanjem).
- **Panel dobaviteljev na projektu** — pri ustvarjanju projekta izbereš panel (koga bomo povpraševali), kasneje ga lahko dopolnjuješ. Ko je panel potrjen, se samodejno generira email povpraševanja po fiksnem predlogi (tehnični kontakt, rok oddaje, pogoji) — samo kopiraš v Outlook.
- **Tehnični kontakt in CDC dokument na projektu** — ime/telefon/email kontaktne osebe, nalaganje tehnično-prevzemnih pogojev (shranjeno v Vercel Blob).
- **Dashboard po projektu** — krogi/ponudbe, koliko dobaviteljev je odgovorilo, razpon cen, ocenjen prihranek (max ponudba vs. izbrana).
- **Rok oddaje ponudb** — vsak krog ima lahko rok, gumb za podaljšanje (šteje, koliko-krat je bil podaljšan), gumb za zapiranje kroga.
- **Aktivnosti** — nadzorna plošča: koliko projektov je odprtih, koliko ponudb še ni potrjenih, koliko rokov je poteklo/čaka ESDC/čaka potrditev panela; seznam "potrebna pozornost"; pregled zadnjega kroga po projektu; časovnica vseh aktivnosti.
- **Opombe po projektu** — prosto besedilo, doda se v časovnico aktivnosti.
- **ZZN PHF** — uvoz tedenske Excel tabele, filtrirano samo na nabavnika Luka. Delovni tok statusov (Dodeljeno → V povpraševanju → Za naročilo → V potrjevanju → Potrjeno → Naročeno), prikaz planerja (Kreirano-stolpec), samodejno zaznavanje "že naročeno v SAP" (ko Excel pokaže `#N/A` v stolpcu "neobdelane"). Za posamezne postavke (ali skupinsko izbrane) nastaviš dobavitelje za povpraševanje — postavke z enako množico dobaviteljev se samodejno združijo v skupino, za katero se generira email z vsemi artikli (kopiraš v Outlook). Ročno dodajanje postavk, prestavitev na drugega nabavnika, mehki izbris (z razlogom, ostane viden v "Brisani").
- **ESDC opozorilo** — projekt se samodejno označi, če končna cena presega 5.000 € (potrebna potrditev izbora dobavitelja).
- **Prijava z geslom** — cel app je zaščiten (samo ti ga uporabljaš).

## Kar še ni narejeno (naslednji koraki)

- AI iskanje dobaviteljev/konkurentov po družinskih kodah + samodejno pisanje mailov (potreben Anthropic API ključ).
- Povezava z družinskimi kodami (`DRUZINSKE KODE po nabavnikih 2026.xlsx`) — shema (`family_codes`, `family_suppliers`) je pripravljena, uvoz še ni napisan.
- Vlečenje podatkov iz SAP/Click2Buy (trenutno ročni Excel uvoz).
- Priponke/dokumenti k posameznim ponudbam (samo CDC na nivoju projekta je podprt) — ni še podprto.
- E-poštna opozorila (npr. dan pred iztekom roka) — trenutno vidiš to samo v Aktivnostih ob obisku aplikacije.
- Pošiljanje emaila neposredno iz aplikacije — trenutno se besedilo generira in kopira ročno v Outlook.

## Lokalni razvoj

Produkcija teče na Postgres (glej spodaj), zato lokalni razvoj zahteva povezavo do iste (ali testne) Postgres baze — `.env`:
```
DATABASE_URL="postgresql://...neon-connection-string..."
APP_PASSWORD="tvoje-geslo"
BLOB_READ_WRITE_TOKEN="vercel-blob-token"   # za nalaganje CDC dokumentov, glej spodaj
```
```bash
npm install
npm run dev
```

Uvoz/posodobitev podatkov:
```bash
npx tsx scripts/seed-brokerage-tiers.ts
npx tsx scripts/import-suppliers.ts "/pot/do/2026 DOBAVITELJI kontaki in nabavniki  URADNA TABELA-dodani prometi.xlsx"
npx tsx scripts/import-zzn.ts "/pot/do/ZZN PHF 2026.xlsx"
```

`import-zzn.ts` je varen za tedenski ponovni zagon — uvozi SAMO vrstice nabavnika "LUKA", vrstice se posodobijo po (interno naročilo, postavka). Delovni tok (status, ročno dodeljen nabavnik, izbris, izbrani dobavitelji za povpraševanje) se pri ponovnem uvozu OHRANI — le če Excel pokaže, da je SAP naročilo že oddano (`#N/A` v stolpcu "neobdelane"), se status samodejno postavi na "Naročeno".

## Shema podatkovne baze in migracije

Po vsaki spremembi `src/db/schema.ts` je treba pognati (na svojem računalniku, z `DATABASE_URL` nastavljenim na produkcijsko bazo):
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Nalaganje CDC dokumentov (Vercel Blob)

Za nalaganje tehnično-prevzemnih pogojev (CDC) na projekt aplikacija uporablja Vercel Blob storage. Enkratna nastavitev:
1. V Vercel dashboardu: projekt → **Storage** → **Create Database** (ali Connect Store) → **Blob**.
2. Vercel samodejno doda env spremenljivko `BLOB_READ_WRITE_TOKEN` projektu (Production + Preview + Development).
3. Redeploy, da začne veljati.

## Deploy na Vercel

1. Push na GitHub (glavna veja `main`), Vercel samodejno zgradi in deploya ob vsakem pushu.
2. **Framework Preset MORA biti "Next.js"** v Project Settings → Build and Deployment (če je pomotoma nastavljen na "Other", vsaka stran vrne 404, čeprav je build uspešen — glej spodaj).
3. Env spremenljivke (Settings → Environment Variables): `DATABASE_URL` (Neon Postgres, avtomatsko iz Storage integracije), `APP_PASSWORD`, `BLOB_READ_WRITE_TOKEN` (iz Blob storage), kasneje `ANTHROPIC_API_KEY` za AI funkcije.
4. Po vsaki spremembi sheme (`src/db/schema.ts`) je treba pred pushom ročno pognati `npx drizzle-kit generate` + `npx drizzle-kit migrate` proti produkcijski bazi (glej zgoraj) — Vercel ob buildu SAM ne poganja migracij.

## Znane omejitve / opombe

- Stopnje provizije so prepisane iz Excela po najboljši interpretaciji nejasno formatirane tabele (merged celice) — preveri jih pred prvo uporabo (`brokerage_tiers` tabela, kasneje UI za urejanje).
- Nekaj vrstic v Excelu dobaviteljev je bilo dejansko oznak razdelkov ne pravih dobaviteljev — te so izločene pri uvozu (`NEHOMOLOGIRAN`, `NOVA HOMOLOGACIJA`, ipd.), a preveri seznam za druge podobne primere.
- Geslo je eno samo (shared), ni ločenih uporabniških računov — dovolj za enega nabavnika, ne za tim.
- Če Vercel deploy uspešno zgradi (zelen), a stran vseeno vrne `404: NOT_FOUND` na čisto vsem, najprej preveri Project Settings → Build and Deployment → **Framework Preset** — mora biti "Next.js", ne "Other".
