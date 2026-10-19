/**
 * Registratie_Verplichtingen.js — Tabblad `verplichtingen` van de eigen registratie-spreadsheet (T001c).
 *
 * DEEL 1: openen, lezen, controleren en plannen. Er wordt NIETS geschreven.
 *  - registratie_open_()   opent de registratie en controleert tabblad, kolomcontract en tijdzone
 *  - registratie_lees_()   leest alle rijen in één blok en controleert elke rij
 *  - registratie_plan_()   vergelijkt de afgeleide verplichtingen met de registratie
 *  - registratie_formatteerId_() en registratie_nummerUitId_()   het ID-formaat VPL-0001 (B10)
 *
 * DEEL 2: schrijven. Alleen registratie_saveVerplichtingen_() schrijft naar dit tabblad (de ENIGE schrijfpoort).
 *  - controleert elk record tegen het kolomcontract; is er één ongeldig, dan wordt niets geschreven
 *  - kent ID's toe (hoogste nummer + 1), schrijft nieuwe rijen in blokken als platte tekst
 *  - werkt bestaande rijen bij door samenvoegen: alleen lespakket_id, bijgewerkt_op en bijgewerkt_door
 *  - leest elk geschreven blok terug en controleert of er precies staat wat er geschreven is
 *  - genereerVerplichtingen_uitvoeren() neemt de lock, leest de registratie OPNIEUW binnen de lock en schrijft
 *
 * Besluiten: B10 (ID's), B11 (13 kolommen, geen docent), B12 (bronregel verdwijnt: verplichting
 * blijft, status ongewijzigd, melden), B14 (alleen scripteigenaar), B19 (sleutel met | ertussen),
 * PB-13 (alles als tekst), PB-14 (hoogste nummer + 1), PB-15 (alleen lespakket_id wordt bijgewerkt),
 * PB-16 (probleem in de registratie: een foute rij blijft ongemoeid en wordt gemeld; een
 * structuurprobleem stopt alles).
 *
 * Regels:
 *  - De registratie mag nooit dezelfde spreadsheet zijn als een bron: dat stopt de code.
 *  - Het kolomcontract (naam en volgorde) moet exact kloppen, anders stopt de code.
 *  - Een rij met een probleem wordt NIET aangepast en NIET overschreven: ze krijgt een fout in
 *    de signaleringslijst en wordt in het plan overgeslagen.
 *  - Signaleringen hebben het vaste formaat { type, ernst, sleutel, bronregel, tekst } (PB-3).
 *
 * Wrappers voor jou (zonder parameters, te starten in de editor):
 *   autoriseerDiensten()                 zodat Google alle toestemmingen in één keer vraagt (KWALITEITSREGELS §8)
 *   genereerVerplichtingen_uitvoeren()   schrijft de nieuwe en bijgewerkte verplichtingen naar de registratie
 *   (genereerVerplichtingen_dryRun() staat in Verplichtingen_Afleiden.js en toont wat er zou veranderen)
 */

var REGISTRATIE_NAAM = 'registratie';

// ── ID-formaat ─────────────────────────────────────────────────────────────────

/** Maakt VPL-0001 uit een nummer. Minimaal 4 cijfers; groeit mee (VPL-10000). */
function registratie_formatteerId_(nummer) {
  var cijfers = String(nummer);
  while (cijfers.length < VERPLICHTING_ID_MIN_CIJFERS) cijfers = '0' + cijfers;
  return VERPLICHTING_ID_PREFIX + '-' + cijfers;
}

/** Geeft het nummer uit een ID als getal, of null als het ID niet het juiste formaat heeft. */
function registratie_nummerUitId_(id) {
  var m = new RegExp('^' + VERPLICHTING_ID_PREFIX + '-(\\d{' + VERPLICHTING_ID_MIN_CIJFERS + ',})$').exec(String(id));
  return m ? parseInt(m[1], 10) : null;
}

// ── Openen ─────────────────────────────────────────────────────────────────────

