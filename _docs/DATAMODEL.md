# DATAMODEL: Onderwijsagenda-app

*Versie T001a, 15-10-2026. Wordt bijgewerkt bij elke schemawijziging.*

Dit document zegt welke tabellen en kolommen de app gebruikt, wie eigenaar is, en in welk formaat gegevens staan of geschreven worden.
De feiten over de bron zijn gecontroleerd op de PO-kopie `gs_basedata v2.xlsx` (Drive-map "Codebase Skooro 20261014", 14-10-2026). Jouw sandbox-kopie kan afwijken: draai `controleerBronBasedata()` en vergelijk.

---

## 1. Eigenaarschap

| Bestand | Eigenaar | Deze app |
|---|---|---|
| `gs_basedata` | Skooro Insights | **alleen lezen** |
| `gs_docentenbeheer` | Skooro Insights | alleen lezen (pas gebruikt vanaf T001d) |
| Registratie-spreadsheet | deze app | lezen en schrijven, alleen via een schrijfpoort per tabblad |

Alle toegang tot `gs_basedata` loopt via `Bron_Lezen.js`. Alle ID's en instellingen staan in Script Properties en worden alleen gelezen in `Config.js`.

## 2. Instellingen (Script Properties)

| Sleutel | Betekenis | Nodig vanaf |
|---|---|---|
| `BRON_BASEDATA_ID` | ID van de Google Sheet-kopie van gs_basedata | T001a |
| `GENEREER_ACADEMISCHJAAR_ID` | academisch jaar voor een run, bijv. `ACJ-007` (nooit uit `is_active`) | T001b |
| `GENEREER_OPLEIDING_ID` | een opleiding-ID of het woord `ALLE`; leeg geeft een fout (PB-8) | T001b |
| `BRON_DOCENTENBEHEER_ID` | ID van de Google Sheet-kopie van gs_docentenbeheer | T001d |
| `REGISTRATIE_ID` | ID van de eigen registratie-spreadsheet | T001c |

Geen standaardwaarden. Ontbreekt een instelling, dan stopt de code met een foutmelding.

## 3. Gebruikte bron: gs_basedata

Het contract staat in code als `BRON_BASEDATA_CONTRACT` (`Bron_Lezen.js`). Alleen deze kolommen komen in de app; andere kolommen worden genegeerd.

| Tabblad | Sleutelkolom | Gebruikte kolommen |
|---|---|---|
| `academischjaar` | `academischjaar_id` | `academischjaar_id`, `academischjaar_code`, `label`, `is_active`, `startdatum`, `einddatum` |
| `opleidingen` | `opleiding_id` | `opleiding_id`, `opleiding_code`, `label` |
| `leerjaren` | `leerjaar_id` | `leerjaar_id`, `academischjaar_id`, `leerjaar_nummer` |
| `trimesters` | `trimester_id` | `trimester_id`, `opleiding_id`, `academischjaar_id`, `trimester_code`, `label`, `startdatum`, `einddatum` |
| `lespakketten` | `lespakket_id` | `lespakket_id`, `lespakket_code`, `opleiding_id`, `leerjaar_id`, `vakken_compleet_bevestigd` |
| `klassen` | `klas_id` | `klas_id`, `klas_code`, `label`, `academischjaar_id`, `lespakket_id` |
| `curriculum` | `curriculum_id` | `curriculum_id`, `lespakket_id`, `onderwijs_eenheid_id`, `trimester_id`, `periode_id`, `verzorgd` |
| `onderwijs_eenheid` | `onderwijs_eenheid_id` | `onderwijs_eenheid_id`, `onderwijs_eenheid_type_id`, `code`, `label` |
| `onderwijs_eenheid_type` | `onderwijs_eenheid_type_id` | `onderwijs_eenheid_type_id`, `label` |
| `trimester_perioden` | `mapping_id` | `mapping_id`, `trimester_id`, `leerjaar_id`, `periode_id` |

**Bewust niet gebruikt:** `curriculum.is_open` (besluit B15: negeren), `curriculum.aantal_lesuren_per_week`, `klassen.old`.

### Relaties

- Klas: `klassen.lespakket_id` verwijst naar `lespakketten`. De opleiding van een klas volgt uit het lespakket.
- Jaar van een klas: `klassen.academischjaar_id` (direct). Het jaar volgt ook via `lespakketten.leerjaar_id` naar `leerjaren.academischjaar_id`. Dat zijn twee paden naar hetzelfde gegeven; een verschil is een tegenstrijdigheid (PB-6: melden, niet aanmaken).
- Curriculum: een regel hoort bij een `lespakket_id`, een `onderwijs_eenheid_id` en een `trimester_id` (uniek per combinatie). De klas zit niet in het curriculum; je komt bij een klas via het lespakket.
- Trimester: `trimesters` bevat per opleiding en per academisch jaar drie trimesters. `trimester_id` wint van `periode_id` bij een conflict (PB-6). `periode_id` wordt in Skooro afgeleid via `trimester_perioden`.
- Type van een onderwijseenheid: `onderwijs_eenheid.onderwijs_eenheid_type_id`. Alleen type `OET-006` (Vak) krijgt een onderwijsagenda (PB-2).

### Feiten uit de PO-kopie (14-10-2026)

