/**
 * Bron_Lezen.js — De ENIGE leeslaag voor de bronspreadsheets.
 * (KWALITEITSREGELS §1: bronnen zijn alleen-lezen; §4: lezen in blokken.)
 *
 * Regels:
 *  - Alleen dit bestand opent een bronspreadsheet. Andere bestanden vragen hier om gegevens.
 *  - Dit bestand schrijft NOOIT naar een bron: alleen openById, getSheetByName,
 *    getDataRange en getValues worden gebruikt.
 *  - Elk tabblad wordt in één keer gelezen (getDataRange().getValues()), niet cel voor cel.
 *  - Alleen kolommen uit BRON_BASEDATA_CONTRACT komen in de rijen. Andere kolommen worden genegeerd.
 *  - ID- en codekolommen (kolomnaam eindigt op _id of _code, of heet 'code') worden als tekst
 *    genormaliseerd (trim + hoofdletters) voordat er ooit vergeleken wordt. Een afwijkende
 *    notatie (spaties, kleine letters) wordt gesignaleerd. Een getal wordt tekst, zonder signalering.
 *  - Ontbreekt er een tabblad of een verplichte kolom, dan stopt de code met een duidelijke fout.
 *  - Gegevens die dubbel of onvolledig zijn, worden gesignaleerd en NIET stil opgelost
 *    of weggelaten (PB-3).
 *  - Een signalering heeft altijd dit formaat: { type, ernst, sleutel, bronregel, tekst }.
 *
 * Wrapper voor jou (zonder parameters, te starten in de editor):
 *   controleerBronBasedata()
 */

var BRON_NAAM_BASEDATA = 'gs_basedata';

/**
 * Welke tabbladen en kolommen deze app uit gs_basedata nodig heeft voor US-01.
 * 'sleutel' is de kolom die per rij uniek moet zijn. Vastgesteld aan de hand van
 * de echte PO-kopie (zie _docs/DATAMODEL.md). Kolommen die we niet gebruiken
 * (bijvoorbeeld curriculum.is_open) staan hier bewust niet in.
 */
var BRON_BASEDATA_CONTRACT = {
  academischjaar: { sleutel: 'academischjaar_id', kolommen: ['academischjaar_id', 'academischjaar_code', 'label', 'is_active', 'startdatum', 'einddatum'] },
  opleidingen: { sleutel: 'opleiding_id', kolommen: ['opleiding_id', 'opleiding_code', 'label'] },
  leerjaren: { sleutel: 'leerjaar_id', kolommen: ['leerjaar_id', 'academischjaar_id', 'leerjaar_nummer'] },
  trimesters: { sleutel: 'trimester_id', kolommen: ['trimester_id', 'opleiding_id', 'academischjaar_id', 'trimester_code', 'label', 'startdatum', 'einddatum'] },
  lespakketten: { sleutel: 'lespakket_id', kolommen: ['lespakket_id', 'lespakket_code', 'opleiding_id', 'leerjaar_id', 'vakken_compleet_bevestigd'] },
  klassen: { sleutel: 'klas_id', kolommen: ['klas_id', 'klas_code', 'label', 'academischjaar_id', 'lespakket_id'] },
  curriculum: { sleutel: 'curriculum_id', kolommen: ['curriculum_id', 'lespakket_id', 'onderwijs_eenheid_id', 'trimester_id', 'periode_id', 'verzorgd'] },
  onderwijs_eenheid: { sleutel: 'onderwijs_eenheid_id', kolommen: ['onderwijs_eenheid_id', 'onderwijs_eenheid_type_id', 'code', 'label'] },
  onderwijs_eenheid_type: { sleutel: 'onderwijs_eenheid_type_id', kolommen: ['onderwijs_eenheid_type_id', 'label'] },
  trimester_perioden: { sleutel: 'mapping_id', kolommen: ['mapping_id', 'trimester_id', 'leerjaar_id', 'periode_id'] }
};

// ── Hulpfuncties ───────────────────────────────────────────────────────────────

/** Eén vaste manier om een ID of code te normaliseren: trim + hoofdletters. Leeg blijft leeg. */
function bron_normaliseerId_(waarde) {
  if (waarde === null || waarde === undefined) return '';
  return String(waarde).trim().toUpperCase();
}