/**
 * Opent de registratie en controleert de structuur. Geeft { ss, sheet, waarden, signaleringen }.
 * Stopt met een duidelijke fout bij: ontbrekende instelling, registratie die een bron is,
 * ontbrekend tabblad, of een kolomcontract dat niet exact klopt.
 */
function registratie_open_() {
  var id = config_registratieId_();
  [CONFIG_SLEUTELS.BRON_BASEDATA_ID, CONFIG_SLEUTELS.BRON_DOCENTENBEHEER_ID].forEach(function (sleutel) {
    if (config_getOptioneel_(sleutel) === id) {
      throw new Error('Instelling REGISTRATIE_ID wijst naar dezelfde spreadsheet als ' + sleutel +
        '. De registratie mag nooit een bron zijn.');
    }
  });

  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('De registratie kon niet worden geopend (controleer instelling REGISTRATIE_ID en of het een ' +
      'Google Sheet is): ' + e.message);
  }
  var sheet = ss.getSheetByName(REGISTRATIE_TAB_VERPLICHTINGEN);
  if (!sheet) {
    throw new Error('Tabblad "' + REGISTRATIE_TAB_VERPLICHTINGEN + '" ontbreekt in de registratie.');
  }

  var waarden = sheet.getDataRange().getValues();
  var kop = (waarden[0] || []).map(function (c) { return (c === null || c === undefined) ? '' : String(c).trim(); });
  var contract = REGISTRATIE_KOLOMMEN_VERPLICHTINGEN;
  for (var i = 0; i < contract.length; i++) {
    if (kop[i] !== contract[i]) {
      throw new Error('Kolomcontract van tabblad "' + REGISTRATIE_TAB_VERPLICHTINGEN + '" klopt niet: kolom ' + (i + 1) +
        ' moet "' + contract[i] + '" heten maar is "' + (kop[i] || '(leeg)') + '". Verwacht: ' + contract.join(', ') + '.');
    }
  }
  for (var j = contract.length; j < kop.length; j++) {
    if (kop[j] !== '') {
      throw new Error('Tabblad "' + REGISTRATIE_TAB_VERPLICHTINGEN + '" heeft een extra kolom "' + kop[j] +
        '" buiten het kolomcontract (kolom ' + (j + 1) + ').');
    }
  }

  var signaleringen = [];
  var tijdzone = ss.getSpreadsheetTimeZone();
  if (tijdzone !== CONFIG_VERWACHTE_TIJDZONE) {
    signaleringen.push(bron_maakSignalering_('TIJDZONE_AFWIJKEND', SIGNALERING_ERNST.WAARSCHUWING, REGISTRATIE_NAAM,
      REGISTRATIE_NAAM, 'Tijdzone van de registratie is "' + tijdzone + '", verwacht "' + CONFIG_VERWACHTE_TIJDZONE + '".'));
  }
  return { ss: ss, sheet: sheet, waarden: waarden, signaleringen: signaleringen };
}

// ── Lezen en controleren ───────────────────────────────────────────────────────

function registratie_bronregel_(rijNummer) {
  return bron_bronregel_(REGISTRATIE_NAAM, REGISTRATIE_TAB_VERPLICHTINGEN, rijNummer);
}

/** ID- en sleutelkolommen worden genormaliseerd; overige kolommen alleen getrimd. */
function registratie_isIdKolom_(kolom) {
  return kolom === 'sleutel' || /_id$/.test(kolom);
}

/**
 * Leest de registratie en controleert elke rij. Geeft:
 *  { sheet, rijen, perSleutel, maxNummer, signaleringen }
 * Elke rij heeft de 13 kolommen plus _rij (rijnummer in de sheet) en geblokkeerd (true bij een probleem).
 * Een geblokkeerde rij wordt later niet aangepast en niet overschreven (PB-16).
 */
