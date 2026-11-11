# NMVPP Design System: dodatki za spletno stran, v0.1, 2026-11-11

Osnova: NMVPP Brand_Book v.01 (https://claude.ai/artifact/7VFqAR8hLxg5wDmDhQ42E6). Tokeni so prepisani v `src/styles/tokens.css`. Spodaj so samo dodatki, v kodi označeni z "EXT v0.1".

| Dodatek | Vrednost | Raba |
|---|---|---|
| Barvna lestvica višine | `#2E3032` → `#5B5E60` → `#B9BDB7` → `#FF5A1F` (0 / 45 / 85 / 100 % višine) | oblaki točk, privzeto barvanje |
| Lestvica odstopanj | `#6B6E70` (0 cm) → `#E4E6E1` (3 cm) → `#FF5A1F` (5 cm in več) | plast "Odstopanja" |
| Primerjalni barvi | A `#FF5A1F`, B `#E4E6E1` | /compare |
| Črtna risba | rez 3 px `#E4E6E1`, tanka 1 px `#8A8D8F`, skrita 1 px `#5B5E60`, kote in puščice 1 do 1,5 px `#FF5A1F`, besedilo JetBrains Mono | tlorisi in prerezi (SVG) |
| Gibanje | `--dur-scene` 600 ms, `--dur-draw` 1200 ms, `--ease-scroll` linear (drsenje), glajenje prizora 5/s | zgodba |
| Gumbi plasti (chip) | višina 28 px, Space Mono, aktivno: oranžna podlaga, grafitno besedilo; onemogočeno: 40 %, opomba "ni podatkov" | pregledovalnik |
| Drsnik prereza | `accent-color` oranžna, vrednost v JetBrains Mono | pregledovalnik |
| Oznaka meritve | oranžna podlaga, JetBrains Mono 11 px, nad sredino daljice | merjenje |
| Kartica s podatkom (metric) | Space Mono oznaka, JetBrains Mono 28 px vrednost, enota 13 px sivo | strani študenta |
| Oznaki osnutka | `[vnesi]` črtkan grafitni okvir, `[preveri]` črtkan rumen okvir (`--status-warn`) | prototip |
| Generator avatarja | 5 × 5 zrcalna mreža, bela polja in eno oranžno polje na grafitu, seme iz `avatar_seed`, brez obrazov | anonimni študenti |

## Dodatki v0.1b (gibanje), v kodi "EXT v0.1b"

| Dodatek | Vrednost | Raba |
|---|---|---|
| Stikalo gibanja | glava, Space Mono, oranžen kvadrat utripa, ko je vklopljeno | vse strani |
| Val skeniranja | oranžen vodoraven pas, 0,85 m/s, širina 0,09 m | uvod, korak 09 |
| Krogi skenerjev | bel (A) in oranžen (B) krog iz položaja skenerja, 2,2 m/s | korak 01 |
| Opozorilna barva | `#FFC23D` (`--status-warn`) za osamelce in premične predmete | korak 02 |
| Vokselska mreža | kvadratne točke s temnejšim robom, celica 12 cm (povečano za berljivost) | korak 02 |
| Položaji kamere | oranžne piramide, bela pot 50 % | korak 04 |
| Kontrolna mera | oranžna črta s prečnima oznakama, oznaka kot pri merjenju | korak 05 |
| Barve plasti | 01_FLOORS `#8A8D8F`, 02_WALLS `#4A4C4E`, 03_CEILING `#6B6E70`, 04_STAIRS in 05_OPENINGS `#FF5A1F` | korak 08 |
| Kazalec | točke v polmeru 0,17 (zaslon) zažarijo oranžno in se umaknejo | zgodba |
| Nagib kartic | do 9° / 11°, oranžna svetloba sledi kazalcu | kartice študentov |
| Vstop kartic korakov | 48 px navzgor, 0,7 do 0,9 s, `--ease-out` | zgodba |

Še ni narejeno: svetla različica za publikacijo (v0.2).
