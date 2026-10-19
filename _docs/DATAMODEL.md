# DATAMODEL: Onderwijsagenda-app

*Versie T001c deel 2, 18-10-2026. Wordt bijgewerkt bij elke schemawijziging.*

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

- ID's staan als `PREFIX-nummer` in hoofdletters (`LPK-043`, `TRI-025`, `OE-001`). Klas-ID's in de PO-kopie hebben de vorm `KLA-<jaar>-<klascode>`, bijvoorbeeld `KLA-ACJ-007-PT1.06.01`. Oudere ID's in andere bronnen (`ls_001`, `doc_001`) volgen we niet.
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

## 5. Registratie-spreadsheet (tabblad `verplichtingen`)

De registratie-spreadsheet is van deze app (lezen en schrijven). Het tabblad `verplichtingen` is met de hand aangemaakt (kant-en-klaar kopbestand, besluit B11) en heeft geen docentkolom: de docent komt in T001d in een aparte koppeltabel waarin alleen regels worden toegevoegd. De ID van de spreadsheet staat in Script Properties (`REGISTRATIE_ID`) en in `CONTEXT.md`.

### Kolomcontract (naam en volgorde moeten exact kloppen, anders stopt de code)

| # | Kolom | Inhoud en notatie (PB-13) | Verplicht |
|---|---|---|---|
| 1 | `verplichting_id` | `VPL-0001`; minimaal 4 cijfers, groeit mee (`VPL-10000`); via één centrale functie (PB-14: hoogste nummer + 1) | ja |
| 2 | `sleutel` | jaar, trimester, opleiding, vak, klas, gescheiden door `\|`; moet overeenkomen met kolommen 3 t/m 7 (PB-12) | ja, uniek |
| 3 | `academischjaar_id` | bron-ID, hoofdletters, bijv. `ACJ-007` | ja |
| 4 | `trimester_id` | bron-ID, hoofdletters | ja |
| 5 | `opleiding_id` | bron-ID, hoofdletters | ja |
| 6 | `onderwijs_eenheid_id` | bron-ID, hoofdletters | ja |
| 7 | `klas_id` | bron-ID, hoofdletters, bijv. `KLA-ACJ-007-PT1.06.01` | ja |
| 8 | `lespakket_id` | bron-ID, hoofdletters. Het enige veld dat later wordt bijgewerkt (PB-15) | ja |
| 9 | `status` | tekst uit één lijst met constanten; eerste waarde `Verwacht` | ja |
| 10 | `aangemaakt_op` | tekst `yyyy-MM-dd HH:mm:ss`, tijd in Paramaribo | ja |
| 11 | `aangemaakt_door` | e-mailadres van de gebruiker; stopt als dat niet beschikbaar is | ja |
| 12 | `bijgewerkt_op` | zelfde formaat als `aangemaakt_op` | ja |
| 13 | `bijgewerkt_door` | zelfde als `aangemaakt_door` | ja |

Alle kolommen worden als tekst (`@`) geschreven, zodat Sheets niets omzet naar een datum of getal. Een bestaande rij krijgt nooit een nieuwe `aangemaakt_op` of `aangemaakt_door`.

### Regels bij het lezen en plannen (`Registratie_Verplichtingen.js`)

- De registratie mag nooit dezelfde spreadsheet zijn als een bron (`BRON_BASEDATA_ID`, `BRON_DOCENTENBEHEER_ID`). Anders stopt de code.
- Ontbrekend tabblad, ontbrekende of verwisselde kolom, extra kolom buiten het contract: de code stopt met een duidelijke fout (PB-16, structuurprobleem).
- Elke rij wordt gecontroleerd. Een rij met een probleem is **geblokkeerd**: ze wordt niet aangepast en niet overschreven en de bijbehorende verplichting wordt overgeslagen. Er ontstaat nooit een dubbele rij (PB-16).
- ID's en sleutel worden bij het lezen genormaliseerd (trim, hoofdletters); een afwijking wordt als info gemeld.
- Plannen vergelijkt de afgeleide verplichtingen met de registratie op `sleutel` en geeft: **nieuw**, **bijwerken** (alleen `lespakket_id` verschilt), **ongewijzigd**, **vervallen** en **overgeslagen**.
- Vervallen = staat in de registratie voor het gekozen jaar en de gekozen opleiding(en), maar wordt niet meer afgeleid. De verplichting en haar status blijven ongewijzigd en worden gemeld (B12).