function registratie_lees_() {
  var open = registratie_open_();
  var contract = REGISTRATIE_KOLOMMEN_VERPLICHTINGEN;
  var signaleringen = open.signaleringen.slice();
  var rijen = [];
  var perSleutel = Object.create(null);
  var perId = Object.create(null);
  var maxNummer = 0;

  function meld(type, ernst, sleutel, rijNr, tekst) {
    signaleringen.push(bron_maakSignalering_(type, ernst, sleutel, registratie_bronregel_(rijNr), tekst));
  }

  for (var r = 1; r < open.waarden.length; r++) {
    var regel = open.waarden[r];
    var rijNr = r + 1;
    var rij = { _rij: rijNr, geblokkeerd: false };
    var heeftInhoud = false;

    for (var k = 0; k < contract.length; k++) {
      var kolom = contract[k];
      var ruw = regel[k];
      if (ruw === undefined || ruw === null) ruw = '';
      var waarde;
      if (registratie_isIdKolom_(kolom)) {
        var ruweTekst = String(ruw);
        waarde = bron_normaliseerId_(ruw);
        if (ruweTekst !== '' && ruweTekst !== waarde) {
          meld('ID_GENORMALISEERD', SIGNALERING_ERNST.INFO, waarde, rijNr,
            'Kolom ' + kolom + ': "' + ruweTekst + '" is genormaliseerd naar "' + waarde + '".');
        }
      } else {
        waarde = (typeof ruw === 'string') ? ruw.trim() : String(ruw);
      }
      if (waarde !== '') heeftInhoud = true;
      rij[kolom] = waarde;
    }
    if (!heeftInhoud) continue;

    var nummer = registratie_nummerUitId_(rij.verplichting_id);
    if (nummer === null) {
      rij.geblokkeerd = true;
      meld('ONGELDIG_ID_REGISTRATIE', SIGNALERING_ERNST.FOUT, rij.verplichting_id, rijNr,
        'Verplichting-ID "' + rij.verplichting_id + '" heeft niet het formaat ' + registratie_formatteerId_(1) +
        '. Deze rij blijft ongemoeid.');
    } else if (nummer > maxNummer) {
      maxNummer = nummer;
    }

    var verwachteSleutel = [rij.academischjaar_id, rij.trimester_id, rij.opleiding_id, rij.onderwijs_eenheid_id, rij.klas_id]
      .join(CONFIG_SLEUTEL_SCHEIDING);
    if (rij.sleutel !== verwachteSleutel) {
      rij.geblokkeerd = true;
      meld('SLEUTEL_INCONSISTENT_REGISTRATIE', SIGNALERING_ERNST.FOUT, rij.sleutel, rijNr,
        'De sleutel "' + rij.sleutel + '" komt niet overeen met jaar, trimester, opleiding, vak en klas in dezelfde rij ("' +
        verwachteSleutel + '"). Deze rij blijft ongemoeid.');
    }

    var geldigeStatus = Object.keys(VERPLICHTING_STATUS).map(function (n) { return VERPLICHTING_STATUS[n]; });
    if (geldigeStatus.indexOf(rij.status) === -1) {
      meld('STATUS_ONBEKEND_REGISTRATIE', SIGNALERING_ERNST.WAARSCHUWING, rij.verplichting_id, rijNr,
        'Status "' + rij.status + '" staat niet in de lijst met bekende statussen (' + geldigeStatus.join(', ') + ').');
    }

    if (rij.verplichting_id !== '') {
      if (rij.verplichting_id in perId) {
        var eerder = perId[rij.verplichting_id];
        rij.geblokkeerd = true;
        eerder.geblokkeerd = true;
        meld('DUBBEL_ID_REGISTRATIE', SIGNALERING_ERNST.FOUT, rij.verplichting_id, rijNr,
          'Verplichting-ID ' + rij.verplichting_id + ' komt dubbel voor (eerder op rij ' + eerder._rij + '). Beide rijen blijven ongemoeid.');
      } else {
        perId[rij.verplichting_id] = rij;
      }
    }

    if (rij.sleutel !== '') {
      if (rij.sleutel in perSleutel) {
        var eersteRij = perSleutel[rij.sleutel];
        rij.geblokkeerd = true;
        eersteRij.geblokkeerd = true;
        meld('DUBBELE_SLEUTEL_REGISTRATIE', SIGNALERING_ERNST.FOUT, rij.sleutel, rijNr,
          'Sleutel ' + rij.sleutel + ' komt dubbel voor (eerder op rij ' + eersteRij._rij + '). Beide rijen blijven ongemoeid.');
      } else {
        perSleutel[rij.sleutel] = rij;
      }
    }
    rijen.push(rij);
  }

  return { sheet: open.sheet, rijen: rijen, perSleutel: perSleutel, maxNummer: maxNummer, signaleringen: signaleringen };
}

