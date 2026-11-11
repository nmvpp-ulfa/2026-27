# NMVPP_web, v0.1, 2026-11-11

Javna spletna stran predmeta NMVPP (UL FA, 2026/27). Stran predstavlja študentska dela: zajeme, poskuse in na koncu modele za razstavo. Potek dela (zgodba v 9 korakih) je okvir.

Gradivo (samo lokalno, ni v repozitoriju): navodila za gradnjo strani, tečajni prompt in osnutek besedil korakov. Potrjena besedila so v `content/steps.json`.

## Stanje v0.1

Klikljiv prototip z **umetnimi demo podatki**. Končni izdelki študentov še niso oddani, zato je vsak podatek na strani označen z "Demo", manjkajoči izdelki pa z "manjka".

| Stran | Pot | Stanje |
|---|---|---|
| Potek dela | `/` | vsi koraki 01 do 09 imajo svoj prizor: 01 dva skenerja zajameta prostor, 02 osamelci, predmeti, izravnava, vokselska mreža, 03 iskanje zasuka in poravnava, 04 položaji kamere iz videa, 05 kontrolne mere, 06 rezi in ravnine, 07 točke v črte in tloris, 08 plasti modela razstavljene, 09 model v oblaku na vrtljivi mizi |
| Atlas | `/explore/` | zemljevid FA in centra, oznake, filtri (lokacija, naprava, faza, status), kartice |
| Študent | `/student/?id=s01` | pregledovalnik (oblak, generaliziran model, odstopanja, prerez, merjenje), podatki, meritve, poskusi, tedenski listi, končni izdelki, razstava |
| Primerjava | `/compare/?a=s01&b=s03` | dva pregledovalnika s sinhronizirano kamero, drsnik, skupni prerez, podatki A / B, vstop "Faza 1" |
| Razstava, Protokol, O predmetu | | v meniju označeno v0.2 / v0.3 |

Stran je privzeto animirana: kamera se v uvodu in v koraku 09 vrti okoli prizora, med koraki niha, sledi kazalcu in se jo da vrteti s potegom (na telefonu z vodoravnim potegom). Točke ob kazalcu zažarijo in se umaknejo. Kartice študentov se nagnejo proti kazalcu. Pregledovalnika na straneh študenta in primerjave se počasi vrtita, dokler ju obiskovalec ne prime, prerez se ob nalaganju dvigne od tal.

Gibanje se izklopi s stikalom "Gibanje" v glavi (izbira se shrani v brskalniku). Takrat zgodba pokaže po eno mirno stanje na korak. Za pregled: `?motion=off` ali `?motion=full`. Nastavitev sistema "manj gibanja" strani ne preklopi več samodejno, ker mora biti stran dinamična; dostopnost zagotavlja stikalo.

Logotip univerze: uradni "znak s pripisom" Fakultete za arhitekturo UL, bela vodoravna različica za temno podlago, v glavi in nogi. Slovenska različica (`public/brand/ul_fa_logo_hor_white_sl_v1_2026-11-11.png`) se ob preklopu na EN zamenja z angleško (`..._en_...`). Vir: uni-lj.si, Medijsko središče, Celostna grafična podoba, Znak s pripisom, paket `UL-FA-logo.zip` (PNG 1103 × 271 oz. 1205 × 271, s prostorom nedotakljivosti). Paket ima tudi AI in PDF; SVG ni priložen. Pogoji uporabe UL: elemente CGP se uporablja z dovoljenjem skrbnika CGP UL oz. članice in skladno s Priročnikom CGP UL.

## Oddaja študentov

Kaj točno oddajo študenti, da se stran projekta sestavi samodejno: [docs/NMVPP_oddaja_navodila_v1_2026-11-11.md](docs/NMVPP_oddaja_navodila_v1_2026-11-11.md), predloga podatkov: [docs/NMVPP_oddaja_predloga_v1_2026-11-11.json](docs/NMVPP_oddaja_predloga_v1_2026-11-11.json). Podatki o predmetu (ime, šolsko leto, nosilec, povezava na stran predmeta) so v `content/course.json`.

