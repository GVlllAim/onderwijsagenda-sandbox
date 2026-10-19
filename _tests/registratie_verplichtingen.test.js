/**
 * registratie_verplichtingen.test.js — Sandboxtests voor Registratie_Verplichtingen.js (T001c, deel 1).
 * Eisen: de registratie is nooit een bron; het kolomcontract moet exact kloppen; elke rij wordt
 * gecontroleerd; een rij met een probleem blijft ongemoeid; plannen is alleen rekenen.
 * Alle testdata is verzonnen.
 */

var RG_ID = 'REGISTRATIE_RG';
var RG_KOP = ['verplichting_id', 'sleutel', 'academischjaar_id', 'trimester_id', 'opleiding_id', 'onderwijs_eenheid_id',
  'klas_id', 'lespakket_id', 'status', 'aangemaakt_op', 'aangemaakt_door', 'bijgewerkt_op', 'bijgewerkt_door'];

/** Eén geldige registratierij. Met `wijzig` kun je velden overschrijven (op kolomnaam). */
function rg_rij(nummer, klas, trimester, oe, opl, lpk, wijzig) {
  var r = {
    verplichting_id: 'VPL-' + ('0000' + nummer).slice(-4),
    sleutel: 'ACJ-007|' + trimester + '|' + opl + '|' + oe + '|' + klas,
    academischjaar_id: 'ACJ-007', trimester_id: trimester, opleiding_id: opl, onderwijs_eenheid_id: oe,
    klas_id: klas, lespakket_id: lpk, status: 'Verwacht',
    aangemaakt_op: '2026-10-18 10:00:00', aangemaakt_door: 'a@b.c', bijgewerkt_op: '2026-10-18 10:00:00', bijgewerkt_door: 'a@b.c'
  };
  Object.keys(wijzig || {}).forEach(function (k) { r[k] = wijzig[k]; });
  return RG_KOP.map(function (k) { return r[k]; });
}

