# NMVPP: navodila za oddajo projekta, v1, 2026-11-11

Napredno modeliranje in vizualizacija prostorskih podatkov, UL FA, šolsko leto 2026/27. Nosilec: doc. dr. Tomaž Berčič.

Iz vsake oddaje spletna stran predmeta samodejno sestavi stran projekta: 3D pregledovalnik (oblak točk, generaliziran model, odstopanja, prerez, merjenje), podatke, meritve, poskuse, tedenske liste, končne izdelke in razstavo. Da to deluje za vse projekte enako, morajo imeti vse oddaje enako strukturo, enaka imena datotek in enak koordinatni sistem.

Oznaka `[vnesi]` pomeni, da podatek še določi nosilec.

## Rok in mesto oddaje

| | |
|---|---|
| Rok | `[vnesi]` |
| Mesto oddaje | `[vnesi]` (naloga v Teams ali mapa OneDrive predmeta NMVPP) |
| Oblika | ena mapa na projekt, stisnjena v ZIP, ali naložena kot mapa |

Oddaja ni javna. Na spletno stran gredo samo pretvorjene datoteke in samo s soglasjem (glejte Soglasja).

## Poimenovanje

Vse datoteke: `priimek_lokacija_element_vN_LLLL-MM-DD.ext`

- male črke, brez šumnikov in presledkov (č → c, š → s, ž → z);
- deli imena so ločeni s podčrtajem `_`, besede znotraj dela z vezajem `-`;
- `vN` je različica (v1, v2 ...), datum je datum izdelave datoteke;
- primer: `novak_stopnisce-fa_oblak_v2_2026-12-15.ply`.

Lokacija je kratko ime prostora, npr. `stopnisce-fa`, `avla-fa`, `kino-siska`. Vsi v isti skupini uporabljajo isto ime lokacije.

## Struktura mape

```
priimek_lokacija/
  priimek_lokacija_oddaja_v1_LLLL-MM-DD.json   podatki o projektu (predloga spodaj)
  01_zajem/          surovi podatki, arhiv, ne gre na splet
  02_oblak/          očiščen, poravnan in umerjen oblak točk
  03_model/          generaliziran model (3DM in GLB), po želji mreža in splat
  04_risbe/          tloris in prerezi
  05_meritve/        meritve s trakom in v oblaku
  06_tedenski_listi/ tedenski listi
  07_slike/          slike za galerijo
  08_porocilo/       končno poročilo
  09_razstava/       fotografija razstavnega modela (po razstavi)
```

## Seznam datotek

**Obvezno** pomeni, da brez datoteke stran projekta ni popolna. **Po želji** se prikaže, če obstaja.

| Mapa | Element | Format | Obvezno | Zahteve |
|---|---|---|---|---|
| koren | `oddaja` | JSON | da | izpolnjena predloga, glejte spodaj |
| 01_zajem | `zajem-a`, `zajem-b` | LAS ali PLY | da | izvoz iz Scaniverse, brez obdelave |
| 01_zajem | `video01`, `video02` | MP4 | da | izvirni videoposnetek, brez prepoznavnih obrazov |
| 01_zajem | `foto01` ... | JPG | da | fotografije elementov, izmerjenih s trakom, trak naj bo viden |
| 02_oblak | `oblak` | PLY (binarni) ali LAZ | da | združen, očiščen, poravnan, umerjen; barve RGB, če obstajajo |
| 03_model | `model` | 3DM | da | plasti `01_FLOORS`, `02_WALLS`, `03_CEILING`, `04_STAIRS`, `05_OPENINGS` |
| 03_model | `model` | GLB | da | isti model, predmeti poimenovani po plasteh, največ 20 MB |
| 03_model | `mesh` | GLB | po želji | teksturirana mreža (RealityScan ali Scaniverse), največ 50 MB |
| 03_model | `splat` | SPZ ali PLY | po želji | Gaussian splat, največ 50 MB |
| 04_risbe | `tloris` | PDF in DXF | da | vodoravni prerez na +1,00 m nad tlemi etaže |
| 04_risbe | `tloris` | SVG | po želji | samo črte; če ga ni, ga izdelamo iz PDF |
| 04_risbe | `prerez01` ... | PDF in DXF | da | vsaj en navpični prerez |
| 05_meritve | `meritve` | CSV | da | glejte Meritve |
| 06_tedenski_listi | `teden01` ... `teden06` | PDF | da | en list na teden, A3 ležeče `[preveri]`, največ 10 MB |
| 07_slike | `slika01` ... `slika06` | JPG | da (vsaj 3) | 2400 px po daljši stranici, sRGB, največ 2 MB; `slika01` je naslovna |
| 08_porocilo | `porocilo` | PDF | da | korak 09: kaj je delovalo, kaj ne, kaj je negotovo, kateri deli prostora manjkajo |
| 09_razstava | `razstava01` ... | JPG | po razstavi | fotografija natisnjenega modela |

Datoteka za splet sme imeti največ 90 MB. Večje surove datoteke so dovoljene samo v `01_zajem`.

## Koordinatni sistem

Pogoj za prekrivanje oblaka in modela, odstopanja, prerez in primerjavo dveh projektov.