// ── Plannen ────────────────────────────────────────────────────────────────────

/**
 * Vergelijkt de afgeleide verplichtingen met de registratie (alleen rekenen, niets schrijven).
 * Geeft { nieuw, bijwerken, ongewijzigd, vervallen, overgeslagen, signaleringen }.
 *  - nieuw        verplichting bestaat nog niet in de registratie
 *  - bijwerken    bestaat al, maar lespakket_id is anders (PB-15: alleen dat veld)
 *  - ongewijzigd  bestaat al en is gelijk
 *  - vervallen    staat in de registratie (jaar en opleiding in de selectie), maar wordt niet meer afgeleid;
 *                 de verplichting en haar status blijven ongewijzigd (B12)
 *  - overgeslagen de bijbehorende registratierij heeft een probleem en blijft ongemoeid (PB-16)
 */
function registratie_plan_(afgeleid, registratie, selectie) {
  var nieuw = [];
  var bijwerken = [];
  var ongewijzigd = [];
  var vervallen = [];
  var overgeslagen = [];
  var signaleringen = [];
  var afgeleidSleutels = Object.create(null);

  afgeleid.forEach(function (v) {
    afgeleidSleutels[v.sleutel] = true;
    var rij = registratie.perSleutel[v.sleutel];
    if (!rij) { nieuw.push(v); return; }
    if (rij.geblokkeerd) {
      overgeslagen.push({ verplichting: v, rij: rij, reden: 'registratierij heeft een probleem' });
      return;
    }
    if (rij.lespakket_id !== v.lespakketId) {
      bijwerken.push({ rij: rij, verplichting: v, wijzigingen: { lespakket_id: v.lespakketId }, oud: { lespakket_id: rij.lespakket_id } });
    } else {
      ongewijzigd.push({ rij: rij, verplichting: v });
    }
  });

  registratie.rijen.forEach(function (rij) {
    if (rij.geblokkeerd) return;
    if (rij.academischjaar_id !== selectie.academischjaarId) return;
    if (!selectie.alleOpleidingen && rij.opleiding_id !== selectie.opleidingId) return;
    if (afgeleidSleutels[rij.sleutel]) return;
    vervallen.push(rij);
    signaleringen.push(bron_maakSignalering_('BRON_VERVALLEN', SIGNALERING_ERNST.WAARSCHUWING, rij.sleutel,
      registratie_bronregel_(rij._rij),
      'Verplichting ' + rij.verplichting_id + ' (' + rij.sleutel + ') wordt niet meer afgeleid uit de bron. ' +
      'De verplichting en haar status blijven ongewijzigd.'));
  });

  return { nieuw: nieuw, bijwerken: bijwerken, ongewijzigd: ongewijzigd, vervallen: vervallen, overgeslagen: overgeslagen, signaleringen: signaleringen };
}

// ── DEEL 2: schrijven ──────────────────────────────────────────────────────────

var REGISTRATIE_DATUMTIJD_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** Huidige tijd als tekst in Paramaribo (PB-13). */
function registratie_nuTekst_() {
  return Utilities.formatDate(new Date(), CONFIG_VERWACHTE_TIJDZONE, REGISTRATIE_DATUMTIJD_PATROON);
}

