/**
 * verplichtingen_afleiden.test.js — Sandboxtests voor Verplichtingen_Afleiden.js (T001b).
 * Eisen: identiteit = jaar + trimester + opleiding + vak + klas; alleen Vak en verzorgd = ja;
 * tegenstrijdig = niet aanmaken en melden; niet-kritiek = waarschuwing; dezelfde invoer geeft
 * dezelfde uitvoer; de dry-run schrijft niets. Alle testdata is verzonnen.
 */

var VB_BRON_ID = 'BRON_BASEDATA_VB';

function vb_tabs() {
  return {
    academischjaar: [
      ['academischjaar_id', 'academischjaar_code', 'label', 'is_active', 'startdatum', 'einddatum'],
      ['ACJ-006', '2025', '2025-2026', 1, '2025-10-01', '2026-08-31'],
      ['ACJ-007', '2026', '2026-2027', 0, '2026-10-01', '2027-08-31']
    ],
    opleidingen: [
      ['opleiding_id', 'opleiding_code', 'label'],
      ['OPL-001', 'ICT', 'ICT'],
      ['OPL-002', 'AV', 'AV'],
      ['OPL-003', 'INFRA', 'Infra']
    ],
    leerjaren: [
      ['leerjaar_id', 'academischjaar_id', 'leerjaar_nummer'],
      ['LJ-001', 'ACJ-007', 1],
      ['LJ-002', 'ACJ-006', 1]
    ],
    trimesters: [
      ['trimester_id', 'opleiding_id', 'academischjaar_id', 'trimester_code', 'label', 'startdatum', 'einddatum'],
      ['TRI-001', 'OPL-001', 'ACJ-007', 'T01ICT', 'Trimester 1', '2026-10-01', '2026-12-18'],
      ['TRI-002', 'OPL-001', 'ACJ-007', 'T02ICT', 'Trimester 2', '2027-01-04', '2027-03-26'],
      ['TRI-004', 'OPL-002', 'ACJ-007', 'T01AV', 'Trimester 1', '2026-10-01', '2026-12-18'],
      ['TRI-005', 'OPL-002', 'ACJ-007', 'T02AV', 'Trimester 2', '2027-01-04', '2027-03-26'],
      ['TRI-010', 'OPL-001', 'ACJ-006', 'T01ICT', 'Trimester 1', '2025-10-01', '2025-12-19']
    ],
    lespakketten: [
      ['lespakket_id', 'lespakket_code', 'opleiding_id', 'leerjaar_id', 'vakken_compleet_bevestigd'],
      ['LPK-001', 'PT1', 'OPL-001', 'LJ-001', 1],
      ['LPK-002', 'AV1', 'OPL-002', 'LJ-001', 1]
    ],
    klassen: [
      ['klas_id', 'klas_code', 'label', 'academischjaar_id', 'lespakket_id'],
      ['KLA-001', 'PT1.01', 'PT 1.01', 'ACJ-007', 'LPK-001'],
      ['KLA-002', 'PT1.02', 'PT 1.02', 'ACJ-007', 'LPK-001'],
      ['KLA-003', 'AV1.01', 'AV 1.01', 'ACJ-007', 'LPK-002'],
      ['KLA-010', 'PT0.01', 'PT 0.01', 'ACJ-006', 'LPK-001']
    ],
    curriculum: [
      ['curriculum_id', 'lespakket_id', 'onderwijs_eenheid_id', 'trimester_id', 'periode_id', 'verzorgd', 'is_open'],
      ['CUR-001', 'LPK-001', 'OE-001', 'TRI-001', 'PER-001', 'JA', 'TRUE'],
      ['CUR-002', 'LPK-001', 'OE-002', 'TRI-001', 'PER-001', 'JA', ''],
      ['CUR-003', 'LPK-001', 'OE-001', 'TRI-002', 'PER-002', 'JA', ''],
      ['CUR-004', 'LPK-001', 'OE-003', 'TRI-001', 'PER-001', 'JA', ''],
      ['CUR-010', 'LPK-002', 'OE-001', 'TRI-004', 'PER-001', 'JA', ''],
      ['CUR-011', 'LPK-002', 'OE-002', 'TRI-005', 'PER-002', 'JA', '']
    ],
    onderwijs_eenheid: [
      ['onderwijs_eenheid_id', 'onderwijs_eenheid_type_id', 'code', 'label'],
      ['OE-001', 'OET-006', 'WISK', 'Wiskunde'],
      ['OE-002', 'OET-006', 'NED', 'Nederlands'],
      ['OE-003', 'OET-003', 'GAST', 'Gastcollege']
    ],
    onderwijs_eenheid_type: [
      ['onderwijs_eenheid_type_id', 'label'],
      ['OET-006', 'Vak'],
      ['OET-003', 'Gastcollege']
    ],
    trimester_perioden: [
      ['mapping_id', 'trimester_id', 'leerjaar_id', 'periode_id'],
      ['MAP-001', 'TRI-001', 'LJ-001', 'PER-001'],
      ['MAP-002', 'TRI-002', 'LJ-001', 'PER-002'],
      ['MAP-003', 'TRI-004', 'LJ-001', 'PER-001'],
      ['MAP-004', 'TRI-005', 'LJ-001', 'PER-002']
    ]
  };
}

