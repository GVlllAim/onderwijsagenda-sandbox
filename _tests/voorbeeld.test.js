/**
 * voorbeeld.test.js — Laat de opbouw van een test zien en bewijst dat het
 * testharnas werkt. Mag blijven staan als controle op de bronbescherming.
 *
 * Opbouw van elke test:
 *   1. BEGINSITUATIE  testdata klaarzetten met __maakSpreadsheet / __zetGebruiker
 *   2. ACTIE          de functie uit de servercode aanroepen
 *   3. CONTROLE       met assert de uitkomst EN de inhoud van de sheet controleren
 */

function _zetBronEnRegistratie() {
  __maakSpreadsheet('BRON_BASEDATA', {
    academischjaar: [
      ['academischjaar_id', 'label', 'is_active'],
      ['ACJ-006', '2025-2026', true],
      ['ACJ-007', '2026-2027', false]
    ]
  }, { alleenLezen: true });
  __maakSpreadsheet('REGISTRATIE', {
    auditlog: [['log_id', 'tijdstip', 'gebruiker', 'actie']]
  });
}

test('bron kan gelezen worden', function () {
  _zetBronEnRegistratie();
  var waarden = SpreadsheetApp.openById('BRON_BASEDATA')
    .getSheetByName('academischjaar').getDataRange().getValues();
  assert.strictEqual(waarden.length, 3);
  assert.strictEqual(waarden[1][0], 'ACJ-006');
});

test('schrijven naar een bron wordt geweigerd (bronbescherming)', function () {
  _zetBronEnRegistratie();
  var sheet = SpreadsheetApp.openById('BRON_BASEDATA').getSheetByName('academischjaar');
  assert.throws(function () { sheet.appendRow(['ACJ-008', '2027-2028', false]); }, /BRONBESCHERMING/);
  assert.throws(function () { sheet.getRange(2, 3).setValue(false); }, /BRONBESCHERMING/);
  assert.strictEqual(__schrijfpogingenNaarBron(), 2);
  assert.strictEqual(__leesTabblad('BRON_BASEDATA', 'academischjaar').length, 3, 'bron is ongewijzigd');
});

test('schrijven naar de eigen registratie werkt', function () {
  _zetBronEnRegistratie();
  __zetGebruiker('docent@sandbox.local');
  var sheet = SpreadsheetApp.openById('REGISTRATIE').getSheetByName('auditlog');
  sheet.appendRow([Utilities.getUuid(), '2026-10-14 10:00', Session.getActiveUser().getEmail(), 'TEST']);
  var rijen = __leesTabblad('REGISTRATIE', 'auditlog');
  assert.strictEqual(rijen.length, 2);
  assert.strictEqual(rijen[1][2], 'docent@sandbox.local');
});

test('gesimuleerde kopieerfout bij Drive is te testen (voor batch-scenario\'s)', function () {
  __maakMap('MAP_BRON'); __maakMap('MAP_DIRECTIE_TEST');
  __maakBestand('DOC1', 'Agenda A', 'MAP_BRON');
  __laatKopierenFalen('DOC1');
  var doel = DriveApp.getFolderById('MAP_DIRECTIE_TEST');
  assert.throws(function () { DriveApp.getFileById('DOC1').makeCopy('Agenda A', doel); }, /mislukt/);
  var kopie = DriveApp.getFileById('DOC1').makeCopy('Agenda A', doel); // tweede poging lukt
  assert.ok(kopie.getId());
});

test('elke test begint met een lege omgeving (__reset)', function () {
  assert.throws(function () { SpreadsheetApp.openById('BRON_BASEDATA'); }, /niet gevonden/);
});
