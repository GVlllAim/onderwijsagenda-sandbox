/**
 * bron_lezen.test.js — Sandboxtests voor Bron_Lezen.js (T001a).
 * Eisen: bron alleen lezen, in blokken lezen, ID's normaliseren, ontbrekende of
 * dubbele gegevens signaleren (niet stil oplossen), duidelijke fouten bij een
 * ontbrekende instelling, tabblad of kolom.
 * Alle testdata is verzonnen.
 */

var TEST_BRON_ID = 'BRON_BASEDATA_TEST';

function _basedataTabs() {
  return {
    academischjaar: [
      ['academischjaar_id', 'academischjaar_code', 'label', 'is_active', 'startdatum', 'einddatum', ''],
      ['ACJ-006', '2025', '2025-2026', 1, '2025-10-01', '2026-08-31', ''],
      ['ACJ-007', 2026, '2026-2027', 0, '2026-10-01', '2027-08-31', '']
    ],
    opleidingen: [
      ['opleiding_id', 'opleiding_code', 'label'],
      ['OPL-001', 'ICT', 'ICT'],
      ['OPL-003', 'INFRA', 'Infra']
    ],
    leerjaren: [
      ['leerjaar_id', 'academischjaar_id', 'leerjaar_nummer'],
      ['LJ-001', 'ACJ-007', 1]
    ],
    trimesters: [
      ['trimester_id', 'opleiding_id', 'academischjaar_id', 'trimester_code', 'label', 'startdatum', 'einddatum'],
      ['TRI-001', 'OPL-001', 'ACJ-007', 'T01ICT', 'Trimester 1', '2026-10-01', '2026-12-18']
    ],
    lespakketten: [
      ['lespakket_id', 'lespakket_code', 'opleiding_id', 'leerjaar_id', 'vakken_compleet_bevestigd'],
      ['LPK-001', 'PT1', 'OPL-001', 'LJ-001', 1]
    ],
    klassen: [
      ['klas_id', 'klas_code', 'label', 'academischjaar_id', 'lespakket_id'],
      ['KLA-001', 'PT1.07.01', 'PT 1.07.01', 'ACJ-007', 'LPK-001']
    ],
    curriculum: [
      ['curriculum_id', 'lespakket_id', 'onderwijs_eenheid_id', 'trimester_id', 'periode_id', 'verzorgd', 'is_open'],
      ['CUR-001', 'LPK-001', 'OE-001', 'TRI-001', 'PER-001', 'JA', 'TRUE']
    ],
    onderwijs_eenheid: [
      ['onderwijs_eenheid_id', 'onderwijs_eenheid_type_id', 'code', 'label'],
      ['OE-001', 'OET-006', 'WISK', 'Wiskunde']
    ],
    onderwijs_eenheid_type: [
      ['onderwijs_eenheid_type_id', 'label'],
      ['OET-006', 'Vak']
    ],
    trimester_perioden: [
      ['mapping_id', 'trimester_id', 'leerjaar_id', 'periode_id'],
      ['MAP-001', 'TRI-001', 'LJ-001', 'PER-001']
    ]
  };
}

/** Zet de testbron klaar (alleen-lezen, zoals een echte bron) en de instelling die ernaar wijst. */
function _zetBasedata(aanpassing, tijdzone) {
  var tabs = _basedataTabs();
  if (aanpassing) aanpassing(tabs);
  __maakSpreadsheet(TEST_BRON_ID, tabs, { alleenLezen: true, tijdzone: tijdzone });
  __zetProperties({ BRON_BASEDATA_ID: TEST_BRON_ID });
}

function _signaleringenVanType(uit, type) {
  return uit.signaleringen.filter(function (s) { return s.type === type; });
}

// ── Hulpfuncties ───────────────────────────────────────────────────────────────