/** Zet één cel in een tabblad: zoek de rij op de eerste kolom (het ID). */
function vb_zet(tabs, tab, id, kolom, waarde) {
  var rijen = tabs[tab];
  var kolomIdx = rijen[0].indexOf(kolom);
  for (var i = 1; i < rijen.length; i++) {
    if (rijen[i][0] === id) { rijen[i][kolomIdx] = waarde; return; }
  }
  throw new Error('testdata: rij ' + id + ' niet gevonden in ' + tab);
}

var VB_ALLE = { academischjaarId: 'ACJ-007', alleOpleidingen: true, opleidingId: null };

/** Bouwt de testbron (alleen-lezen), leest die en leidt af. Geeft { bron, uit }. */
function vb_run(selectie, aanpassing) {
  var tabs = vb_tabs();
  if (aanpassing) aanpassing(tabs);
  __maakSpreadsheet(VB_BRON_ID, tabs, { alleenLezen: true });
  __zetProperties({ BRON_BASEDATA_ID: VB_BRON_ID });
  var bron = bron_leesBasedata_();
  var uit = verplichtingen_leidAf_(bron, selectie || VB_ALLE);
  return { bron: bron, uit: uit };
}

function vb_sleutels(uit) { return uit.verplichtingen.map(function (v) { return v.sleutel; }); }
function vb_typen(uit) { return uit.signaleringen.map(function (s) { return s.ernst + ' / ' + s.type; }); }
function vb_van(uit, type) { return uit.signaleringen.filter(function (s) { return s.type === type; }); }

var VB_VERWACHT_HOOFD = [
  'ACJ-007|TRI-001|OPL-001|OE-001|KLA-001',
  'ACJ-007|TRI-001|OPL-001|OE-002|KLA-001',
  'ACJ-007|TRI-002|OPL-001|OE-001|KLA-001',
  'ACJ-007|TRI-001|OPL-001|OE-001|KLA-002',
  'ACJ-007|TRI-001|OPL-001|OE-002|KLA-002',
  'ACJ-007|TRI-002|OPL-001|OE-001|KLA-002',
  'ACJ-007|TRI-004|OPL-002|OE-001|KLA-003',
  'ACJ-007|TRI-005|OPL-002|OE-002|KLA-003'
];

// ── Ja/nee-vertaling ───────────────────────────────────────────────────────────

test('verzorgd-vertaling: JA, 1, TRUE zijn ja; NEE, 0, FALSE zijn nee; leeg is leeg; de rest is onbekend', function () {
  ['JA', ' ja ', '1', 1, true, 'TRUE', 'true'].forEach(function (w) {
    assert.strictEqual(verplichtingen_vertaalVerzorgd_(w), 'ja', 'ja: ' + String(w));
  });
  ['NEE', 'nee', '0', 0, false, 'FALSE'].forEach(function (w) {
    assert.strictEqual(verplichtingen_vertaalVerzorgd_(w), 'nee', 'nee: ' + String(w));
  });
  ['', '   ', null, undefined].forEach(function (w) {
    assert.strictEqual(verplichtingen_vertaalVerzorgd_(w), 'leeg', 'leeg');
  });
  ['MISSCHIEN', 2, 'J'].forEach(function (w) {
    assert.strictEqual(verplichtingen_vertaalVerzorgd_(w), 'onbekend', 'onbekend: ' + String(w));
  });
});