| Onderwerp | Waarde |
|---|---|
| Rijen per tabblad | academischjaar 4, opleidingen 3, leerjaren 16, trimesters 33, lespakketten 58, klassen 96, curriculum 1347, onderwijs_eenheid 81, onderwijs_eenheid_type 8, trimester_perioden 108 |
| Academische jaren | ACJ-004 t/m ACJ-007. `is_active` = 1 alleen bij ACJ-006, terwijl ACJ-007 al op 2026-10-01 begon. Gebruik `is_active` dus niet. |
| Opleidingen | OPL-001 ICT, OPL-002 AV, OPL-003 INFRA |
| Trimesters ACJ-007 | TRI-025 t/m TRI-027 (ICT), TRI-028 t/m TRI-030 (AV), TRI-031 t/m TRI-033 (INFRA) |
| Klassen | totaal 96. ACJ-007: **28** (OPL-001: 8, OPL-002: 4, OPL-003: 16) |
| Lespakketten ACJ-007 | LPK-043 t/m LPK-058 (16). `vakken_compleet_bevestigd`: 1 bij 9, 0 bij LPK-049, leeg bij LPK-053 t/m LPK-058 (INFRA) |
| Curriculum | 709 regels in ACJ-006 (alle met lege `verzorgd`), 638 in ACJ-007 (625 `JA`, 13 `NEE`, geen lege) |
| Onderwijseenheid-typen | OET-001 Docentenvergadering, OET-002 Excursie, OET-003 Gastcollege, OET-004 Keuzebegeleiding, OET-005 Stemproject, **OET-006 Vak**, OET-007 Vakbegeleiding, OET-008 Workshop |
| Indicatie voor T001b (geen afgeleide logica, alleen een controlegetal) | ACJ-007, type Vak, `verzorgd` = ja, per klas via het lespakket: 1069 klas-vak-trimester-combinaties (OPL-001: 255, OPL-002: 147, OPL-003: 667); geen klas zonder curriculum |

### Notatie in de bron (waarom er genormaliseerd wordt)

- ID's staan als `PREFIX-nummer` in hoofdletters (`KLA-001`, `LPK-043`). Oudere ID's in andere bronnen (`ls_001`, `doc_001`) volgen we niet.
- `academischjaar_code` is tekst (`'2025'`) bij oudere jaren en een getal (`2026`) bij ACJ-007. De leeslaag maakt er altijd tekst van.
- `is_active` en `vakken_compleet_bevestigd` zijn getallen (`1`/`0`) of leeg. `curriculum.verzorgd` is `JA`, `NEE` of leeg; vertaling volgt in T001b (`JA`/`1`/`TRUE` = ja; `NEE`/`0`/`FALSE`/leeg = nee).
- De sheets hebben lege rijen en extra lege kolommen onderaan en rechts. De leeslaag slaat lege rijen over en negeert lege kopcellen.

## 4. Leesregels (`Bron_Lezen.js`)

- ID- en codekolommen (naam eindigt op `_id` of `_code`, of heet `code`): `trim()` + hoofdletters, altijd als tekst. Een afwijkende notatie geeft een signalering `ID_GENORMALISEERD` (info).
- Ontbrekend tabblad of verplichte kolom, dubbele kolomnaam, ontbrekende of onbruikbare instelling: de code stopt met een duidelijke fout.
- Dubbele sleutel (`DUBBELE_SLEUTEL`, fout) en lege sleutel (`LEGE_SLEUTEL`, fout): rijen blijven staan en worden gesignaleerd.
- Tijdzone van de spreadsheet is niet `America/Paramaribo`: signalering `TIJDZONE_AFWIJKEND` (waarschuwing).
- Elk tabblad wordt in één keer gelezen (`getDataRange().getValues()`).

### Formaat van een signalering (PB-3)

| Veld | Inhoud |
|---|---|
| `type` | vaste code, bijv. `DUBBELE_SLEUTEL` |
| `ernst` | `fout`, `waarschuwing` of `info` (constante `SIGNALERING_ERNST`) |
| `sleutel` | de sleutel waar het over gaat (genormaliseerd), of leeg |
| `bronregel` | bijv. `gs_basedata/klassen rij 12` |
| `tekst` | uitleg in gewone taal |

## 5. Registratie-spreadsheet (nog niet aangemaakt)

Tabblad `verplichtingen` volgens besluit PB-5 (14-10-2026). Het tabblad en de kolommen maak je met de hand; de exacte CSV-regel en de notatie per kolom worden in T001c vastgesteld. Er is **geen** docentkolom: de docent komt in T001d in een aparte koppeltabel waarin alleen regels worden toegevoegd.

Kolommen, in volgorde:

`verplichting_id`, `sleutel`, `academischjaar_id`, `trimester_id`, `opleiding_id`, `onderwijs_eenheid_id`, `klas_id`, `lespakket_id`, `status`, `aangemaakt_op`, `aangemaakt_door`, `bijgewerkt_op`, `bijgewerkt_door`

- ID-formaat: `VPL-0001`, `VPL-0002`, ... via een centrale functie (PB-4).
- Geen dubbele verplichtingen via de natuurlijke sleutel (jaar + trimester + opleiding + vak + klas), niet via het ID.
- Statusnamen staan als constanten op één plek. De eerste status is `Verwacht`; de overgangsmatrix volgt in een latere taak.