test('normaliseerId: spaties weg en hoofdletters; leeg en null blijven leeg', function () {
  assert.strictEqual(bron_normaliseerId_(' opl-001 '), 'OPL-001');
  assert.strictEqual(bron_normaliseerId_('OPL-001'), 'OPL-001');
  assert.strictEqual(bron_normaliseerId_(''), '');
  assert.strictEqual(bron_normaliseerId_(null), '');
  assert.strictEqual(bron_normaliseerId_(undefined), '');
  assert.strictEqual(bron_normaliseerId_(12), '12');
});

test('een signalering heeft het vaste formaat (type, ernst, sleutel, bronregel, tekst)', function () {
  var s = bron_maakSignalering_('TYPE', SIGNALERING_ERNST.FOUT, 'S1', 'bron/tab rij 3', 'tekst');
  assert.deepStrictEqual(Object.keys(s).sort(), ['bronregel', 'ernst', 'sleutel', 'tekst', 'type']);
});

// ── Lezen en normaliseren ──────────────────────────────────────────────────────

test('leest een tabblad met kolomnamen, negeert lege kopcellen en onderdrukt de extra kolom', function () {
  _zetBasedata();
  var uit = bron_leesBasedata_();
  var jaren = uit.tabs.academischjaar;
  assert.strictEqual(jaren.length, 2);
  assert.strictEqual(jaren[0].academischjaar_id, 'ACJ-006');
  assert.strictEqual(jaren[1]._bronRij, 3, 'rijnummer in de sheet blijft bewaard');
  assert.ok(!('' in jaren[0]), 'de lege kopcel is geen kolom');
});

test('alleen kolommen uit het contract komen in de rijen (is_open wordt genegeerd)', function () {
  _zetBasedata();
  var rij = bron_leesBasedata_().tabs.curriculum[0];
  assert.strictEqual(rij.verzorgd, 'JA');
  assert.ok(!('is_open' in rij), 'is_open komt niet in de rij');
});

test('overige waarden behouden hun type (getal blijft getal), tekst wordt getrimd', function () {
  _zetBasedata(function (t) { t.klassen[1][2] = '  PT 1.07.01  '; });
  var uit = bron_leesBasedata_();
  assert.strictEqual(uit.tabs.academischjaar[0].is_active, 1);
  assert.strictEqual(uit.tabs.leerjaren[0].leerjaar_nummer, 1);
  assert.strictEqual(uit.tabs.klassen[0].label, 'PT 1.07.01');
  assert.strictEqual(_signaleringenVanType(uit, 'ID_GENORMALISEERD').length, 0, 'trimmen van een label geeft geen signalering');
});

test('codekolommen worden tekst: een getal als jaarcode (2026) wordt "2026", zonder signalering', function () {
  _zetBasedata();
  var uit = bron_leesBasedata_();
  assert.strictEqual(uit.tabs.academischjaar[0].academischjaar_code, '2025');
  assert.strictEqual(uit.tabs.academischjaar[1].academischjaar_code, '2026', 'getal wordt tekst');
  assert.strictEqual(_signaleringenVanType(uit, 'ID_GENORMALISEERD').length, 0);
});

test('codekolommen worden genormaliseerd (spaties, hoofdletters) en gesignaleerd', function () {
  _zetBasedata(function (t) { t.klassen[1][1] = ' pt1.07.01 '; t.onderwijs_eenheid[1][2] = 'wisk'; });
  var uit = bron_leesBasedata_();
  assert.strictEqual(uit.tabs.klassen[0].klas_code, 'PT1.07.01');
  assert.strictEqual(uit.tabs.onderwijs_eenheid[0].code, 'WISK');
  var sigs = _signaleringenVanType(uit, 'ID_GENORMALISEERD');
  assert.strictEqual(sigs.length, 2);
});