function rg_standaard() {
  return [
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_rij(2, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001'),
    rg_rij(3, 'KLA-003', 'TRI-004', 'OE-001', 'OPL-002', 'LPK-002')
  ];
}

/** Maakt de registratie klaar en zet REGISTRATIE_ID. `kop` is optioneel (om het contract te breken). */
function rg_maak(rijen, kop, opties) {
  __maakSpreadsheet(RG_ID, { verplichtingen: [kop || RG_KOP].concat(rijen || []) }, opties || {});
  __zetProperties({ REGISTRATIE_ID: RG_ID });
}

/** Een afgeleide verplichting zoals verplichtingen_leidAf_ ze oplevert. */
function rg_verpl(klas, trimester, oe, opl, lpk) {
  return { sleutel: 'ACJ-007|' + trimester + '|' + opl + '|' + oe + '|' + klas, academischjaarId: 'ACJ-007', trimesterId: trimester,
    opleidingId: opl, onderwijsEenheidId: oe, klasId: klas, lespakketId: lpk, curriculumId: 'CUR-X', bronRij: 2 };
}

function rg_afgeleid() {
  return [
    rg_verpl('KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_verpl('KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001'),
    rg_verpl('KLA-003', 'TRI-004', 'OE-001', 'OPL-002', 'LPK-002')
  ];
}

var RG_ALLE = { academischjaarId: 'ACJ-007', alleOpleidingen: true, opleidingId: null };

function rg_typen(signaleringen) { return signaleringen.map(function (s) { return s.ernst + ' / ' + s.type; }); }
function rg_van(signaleringen, type) { return signaleringen.filter(function (s) { return s.type === type; }); }

// ── ID-formaat ─────────────────────────────────────────────────────────────────

test('ID-formaat: minimaal 4 cijfers en het groeit mee na VPL-9999', function () {
  assert.strictEqual(registratie_formatteerId_(1), 'VPL-0001');
  assert.strictEqual(registratie_formatteerId_(42), 'VPL-0042');
  assert.strictEqual(registratie_formatteerId_(9999), 'VPL-9999');
  assert.strictEqual(registratie_formatteerId_(10000), 'VPL-10000');
});

test('ID-formaat: het nummer uit een ID; een ongeldig formaat geeft null', function () {
  assert.strictEqual(registratie_nummerUitId_('VPL-0001'), 1);
  assert.strictEqual(registratie_nummerUitId_('VPL-10000'), 10000);
  ['VPL-1', 'vpl-0001', 'XYZ-0001', 'VPL-00A1', 'VPL-0001 ', '', null, undefined].forEach(function (x) {
    assert.strictEqual(registratie_nummerUitId_(x), null, 'ongeldig: ' + String(x));
  });
});

// ── Openen ─────────────────────────────────────────────────────────────────────

test('openen: een geldige registratie geeft geen signaleringen', function () {
  rg_maak(rg_standaard());
  var open = registratie_open_();
  assert.deepStrictEqual(open.signaleringen, []);
  assert.ok(open.sheet);
});

test('openen zonder instelling REGISTRATIE_ID stopt met een duidelijke fout', function () {
  assert.throws(function () { registratie_open_(); }, /Instelling "REGISTRATIE_ID" ontbreekt/);
});

test('een registratie die dezelfde spreadsheet is als de bron-basedata wordt geweigerd', function () {
  rg_maak([]);
  __zetProperties({ BRON_BASEDATA_ID: RG_ID });
  assert.throws(function () { registratie_open_(); }, /dezelfde spreadsheet als BRON_BASEDATA_ID.*nooit een bron/);
});

test('een registratie die dezelfde spreadsheet is als de bron-docentenbeheer wordt geweigerd', function () {
  rg_maak([]);
  __zetProperties({ BRON_DOCENTENBEHEER_ID: RG_ID });
  assert.throws(function () { registratie_open_(); }, /dezelfde spreadsheet als BRON_DOCENTENBEHEER_ID/);
});

test('een ID dat niet bestaat geeft een duidelijke fout over REGISTRATIE_ID', function () {
  __zetProperties({ REGISTRATIE_ID: 'BESTAAT-NIET' });
  assert.throws(function () { registratie_open_(); }, /kon niet worden geopend \(controleer instelling REGISTRATIE_ID/);
});

test('een ontbrekend tabblad stopt met een fout die het tabblad noemt', function () {
  __maakSpreadsheet(RG_ID, { ander: [['x']] }, {});
  __zetProperties({ REGISTRATIE_ID: RG_ID });
  assert.throws(function () { registratie_open_(); }, /Tabblad "verplichtingen" ontbreekt/);
});

test('een verkeerde kolomnaam stopt met een fout die kolom, naam en verwachting noemt', function () {
  var kop = RG_KOP.slice(); kop[2] = 'jaar_id';
  rg_maak([], kop);
  assert.throws(function () { registratie_open_(); }, /kolom 3 moet "academischjaar_id" heten maar is "jaar_id"/);
});

test('twee verwisselde kolommen (verkeerde volgorde) stoppen met een fout', function () {
  var kop = RG_KOP.slice(); var t = kop[3]; kop[3] = kop[4]; kop[4] = t;
  rg_maak([], kop);
  assert.throws(function () { registratie_open_(); }, /kolom 4 moet "trimester_id" heten/);
});

test('een ontbrekende kolom (12 in plaats van 13) stopt met een fout', function () {
  rg_maak([], RG_KOP.slice(0, 12));
  assert.throws(function () { registratie_open_(); }, /kolom 13 moet "bijgewerkt_door" heten maar is "\(leeg\)"/);
});

test('een extra kolom buiten het contract stopt met een fout', function () {
  rg_maak([], RG_KOP.concat(['notitie']));
  assert.throws(function () { registratie_open_(); }, /extra kolom "notitie"/);
});

test('een afwijkende tijdzone van de registratie geeft een waarschuwing', function () {
  rg_maak([], null, { tijdzone: 'America/Los_Angeles' });
  var sigs = rg_van(registratie_open_().signaleringen, 'TIJDZONE_AFWIJKEND');
  assert.strictEqual(sigs.length, 1);
  assert.strictEqual(sigs[0].ernst, SIGNALERING_ERNST.WAARSCHUWING);
});

// ── Lezen en controleren ───────────────────────────────────────────────────────

test('lezen: een lege registratie (alleen de kopregel) geeft geen rijen en maxNummer 0', function () {
  rg_maak([]);
  var r = registratie_lees_();
  assert.strictEqual(r.rijen.length, 0);
  assert.strictEqual(r.maxNummer, 0);
  assert.deepStrictEqual(r.signaleringen, []);
});

test('lezen: geldige rijen worden ingelezen, geindexeerd op sleutel, zonder problemen', function () {
  rg_maak(rg_standaard());
  var r = registratie_lees_();
  assert.strictEqual(r.rijen.length, 3);
  assert.strictEqual(r.maxNummer, 3);
  assert.deepStrictEqual(r.signaleringen, []);
  assert.ok(r.rijen.every(function (x) { return x.geblokkeerd === false; }));
  assert.strictEqual(r.perSleutel['ACJ-007|TRI-001|OPL-001|OE-002|KLA-001'].verplichting_id, 'VPL-0002');
  assert.strictEqual(r.rijen[0]._rij, 2);
});

test('lezen: ID\'s met hoofdletter- of spatieverschillen worden genormaliseerd en gemeld, niet geblokkeerd', function () {
  rg_maak([rg_rij(1, ' kla-001 ', 'tri-001', 'oe-001', 'opl-001', ' lpk-001', { sleutel: ' acj-007|tri-001|opl-001|oe-001|kla-001 ', academischjaar_id: 'acj-007', verplichting_id: ' vpl-0001' })]);
  var r = registratie_lees_();
  assert.strictEqual(r.rijen[0].klas_id, 'KLA-001');
  assert.strictEqual(r.rijen[0].verplichting_id, 'VPL-0001');
  assert.strictEqual(r.rijen[0].geblokkeerd, false);
  assert.ok(rg_van(r.signaleringen, 'ID_GENORMALISEERD').length >= 5);
  assert.strictEqual(rg_van(r.signaleringen, 'ID_GENORMALISEERD')[0].ernst, SIGNALERING_ERNST.INFO);
});

test('lezen: lege rijen worden overgeslagen en rijnummers blijven kloppen', function () {
  rg_maak([RG_KOP.map(function () { return ''; }), rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001')]);
  var r = registratie_lees_();
  assert.strictEqual(r.rijen.length, 1);
  assert.strictEqual(r.rijen[0]._rij, 3);
});

test('lezen: een ongeldig verplichting-ID geeft een fout, de rij is geblokkeerd en telt niet mee voor maxNummer', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_rij(2, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001', { verplichting_id: 'VPL-7' })
  ]);
  var r = registratie_lees_();
  var m = rg_van(r.signaleringen, 'ONGELDIG_ID_REGISTRATIE');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.FOUT);
  assert.strictEqual(m[0].bronregel, 'registratie/verplichtingen rij 3');
  assert.strictEqual(r.rijen[1].geblokkeerd, true);
  assert.strictEqual(r.rijen[0].geblokkeerd, false);
  assert.strictEqual(r.maxNummer, 1);
});

test('lezen: een dubbele sleutel blokkeert beide rijen en geeft één fout', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_rij(2, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001')
  ]);
  var r = registratie_lees_();
  assert.strictEqual(rg_van(r.signaleringen, 'DUBBELE_SLEUTEL_REGISTRATIE').length, 1);
  assert.ok(r.rijen.every(function (x) { return x.geblokkeerd; }));
});