// ── Hoofdscenario ──────────────────────────────────────────────────────────────

test('hoofdscenario: 8 verplichtingen met de verwachte sleutels, in vaste volgorde', function () {
  var r = vb_run();
  assert.deepStrictEqual(vb_sleutels(r.uit), VB_VERWACHT_HOOFD);
  assert.strictEqual(r.uit.samenvatting.totaalVerplichtingen, 8);
  var eerste = r.uit.verplichtingen[0];
  assert.strictEqual(eerste.academischjaarId, 'ACJ-007');
  assert.strictEqual(eerste.trimesterId, 'TRI-001');
  assert.strictEqual(eerste.opleidingId, 'OPL-001');
  assert.strictEqual(eerste.onderwijsEenheidId, 'OE-001');
  assert.strictEqual(eerste.klasId, 'KLA-001');
  assert.strictEqual(eerste.lespakketId, 'LPK-001');
  assert.ok(!('docent' in eerste) && !('docentId' in eerste), 'de docent speelt geen rol');
});

test('hoofdscenario: de klas van een ander jaar (KLA-010) geeft geen verplichtingen', function () {
  var r = vb_run();
  assert.ok(vb_sleutels(r.uit).every(function (s) { return s.indexOf('KLA-010') === -1; }));
});

test('hoofdscenario: alleen de opleiding zonder klassen geeft een waarschuwing (PB-10)', function () {
  var r = vb_run();
  assert.deepStrictEqual(vb_typen(r.uit), ['waarschuwing / OPLEIDING_ZONDER_KLASSEN']);
  assert.strictEqual(r.uit.signaleringen[0].sleutel, 'OPL-003');
});

test('alleen type Vak telt mee: het gastcollege wordt alleen geteld, zonder signalering (PB-11)', function () {
  var r = vb_run();
  var t = r.uit.samenvatting.perOpleiding['OPL-001'];
  assert.strictEqual(t.nietVak, 2, 'een regel x twee klassen');
  assert.strictEqual(t.klassen, 2);
  assert.strictEqual(t.verplichtingen, 6);
  assert.strictEqual(r.uit.samenvatting.perOpleiding['OPL-002'].verplichtingen, 2);
  assert.strictEqual(r.uit.samenvatting.perOpleiding['OPL-003'].klassen, 0);
});

test('de kolom is_open wordt genegeerd', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'curriculum', 'CUR-001', 'is_open', 'FALSE'); });
  assert.deepStrictEqual(vb_sleutels(r.uit), VB_VERWACHT_HOOFD);
});

// ── Verzorgd ───────────────────────────────────────────────────────────────────

test('verzorgd = NEE telt niet mee en geeft geen signalering, alleen een telling', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'curriculum', 'CUR-003', 'verzorgd', 'NEE'); });
  assert.strictEqual(r.uit.verplichtingen.length, 6);
  assert.strictEqual(r.uit.samenvatting.perOpleiding['OPL-001'].verzorgdNee, 2);
  assert.deepStrictEqual(vb_typen(r.uit), ['waarschuwing / OPLEIDING_ZONDER_KLASSEN']);
});

test('verzorgd leeg telt als niet verzorgd en geeft ÉÉN waarschuwing per lespakket (niet per klas)', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'curriculum', 'CUR-001', 'verzorgd', ''); });
  assert.strictEqual(r.uit.verplichtingen.length, 6);
  var meldingen = vb_van(r.uit, 'VERZORGD_LEEG');
  assert.strictEqual(meldingen.length, 1);
  assert.strictEqual(meldingen[0].sleutel, 'LPK-001');
  assert.ok(/1 curriculumregel/.test(meldingen[0].tekst));
  assert.strictEqual(r.uit.samenvatting.perOpleiding['OPL-001'].verzorgdLeeg, 2);
});

test('een onbekende verzorgd-waarde telt niet mee en geeft een waarschuwing', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'curriculum', 'CUR-001', 'verzorgd', 'MISSCHIEN'); });
  assert.strictEqual(r.uit.verplichtingen.length, 6);
  var m = vb_van(r.uit, 'VERZORGD_ONBEKEND');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.WAARSCHUWING);
});

