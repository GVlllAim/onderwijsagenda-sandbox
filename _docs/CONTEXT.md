# CONTEXT: Onderwijsagenda-app

*Logboek van de actuele stand. Bijwerken aan het einde van **elke** sessie. Claude levert het volledige bestand; jij zet het in de repo en vervangt het in de projectbestanden.*

**Laatst bijgewerkt:** 18-10-2026
**Huidige fase:** Fase 1: datamodel, bronmapping en beveiligingsbasis (volgens de projectbeschrijving)
**Huidige taak:** T001: US-01 verwachte onderwijsagenda's genereren. T001a (leeslaag) en T001b (afleiden, dry-run) zijn klaar. Het plan voor T001c (vaste ID's en schrijven naar de registratie) volgt.

---

## Sandbox-gegevens

| Onderdeel | Waarde |
|---|---|
| Apps Script-project (naam) | OA Sandbox |
| Script ID | 1SOdd0M54V6IAdb2L6X4Lg8z8ou-EQOU-Ybuld9PUHJ_ffX_Av-sOR-5a |
| Webapp-URL (actieve deployment) | (nog geen deployment) |
| Registratie-spreadsheet ID | 1rsCchjPw5BfLx0yiuZbxyUxlzNP1GhojSKFGIA3aEJ8 (OA_Registratie_sandbox; tabblad `verplichtingen`, 13 kolommen, nog leeg) |
| Bron: kopie gs_basedata ID | 1woSy-b58QV066vDA-6NYCa-RW5tNpIJvBgVPBb9QUbY (gs_basedata v2, Google Sheet) |
| Bron: kopie gs_docentenbeheer ID | (nog niet nodig; vanaf T001d) |
| Bron: roostergegevens ID | niet van toepassing (besluit B04) |
| Drive-map inzendingen ID | (nog niet aangemaakt) |
| Drive-map "directie" **(TEST)** ID | (nog niet aangemaakt) |
| Lokale map | C:\Users\molij\GAS_Project\OA_Module_Sandbox |
| GitHub-repository | <VUL IN: GitHub-adres van de privé-repo> |
| Tijdzone van alle spreadsheets gecontroleerd (`America/Paramaribo`) | gs_basedata-kopie: ja (controleerBronBasedata, 0 signaleringen). Registratie-spreadsheet: door de coder ingesteld, nog niet met een controle bevestigd. |

Instellingen in Script Properties (alleen de namen, nooit de waarden hier noteren): `BRON_BASEDATA_ID`, `REGISTRATIE_ID`, `GENEREER_ACADEMISCHJAAR_ID` (ACJ-007), `GENEREER_OPLEIDING_ID` (ALLE). Later: `BRON_DOCENTENBEHEER_ID`.

Inrichting afgerond (zie STARTGIDS §2):
- [ ] Google-omgeving (bronkopie en registratie-spreadsheet staan; de mappen inzendingen en directie TEST nog niet)
- [x] Lokale map, git en GitHub, eerste commit
- [x] `clasp status` toont geen `_tests/` of `_docs/`
- [x] Testharnas groen (67 geslaagd, 0 mislukt)
- [ ] Claude-project met instructies en bestanden

---

## Bekende context over de bronnen (te verifiëren in fase 1)

Feiten die de PO meegeeft. Het zijn **geen ontwerpkeuzes**: de analyse en het ontwerp doe je zelf, en elke conclusie leg je voor aan de PO.

- Skooro Insights is de enige applicatie die naar basedata en docentenbeheer schrijft. Deze app leest alleen.
- Het rooster is **geen bron** voor deze app (besluit B04). Docentkoppelingen komen later in T001d, naar verwachting uit de lesurenstaten van Skooro (besluit B06). Dat is een optioneel HR-gegeven en niet altijd volledig.
- Codes en ID's in de bronnen komen in hoofdletters en kleine letters door elkaar voor. Normaliseer vóór je vergelijkt (gebeurt centraal in `Bron_Lezen.js`).
- Skooro beheert nu 3 opleidingen (ICT, AV, Infra), maar NATIN heeft er ongeveer 17. Ontwerp zo dat meer opleidingen geen probleem zijn.
- In basedata heet de vak-per-lespakket-tabel `curriculum`. Academische jaren hebben een vlag `is_active`; die staat nog op 2025-2026 en wordt niet gebruikt om het jaar te kiezen (besluit B05).
- Klas-ID's in basedata hebben de vorm `KLA-<jaar>-<klascode>`, bijvoorbeeld `KLA-ACJ-007-PT1.06.01`.
- Gecontroleerde feiten over de bron (aantallen, relaties, notatie): zie `_docs/DATAMODEL.md`.