test('lezen: een dubbel verplichting-ID blokkeert beide rijen en geeft één fout', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001')
  ]);
  var r = registratie_lees_();
  assert.strictEqual(rg_van(r.signaleringen, 'DUBBEL_ID_REGISTRATIE').length, 1);
  assert.ok(r.rijen.every(function (x) { return x.geblokkeerd; }));
});

test('lezen: een sleutel die niet bij de velden in dezelfde rij past blokkeert de rij', function () {
  rg_maak([rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001', { klas_id: 'KLA-999' })]);
  var r = registratie_lees_();
  assert.strictEqual(rg_van(r.signaleringen, 'SLEUTEL_INCONSISTENT_REGISTRATIE').length, 1);
  assert.strictEqual(r.rijen[0].geblokkeerd, true);
});

test('lezen: een onbekende status geeft een waarschuwing maar blokkeert de rij niet', function () {
  rg_maak([rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001', { status: 'Goedgekeurd' })]);
  var r = registratie_lees_();
  var m = rg_van(r.signaleringen, 'STATUS_ONBEKEND_REGISTRATIE');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.WAARSCHUWING);
  assert.strictEqual(r.rijen[0].geblokkeerd, false);
});

test('lezen: maxNummer is het hoogste nummer, ook met gaten en met VPL-10000', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_rij(5, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001'),
    rg_rij(10000, 'KLA-003', 'TRI-004', 'OE-001', 'OPL-002', 'LPK-002', { verplichting_id: 'VPL-10000' })
  ]);
  assert.strictEqual(registratie_lees_().maxNummer, 10000);
});

test('lezen schrijft niets: de registratie en alle bronnen blijven ongewijzigd', function () {
  rg_maak(rg_standaard());
  var voor = JSON.stringify(__leesTabblad(RG_ID, 'verplichtingen'));
  registratie_lees_();
  assert.strictEqual(JSON.stringify(__leesTabblad(RG_ID, 'verplichtingen')), voor);
  assert.strictEqual(__schrijfpogingenNaarBron(), 0);
});

// ── Plannen ────────────────────────────────────────────────────────────────────

test('plan: bij een lege registratie is alles nieuw', function () {
  rg_maak([]);
  var p = registratie_plan_(rg_afgeleid(), registratie_lees_(), RG_ALLE);
  assert.strictEqual(p.nieuw.length, 3);
  assert.strictEqual(p.bijwerken.length + p.ongewijzigd.length + p.vervallen.length + p.overgeslagen.length, 0);
});

test('plan: een identieke registratie geeft alles ongewijzigd en niets nieuw', function () {
  rg_maak(rg_standaard());
  var p = registratie_plan_(rg_afgeleid(), registratie_lees_(), RG_ALLE);
  assert.strictEqual(p.ongewijzigd.length, 3);
  assert.strictEqual(p.nieuw.length + p.bijwerken.length + p.vervallen.length + p.overgeslagen.length, 0);
  assert.deepStrictEqual(p.signaleringen, []);
});

test('plan: een ander lespakket geeft bijwerken met alleen het veld lespakket_id (PB-15)', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-099'),
    rg_rij(2, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001'),
    rg_rij(3, 'KLA-003', 'TRI-004', 'OE-001', 'OPL-002', 'LPK-002')
  ]);
  var p = registratie_plan_(rg_afgeleid(), registratie_lees_(), RG_ALLE);
  assert.strictEqual(p.bijwerken.length, 1);
  assert.deepStrictEqual(p.bijwerken[0].wijzigingen, { lespakket_id: 'LPK-001' });
  assert.deepStrictEqual(p.bijwerken[0].oud, { lespakket_id: 'LPK-099' });
  assert.strictEqual(p.ongewijzigd.length, 2);
});