test('ID-kolommen worden genormaliseerd en een afwijkende notatie wordt gesignaleerd', function () {
  _zetBasedata(function (t) {
    t.klassen.push([' kla-002 ', 'PT1.07.02', 'PT 1.07.02', 'acj-007', 'lpk-001 ']);
  });
  var uit = bron_leesBasedata_();
  var nieuw = uit.tabs.klassen[1];
  assert.strictEqual(nieuw.klas_id, 'KLA-002');
  assert.strictEqual(nieuw.academischjaar_id, 'ACJ-007');
  assert.strictEqual(nieuw.lespakket_id, 'LPK-001');
  var sigs = _signaleringenVanType(uit, 'ID_GENORMALISEERD');
  assert.strictEqual(sigs.length, 3, 'drie afwijkende ID-cellen');
  assert.strictEqual(sigs[0].ernst, SIGNALERING_ERNST.INFO);
  assert.strictEqual(sigs[0].bronregel, 'gs_basedata/klassen rij 3');
});

test('lege rijen worden overgeslagen en het rijnummer van de volgende rij klopt', function () {
  _zetBasedata(function (t) {
    t.klassen.push(['', '', '', '', '']);
    t.klassen.push(['KLA-003', 'PT1.07.03', 'PT 1.07.03', 'ACJ-007', 'LPK-001']);
  });
  var klassen = bron_leesBasedata_().tabs.klassen;
  assert.strictEqual(klassen.length, 2);
  assert.strictEqual(klassen[1].klas_id, 'KLA-003');
  assert.strictEqual(klassen[1]._bronRij, 4);
});

// ── Ontbrekende of dubbele gegevens: zichtbaar, niet stil opgelost ─────────────

test('een dubbele sleutel wordt gesignaleerd en beide rijen blijven bestaan', function () {
  _zetBasedata(function (t) {
    t.klassen.push(['kla-001', 'PT1.07.99', 'PT 1.07.99', 'ACJ-007', 'LPK-001']);
  });
  var uit = bron_leesBasedata_();
  assert.strictEqual(uit.tabs.klassen.length, 2, 'er wordt niets stil weggelaten');
  var dubbel = _signaleringenVanType(uit, 'DUBBELE_SLEUTEL');
  assert.strictEqual(dubbel.length, 1);
  assert.strictEqual(dubbel[0].ernst, SIGNALERING_ERNST.FOUT);
  assert.strictEqual(dubbel[0].sleutel, 'KLA-001');
  assert.ok(/eerder op rij 2/.test(dubbel[0].tekst));
});

test('een rij met inhoud maar zonder sleutel wordt gesignaleerd', function () {
  _zetBasedata(function (t) {
    t.klassen.push(['', 'PT1.07.50', 'PT 1.07.50', 'ACJ-007', 'LPK-001']);
  });
  var uit = bron_leesBasedata_();
  var sigs = _signaleringenVanType(uit, 'LEGE_SLEUTEL');
  assert.strictEqual(sigs.length, 1);
  assert.strictEqual(sigs[0].ernst, SIGNALERING_ERNST.FOUT);
  assert.strictEqual(uit.tabs.klassen.length, 2, 'rij blijft staan');
});

test('een afwijkende tijdzone geeft een waarschuwing', function () {
  _zetBasedata(null, 'Europe/Amsterdam');
  var sigs = _signaleringenVanType(bron_leesBasedata_(), 'TIJDZONE_AFWIJKEND');
  assert.strictEqual(sigs.length, 1);
  assert.strictEqual(sigs[0].ernst, SIGNALERING_ERNST.WAARSCHUWING);
});

test('de verwachte tijdzone America/Paramaribo geeft geen waarschuwing', function () {
  _zetBasedata();
  assert.strictEqual(_signaleringenVanType(bron_leesBasedata_(), 'TIJDZONE_AFWIJKEND').length, 0);
});

// ── Structuurfouten: duidelijk stoppen ─────────────────────────────────────────

test('een ontbrekend tabblad stopt met een fout die het tabblad noemt', function () {
  _zetBasedata(function (t) { delete t.klassen; });
  assert.throws(function () { bron_leesBasedata_(); }, /Tabblad "klassen" ontbreekt in bron gs_basedata/);
});