### Signaleringen van de registratie

| Type | Ernst | Betekenis |
|---|---|---|
| `ONGELDIG_ID_REGISTRATIE` | fout | `verplichting_id` heeft niet het formaat `VPL-0001`; rij geblokkeerd |
| `SLEUTEL_INCONSISTENT_REGISTRATIE` | fout | `sleutel` komt niet overeen met jaar, trimester, opleiding, vak en klas in dezelfde rij; rij geblokkeerd |
| `DUBBELE_SLEUTEL_REGISTRATIE` | fout | dezelfde sleutel in twee rijen; beide geblokkeerd |
| `DUBBEL_ID_REGISTRATIE` | fout | hetzelfde `verplichting_id` in twee rijen; beide geblokkeerd |
| `STATUS_ONBEKEND_REGISTRATIE` | waarschuwing | status staat niet in de lijst met bekende statussen; rij niet geblokkeerd |
| `BRON_VERVALLEN` | waarschuwing | verplichting wordt niet meer afgeleid; blijft staan |
| `TIJDZONE_AFWIJKEND` | waarschuwing | tijdzone van de registratie is niet `America/Paramaribo` |
| `ID_GENORMALISEERD` | info | spelling van een ID in de registratie is genormaliseerd |

### Schrijven (T001c deel 2)

Alleen `registratie_saveVerplichtingen_()` schrijft naar dit tabblad (de enige schrijfpoort). De wrapper `genereerVerplichtingen_uitvoeren()` roept hem aan. Alleen de scripteigenaar, vanuit de editor (B14); er is geen webingang.

Volgorde van een uitvoering:

1. Selectie lezen en bron lezen en afleiden (alleen rekenen), vóór de lock.
2. E-mailadres van de gebruiker ophalen. Ontbreekt het, dan stopt de run vóór de lock (PB-13).
3. De lock nemen (maximaal 30 seconden wachten). Lukt dat niet, dan stopt de run en is er niets geschreven.
4. Binnen de lock de registratie **opnieuw** lezen en plannen. Zo ziet een tweede run of een dubbele klik wat de eerste schreef en schrijft niets dubbel.
5. Een tijdzone van de registratie die niet `America/Paramaribo` is stopt de run (PB-16).
6. De schrijfpoort: alle nieuwe en bij te werken records worden eerst tegen het kolomcontract gecontroleerd. Is er één probleem, dan wordt niets geschreven. Daarna:
   - **Bijwerken (samenvoegen, PB-15):** alleen `lespakket_id`, `bijgewerkt_op` en `bijgewerkt_door`. `aangemaakt_op`, `aangemaakt_door` en alle andere kolommen blijven staan. Een onveranderde rij wordt niet aangeraakt.
   - **Nieuw:** ID's van hoogste bestaande nummer + 1 (PB-14), in blokken van 200 rijen. Eerst wordt het tekstformaat (`@`) op het blok gezet, dan geschreven, dan teruggelezen en vergeleken met wat er geschreven is.
7. De lock wordt altijd vrijgegeven, ook bij een fout.

Een nummer wordt door de app nooit opnieuw gebruikt. Rijen worden door de app nooit verwijderd.

Mislukt het schrijven halverwege, dan blijft wat al geschreven is staan (er wordt niets teruggedraaid) en de foutmelding noemt hoeveel er klaar is. Opnieuw uitvoeren vult de rest aan, zonder dubbelen.

Wat een uitvoering **niet** doet: een rij met een probleem (geblokkeerd) aanpassen of overschrijven; een vervallen verplichting wijzigen of verwijderen; iets in een bron schrijven.

Uitvoerlogboek van een run: selectie, aantal afgeleid, rijen voor en na, aantal nieuw (met eerste en laatste ID), bijgewerkt, ongewijzigd, vervallen en overgeslagen, en de signaleringen.

## 6. Afleiden van verwachte agenda's (T001b, `Verplichtingen_Afleiden.js`)

Dit onderdeel leest en schrijft niets. Het krijgt de gelezen basedata en de selectie uit Script Properties (`GENEREER_ACADEMISCHJAAR_ID`, `GENEREER_OPLEIDING_ID` = opleiding-ID of `ALLE`) en geeft `{ verplichtingen, signaleringen, samenvatting }`. Dezelfde invoer geeft altijd dezelfde uitvoer in dezelfde volgorde (opleiding, klas, trimester, vak).