test('plan: een geregistreerde verplichting die niet meer wordt afgeleid is vervallen, blijft bestaan en wordt gemeld (B12)', function () {
  rg_maak(rg_standaard().concat([rg_rij(4, 'KLA-777', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001')]));
  var p = registratie_plan_(rg_afgeleid(), registratie_lees_(), RG_ALLE);
  assert.strictEqual(p.vervallen.length, 1);
  assert.strictEqual(p.vervallen[0].verplichting_id, 'VPL-0004');
  var m = rg_van(p.signaleringen, 'BRON_VERVALLEN');
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].ernst, SIGNALERING_ERNST.WAARSCHUWING);
  assert.ok(/status blijven ongewijzigd/.test(m[0].tekst));
});

test('plan: vervallen wordt alleen bepaald binnen het gekozen jaar en de gekozen opleiding', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_rij(2, 'KLA-800', 'TRI-001', 'OE-001', 'OPL-002', 'LPK-002'),                                     // andere opleiding
    rg_rij(3, 'KLA-900', 'TRI-010', 'OE-001', 'OPL-001', 'LPK-001', {
      sleutel: 'ACJ-006|TRI-010|OPL-001|OE-001|KLA-900', academischjaar_id: 'ACJ-006' })                  // ander jaar
  ]);
  var afgeleid = [rg_verpl('KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001')];
  var p = registratie_plan_(afgeleid, registratie_lees_(), { academischjaarId: 'ACJ-007', alleOpleidingen: false, opleidingId: 'OPL-001' });
  assert.strictEqual(p.vervallen.length, 0, 'rijen buiten de selectie blijven buiten beschouwing');
  var alle = registratie_plan_(afgeleid, registratie_lees_(), RG_ALLE);
  assert.strictEqual(alle.vervallen.length, 1, 'bij ALLE telt de andere opleiding wel mee');
  assert.strictEqual(alle.vervallen[0].verplichting_id, 'VPL-0002');
});