test('een ontbrekende verplichte kolom stopt met een fout die de kolom noemt', function () {
  _zetBasedata(function (t) { t.curriculum[0][5] = 'verzorgd_oud'; });
  assert.throws(function () { bron_leesBasedata_(); }, /tabblad "curriculum" mist verplichte kolom\(men\): verzorgd/);
});

test('een dubbele kolomnaam stopt met een fout', function () {
  _zetBasedata(function (t) { t.klassen[0][2] = 'klas_code'; });
  assert.throws(function () { bron_leesBasedata_(); }, /Kolomnaam "klas_code" komt dubbel voor/);
});

// ── Instelling en toegang ──────────────────────────────────────────────────────

test('zonder instelling BRON_BASEDATA_ID stopt de code zonder iets te openen', function () {
  assert.throws(function () { bron_leesBasedata_(); }, /Instelling "BRON_BASEDATA_ID" ontbreekt/);
});

test('een ID dat niet bestaat geeft een duidelijke fout over BRON_BASEDATA_ID (geen terugval)', function () {
  __zetProperties({ BRON_BASEDATA_ID: 'BESTAAT-NIET' });
  assert.throws(function () { bron_leesBasedata_(); }, /kon niet worden geopend \(controleer instelling BRON_BASEDATA_ID/);
});

// ── Bronbescherming en lezen in blokken ────────────────────────────────────────

test('lezen schrijft nooit naar de bron: nul schrijfpogingen en de bron is ongewijzigd', function () {
  _zetBasedata();
  var voor = JSON.stringify(Object.keys(_basedataTabs()).map(function (t) { return __leesTabblad(TEST_BRON_ID, t); }));
  bron_leesBasedata_();
  controleerBronBasedata();
  var na = JSON.stringify(Object.keys(_basedataTabs()).map(function (t) { return __leesTabblad(TEST_BRON_ID, t); }));
  assert.strictEqual(__schrijfpogingenNaarBron(), 0);
  assert.strictEqual(na, voor);
});

test('elk tabblad wordt in één blok gelezen (getDataRange), nooit cel voor cel (getRange)', function () {
  _zetBasedata();
  var origineel = SpreadsheetApp.openById;
  var teller = { getDataRange: 0, getRange: 0 };
  SpreadsheetApp.openById = function (id) {
    var ss = origineel(id);
    var origSheet = ss.getSheetByName;
    ss.getSheetByName = function (naam) {
      var sheet = origSheet(naam);
      if (!sheet) return sheet;
      var dr = sheet.getDataRange, gr = sheet.getRange;
      sheet.getDataRange = function () { teller.getDataRange++; return dr.apply(sheet, arguments); };
      sheet.getRange = function () { teller.getRange++; return gr.apply(sheet, arguments); };
      return sheet;
    };
    return ss;
  };
  try { bron_leesBasedata_(); } finally { SpreadsheetApp.openById = origineel; }
  assert.strictEqual(teller.getDataRange, Object.keys(BRON_BASEDATA_CONTRACT).length);
  assert.strictEqual(teller.getRange, 0);
});

test('leesBasedata geeft alle tabbladen uit het contract met de juiste tellingen', function () {
  _zetBasedata();
  var uit = bron_leesBasedata_();
  assert.deepStrictEqual(Object.keys(uit.tabs).sort(), Object.keys(BRON_BASEDATA_CONTRACT).sort());
  assert.strictEqual(uit.telling.klassen, 1);
  assert.strictEqual(uit.telling.curriculum, 1);
  assert.strictEqual(uit.signaleringen.length, 0, 'schone testdata geeft geen signaleringen');
});

test('controleerBronBasedata toont tellingen en signaleringen in het log', function () {
  _zetBasedata(function (t) { t.klassen.push(['kla-001', 'X', 'X', 'ACJ-007', 'LPK-001']); });
  controleerBronBasedata();
  var log = __state.log.join('\n');
  assert.ok(/klassen: 2/.test(log));
  assert.ok(/fout \/ DUBBELE_SLEUTEL: 1/.test(log));
});