### Regels

1. Klassen van het gekozen jaar (`klassen.academischjaar_id`) horen via `lespakket_id` bij een lespakket en dus bij een opleiding.
2. Het jaar via lespakket en leerjaar moet gelijk zijn aan het jaar van de klas. Anders: fout, geen verplichtingen voor die klas (B09).
3. Voor elk lespakket met minstens één geldige klas, één keer: curriculumregels controleren.
   - Trimester moet bestaan, bij het gekozen jaar horen en bij dezelfde opleiding als het lespakket horen. Anders: fout, regel telt niet mee.
   - Onderwijseenheid moet bestaan en het type `OET-006` (Vak) hebben (B07). Andere typen worden alleen geteld.
   - `verzorgd`: `JA`, `1`, `TRUE` = ja. `NEE`, `0`, `FALSE` = nee (alleen geteld). Leeg = niet verzorgd, wel melden per lespakket. Andere waarden: waarschuwing, telt niet mee.
   - Periode: `curriculum.periode_id` vergelijken met de periode uit `trimester_perioden` voor trimester en leerjaar. Bij afwijking: waarschuwing, het trimester wint en de verplichting blijft (B09).
   - Dubbele regel (zelfde lespakket, trimester en vak): fout, de tweede telt niet mee.
4. Per geldige klas van het lespakket ontstaat één verplichting per geldige curriculumregel.
5. Een opleiding in de selectie zonder klassen in het jaar geeft een waarschuwing (PB-10). Bij `ALLE` zijn dat alle rijen in `opleidingen`.
6. `curriculum.is_open` wordt genegeerd (B15). De docent speelt geen rol (B06).

### Signaleringen van deze stap

| Type | Ernst | Betekenis |
|---|---|---|
| `KLAS_ZONDER_LESPAKKET` | fout | klas verwijst naar een onbekend of leeg lespakket |
| `OPLEIDING_ONBEKEND` | fout | lespakket verwijst naar een onbekende opleiding |
| `KLAS_JAAR_CONFLICT` | fout | jaar van de klas is niet gelijk aan het jaar via lespakket en leerjaar |
| `TRIMESTER_ONBEKEND` | fout | curriculumregel verwijst naar een onbekend trimester |
| `TRIMESTER_JAAR_CONFLICT` | fout | trimester hoort bij een ander jaar dan het gekozen jaar |
| `OPLEIDING_CONFLICT` | fout | trimester hoort bij een andere opleiding dan het lespakket |
| `OE_ONBEKEND` | fout | curriculumregel verwijst naar een onbekende onderwijseenheid |
| `DUBBELE_SLEUTEL` | fout | dubbele curriculumregel of dubbele verplichting |
| `LESPAKKET_NIET_COMPLEET` | waarschuwing | `vakken_compleet_bevestigd` is niet ja (één melding per lespakket) |
| `LESPAKKET_ZONDER_CURRICULUM` | waarschuwing | lespakket heeft geen curriculumregels |
| `VERZORGD_LEEG` | waarschuwing | aantal Vak-regels met een lege `verzorgd` (één melding per lespakket) |
| `VERZORGD_ONBEKEND` | waarschuwing | `verzorgd` heeft een niet-herkende waarde |
| `PERIODE_AFWIJKEND` | waarschuwing | `periode_id` komt niet overeen met de afgeleide periode |
| `OPLEIDING_ZONDER_KLASSEN` | waarschuwing | opleiding in de selectie heeft geen klassen in het jaar |

Bewust uitgesloten regels (geen Vak, `verzorgd` = nee) geven geen signalering; ze staan als telling in de samenvatting (PB-11). De tellingen zijn per klas-regelcombinatie.

### Controlegetallen op de PO-kopie (ACJ-007, `ALLE`, 16-10-2026)

| Opleiding | Klassen | Verplichtingen | Geen Vak | Verzorgd nee |
|---|---|---|---|---|
| OPL-001 | 8 | 255 | 46 | 7 |
| OPL-002 | 4 | 147 | 22 | 9 |
| OPL-003 | 16 | 667 | 0 | 0 |
| Totaal | 28 | 1069 | 68 | 16 |

Signaleringen: 7 maal `LESPAKKET_NIET_COMPLEET` (LPK-049 en LPK-053 t/m LPK-058). Geen fouten.