/** E-mailadres van de gebruiker voor aangemaakt_door en bijgewerkt_door. Stopt als het ontbreekt (PB-13). */
function registratie_gebruiker_() {
  var email = Session.getActiveUser().getEmail();
  email = email ? String(email).trim() : '';
  if (email === '') {
    throw new Error('Het e-mailadres van de gebruiker is niet beschikbaar (nodig voor aangemaakt_door en ' +
      'bijgewerkt_door). Er is niets geschreven.');
  }
  return email;
}

/**
 * Controleert één record tegen het kolomcontract (PB-13). Geeft een lijst met problemen; leeg = geldig.
 */
function registratie_valideerRecord_(rec) {
  var contract = REGISTRATIE_KOLOMMEN_VERPLICHTINGEN;
  var problemen = [];
  contract.forEach(function (kolom) {
    if (typeof rec[kolom] !== 'string' || rec[kolom].trim() === '') {
      problemen.push('kolom ' + kolom + ' is verplicht en moet tekst zijn');
    }
  });
  if (problemen.length > 0) return problemen;

  if (registratie_nummerUitId_(rec.verplichting_id) === null) {
    problemen.push('verplichting_id "' + rec.verplichting_id + '" heeft niet het formaat ' + registratie_formatteerId_(1));
  }
  contract.forEach(function (kolom) {
    if (registratie_isIdKolom_(kolom) && rec[kolom] !== bron_normaliseerId_(rec[kolom])) {
      problemen.push('kolom ' + kolom + ' ("' + rec[kolom] + '") moet in hoofdletters en zonder spaties');
    }
  });
  var verwachteSleutel = [rec.academischjaar_id, rec.trimester_id, rec.opleiding_id, rec.onderwijs_eenheid_id, rec.klas_id]
    .join(CONFIG_SLEUTEL_SCHEIDING);
  if (rec.sleutel !== verwachteSleutel) {
    problemen.push('sleutel "' + rec.sleutel + '" past niet bij jaar, trimester, opleiding, vak en klas ("' + verwachteSleutel + '")');
  }
  var geldigeStatus = Object.keys(VERPLICHTING_STATUS).map(function (n) { return VERPLICHTING_STATUS[n]; });
  if (geldigeStatus.indexOf(rec.status) === -1) {
    problemen.push('status "' + rec.status + '" staat niet in de lijst (' + geldigeStatus.join(', ') + ')');
  }
  ['aangemaakt_op', 'bijgewerkt_op'].forEach(function (kolom) {
    if (!REGISTRATIE_DATUMTIJD_REGEX.test(rec[kolom])) {
      problemen.push('kolom ' + kolom + ' ("' + rec[kolom] + '") moet het formaat ' + REGISTRATIE_DATUMTIJD_PATROON + ' hebben');
    }
  });
  ['aangemaakt_door', 'bijgewerkt_door'].forEach(function (kolom) {
    if (rec[kolom].indexOf('@') === -1) {
      problemen.push('kolom ' + kolom + ' moet een e-mailadres zijn');
    }
  });
  return problemen;
}

/** Schrijft één cel als platte tekst (zodat Sheets er niets van maakt). */
function registratie_schrijfTekst_(sheet, rij, kolom, waarde) {
  var cel = sheet.getRange(rij, kolom, 1, 1);
  cel.setNumberFormat('@');
  cel.setValue(waarde);
}