---

## Besluitenlog

*Elk besluit van de PO, met datum. Claude verwijst hiernaar in plannen.*

| # | Datum | Besluit | Toelichting |
|---|---|---|---|
| B01 | 14-10-2026 | De app is zelfstandig; bronnen zijn alleen-lezen | Projectbeschrijving §1, §6.1 |
| B02 | 14-10-2026 | Eén sandbox-omgeving; geen scheiding tussen test en productie. De directiemap is altijd een testmap | PO |
| B03 | 14-10-2026 | Code naar Apps Script via clasp; versiebeheer in een privé GitHub-repo | PO |
| B04 | 14-10-2026 | Geen roosterdata; het rooster is geen bron | A3 vervalt; PB-1 optie B en C vallen weg |
| B05 | 14-10-2026 | Alle opleidingen hebben de verplichting tot een onderwijsagenda. Test op ACJ-007 (2026-2027), alle opleidingen; `is_active` niet gebruiken om het jaar te kiezen | C3 |
| B06 | 14-10-2026 | PB-1: optie D, eerst verplichtingen zonder docent; docent in T001d (richting: lesurenstaten) | Curriculum bepaalt welke agenda's er zijn |
| B07 | 14-10-2026 | PB-2: alleen type OET-006 (Vak) en `verzorgd` = ja; leeg = niet verzorgd; per lespakket melden | `JA`/`1`/`TRUE` = ja |
| B08 | 14-10-2026 | PB-3: optie A, meldingen in het resultaat van de run, vast formaat; tegenstrijdig = niet aanmaken | |
| B09 | 14-10-2026 | PB-6: `trimester_id` wint van `periode_id` (met melding); conflict in jaar van de klas = melden en niet aanmaken | |
| B10 | 14-10-2026 | PB-4: ID `VPL-0001` via centrale functie; geen dubbele verplichtingen via de natuurlijke sleutel | |
| B11 | 14-10-2026 | PB-5: optie A, minimaal tabblad zonder docent; docent later in een koppeltabel waarin alleen regels worden toegevoegd | Tabblad handmatig aanmaken (gedaan met een kant-en-klaar kopbestand) |
| B12 | 14-10-2026 | PB-7: optie A, verplichting behouden, melding "bron vervallen", status ongewijzigd | Status "Vervallen" later |
| B13 | 14-10-2026 | PB-8: optie B, selectie in Script Properties, geen standaardwaarde; opleiding = ID of `ALLE`, leeg geeft een fout | |
| B14 | 14-10-2026 | PB-9: optie A, alleen scripteigenaar via de editor, geen webingang tot US-17 | Op parkeerlijst |
| B15 | 14-10-2026 | C1: `curriculum.is_open` negeren | Kolom wordt niet gebruikt |
| B16 | 14-10-2026 | Bronkopieën: Google Sheet in Drive voor de app, .xlsx in het Claude-project (docentenbeheer zonder onnodige persoonsgegevens), lokaal alleen in `exports/` | Deel 5A van de besluiten |
| B17 | 18-10-2026 | PB-10: `ALLE` = alle opleidingen in het tabblad `opleidingen`; een opleiding zonder klassen in het jaar geeft een waarschuwing | Genomen door de coder met gedelegeerd mandaat van de PO; PO nog informeren |
| B18 | 18-10-2026 | PB-11: bewust uitgesloten regels (geen Vak, `verzorgd` = nee) alleen tellen in de samenvatting; lege `verzorgd` = waarschuwing per lespakket; onbekende waarde = waarschuwing | idem |
| B19 | 18-10-2026 | PB-12: sleutel = jaar\|trimester\|opleiding\|vak\|klas, gescheiden door `\|` | idem; geldt ook voor T001c |

---

## Openstaande PO-besluiten