test('plan: een geblokkeerde registratierij wordt overgeslagen en niet als nieuw aangemaakt (geen dubbele)', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001', { verplichting_id: 'VPL-7' }),
    rg_rij(2, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001')
  ]);
  var afgeleid = rg_afgeleid().slice(0, 2);
  var p = registratie_plan_(afgeleid, registratie_lees_(), RG_ALLE);
  assert.strictEqual(p.overgeslagen.length, 1);
  assert.strictEqual(p.overgeslagen[0].verplichting.sleutel, 'ACJ-007|TRI-001|OPL-001|OE-001|KLA-001');
  assert.strictEqual(p.nieuw.length, 0);
  assert.strictEqual(p.ongewijzigd.length, 1);
});

test('plan: de aantallen kloppen samen met het aantal afgeleide verplichtingen en de invoer wordt niet gewijzigd', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-099'),
    rg_rij(2, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001', { verplichting_id: 'VPL-7' })
  ]);
  var afgeleid = rg_afgeleid();
  var reg = registratie_lees_();
  var voorAfg = JSON.stringify(afgeleid);
  var voorReg = JSON.stringify(reg.rijen);
  var p = registratie_plan_(afgeleid, reg, RG_ALLE);
  assert.strictEqual(p.nieuw.length + p.bijwerken.length + p.ongewijzigd.length + p.overgeslagen.length, afgeleid.length);
  assert.strictEqual(JSON.stringify(afgeleid), voorAfg);
  assert.strictEqual(JSON.stringify(reg.rijen), voorReg);
});

test('plan: dezelfde invoer geeft dezelfde uitvoer', function () {
  rg_maak(rg_standaard());
  var a = JSON.stringify(registratie_plan_(rg_afgeleid(), registratie_lees_(), RG_ALLE));
  var b = JSON.stringify(registratie_plan_(rg_afgeleid(), registratie_lees_(), RG_ALLE));
  assert.strictEqual(a, b);
});

// ── Wrapper autoriseerDiensten ─────────────────────────────────────────────────

test('autoriseerDiensten: toont of het e-mailadres beschikbaar is, zonder het te tonen, en schrijft niets', function () {
  rg_maak(rg_standaard());
  __zetGebruiker('geheim@voorbeeld.nl');
  var voor = JSON.stringify(__leesTabblad(RG_ID, 'verplichtingen'));
  autoriseerDiensten();
  var log = __state.log.join('\n');
  assert.ok(/Spreadsheets: geopend/.test(log));
  assert.ok(/Lock: ok/.test(log));
  assert.ok(/E-mailadres beschikbaar voor aangemaakt_door: ja/.test(log));
  assert.ok(log.indexOf('geheim@voorbeeld.nl') === -1, 'het adres zelf staat niet in het log');
  assert.strictEqual(JSON.stringify(__leesTabblad(RG_ID, 'verplichtingen')), voor);
});

test('autoriseerDiensten: meldt NEE als er geen e-mailadres beschikbaar is', function () {
  rg_maak([]);
  __zetGebruiker('');
  autoriseerDiensten();
  assert.ok(/E-mailadres beschikbaar voor aangemaakt_door: NEE/.test(__state.log.join('\n')));
});

test('autoriseerDiensten: meldt het als de lock niet verkregen wordt', function () {
  rg_maak([]);
  var origineel = LockService.getScriptLock;
  LockService.getScriptLock = function () { return { tryLock: function () { return false; }, releaseLock: function () {} }; };
  try { autoriseerDiensten(); } finally { LockService.getScriptLock = origineel; }
  assert.ok(/Lock: NIET verkregen/.test(__state.log.join('\n')));
});

// ══ DEEL 2: de schrijfpoort ═══════════════════════════════════════════════════

var RG_CTX = { gebruiker: 'a@b.c', nu: '2026-10-18 12:00:00' };

function rg_tab() { return __leesTabblad(RG_ID, 'verplichtingen'); }

/** Leest de registratie, plant en schrijft via de poort. */
function rg_schrijf(afgeleid, ctx, selectie) {
  var reg = registratie_lees_();
  var plan = registratie_plan_(afgeleid, reg, selectie || RG_ALLE);
  return registratie_saveVerplichtingen_(reg, plan, ctx || RG_CTX);
}

/** Vervangt SpreadsheetApp.openById zodat elk tabblad door `patch(sheet)` kan worden aangepast. Geeft een herstelfunctie. */
function rg_wrapSheet(patch) {
  var orig = SpreadsheetApp.openById;
  SpreadsheetApp.openById = function (id) {
    var ss = orig(id);
    var origGet = ss.getSheetByName;
    ss.getSheetByName = function (n) { var sh = origGet(n); if (sh) patch(sh); return sh; };
    return ss;
  };
  return function () { SpreadsheetApp.openById = orig; };
}