/** Maakt een signalering in het vaste formaat (PB-3). */
function bron_maakSignalering_(type, ernst, sleutel, bronregel, tekst) {
  return { type: type, ernst: ernst, sleutel: sleutel, bronregel: bronregel, tekst: tekst };
}

/** ID- en codekolommen (naam eindigt op _id of _code, of heet precies 'code') worden genormaliseerd. */
function bron_isIdOfCodeKolom_(kolomNaam) {
  return /(_id|_code)$/.test(kolomNaam) || kolomNaam === 'code';
}

function bron_bronregel_(bronNaam, tabNaam, rijNummer) {
  return bronNaam + '/' + tabNaam + ' rij ' + rijNummer;
}

function bron_heeft_(obj, sleutel) {
  return Object.prototype.hasOwnProperty.call(obj, sleutel);
}

// ── Eén tabblad lezen ──────────────────────────────────────────────────────────

/**
 * Leest één tabblad in één keer. Geeft:
 *   { rijen: [ { <kolom>: waarde, ..., _bronRij: <rijnummer in de sheet> } ],
 *     signaleringen: [...], aantalLegeRijen: n }
 * Rijen die helemaal leeg zijn worden overgeslagen en geteld.
 */
function bron_leesTab_(ss, bronNaam, tabNaam, contract) {
  var sheet = ss.getSheetByName(tabNaam);
  if (!sheet) {
    throw new Error('Tabblad "' + tabNaam + '" ontbreekt in bron ' + bronNaam + '.');
  }
  var waarden = sheet.getDataRange().getValues();
  var kop = waarden[0] || [];

  // Kolomnamen: spaties weg, lege kopcellen (extra lege kolommen rechts) negeren.
  var kolomIndex = {};
  for (var c = 0; c < kop.length; c++) {
    var naam = (kop[c] === null || kop[c] === undefined) ? '' : String(kop[c]).trim();
    if (naam === '') continue;
    if (bron_heeft_(kolomIndex, naam)) {
      throw new Error('Kolomnaam "' + naam + '" komt dubbel voor in ' + bronNaam + '/' + tabNaam + '.');
    }
    kolomIndex[naam] = c;
  }
  var ontbrekend = contract.kolommen.filter(function (k) { return !bron_heeft_(kolomIndex, k); });
  if (ontbrekend.length > 0) {
    throw new Error('Bron ' + bronNaam + ' tabblad "' + tabNaam + '" mist verplichte kolom(men): ' + ontbrekend.join(', ') + '.');
  }

  var rijen = [];
  var signaleringen = [];
  var aantalLeeg = 0;
  var gezien = {};   // genormaliseerde sleutel -> rijnummer van de eerste keer

  for (var r = 1; r < waarden.length; r++) {
    var bronRij = r + 1;
    var regel = waarden[r];
    var rij = { _bronRij: bronRij };
    var heeftInhoud = false;

    for (var k = 0; k < contract.kolommen.length; k++) {
      var kolom = contract.kolommen[k];   // alleen kolommen uit het contract; overige kolommen worden niet gebruikt
      var ruw = regel[kolomIndex[kolom]];
      if (ruw === undefined || ruw === null) ruw = '';
      var waarde = ruw;

      if (bron_isIdOfCodeKolom_(kolom)) {
        var ruweTekst = String(ruw);
        waarde = bron_normaliseerId_(ruw);
        if (ruweTekst !== '' && ruweTekst !== waarde) {
          signaleringen.push(bron_maakSignalering_('ID_GENORMALISEERD', SIGNALERING_ERNST.INFO, waarde,
            bron_bronregel_(bronNaam, tabNaam, bronRij),
            'Kolom ' + kolom + ': "' + ruweTekst + '" is genormaliseerd naar "' + waarde + '".'));
        }
      } else if (typeof ruw === 'string') {
        waarde = ruw.trim();
      }
      if (waarde !== '') heeftInhoud = true;
      rij[kolom] = waarde;
    }

    if (!heeftInhoud) { aantalLeeg++; continue; }

    var sleutelWaarde = rij[contract.sleutel];
    if (sleutelWaarde === '') {
      signaleringen.push(bron_maakSignalering_('LEGE_SLEUTEL', SIGNALERING_ERNST.FOUT, '',
        bron_bronregel_(bronNaam, tabNaam, bronRij),
        'Rij heeft inhoud maar de sleutelkolom ' + contract.sleutel + ' is leeg.'));
    } else if (bron_heeft_(gezien, sleutelWaarde)) {
      signaleringen.push(bron_maakSignalering_('DUBBELE_SLEUTEL', SIGNALERING_ERNST.FOUT, sleutelWaarde,
        bron_bronregel_(bronNaam, tabNaam, bronRij),
        contract.sleutel + ' "' + sleutelWaarde + '" komt dubbel voor (eerder op rij ' + gezien[sleutelWaarde] + ').'));
    } else {
      gezien[sleutelWaarde] = bronRij;
    }
    rijen.push(rij);
  }

  return { rijen: rijen, signaleringen: signaleringen, aantalLegeRijen: aantalLeeg };
}

