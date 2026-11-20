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
public/data/      spletni podatki: story/ (referenčni zajem za zgodbo), s01 ... s06/ (slike, videi, oblaki točk)
scripts/          make_demo_data.mjs (demo podatki), vite.mjs (zagon brez node_modules v Drive)
docs/screenshots/ slike zaslona za pregled
```

## Podatki

- `content/students.json` sledi podatkovnemu modelu iz prompta (id, display_name, consent_name, avatar_seed, phase, location, consent_location_publication, devices, apps, ai_models, metrics, files, text_sl, text_en). Dodana polja: `demo`, `status`, `reached_step`, `scene`, `measurements`, `worklog`, `exhibition`, `files.model_json`.
- Zapisi so resnični: dnevniki, poročila, videi in skeni iz mape `0 results` na SharePointu predmeta (do 10. 11. 2026). Imena, slike, videi in skeni so objavljeni s soglasjem študentov (nosilec, 14. 11. 2026). Zasebni naslovi niso objavljeni.
- Imena so v `private/apply_media.mjs` (NAMES); priimek Grete Kočar je iz njenega gradiva, priimek Lize Bolha je sporočil nosilec.
- Pretvorba je lokalna (`private/`, ni objavljeno): `check_new.py` (nove datoteke v mapi 0 results, vsak večer jo zažene načrtovano opravilo), `import_media.py` (slike do 1600 px brez metapodatkov, videi H.264 brez zvoka, oblaki točk), `apply_media.mjs` (zapis v `content/students.json`), `make_story_tb.py` (zgodba).
- Oblak točk: binarni int16 (mm) + odstopanje (uint8) + barva zajema (uint8 RGB), središče v izhodišču, tla na z = 0.
- Zgodba na začetni strani: referenčni zajem nosilca, stopnišče do WC v Zlati ladjici. Dva LiDAR skena (Scaniverse, iPhone) sta poravnana na posplošen model v Rhinu (`prostor_stopnisce_model_v1.1_2026-11-01_1.3dm`); zamik skena B v koraku 03 je dejanski zamik, ki ga je dal telefon (42°, približno 9 m). Model v JSON ima mreže po plasteh in obrise.

## Odprto

1. Ko bodo oddani posplošeni modeli študentov (GLB ali 3DM), jih dodati v pregledovalnik in primerjavo.
2. Čas in "kaj ni delovalo" za korake 01 do 09 (Tomaž, iz referenčnega zajema); drugi `[vnesi]` in `[preveri]` v `content/steps.json`.
3. `/student/?id=..` je zdaj poizvedba; prompt predvideva `/student/[id]`. Strani po študentih lahko ustvari gradnja v v0.3.
4. Dovoljenje skrbnika CGP na UL FA za rabo znaka s pripisom na spletni strani (pogoj uporabe UL).
5. Zemljevid uporablja ploščice OpenStreetMap (atribucija je prikazana). Za objavo preverite pogoje uporabe ali izberite drug vir ploščic.