function rg_alleTekst(tab) {
  return tab.every(function (rij) { return rij.every(function (c) { return typeof c === 'string'; }); });
}

test('poort: schrijft nieuwe rijen met oplopende ID\'s en alle waarden als tekst (geen datum of getal)', function () {
  rg_maak([]);
  var res = rg_schrijf(rg_afgeleid());
  var tab = rg_tab();
  assert.strictEqual(tab.length, 4);
  assert.deepStrictEqual(RG_KOP, tab[0], 'de kopregel blijft ongewijzigd');
  assert.deepStrictEqual(tab[1], ['VPL-0001', 'ACJ-007|TRI-001|OPL-001|OE-001|KLA-001', 'ACJ-007', 'TRI-001', 'OPL-001',
    'OE-001', 'KLA-001', 'LPK-001', 'Verwacht', '2026-10-18 12:00:00', 'a@b.c', '2026-10-18 12:00:00', 'a@b.c']);
  assert.deepStrictEqual([tab[1][0], tab[2][0], tab[3][0]], ['VPL-0001', 'VPL-0002', 'VPL-0003']);
  assert.ok(rg_alleTekst(tab), 'elke cel is tekst; Sheets heeft de datum niet omgezet');
  assert.deepStrictEqual(res, { nieuwGeschreven: 3, bijgewerkt: 0, eersteId: 'VPL-0001', laatsteId: 'VPL-0003' });
});

test('poort: zet eerst het tekstformaat op het blok dat geschreven wordt', function () {
  rg_maak([]);
  rg_schrijf(rg_afgeleid());
  var formaten = __formatenVan(RG_ID, 'verplichtingen');
  assert.ok(formaten.some(function (f) { return f.formaat === '@' && f.rij === 2 && f.aantalRijen === 3 && f.aantalKol === 13; }));
});