test('verzorgd als 1, TRUE (echte boolean) en " ja " telt als ja', function () {
  var r = vb_run(null, function (t) {
    vb_zet(t, 'curriculum', 'CUR-001', 'verzorgd', '1');
    vb_zet(t, 'curriculum', 'CUR-002', 'verzorgd', true);
    vb_zet(t, 'curriculum', 'CUR-003', 'verzorgd', ' ja ');
  });
  assert.deepStrictEqual(vb_sleutels(r.uit), VB_VERWACHT_HOOFD);
});

// ── Niet-kritiek: waarschuwing, verplichting blijft ────────────────────────────

test('een lespakket dat niet compleet is bevestigd geeft één waarschuwing per lespakket; de verplichtingen blijven', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'lespakketten', 'LPK-001', 'vakken_compleet_bevestigd', ''); });
  assert.strictEqual(r.uit.verplichtingen.length, 8);
  var m = vb_van(r.uit, 'LESPAKKET_NIET_COMPLEET');
  assert.strictEqual(m.length, 1, 'twee klassen, toch één melding');
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.WAARSCHUWING);
  assert.strictEqual(m[0].sleutel, 'LPK-001');
});

test('een afwijkende periode geeft een waarschuwing; het trimester wint en de verplichting blijft', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'curriculum', 'CUR-001', 'periode_id', 'PER-009'); });
  assert.strictEqual(r.uit.verplichtingen.length, 8);
  var m = vb_van(r.uit, 'PERIODE_AFWIJKEND');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].sleutel, 'CUR-001');
});

test('een periode die niet af te leiden is (geen trimester_perioden-regel) geeft een waarschuwing', function () {
  var r = vb_run(null, function (t) { t.trimester_perioden.splice(1, 1); });   // MAP-001 weg: TRI-001
  assert.strictEqual(r.uit.verplichtingen.length, 8);
  assert.strictEqual(vb_van(r.uit, 'PERIODE_AFWIJKEND').length, 2, 'CUR-001 en CUR-002 hangen aan TRI-001');
});

test('een lespakket zonder curriculumregels geeft een waarschuwing en geen verplichtingen voor die klassen', function () {
  var r = vb_run(null, function (t) {
    t.curriculum = t.curriculum.filter(function (rij, i) { return i === 0 || rij[1] !== 'LPK-002'; });
  });
  assert.strictEqual(r.uit.verplichtingen.length, 6);
  var m = vb_van(r.uit, 'LESPAKKET_ZONDER_CURRICULUM');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].sleutel, 'LPK-002');
});

// ── Tegenstrijdig: geen verplichting, fout ─────────────────────────────────────

test('een klas zonder bestaand lespakket geeft een fout en geen verplichtingen voor die klas', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'klassen', 'KLA-002', 'lespakket_id', 'LPK-099'); });
  assert.strictEqual(r.uit.verplichtingen.length, 5);
  var m = vb_van(r.uit, 'KLAS_ZONDER_LESPAKKET');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.FOUT);
  assert.strictEqual(m[0].sleutel, 'KLA-002');
});

test('een conflict tussen het jaar van de klas en het jaar via het lespakket geeft een fout en geen verplichtingen (PB-6)', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'lespakketten', 'LPK-001', 'leerjaar_id', 'LJ-002'); });
  assert.deepStrictEqual(vb_sleutels(r.uit), [
    'ACJ-007|TRI-004|OPL-002|OE-001|KLA-003',
    'ACJ-007|TRI-005|OPL-002|OE-002|KLA-003'
  ]);
  var m = vb_van(r.uit, 'KLAS_JAAR_CONFLICT');
  assert.strictEqual(m.length, 2, 'KLA-001 en KLA-002');
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.FOUT);
  assert.strictEqual(vb_van(r.uit, 'LESPAKKET_NIET_COMPLEET').length, 0, 'lespakket met alleen conflictklassen wordt niet beoordeeld');
});

test('een curriculumregel met een trimester van een ander jaar geeft een fout en wordt niet aangemaakt', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'curriculum', 'CUR-002', 'trimester_id', 'TRI-010'); });
  assert.strictEqual(r.uit.verplichtingen.length, 6);
  var m = vb_van(r.uit, 'TRIMESTER_JAAR_CONFLICT');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.FOUT);
});

