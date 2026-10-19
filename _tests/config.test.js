/**
 * config.test.js — Sandboxtests voor Config.js (T001a).
 * Eisen: geen terugval op een standaardwaarde, duidelijke fout bij ontbrekende
 * instelling, selectie volgens PB-8 (jaar uit instelling, opleiding-ID of ALLE, leeg = fout).
 */

test('ontbrekende instelling stopt met een duidelijke fout (geen terugval)', function () {
  assert.throws(function () { config_bronBasedataId_(); },
    /Instelling "BRON_BASEDATA_ID" ontbreekt of is leeg.*Scripteigenschappen/);
});

test('een lege of alleen-spaties instelling telt als ontbrekend', function () {
  __zetProperties({ BRON_BASEDATA_ID: '   ' });
  assert.throws(function () { config_bronBasedataId_(); }, /ontbreekt of is leeg/);
});

test('een onbekende instellingsnaam geeft een fout (typfout wordt niet stil genegeerd)', function () {
  assert.throws(function () { config_get_('BRON_BASEDATA_IDD'); }, /Onbekende instelling/);
});

test('de waarde wordt zonder spaties aan begin en eind teruggegeven', function () {
  __zetProperties({ BRON_BASEDATA_ID: '  ABC123  ' });
  assert.strictEqual(config_bronBasedataId_(), 'ABC123');
});

test('selectie: academisch jaar uit de instelling en opleiding ALLE', function () {
  __zetProperties({ GENEREER_ACADEMISCHJAAR_ID: 'ACJ-007', GENEREER_OPLEIDING_ID: 'ALLE' });
  var sel = config_genereerSelectie_();
  assert.deepStrictEqual(sel, { academischjaarId: 'ACJ-007', alleOpleidingen: true, opleidingId: null });
});

test('selectie: een opleiding-ID wordt genormaliseerd (hoofdletters, spaties)', function () {
  __zetProperties({ GENEREER_ACADEMISCHJAAR_ID: ' acj-007 ', GENEREER_OPLEIDING_ID: ' opl-001 ' });
  var sel = config_genereerSelectie_();
  assert.deepStrictEqual(sel, { academischjaarId: 'ACJ-007', alleOpleidingen: false, opleidingId: 'OPL-001' });
});

test('selectie: het woord "alle" in kleine letters telt ook als ALLE', function () {
  __zetProperties({ GENEREER_ACADEMISCHJAAR_ID: 'ACJ-007', GENEREER_OPLEIDING_ID: 'alle' });
  assert.strictEqual(config_genereerSelectie_().alleOpleidingen, true);
});

test('selectie: een LEGE opleiding betekent niet ALLE maar geeft een fout (PB-8)', function () {
  __zetProperties({ GENEREER_ACADEMISCHJAAR_ID: 'ACJ-007', GENEREER_OPLEIDING_ID: '' });
  assert.throws(function () { config_genereerSelectie_(); }, /GENEREER_OPLEIDING_ID/);
});

test('selectie: zonder academisch jaar is er geen standaardjaar, de code stopt', function () {
  __zetProperties({ GENEREER_OPLEIDING_ID: 'ALLE' });
  assert.throws(function () { config_genereerSelectie_(); }, /GENEREER_ACADEMISCHJAAR_ID/);
});

test('controleerInstellingen toont de status en lekt nooit een waarde', function () {
  __zetProperties({ BRON_BASEDATA_ID: 'GEHEIM-ID-123', GENEREER_OPLEIDING_ID: 'ALLE' });
  controleerInstellingen();
  var log = __state.log.join('\n');
  assert.ok(/BRON_BASEDATA_ID: ingesteld/.test(log), 'ingestelde sleutel wordt gemeld');
  assert.ok(/GENEREER_ACADEMISCHJAAR_ID: ONTBREEKT/.test(log), 'ontbrekende sleutel wordt gemeld');
  assert.ok(/Ontbrekend \(nu nodig\): GENEREER_ACADEMISCHJAAR_ID/.test(log));
  assert.ok(log.indexOf('GEHEIM-ID-123') === -1, 'de waarde zelf staat niet in het log');
});

test('config_getOptioneel_ geeft een lege tekst bij een ontbrekende instelling en gooit geen fout', function () {
  assert.strictEqual(config_getOptioneel_('BRON_DOCENTENBEHEER_ID'), '');
  __zetProperties({ BRON_DOCENTENBEHEER_ID: '  XYZ  ' });
  assert.strictEqual(config_getOptioneel_('BRON_DOCENTENBEHEER_ID'), 'XYZ');
  assert.throws(function () { config_getOptioneel_('ONBEKEND'); }, /Onbekende instelling/);
});