- enota: meter;
- os Z kaže navzgor, tla najnižje etaže so na z = 0;
- izhodišče (0, 0) je v enem vogalu prostora, os X poteka vzdolž najdaljše stene;
- oblak, model, mreža in splat so v **istem** koordinatnem sistemu (brez premika ali zasuka med njimi);
- merilo je preverjeno s trakom (korak 05).

## Meritve

Datoteka `meritve` je CSV, ločilo podpičje, decimalna vejica ali pika:

```
element;trak_cm;oblak_cm;opomba
sirina-vrat;90,0;90,6;vrata v pritličju
visina-stropa;320,0;318,9;pod galerijo
dolzina-stene;600,0;600,4;severna stena
```

Vsaj tri meritve: širina vrat, višina stropa, dolžina stene. Stran pokaže razliko in jo označi, če je večja od 3 cm.

## Podatki o projektu (oddaja.json)

Predloga: `NMVPP_oddaja_predloga_v1_2026-11-11.json` (v isti mapi kot ta navodila). Kopirajte jo, preimenujte v `priimek_lokacija_oddaja_v1_LLLL-MM-DD.json` in izpolnite.

| Polje | Pomen |
|---|---|
| `ime`, `priimek` | ostane zasebno; na strani se pokaže samo s soglasjem |
| `soglasje_ime`, `soglasje_lokacija` | da ali ne (`true` / `false`), enako kot na obrazcu soglasja |
| `faza` | 1 = skupni prostor (stopnišče FA), 2 = lastna lokacija |
| `lokacija` | ime, vrsta prostora, približne koordinate stavbe (lat, lon), dovoljenje upravljavca |
| `datum_zajema` | LLLL-MM-DD |
| `naprave` | model telefona ali naprave, LiDAR da ali ne |
| `aplikacije` | vse uporabljene aplikacije in programi |
| `ai` | uporabljeni AI asistenti in model, do katerega koraka je vsak prišel, opomba |
| `dosezeni_korak` | zadnji dokončani korak, 1 do 9 |
| `koraki` | za vsak korak 01 do 09: porabljen čas v urah in kaj ni delovalo |
| `besedilo_sl`, `besedilo_en` | kratek opis projekta, 80 do 120 besed v vsakem jeziku |
| `razstava` | predlog za razstavo: tehnika tiska, merilo, material |

## Soglasja

Brez soglasja je projekt na strani anonimen: "Študent NN" z geometrijskim avatarjem, brez imena v besedilu, datotekah in metapodatkih.

- **soglasje za ime**: na strani se pokaže ime in priimek;
- **soglasje za lokacijo**: pokažejo se oblak točk, splat in fotografije; brez njega samo generaliziran model.

Obrazec soglasja je v Teams, predmet NMVPP `[vnesi]`.

## Zasebnost

- na posnetkih, fotografijah in v oblaku ne sme biti prepoznavnih oseb (zamegliti ali izrezati);
- brez osebnih podatkov v imenih datotek za splet (to uredi pretvorba);
- lokacije samo v javnih stavbah, z dovoljenjem upravljavca.

## Kaj se zgodi z oddajo

Skripta `build_manifest` prebere mapo, preveri imena in obvezne datoteke, dodeli anonimno oznako (s01, s02 ...), pretvori oblak za splet, izračuna metrike (število točk, mediana odstopanja, delež točk znotraj 5 cm, napaka merila) in posodobi stran. Napake (manjkajoča datoteka, napačno ime, drug koordinatni sistem) vrne kot seznam za popravek.

| Na strani | Iz datoteke |
|---|---|
| kartica v Atlasu, zemljevid | `oddaja.json` (lokacija, faza, naprave), `tloris.svg` ali `tloris.pdf` |
| 3D pregledovalnik: oblak | `oblak` |
| 3D pregledovalnik: model, prerez | `model.glb` |
| plast odstopanja, metrike | `oblak` in `model.glb` (izračun) |
| plasti splat in mreža | `splat`, `mesh` |
| meritve | `meritve.csv` |
| poskusi, dnevnik | `oddaja.json` (`ai`, `koraki`) |
| tedenski listi | `teden01` ... `teden06` |
| končni izdelki za prenos | `model.3dm`, `tloris` in `prerez` (DXF, PDF), `model.glb` kot OBJ ali GLB |
| galerija | `slika01` ... |
| razstava | `oddaja.json` (`razstava`), `razstava01` ... |

## Kontrolni seznam pred oddajo

- [ ] mapa in vse datoteke imajo ime `priimek_lokacija_element_vN_LLLL-MM-DD.ext`
- [ ] `oddaja.json` je izpolnjen, besedilo v SL in EN
- [ ] oblak, model, mreža in splat so v istem koordinatnem sistemu, metri, Z navzgor, tla na z = 0
- [ ] model ima plasti `01_FLOORS` do `05_OPENINGS`, GLB je izvožen iz istega 3DM
- [ ] tloris na +1,00 m in vsaj en prerez, PDF in DXF
- [ ] vsaj tri meritve v `meritve.csv`
- [ ] šest tedenskih listov, vsaj tri slike, poročilo
- [ ] brez prepoznavnih oseb, soglasje oddano