test('een curriculumregel met een trimester van een andere opleiding geeft een fout en wordt niet aangemaakt', function () {
  var r = vb_run(null, function (t) { vb_zet(t, 'curriculum', 'CUR-002', 'trimester_id', 'TRI-004'); });
  assert.strictEqual(r.uit.verplichtingen.length, 6);
  assert.strictEqual(vb_van(r.uit, 'OPLEIDING_CONFLICT').length, 1);
});

test('een onbekend trimester en een onbekende onderwijseenheid geven een fout; de regels worden niet aangemaakt', function () {
  var r = vb_run(null, function (t) {
    vb_zet(t, 'curriculum', 'CUR-002', 'trimester_id', 'TRI-999');
    vb_zet(t, 'curriculum', 'CUR-001', 'onderwijs_eenheid_id', 'OE-999');
  });
  assert.strictEqual(r.uit.verplichtingen.length, 4);
  assert.strictEqual(vb_van(r.uit, 'TRIMESTER_ONBEKEND').length, 1);
  assert.strictEqual(vb_van(r.uit, 'OE_ONBEKEND').length, 1);
});

test('een dubbele curriculumregel (zelfde lespakket, trimester en vak) geeft een fout en maakt geen dubbele verplichtingen', function () {
  var r = vb_run(null, function (t) {
    t.curriculum.push(['CUR-020', 'LPK-001', 'OE-001', 'TRI-001', 'PER-001', 'JA', '']);
  });
  assert.strictEqual(r.uit.verplichtingen.length, 8);
  var m = vb_van(r.uit, 'DUBBELE_SLEUTEL');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.FOUT);
  assert.deepStrictEqual(vb_sleutels(r.uit), VB_VERWACHT_HOOFD);
});

// ── Selectie ───────────────────────────────────────────────────────────────────

test('selectie op één opleiding: alleen die opleiding, geen opleidingen gemengd', function () {
  var r = vb_run({ academischjaarId: 'ACJ-007', alleOpleidingen: false, opleidingId: 'OPL-001' });
  assert.strictEqual(r.uit.verplichtingen.length, 6);
  assert.ok(r.uit.verplichtingen.every(function (v) { return v.opleidingId === 'OPL-001'; }));
  assert.deepStrictEqual(Object.keys(r.uit.samenvatting.perOpleiding), ['OPL-001']);
  assert.deepStrictEqual(vb_typen(r.uit), [], 'geen waarschuwing voor opleidingen buiten de selectie');
});

test('selectie op een opleiding zonder klassen: geen verplichtingen en een waarschuwing', function () {
  var r = vb_run({ academischjaarId: 'ACJ-007', alleOpleidingen: false, opleidingId: 'OPL-003' });
  assert.strictEqual(r.uit.verplichtingen.length, 0);
  assert.deepStrictEqual(vb_typen(r.uit), ['waarschuwing / OPLEIDING_ZONDER_KLASSEN']);
});

test('een onbekend academisch jaar of een onbekende opleiding stopt met een duidelijke fout', function () {
  assert.throws(function () {
    vb_run({ academischjaarId: 'ACJ-099', alleOpleidingen: true, opleidingId: null });
  }, /Academisch jaar "ACJ-099" bestaat niet/);
  assert.throws(function () {
    vb_run({ academischjaarId: 'ACJ-007', alleOpleidingen: false, opleidingId: 'OPL-099' });
  }, /Opleiding "OPL-099" bestaat niet/);
});

// ── Notatie, volgorde en herhaalbaarheid ───────────────────────────────────────

test('hoofdletter- en spatieverschillen in de bron geven geen valse conflicten', function () {
  var r = vb_run(null, function (t) {
    t.klassen[2][0] = ' kla-002 ';
    t.klassen[2][3] = 'acj-007';
    t.klassen[2][4] = ' lpk-001 ';
    vb_zet(t, 'curriculum', 'CUR-001', 'trimester_id', ' tri-001 ');
  });
  assert.deepStrictEqual(vb_sleutels(r.uit), VB_VERWACHT_HOOFD);
  assert.deepStrictEqual(vb_typen(r.uit), ['waarschuwing / OPLEIDING_ZONDER_KLASSEN']);
});

