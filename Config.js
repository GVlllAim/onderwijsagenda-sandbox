/**
 * Config.js — Eén plek voor alle instellingen en vaste lijsten.
 * (KWALITEITSREGELS §2: configuratie centraal, geen hardcoded waarden.)
 *
 * Regels:
 *  - Alle spreadsheet-ID's en instellingen staan in Script Properties
 *    (Apps Script: Projectinstellingen > Scripteigenschappen) en worden
 *    ALLEEN in dit bestand gelezen. Nergens anders in de code staat een ID.
 *  - Geen stille terugval op een standaardwaarde. Ontbreekt een instelling,
 *    dan stopt de code met een duidelijke foutmelding.
 *  - Vaste lijsten (constanten) staan op één plek: hier.
 *  - Bovenaan dit bestand staan alleen losse waarden. Verwijs hier nooit naar
 *    andere bestanden: Apps Script laadt bestanden in een willekeurige volgorde.
 *
 * Wrapper voor jou (zonder parameters, te starten in de editor):
 *   controleerInstellingen()
 */

// ── Namen van de instellingen (Script Properties) ──────────────────────────────
var CONFIG_SLEUTELS = {
  BRON_BASEDATA_ID: 'BRON_BASEDATA_ID',                       // Google Sheet-kopie van gs_basedata
  BRON_DOCENTENBEHEER_ID: 'BRON_DOCENTENBEHEER_ID',           // Google Sheet-kopie van gs_docentenbeheer (pas nodig in T001d)
  REGISTRATIE_ID: 'REGISTRATIE_ID',                           // eigen registratie-spreadsheet (pas nodig in T001c)
  GENEREER_ACADEMISCHJAAR_ID: 'GENEREER_ACADEMISCHJAAR_ID',   // bijv. ACJ-007 (PB-8)
  GENEREER_OPLEIDING_ID: 'GENEREER_OPLEIDING_ID'              // een opleiding-ID of ALLE (PB-8)
};

// Welke instellingen zijn nu al verplicht, en welke komen in een latere deeltaak.
var CONFIG_NU_VERPLICHT = ['BRON_BASEDATA_ID', 'GENEREER_ACADEMISCHJAAR_ID', 'GENEREER_OPLEIDING_ID'];
var CONFIG_LATER_VERPLICHT = ['BRON_DOCENTENBEHEER_ID', 'REGISTRATIE_ID'];

// ── Vaste waarden ──────────────────────────────────────────────────────────────
var CONFIG_ALLE_OPLEIDINGEN = 'ALLE';                  // PB-8: ALLE = alle opleidingen; leeg is NIET hetzelfde als ALLE
var CONFIG_VERWACHTE_TIJDZONE = 'America/Paramaribo';  // KWALITEITSREGELS §8

// Ernst van een signalering (PB-3: vast formaat type, ernst, sleutel, bronregel, tekst).
var SIGNALERING_ERNST = { FOUT: 'fout', WAARSCHUWING: 'waarschuwing', INFO: 'info' };

// ── Lezen van een instelling ───────────────────────────────────────────────────

/**
 * Geeft de waarde van een instelling, zonder spaties aan begin en eind.
 * Gooit een fout als de sleutel onbekend is of de instelling ontbreekt of leeg is.
 * Er is bewust GEEN standaardwaarde.
 */
function config_get_(sleutel) {
  if (!Object.prototype.hasOwnProperty.call(CONFIG_SLEUTELS, sleutel)) {
    throw new Error('Onbekende instelling "' + sleutel + '". Bekende instellingen: ' +
      Object.keys(CONFIG_SLEUTELS).join(', ') + '.');
  }
  var waarde = PropertiesService.getScriptProperties().getProperty(sleutel);
  waarde = (waarde === null || waarde === undefined) ? '' : String(waarde).trim();
  if (waarde === '') {
    throw new Error('Instelling "' + sleutel + '" ontbreekt of is leeg. ' +
      'Zet hem in Apps Script bij Projectinstellingen > Scripteigenschappen.');
  }
  return waarde;
}

function config_bronBasedataId_() { return config_get_(CONFIG_SLEUTELS.BRON_BASEDATA_ID); }
function config_bronDocentenbeheerId_() { return config_get_(CONFIG_SLEUTELS.BRON_DOCENTENBEHEER_ID); }
function config_registratieId_() { return config_get_(CONFIG_SLEUTELS.REGISTRATIE_ID); }

/**
 * Leest de selectie voor een genereer-run (PB-8).
 * Geeft { academischjaarId, alleOpleidingen, opleidingId }.
 *  - Het academisch jaar komt uit de instelling, nooit uit is_active.
 *  - Opleiding is een opleiding-ID of het woord ALLE. Leeg geeft een fout.
 */
function config_genereerSelectie_() {
  var jaar = bron_normaliseerId_(config_get_(CONFIG_SLEUTELS.GENEREER_ACADEMISCHJAAR_ID));
  var opleiding = bron_normaliseerId_(config_get_(CONFIG_SLEUTELS.GENEREER_OPLEIDING_ID));
  var alle = (opleiding === CONFIG_ALLE_OPLEIDINGEN);
  return { academischjaarId: jaar, alleOpleidingen: alle, opleidingId: alle ? null : opleiding };
}

// ── Wrapper voor jou (zonder parameters) ───────────────────────────────────────

/**
 * Toont in het uitvoerlogboek welke instellingen aanwezig zijn.
 * Schrijft niets en toont nooit de waarden zelf.
 */
function controleerInstellingen() {
  var props = PropertiesService.getScriptProperties();
  function status(sleutel) {
    var w = props.getProperty(sleutel);
    return (w !== null && w !== undefined && String(w).trim() !== '') ? 'ingesteld' : 'ONTBREEKT';
  }
  CONFIG_NU_VERPLICHT.forEach(function (s) { Logger.log(s + ': ' + status(s) + ' (nu nodig)'); });
  CONFIG_LATER_VERPLICHT.forEach(function (s) { Logger.log(s + ': ' + status(s) + ' (pas nodig in een latere deeltaak)'); });
  var ontbrekend = CONFIG_NU_VERPLICHT.filter(function (s) { return status(s) === 'ONTBREEKT'; });
  Logger.log(ontbrekend.length === 0
    ? 'Alle nu benodigde instellingen zijn aanwezig.'
    : 'Ontbrekend (nu nodig): ' + ontbrekend.join(', '));
}