/**
 * DE ENIGE SCHRIJFPOORT naar het tabblad verplichtingen.
 * registratie = uitkomst van registratie_lees_() (binnen de lock gelezen), plan = uitkomst van
 * registratie_plan_(), context = { gebruiker, nu }.
 *
 *  1. Maakt de nieuwe records en kent ID's toe (hoogste nummer + 1, PB-14).
 *  2. Controleert ALLES tegen het kolomcontract. Is er één probleem, dan wordt niets geschreven.
 *  3. Werkt bestaande rijen bij door samenvoegen: alleen lespakket_id, bijgewerkt_op en bijgewerkt_door.
 *     aangemaakt_op en aangemaakt_door blijven staan (PB-15).
 *  4. Schrijft nieuwe rijen in blokken als platte tekst en leest elk blok terug om te controleren.
 *
 * Mislukt het schrijven halverwege, dan blijft wat al geschreven is staan (nooit teruggedraaid) en meldt de
 * fout hoeveel er klaar is. Opnieuw uitvoeren vult de rest aan, zonder dubbelen.
 * Geeft { nieuwGeschreven, bijgewerkt, eersteId, laatsteId }.
 */
function registratie_saveVerplichtingen_(registratie, plan, context) {
  var sheet = registratie.sheet;
  var contract = REGISTRATIE_KOLOMMEN_VERPLICHTINGEN;
  var nu = context.nu;
  var gebruiker = context.gebruiker;

  // 1. Nieuwe records met ID's.
  var nieuweRecords = plan.nieuw.map(function (v, i) {
    return {
      verplichting_id: registratie_formatteerId_(registratie.maxNummer + 1 + i),
      sleutel: v.sleutel,
      academischjaar_id: v.academischjaarId,
      trimester_id: v.trimesterId,
      opleiding_id: v.opleidingId,
      onderwijs_eenheid_id: v.onderwijsEenheidId,
      klas_id: v.klasId,
      lespakket_id: v.lespakketId,
      status: VERPLICHTING_STATUS.VERWACHT,
      aangemaakt_op: nu,
      aangemaakt_door: gebruiker,
      bijgewerkt_op: nu,
      bijgewerkt_door: gebruiker
    };
  });

  // 2. Alles controleren voordat er iets geschreven wordt.
  var problemen = [];
  if (typeof nu !== 'string' || !REGISTRATIE_DATUMTIJD_REGEX.test(nu)) {
    problemen.push('het tijdstip "' + nu + '" heeft niet het formaat ' + REGISTRATIE_DATUMTIJD_PATROON);
  }
  if (typeof gebruiker !== 'string' || gebruiker.indexOf('@') === -1) {
    problemen.push('de gebruiker moet een e-mailadres zijn');
  }
  nieuweRecords.forEach(function (rec, i) {
    registratie_valideerRecord_(rec).forEach(function (p) {
      problemen.push('nieuwe verplichting ' + (i + 1) + ' (' + rec.sleutel + '): ' + p);
    });
  });
  plan.bijwerken.forEach(function (b) {
    Object.keys(b.wijzigingen).forEach(function (veld) {
      if (veld !== 'lespakket_id') {
        problemen.push('rij ' + b.rij._rij + ': het veld "' + veld + '" mag niet worden bijgewerkt (alleen lespakket_id)');
      }
    });
    if (b.rij.geblokkeerd) {
      problemen.push('rij ' + b.rij._rij + ' heeft een probleem en mag niet worden bijgewerkt');
    }
    var w = b.wijzigingen.lespakket_id;
    if (typeof w !== 'string' || w === '' || w !== bron_normaliseerId_(w)) {
      problemen.push('rij ' + b.rij._rij + ': lespakket_id "' + w + '" moet in hoofdletters en zonder spaties');
    }
  });
  if (problemen.length > 0) {
    throw new Error('De gegevens voldoen niet aan het kolomcontract; er is niets geschreven. ' +
      problemen.slice(0, 10).join(' | ') + (problemen.length > 10 ? ' ... en ' + (problemen.length - 10) + ' meer.' : ''));
  }

  var bijgewerkt = 0;
  var geschreven = 0;
  try {
    // 3. Bijwerken door samenvoegen: alleen deze drie cellen per rij.
    var kolomLespakket = contract.indexOf('lespakket_id') + 1;
    var kolomBijgewerktOp = contract.indexOf('bijgewerkt_op') + 1;
    var kolomBijgewerktDoor = contract.indexOf('bijgewerkt_door') + 1;
    plan.bijwerken.forEach(function (b) {
      registratie_schrijfTekst_(sheet, b.rij._rij, kolomLespakket, b.wijzigingen.lespakket_id);
      registratie_schrijfTekst_(sheet, b.rij._rij, kolomBijgewerktOp, nu);
      registratie_schrijfTekst_(sheet, b.rij._rij, kolomBijgewerktDoor, gebruiker);
      bijgewerkt++;
    });

    // 4. Nieuwe rijen in blokken schrijven en terugcontroleren.
    for (var start = 0; start < nieuweRecords.length; start += REGISTRATIE_CHUNK_GROOTTE) {
      var deel = nieuweRecords.slice(start, start + REGISTRATIE_CHUNK_GROOTTE);
      var waarden = deel.map(function (rec) { return contract.map(function (k) { return rec[k]; }); });
      var eersteRij = sheet.getLastRow() + 1;
      var bereik = sheet.getRange(eersteRij, 1, deel.length, contract.length);
      bereik.setNumberFormat('@');
      bereik.setValues(waarden);
      SpreadsheetApp.flush();

      var terug = sheet.getRange(eersteRij, 1, deel.length, contract.length).getValues();
      for (var i = 0; i < deel.length; i++) {
        for (var c = 0; c < contract.length; c++) {
          if (String(terug[i][c]) !== waarden[i][c]) {
            throw new Error('Schrijfcontrole mislukt op rij ' + (eersteRij + i) + ', kolom ' + contract[c] +
              ': geschreven "' + waarden[i][c] + '", teruggelezen "' + String(terug[i][c]) + '"');
          }
        }
      }
      geschreven += deel.length;
    }
  } catch (e) {
    throw new Error('Schrijven gestopt na ' + bijgewerkt + ' van ' + plan.bijwerken.length + ' bijwerkingen en ' +
      geschreven + ' van ' + nieuweRecords.length + ' nieuwe rijen: ' + e.message +
      ' Wat al geschreven is blijft staan. Opnieuw uitvoeren vult de rest aan, zonder dubbelen.');
  }

  return {
    nieuwGeschreven: geschreven,
    bijgewerkt: bijgewerkt,
    eersteId: nieuweRecords.length > 0 ? nieuweRecords[0].verplichting_id : null,
    laatsteId: nieuweRecords.length > 0 ? nieuweRecords[nieuweRecords.length - 1].verplichting_id : null
  };
}