## Zagon

```
npm run dev
```

Zažene Vite na http://localhost:5173. Prvi zagon namesti knjižnice.

**Knjižnice niso v Google Drive.** `npm install` na pogonu G: ne deluje (EPERM / EBADF) in bi sinhroniziral tisoče datotek. Skripta `scripts/vite.mjs` zato namesti knjižnice v `%USERPROFILE%\.nmvpp-web-toolchain` (drugo mesto: spremenljivka `NMVPP_TOOLCHAIN`) in od tam zažene Vite. Če obstaja običajen `./node_modules` (npr. v GitHub Actions), uporabi tega.

- `npm run build`: produkcijska gradnja v `%USERPROFILE%\.nmvpp-web-toolchain\dist`
- `npm run preview`: ogled gradnje
- `npm run demo-data`: ponovno ustvari umetne demo podatke

## Struktura

```
index.html, explore/, student/, compare/   strani (Vite multi-page)
src/pages/        logika strani
src/three/        oblak točk (shaderji), generaliziran model, pregledovalnik
src/lib/          jezik SL/EN, podatki, kartice, avatar, glava in noga
src/styles/       tokeni design systema, osnovni slog, strani
content/          steps.json (besedila korakov), students.json (zapisi študentov)
public/data/      spletni podatki: demo/ (zgodba, prizori), s01 ... s06/
scripts/          make_demo_data.mjs (demo podatki), vite.mjs (zagon brez node_modules v Drive)
docs/screenshots/ slike zaslona za pregled
```

## Podatki

- `content/students.json` sledi podatkovnemu modelu iz prompta (id, display_name, consent_name, avatar_seed, phase, location, consent_location_publication, devices, apps, ai_models, metrics, files, text_sl, text_en). Dodana polja: `demo`, `status`, `reached_step`, `scene`, `measurements`, `worklog`, `exhibition`, `files.model_json`.
- Zdaj ga piše `scripts/make_demo_data.mjs`. V v0.3 ga nadomesti `scripts/build_manifest.py`, ki prebere mapo z rezultati po vzorcu `priimek_lokacija_element_vN_LLLL-MM-DD.ext`.
- Demo podatki so umetni: generično stopnišče (namesto stopnišča FA) in generičen prostor s stebri (namesto lokacije v centru). Metrike so izračunane iz teh umetnih oblakov, niso študentski rezultati.
- Vsi študenti so anonimni (`consent_name: false`), dokler ni seznama soglasij s Teamsov. `s06` ima `consent_location_publication: false` in prikazuje samo generaliziran model.
- Oblak točk v0.1: binarni int16 (mm). Generaliziran model v0.1: JSON s ploskvami. Potree, GLB in SPZ pridejo z resničnimi podatki.

## Odprto

1. Pot do demo skenov Scaniverse 2022–2024 na Drive (zamenjajo umetni oblak, označeni "demo").
2. Pot do referenčnega zajema stopnišča FA in do mape z rezultati.
3. Seznam soglasij s Teamsov (predmet NMVPP).
4. Čas in "kaj ni delovalo" za korake 01 do 09 (Tomaž, iz referenčnega zajema); drugi `[vnesi]` in `[preveri]` v `content/steps.json`.
5. `[preveri]` koordinate FA v `scripts/make_demo_data.mjs` (46.0446, 14.5003).
6. `/student/?id=..` je zdaj poizvedba; prompt predvideva `/student/[id]`. Strani po študentih lahko ustvari gradnja v v0.3.
7. Dovoljenje skrbnika CGP na UL FA za rabo znaka s pripisom na spletni strani (pogoj uporabe UL).
8. Zemljevid uporablja ploščice OpenStreetMap (atribucija je prikazana). Za objavo preverite pogoje uporabe ali izberite drug vir ploščic.