test('poort: de nummering gaat verder na het hoogste bestaande nummer, ook met gaten', function () {
  rg_maak([
    rg_rij(1, 'KLA-700', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'),
    rg_rij(7, 'KLA-701', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001')
  ]);
  var voor = rg_tab().slice(0, 3);
  rg_schrijf(rg_afgeleid());
  var tab = rg_tab();
  assert.deepStrictEqual(tab.slice(0, 3), voor, 'bestaande rijen blijven onaangeroerd');
  assert.deepStrictEqual([tab[3][0], tab[4][0], tab[5][0]], ['VPL-0008', 'VPL-0009', 'VPL-0010']);
});

test('poort: na VPL-9999 groeit het ID mee naar VPL-10000', function () {
  rg_maak([rg_rij(9999, 'KLA-700', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001', { verplichting_id: 'VPL-9999' })]);
  rg_schrijf(rg_afgeleid());
  var tab = rg_tab();
  assert.deepStrictEqual([tab[2][0], tab[3][0], tab[4][0]], ['VPL-10000', 'VPL-10001', 'VPL-10002']);
});

test('poort: ID\'s worden nooit hergebruikt: twee runs geven allemaal verschillende ID\'s', function () {
  rg_maak([]);
  rg_schrijf(rg_afgeleid());
  var meer = rg_afgeleid().concat([rg_verpl('KLA-004', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'), rg_verpl('KLA-005', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001')]);
  rg_schrijf(meer);
  var ids = rg_tab().slice(1).map(function (r) { return r[0]; });
  assert.deepStrictEqual(ids, ['VPL-0001', 'VPL-0002', 'VPL-0003', 'VPL-0004', 'VPL-0005']);
});

test('poort: één ongeldig record weigert het hele pakket en er wordt niets geschreven', function () {
  rg_maak([]);
  var afgeleid = rg_afgeleid();
  afgeleid[1].klasId = 'kla-001';          // kleine letters en past niet bij de sleutel
  assert.throws(function () { rg_schrijf(afgeleid); }, /voldoen niet aan het kolomcontract; er is niets geschreven/);
  assert.strictEqual(rg_tab().length, 1, 'alleen de kopregel');
  assert.strictEqual(__formatenVan(RG_ID, 'verplichtingen').length, 0, 'ook geen formaat gezet');
});

test('poort: ontbrekende velden, een slecht adres en een slecht tijdstip weigeren ook alles', function () {
  rg_maak([]);
  var leeg = rg_afgeleid(); leeg[0].trimesterId = '';
  assert.throws(function () { rg_schrijf(leeg); }, /kolom trimester_id is verplicht/);
  assert.throws(function () { rg_schrijf(rg_afgeleid(), { gebruiker: 'geen-adres', nu: RG_CTX.nu }); }, /moet een e-mailadres zijn/);
  assert.throws(function () { rg_schrijf(rg_afgeleid(), { gebruiker: 'a@b.c', nu: '18-10-2026 12:00' }); }, /heeft niet het formaat yyyy-MM-dd HH:mm:ss/);
  assert.strictEqual(rg_tab().length, 1);
});

test('poort: bijwerken voegt samen; alleen lespakket_id, bijgewerkt_op en bijgewerkt_door veranderen', function () {
  rg_maak([
    rg_rij(1, 'KLA-001', 'TRI-001', 'OE-001', 'OPL-001', 'LPK-099'),
    rg_rij(2, 'KLA-001', 'TRI-001', 'OE-002', 'OPL-001', 'LPK-001'),
    rg_rij(3, 'KLA-003', 'TRI-004', 'OE-001', 'OPL-002', 'LPK-002')
  ]);
  var voor = rg_tab();
  var res = rg_schrijf(rg_afgeleid(), { gebruiker: 'x@y.z', nu: '2026-10-19 08:00:00' });
  var na = rg_tab();
  assert.strictEqual(res.bijgewerkt, 1);
  assert.strictEqual(res.nieuwGeschreven, 0);
  assert.strictEqual(na.length, voor.length, 'geen rijen erbij of eraf');
  var verwacht = voor[1].slice();
  verwacht[7] = 'LPK-001';
  verwacht[11] = '2026-10-19 08:00:00';
  verwacht[12] = 'x@y.z';
  assert.deepStrictEqual(na[1], verwacht);
  assert.strictEqual(na[1][9], '2026-10-18 10:00:00', 'aangemaakt_op blijft');
  assert.strictEqual(na[1][10], 'a@b.c', 'aangemaakt_door blijft');
  assert.deepStrictEqual(na[2], voor[2]);
  assert.deepStrictEqual(na[3], voor[3]);
  assert.ok(rg_alleTekst(na));
});

test('poort: een ongewijzigde registratie wordt niet aangeraakt (nul schrijfacties)', function () {
  rg_maak(rg_standaard());
  var voor = JSON.stringify(rg_tab());
  var teller = { schrijf: 0 };
  var herstel = rg_wrapSheet(function (sheet) {
    var gr = sheet.getRange;
    sheet.getRange = function () {
      var r = gr.apply(sheet, arguments);
      ['setValue', 'setValues', 'setNumberFormat'].forEach(function (m) {
        var o = r[m]; r[m] = function () { teller.schrijf++; return o.apply(r, arguments); };
      });
      return r;
    };
  });
  var res;
  try { res = rg_schrijf(rg_afgeleid()); } finally { herstel(); }
  assert.strictEqual(teller.schrijf, 0);
  assert.strictEqual(JSON.stringify(rg_tab()), voor);
  assert.strictEqual(res.nieuwGeschreven, 0);
  assert.strictEqual(res.bijgewerkt, 0);
});

test('poort: alleen lespakket_id mag worden bijgewerkt; een ander veld weigert alles', function () {
  rg_maak(rg_standaard());
  var voor = JSON.stringify(rg_tab());
  var reg = registratie_lees_();
  var plan = registratie_plan_(rg_afgeleid(), reg, RG_ALLE);
  plan.bijwerken.push({ rij: reg.rijen[0], verplichting: rg_afgeleid()[0], wijzigingen: { status: 'Goedgekeurd', lespakket_id: 'LPK-001' }, oud: {} });
  assert.throws(function () { registratie_saveVerplichtingen_(reg, plan, RG_CTX); }, /het veld "status" mag niet worden bijgewerkt/);
  assert.strictEqual(JSON.stringify(rg_tab()), voor);
});

test('poort: een geblokkeerde rij mag niet worden bijgewerkt', function () {
  rg_maak(rg_standaard());
  var reg = registratie_lees_();
  reg.rijen[0].geblokkeerd = true;
  var plan = { nieuw: [], ongewijzigd: [], vervallen: [], overgeslagen: [], signaleringen: [],
    bijwerken: [{ rij: reg.rijen[0], verplichting: rg_afgeleid()[0], wijzigingen: { lespakket_id: 'LPK-005' }, oud: {} }] };
  var voor = JSON.stringify(rg_tab());
  assert.throws(function () { registratie_saveVerplichtingen_(reg, plan, RG_CTX); }, /heeft een probleem en mag niet worden bijgewerkt/);
  assert.strictEqual(JSON.stringify(rg_tab()), voor);
});

test('poort: nieuwe rijen worden in blokken geschreven (blokgrootte 2: 5 rijen = 3 blokken)', function () {
  rg_maak([]);
  var origineel = REGISTRATIE_CHUNK_GROOTTE;
  var teller = { blokken: 0 };
  var herstel = rg_wrapSheet(function (sheet) {
    var gr = sheet.getRange;
    sheet.getRange = function () {
      var r = gr.apply(sheet, arguments);
      var sv = r.setValues; r.setValues = function () { teller.blokken++; return sv.apply(r, arguments); };
      return r;
    };
  });
  REGISTRATIE_CHUNK_GROOTTE = 2;
  var vijf = [];
  for (var i = 1; i <= 5; i++) vijf.push(rg_verpl('KLA-00' + i, 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'));
  try { rg_schrijf(vijf); } finally { REGISTRATIE_CHUNK_GROOTTE = origineel; herstel(); }
  assert.strictEqual(teller.blokken, 3);
  assert.deepStrictEqual(rg_tab().slice(1).map(function (r) { return r[0]; }), ['VPL-0001', 'VPL-0002', 'VPL-0003', 'VPL-0004', 'VPL-0005']);
});

test('poort: mislukt het tweede blok, dan blijft het eerste staan en opnieuw uitvoeren vult aan zonder dubbelen', function () {
  rg_maak([]);
  var origineel = REGISTRATIE_CHUNK_GROOTTE;
  var vijf = [];
  for (var i = 1; i <= 5; i++) vijf.push(rg_verpl('KLA-00' + i, 'TRI-001', 'OE-001', 'OPL-001', 'LPK-001'));

  var aantal = 0;
  var herstel = rg_wrapSheet(function (sheet) {
    var gr = sheet.getRange;
    sheet.getRange = function () {
      var r = gr.apply(sheet, arguments);
      var sv = r.setValues;
      r.setValues = function () { aantal++; if (aantal === 2) throw new Error('gesimuleerde fout'); return sv.apply(r, arguments); };
      return r;
    };
  });
  REGISTRATIE_CHUNK_GROOTTE = 2;
  try {
    assert.throws(function () { rg_schrijf(vijf); },
      /Schrijven gestopt na 0 van 0 bijwerkingen en 2 van 5 nieuwe rijen: gesimuleerde fout.*vult de rest aan, zonder dubbelen/);
  } finally { herstel(); }
  assert.strictEqual(rg_tab().length, 3, 'het eerste blok (2 rijen) staat er');

  try { rg_schrijf(vijf); } finally { REGISTRATIE_CHUNK_GROOTTE = origineel; }
  var rijen = rg_tab().slice(1);
  assert.deepStrictEqual(rijen.map(function (r) { return r[0]; }), ['VPL-0001', 'VPL-0002', 'VPL-0003', 'VPL-0004', 'VPL-0005']);
  var sleutels = rijen.map(function (r) { return r[1]; });
  assert.strictEqual(new Set(sleutels).size, 5, 'geen dubbelen');
});

test('poort: een schrijfactie die niet blijft staan wordt gevonden door de schrijfcontrole', function () {
  rg_maak([]);
  var herstel = rg_wrapSheet(function (sheet) {
    var gr = sheet.getRange;
    sheet.getRange = function () {
      var r = gr.apply(sheet, arguments);
      r.setValues = function () { return r; };     // doet alsof er geschreven is
      return r;
    };
  });
  try {
    assert.throws(function () { rg_schrijf(rg_afgeleid()); }, /Schrijfcontrole mislukt op rij 2/);
  } finally { herstel(); }
});

test('poort: schrijft alleen naar de registratie en nooit naar een bron', function () {
  __maakSpreadsheet('BRON_X', { klassen: [['klas_id'], ['KLA-001']] }, { alleenLezen: true });
  rg_maak([]);
  rg_schrijf(rg_afgeleid());
  assert.strictEqual(__schrijfpogingenNaarBron(), 0);
  assert.strictEqual(__leesTabblad('BRON_X', 'klassen').length, 2);
});