/** Logt het resultaat van een uitvoering. Alleen loggen. */
function registratie_logUitvoering_(selectie, leesSignaleringen, uit, registratie, plan, resultaat, rijenVoor, rijenNa) {
  Logger.log('UITVOEREN verwachte onderwijsagenda\'s.');
  Logger.log('Selectie: academisch jaar ' + selectie.academischjaarId + ', opleiding ' +
    (selectie.alleOpleidingen ? 'ALLE' : selectie.opleidingId));
  Logger.log('Afgeleid uit de bron: ' + uit.verplichtingen.length + ' verplichtingen. Registratie voor de run: ' + rijenVoor + ' rijen.');
  if (resultaat.nieuwGeschreven > 0) {
    Logger.log('Geschreven: nieuw ' + resultaat.nieuwGeschreven + ' (' + resultaat.eersteId + ' t/m ' + resultaat.laatsteId +
      '), bijgewerkt ' + resultaat.bijgewerkt + '.');
  } else {
    Logger.log('Geschreven: nieuw 0, bijgewerkt ' + resultaat.bijgewerkt + '.');
  }
  Logger.log('Niet aangepast: ongewijzigd ' + plan.ongewijzigd.length + ', vervallen ' + plan.vervallen.length +
    ', overgeslagen ' + plan.overgeslagen.length + '.');
  Logger.log('Registratie na de run: ' + rijenNa + ' rijen.');
  plan.bijwerken.slice(0, 10).forEach(function (b) {
    Logger.log('  Bijgewerkt ' + b.rij.verplichting_id + ' | ' + b.rij.sleutel + ' | lespakket ' + b.oud.lespakket_id +
      ' is ' + b.wijzigingen.lespakket_id);
  });
  verplichtingen_logSignaleringen_(leesSignaleringen.concat(uit.signaleringen, registratie.signaleringen, plan.signaleringen));
}