test('dezelfde invoer twee keer geeft dezelfde uitvoer', function () {
  var a = vb_run();
  __reset();
  var b = vb_run();
  assert.strictEqual(JSON.stringify(a.uit), JSON.stringify(b.uit));
});

test('de volgorde van de bronrijen verandert de uitkomst niet', function () {
  var a = vb_run();
  __reset();
  var b = vb_run(null, function (t) {
    t.klassen = [t.klassen[0]].concat(t.klassen.slice(1).reverse());
    t.curriculum = [t.curriculum[0]].concat(t.curriculum.slice(1).reverse());
    t.opleidingen = [t.opleidingen[0]].concat(t.opleidingen.slice(1).reverse());
  });
  assert.deepStrictEqual(vb_sleutels(b.uit), vb_sleutels(a.uit));
  assert.deepStrictEqual(vb_typen(b.uit), vb_typen(a.uit));
});

test('een ID met het scheidingsteken in de sleutel stopt met een duidelijke fout', function () {
  assert.throws(function () {
    vb_run(null, function (t) { t.klassen[1][0] = 'KLA|1'; });
  }, /bevat het scheidingsteken/);
});

test('lege tabbladen geven geen crash maar waarschuwingen', function () {
  var zonderKlassen = vb_run(null, function (t) { t.klassen = [t.klassen[0]]; });
  assert.strictEqual(zonderKlassen.uit.verplichtingen.length, 0);
  assert.strictEqual(vb_van(zonderKlassen.uit, 'OPLEIDING_ZONDER_KLASSEN').length, 3);
  __reset();
  var zonderCurriculum = vb_run(null, function (t) { t.curriculum = [t.curriculum[0]]; });
  assert.strictEqual(zonderCurriculum.uit.verplichtingen.length, 0);
  assert.strictEqual(vb_van(zonderCurriculum.uit, 'LESPAKKET_ZONDER_CURRICULUM').length, 2);
});

// ── Dry-run wrapper ────────────────────────────────────────────────────────────

test('de dry-run toont samenvatting en signaleringen en schrijft niets', function () {
  var tabs = vb_tabs();
  __maakSpreadsheet(VB_BRON_ID, tabs, { alleenLezen: true });
  __zetProperties({ BRON_BASEDATA_ID: VB_BRON_ID, GENEREER_ACADEMISCHJAAR_ID: 'ACJ-007', GENEREER_OPLEIDING_ID: 'ALLE' });
  var namen = Object.keys(tabs);
  var voor = JSON.stringify(namen.map(function (n) { return __leesTabblad(VB_BRON_ID, n); }));

  genereerVerplichtingen_dryRun();

  var na = JSON.stringify(namen.map(function (n) { return __leesTabblad(VB_BRON_ID, n); }));
  var log = __state.log.join('\n');
  assert.ok(/DRY-RUN.*er is niets geschreven/.test(log));
  assert.ok(/Selectie: academisch jaar ACJ-007, opleiding ALLE/.test(log));
  assert.ok(/OPL-001: klassen 2, verplichtingen 6/.test(log));
  assert.ok(/Totaal verplichtingen: 8/.test(log));
  assert.ok(/waarschuwing \/ OPLEIDING_ZONDER_KLASSEN: 1/.test(log));
  assert.ok(/ACJ-007\|TRI-001\|OPL-001\|OE-001\|KLA-001/.test(log), 'voorbeeldsleutel staat in het log');
  assert.strictEqual(__schrijfpogingenNaarBron(), 0);
  assert.strictEqual(na, voor, 'de bron is ongewijzigd');
});

test('de dry-run stopt met een duidelijke fout als de selectie ontbreekt (geen standaardjaar)', function () {
  __maakSpreadsheet(VB_BRON_ID, vb_tabs(), { alleenLezen: true });
  __zetProperties({ BRON_BASEDATA_ID: VB_BRON_ID, GENEREER_OPLEIDING_ID: 'ALLE' });
  assert.throws(function () { genereerVerplichtingen_dryRun(); }, /GENEREER_ACADEMISCHJAAR_ID/);
});