// ── gs_basedata lezen (centrale laadfunctie voor referentiedata) ───────────────

/**
 * Leest alle tabbladen uit BRON_BASEDATA_CONTRACT. Geeft:
 *   { tabs: { <tabnaam>: [rijen] }, telling: { <tabnaam>: aantal }, signaleringen: [...] }
 * Stopt met een duidelijke fout bij een ontbrekende instelling, tabblad of kolom.
 */
function bron_leesBasedata_() {
  var id = config_bronBasedataId_();
  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('Bron ' + BRON_NAAM_BASEDATA + ' kon niet worden geopend (controleer instelling BRON_BASEDATA_ID ' +
      'en of het een Google Sheet is, geen .xlsx): ' + e.message);
  }

  var signaleringen = [];
  var tijdzone = ss.getSpreadsheetTimeZone();
  if (tijdzone !== CONFIG_VERWACHTE_TIJDZONE) {
    signaleringen.push(bron_maakSignalering_('TIJDZONE_AFWIJKEND', SIGNALERING_ERNST.WAARSCHUWING, BRON_NAAM_BASEDATA,
      BRON_NAAM_BASEDATA, 'Tijdzone van de spreadsheet is "' + tijdzone + '", verwacht "' + CONFIG_VERWACHTE_TIJDZONE + '".'));
  }

  var tabs = {};
  var telling = {};
  Object.keys(BRON_BASEDATA_CONTRACT).forEach(function (tabNaam) {
    var uit = bron_leesTab_(ss, BRON_NAAM_BASEDATA, tabNaam, BRON_BASEDATA_CONTRACT[tabNaam]);
    tabs[tabNaam] = uit.rijen;
    telling[tabNaam] = uit.rijen.length;
    uit.signaleringen.forEach(function (s) { signaleringen.push(s); });
  });
  return { tabs: tabs, telling: telling, signaleringen: signaleringen };
}

// ── Wrapper voor jou (zonder parameters) ───────────────────────────────────────

/**
 * Leest gs_basedata en toont in het uitvoerlogboek per tabblad hoeveel rijen
 * er zijn en welke signaleringen er zijn. Schrijft niets.
 */
function controleerBronBasedata() {
  var uit = bron_leesBasedata_();
  Logger.log('gs_basedata gelezen. Rijen per tabblad:');
  Object.keys(uit.telling).forEach(function (t) { Logger.log('  ' + t + ': ' + uit.telling[t]); });

  var perType = {};
  uit.signaleringen.forEach(function (s) {
    var k = s.ernst + ' / ' + s.type;
    perType[k] = (perType[k] || 0) + 1;
  });
  Logger.log('Signaleringen: ' + uit.signaleringen.length);
  Object.keys(perType).forEach(function (k) { Logger.log('  ' + k + ': ' + perType[k]); });
  uit.signaleringen.slice(0, 25).forEach(function (s) {
    Logger.log('  [' + s.ernst + '] ' + s.type + ' | ' + s.bronregel + ' | ' + s.tekst);
  });
  if (uit.signaleringen.length > 25) Logger.log('  ... en ' + (uit.signaleringen.length - 25) + ' meer.');
}