// ── Wrapper voor jou (zonder parameters) ───────────────────────────────────────

/**
 * Roept alle gebruikte diensten één keer aan, zodat Google de toestemming in één keer vraagt.
 * Toont of je e-mailadres beschikbaar is (nodig voor aangemaakt_door en bijgewerkt_door).
 * Schrijft niets en toont geen waarden.
 */
function autoriseerDiensten() {
  registratie_open_();
  Logger.log('Spreadsheets: geopend (alleen gelezen).');

  var slot = LockService.getScriptLock();
  var gekregen = slot.tryLock(1000);
  if (gekregen) slot.releaseLock();
  Logger.log('Lock: ' + (gekregen ? 'ok' : 'NIET verkregen (probeer het later opnieuw)'));

  var email = Session.getActiveUser().getEmail();
  Logger.log('E-mailadres beschikbaar voor aangemaakt_door: ' + (email ? 'ja' : 'NEE'));
}


/**
 * Schrijft de nieuwe en bijgewerkte verplichtingen voor de selectie in Script Properties naar de
 * registratie. Alleen de scripteigenaar, vanuit de editor (besluit B14). Gebruik EERST
 * genereerVerplichtingen_dryRun() om te zien wat er gaat gebeuren.
 *
 *  - Bron lezen en afleiden gebeuren vóór de lock (alleen rekenen).
 *  - Binnen de lock wordt de registratie opnieuw gelezen en wordt opnieuw gepland. Zo is een tweede run of een
 *    dubbele klik onschadelijk: de tweede run ziet wat de eerste schreef en schrijft niets dubbel.
 *  - Een tijdzone van de registratie die niet Paramaribo is stopt de uitvoering (PB-16).
 *  - Een rij met een probleem blijft ongemoeid en wordt gemeld; de rest gaat door (PB-16).
 */
function genereerVerplichtingen_uitvoeren() {
  var selectie = config_genereerSelectie_();
  var basedata = bron_leesBasedata_();
  var uit = verplichtingen_leidAf_(basedata, selectie);
  var gebruiker = registratie_gebruiker_();      // stopt vóór de lock als het adres ontbreekt

  var slot = LockService.getScriptLock();
  if (!slot.tryLock(REGISTRATIE_LOCK_WACHTTIJD_MS)) {
    throw new Error('Er draait al een andere run: de lock is niet verkregen binnen ' + (REGISTRATIE_LOCK_WACHTTIJD_MS / 1000) +
      ' seconden. Er is niets geschreven. Probeer het over een minuut opnieuw.');
  }
  var registratie, plan, resultaat, rijenNa;
  try {
    registratie = registratie_lees_();
    var tijdzoneProbleem = registratie.signaleringen.filter(function (s) { return s.type === 'TIJDZONE_AFWIJKEND'; });
    if (tijdzoneProbleem.length > 0) {
      throw new Error('De tijdzone van de registratie is niet ' + CONFIG_VERWACHTE_TIJDZONE + ' (Google Sheets: Bestand > Instellingen > Tijdzone). ' +
        'Er is niets geschreven.');
    }
    plan = registratie_plan_(uit.verplichtingen, registratie, selectie);
    resultaat = registratie_saveVerplichtingen_(registratie, plan, { gebruiker: gebruiker, nu: registratie_nuTekst_() });
    SpreadsheetApp.flush();
    rijenNa = Math.max(registratie.sheet.getLastRow() - 1, 0);
  } finally {
    slot.releaseLock();
  }
  registratie_logUitvoering_(selectie, basedata.signaleringen, uit, registratie, plan, resultaat, registratie.rijen.length, rijenNa);
}