*Vragen die gemarkeerd zijn als [PO-BESLUIT NODIG] en nog wachten op de PO. Zie ook §11 van de projectbeschrijving.*

- Controle bij de PO: B07 zegt dat Skooro een lege `verzorgd` als NEE leest. In `Server_Data_Basedata.js` (`saveBasedataEntity`, T198) wordt leeg bij opslaan juist JA. Geen blokkade voor ACJ-007 (daar zijn geen lege waarden), wel goed om de toelichting bij B07 te corrigeren.
- B17 t/m B19 zijn met gedelegeerd mandaat genomen en moeten nog aan de PO worden gemeld (volgend overleg).
- Zeven lespakketten in ACJ-007 zijn niet als compleet bevestigd (LPK-049 en LPK-053 t/m LPK-058). De PO kan dat in Skooro aanvullen.

---

## Taken

| Taak | Omschrijving | Status | Commit |
|---|---|---|---|
| T000 | Werkomgeving ingericht | bijna klaar (git, GitHub en harnas klaar; mappen inzendingen en directie TEST nog niet aangemaakt) | |
| T001a | Config.js, Bron_Lezen.js, DATAMODEL.md (leeslaag gs_basedata) | klaar (Apps Script-controle: 0 signaleringen) | |
| T001b | Verwachte agenda's afleiden en signaleren, zonder schrijven (`Verplichtingen_Afleiden.js`) | klaar (67 tests groen; dry-run in Apps Script: 1069 verplichtingen, 7 waarschuwingen) | |
| T001c | Vaste ID's, idempotent schrijven naar de registratie | te doen (plan volgt) | |
| T001d | Docentkoppeling | te doen | |

Status: `te doen` / `bezig` / `wacht op PO` / `klaar`

*De commit-hashes vul je in met `git log --oneline`.*

---

## Wat al werkt

- `Config.js`: instellingen uit Script Properties, geen terugval op standaardwaarden; selectie van jaar en opleiding (ID of `ALLE`); constanten voor het Vak-type en het scheidingsteken van de sleutel.
- `Bron_Lezen.js`: leest 10 tabbladen van gs_basedata in blokken, normaliseert ID's en codes, signaleert dubbele of lege sleutels en een afwijkende tijdzone. Schrijft nooit naar een bron.
- `Verplichtingen_Afleiden.js`: leidt de verwachte agenda's af (jaar + trimester + opleiding + vak + klas), meldt tegenstrijdige en ontbrekende gegevens, schrijft niets.
- Wrappers in de editor: `controleerInstellingen`, `controleerBronBasedata` en `genereerVerplichtingen_dryRun`.
- Registratie-spreadsheet met het tabblad `verplichtingen` (13 kolommen volgens B11), nog niet beschreven.
- 67 sandboxtests groen.

---

## Parkeerlijst

*Ideeën en bijvangsten die tijdens een taak opkwamen. Niet meteen oppakken.*

- Rechtencontrole bij genereren (gekoppeld aan US-17), zie B14.
- Status "Vervallen" in de overgangsmatrix (bij PB-7 / B12).
- Docentenbeheer-kopie in het Claude-project zonder onnodige persoonsgegevens (B16), vóór T001d.
- De registratie-spreadsheet staat in dezelfde Drive-map als de bronkopie. Overweeg hem naar de eigen map `Onderwijsagenda - Sandbox` te verplaatsen, zodat bronnen en eigen registratie gescheiden blijven (het ID verandert daarbij niet).

---

## Notities voor de volgende sessie

- Eerdere bewering "ACJ-007 heeft maar 2 klassen" was fout (tekstexport). Juist: 28 klassen (OPL-001: 8, OPL-002: 4, OPL-003: 16).
- Controlegetallen voor ACJ-007 en `ALLE` (dry-run in Apps Script en in Node gelijk): 1069 verplichtingen (OPL-001: 255, OPL-002: 147, OPL-003: 667), 7 waarschuwingen `LESPAKKET_NIET_COMPLEET`, geen fouten. Uitgesloten: 68 klas-regelcombinaties zonder Vak-type, 16 met `verzorgd` = nee.
- Volgende stap: plan voor T001c opstellen en door de coder laten goedkeuren.
