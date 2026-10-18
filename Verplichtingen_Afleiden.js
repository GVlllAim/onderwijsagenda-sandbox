/**
 * Verplichtingen_Afleiden.js — Leidt de verwachte onderwijsagenda's af (US-01, T001b).
 *
 * Voor het gekozen academisch jaar en de gekozen opleiding(en) wordt uit de klassen en
 * het curriculum van gs_basedata afgeleid welke onderwijsagenda's er moeten komen.
 * Elke verplichting wordt bepaald door: academisch jaar + trimester + opleiding + vak + klas.
 * De docent speelt GEEN rol (besluit B06; de docentkoppeling komt in T001d).
 *
 * Deze functie leest en schrijft niets. Ze krijgt de gelezen basedata en de selectie,
 * en geeft { verplichtingen, signaleringen, samenvatting }. Dezelfde invoer geeft altijd
 * dezelfde uitvoer, in dezelfde volgorde.
 *
 * Regels (besluiten B05 t/m B15, plus PB-10 t/m PB-12):
 *  - Alleen onderwijseenheden van het type Vak (CONFIG_TYPE_VAK) met verzorgd = ja tellen mee.
 *      ja   = JA, 1, TRUE   |   nee = NEE, 0, FALSE   |   leeg = niet verzorgd, wel melden per lespakket
 *      Een andere waarde telt niet mee en geeft een waarschuwing.
 *  - Tegenstrijdig = geen verplichting aanmaken en een fout melden. Niets wordt stil opgelost.
 *  - Ontbreekt er iets dat niet kritiek is: wel aanmaken (waar mogelijk) en een waarschuwing melden.
 *  - trimester_id wint van periode_id: een afwijkende periode geeft alleen een waarschuwing.
 *  - curriculum.is_open wordt genegeerd.
 *  - Bewust uitgesloten regels (geen Vak, verzorgd = nee) worden alleen geteld in de samenvatting (PB-11).
 *  - ALLE betekent: elke opleiding in het tabblad opleidingen. Een opleiding zonder klassen in het
 *    jaar geeft een waarschuwing (PB-10).
 *
 * Signaleringen (type, ernst):
 *  KLAS_ZONDER_LESPAKKET fout | OPLEIDING_ONBEKEND fout | KLAS_JAAR_CONFLICT fout |
 *  TRIMESTER_ONBEKEND fout | TRIMESTER_JAAR_CONFLICT fout | OPLEIDING_CONFLICT fout |
 *  OE_ONBEKEND fout | DUBBELE_SLEUTEL fout |
 *  LESPAKKET_NIET_COMPLEET waarschuwing | LESPAKKET_ZONDER_CURRICULUM waarschuwing |
 *  VERZORGD_LEEG waarschuwing | VERZORGD_ONBEKEND waarschuwing | PERIODE_AFWIJKEND waarschuwing |
 *  OPLEIDING_ZONDER_KLASSEN waarschuwing
 *
 * Wrapper voor jou (zonder parameters, te starten in de editor):
 *   genereerVerplichtingen_dryRun()   (schrijft niets)
 */

// ── Hulpfuncties ───────────────────────────────────────────────────────────────

/**
 * Vertaalt een ja/nee-waarde uit de bron. Geeft 'ja', 'nee', 'leeg' of 'onbekend'.
 * Eén functie voor alle ja/nee-kolommen (verzorgd, vakken_compleet_bevestigd).
 */
function verplichtingen_vertaalVerzorgd_(waarde) {
  var w = (waarde === null || waarde === undefined) ? '' : String(waarde).trim().toUpperCase();
  if (w === 'JA' || w === '1' || w === 'TRUE') return 'ja';
  if (w === '') return 'leeg';
  if (w === 'NEE' || w === '0' || w === 'FALSE') return 'nee';
  return 'onbekend';
}

/** Bouwt een index { id: rij } zonder prototype-problemen. De eerste rij met een ID wint. */
function verplichtingen_indexeer_(rijen, sleutelKolom) {
  var index = Object.create(null);
  rijen.forEach(function (r) {
    var id = r[sleutelKolom];
    if (id !== '' && !(id in index)) index[id] = r;
  });
  return index;
}

/** Maakt de natuurlijke sleutel (PB-12). Een ID met het scheidingsteken is een fout. */
function verplichtingen_maakSleutel_(delen) {
  delen.forEach(function (d) {
    if (String(d).indexOf(CONFIG_SLEUTEL_SCHEIDING) !== -1) {
      throw new Error('Het ID "' + d + '" bevat het scheidingsteken "' + CONFIG_SLEUTEL_SCHEIDING +
        '" en kan niet in een sleutel. Controleer de bron.');
    }
  });
  return delen.join(CONFIG_SLEUTEL_SCHEIDING);
}

function verplichtingen_vergelijk_(a, b) {
  return a < b ? -1 : (a > b ? 1 : 0);
}

// ── Afleiden ───────────────────────────────────────────────────────────────────

/**
 * Leidt de verwachte onderwijsagenda's af.
 * basedata = uitkomst van bron_leesBasedata_(); selectie = uitkomst van config_genereerSelectie_().
 */
function verplichtingen_leidAf_(basedata, selectie) {
  var T = basedata.tabs;
  var jaar = selectie.academischjaarId;

  var jaren = verplichtingen_indexeer_(T.academischjaar, 'academischjaar_id');
  var opleidingen = verplichtingen_indexeer_(T.opleidingen, 'opleiding_id');
  var leerjaren = verplichtingen_indexeer_(T.leerjaren, 'leerjaar_id');
  var trimesters = verplichtingen_indexeer_(T.trimesters, 'trimester_id');
  var lespakketten = verplichtingen_indexeer_(T.lespakketten, 'lespakket_id');
  var eenheden = verplichtingen_indexeer_(T.onderwijs_eenheid, 'onderwijs_eenheid_id');

  if (!(jaar in jaren)) {
    throw new Error('Academisch jaar "' + jaar + '" bestaat niet in gs_basedata (controleer instelling GENEREER_ACADEMISCHJAAR_ID).');
  }
  if (!selectie.alleOpleidingen && !(selectie.opleidingId in opleidingen)) {
    throw new Error('Opleiding "' + selectie.opleidingId + '" bestaat niet in gs_basedata (controleer instelling GENEREER_OPLEIDING_ID).');
  }

  // Periode die bij een trimester en leerjaar hoort (trimester_perioden).
  var periodeVan = Object.create(null);
  T.trimester_perioden.forEach(function (m) {
    var sl = m.trimester_id + CONFIG_SLEUTEL_SCHEIDING + m.leerjaar_id;
    if (!(sl in periodeVan)) periodeVan[sl] = m.periode_id;
  });

  // Curriculumregels per lespakket, in bronvolgorde.
  var curriculumVan = Object.create(null);
  T.curriculum.forEach(function (c) {
    (curriculumVan[c.lespakket_id] = curriculumVan[c.lespakket_id] || []).push(c);
  });

  var signaleringen = [];
  function meld(type, ernst, sleutel, tabNaam, rij, tekst) {
    signaleringen.push(bron_maakSignalering_(type, ernst, sleutel,
      bron_bronregel_(BRON_NAAM_BASEDATA, tabNaam, rij._bronRij), tekst));
  }

  // Samenvatting per opleiding; telling van uitgesloten regels is per klas-regelcombinatie.
  var perOpleiding = {};
  function tel(oplId) {
    if (!perOpleiding[oplId]) {
      perOpleiding[oplId] = { klassen: 0, verplichtingen: 0, nietVak: 0, verzorgdNee: 0, verzorgdLeeg: 0, verzorgdOnbekend: 0 };
    }
    return perOpleiding[oplId];
  }
  var opleidingenInScope = selectie.alleOpleidingen
    ? Object.keys(opleidingen).sort(verplichtingen_vergelijk_)
    : [selectie.opleidingId];
  opleidingenInScope.forEach(function (o) { tel(o); });

  // 1. Klassen van het jaar: lespakket, opleiding en jaar controleren.
  var klassenVanJaar = T.klassen.filter(function (k) { return k.academischjaar_id === jaar; });
  klassenVanJaar.sort(function (a, b) { return verplichtingen_vergelijk_(a.klas_id, b.klas_id); });

  var klassenPerLespakket = Object.create(null);
  var lespakketVolgorde = [];

  klassenVanJaar.forEach(function (k) {
    var lp = lespakketten[k.lespakket_id];
    if (!lp) {
      meld('KLAS_ZONDER_LESPAKKET', SIGNALERING_ERNST.FOUT, k.klas_id, 'klassen', k,
        'Klas ' + k.klas_id + ' verwijst naar lespakket "' + k.lespakket_id + '" dat niet bestaat of leeg is. Er worden geen verplichtingen voor deze klas aangemaakt.');
      return;
    }
    var oplId = lp.opleiding_id;
    if (!(oplId in opleidingen)) {
      meld('OPLEIDING_ONBEKEND', SIGNALERING_ERNST.FOUT, lp.lespakket_id, 'lespakketten', lp,
        'Lespakket ' + lp.lespakket_id + ' verwijst naar opleiding "' + oplId + '" die niet bestaat. Klas ' + k.klas_id + ' krijgt geen verplichtingen.');
      return;
    }
    if (!selectie.alleOpleidingen && oplId !== selectie.opleidingId) return;   // buiten de selectie

    tel(oplId).klassen++;

    var leerjaar = leerjaren[lp.leerjaar_id];
    var jaarViaLespakket = leerjaar ? leerjaar.academischjaar_id : '';
    if (jaarViaLespakket !== k.academischjaar_id) {
      meld('KLAS_JAAR_CONFLICT', SIGNALERING_ERNST.FOUT, k.klas_id, 'klassen', k,
        'Klas ' + k.klas_id + ' hoort bij jaar ' + k.academischjaar_id + ', maar lespakket ' + lp.lespakket_id +
        ' leidt via leerjaar naar jaar ' + (jaarViaLespakket || 'onbekend') + '. Er worden geen verplichtingen voor deze klas aangemaakt.');
      return;
    }
    if (!(lp.lespakket_id in klassenPerLespakket)) {
      klassenPerLespakket[lp.lespakket_id] = [];
      lespakketVolgorde.push(lp.lespakket_id);
    }
    klassenPerLespakket[lp.lespakket_id].push(k);
  });

  // 2. Per lespakket (één keer): curriculum controleren en regels bepalen.
  var verplichtingen = [];
  var gezien = Object.create(null);
  lespakketVolgorde.sort(verplichtingen_vergelijk_);

  lespakketVolgorde.forEach(function (lpId) {
    var lp = lespakketten[lpId];
    var klassen = klassenPerLespakket[lpId];
    var t = tel(lp.opleiding_id);

    if (verplichtingen_vertaalVerzorgd_(lp.vakken_compleet_bevestigd) !== 'ja') {
      meld('LESPAKKET_NIET_COMPLEET', SIGNALERING_ERNST.WAARSCHUWING, lp.lespakket_id, 'lespakketten', lp,
        'Lespakket ' + lp.lespakket_id + ' (' + lp.lespakket_code + ') is niet als compleet bevestigd. Het curriculum kan onvolledig zijn.');
    }

    var regels = curriculumVan[lpId] || [];
    if (regels.length === 0) {
      meld('LESPAKKET_ZONDER_CURRICULUM', SIGNALERING_ERNST.WAARSCHUWING, lp.lespakket_id, 'lespakketten', lp,
        'Lespakket ' + lp.lespakket_id + ' heeft geen curriculumregels. Er worden geen verplichtingen aangemaakt voor de ' + klassen.length + ' klas(sen).');
      return;
    }

    var geldig = [];
    var gezienRegel = Object.create(null);
    var aantalLeeg = 0;
    var nietVak = 0, nee = 0, onbekend = 0;

    regels.forEach(function (c) {
      var trim = trimesters[c.trimester_id];
      if (!trim) {
        meld('TRIMESTER_ONBEKEND', SIGNALERING_ERNST.FOUT, c.curriculum_id, 'curriculum', c,
          'Curriculumregel ' + c.curriculum_id + ' verwijst naar trimester "' + c.trimester_id + '" dat niet bestaat.');
        return;
      }
      if (trim.academischjaar_id !== jaar) {
        meld('TRIMESTER_JAAR_CONFLICT', SIGNALERING_ERNST.FOUT, c.curriculum_id, 'curriculum', c,
          'Curriculumregel ' + c.curriculum_id + ' hoort bij trimester ' + trim.trimester_id + ' van jaar ' + trim.academischjaar_id +
          ', maar lespakket ' + lp.lespakket_id + ' wordt gebruikt in jaar ' + jaar + '.');
        return;
      }
      if (trim.opleiding_id !== lp.opleiding_id) {
        meld('OPLEIDING_CONFLICT', SIGNALERING_ERNST.FOUT, c.curriculum_id, 'curriculum', c,
          'Curriculumregel ' + c.curriculum_id + ' hoort bij trimester ' + trim.trimester_id + ' van opleiding ' + trim.opleiding_id +
          ', maar lespakket ' + lp.lespakket_id + ' hoort bij opleiding ' + lp.opleiding_id + '.');
        return;
      }
      var eenheid = eenheden[c.onderwijs_eenheid_id];
      if (!eenheid) {
        meld('OE_ONBEKEND', SIGNALERING_ERNST.FOUT, c.curriculum_id, 'curriculum', c,
          'Curriculumregel ' + c.curriculum_id + ' verwijst naar onderwijseenheid "' + c.onderwijs_eenheid_id + '" die niet bestaat.');
        return;
      }
      if (eenheid.onderwijs_eenheid_type_id !== CONFIG_TYPE_VAK) { nietVak++; return; }

      var verzorgd = verplichtingen_vertaalVerzorgd_(c.verzorgd);
      if (verzorgd === 'leeg') { aantalLeeg++; return; }
      if (verzorgd === 'nee') { nee++; return; }
      if (verzorgd === 'onbekend') {
        onbekend++;
        meld('VERZORGD_ONBEKEND', SIGNALERING_ERNST.WAARSCHUWING, c.curriculum_id, 'curriculum', c,
          'Curriculumregel ' + c.curriculum_id + ' heeft verzorgd = "' + c.verzorgd + '". Dat is geen herkende waarde; de regel telt niet mee.');
        return;
      }

      var regelSleutel = c.trimester_id + CONFIG_SLEUTEL_SCHEIDING + c.onderwijs_eenheid_id;
      if (regelSleutel in gezienRegel) {
        meld('DUBBELE_SLEUTEL', SIGNALERING_ERNST.FOUT, lp.lespakket_id + CONFIG_SLEUTEL_SCHEIDING + regelSleutel, 'curriculum', c,
          'Curriculumregel ' + c.curriculum_id + ' is dubbel met ' + gezienRegel[regelSleutel] +
          ' (zelfde lespakket, trimester en onderwijseenheid). De tweede telt niet mee.');
        return;
      }
      gezienRegel[regelSleutel] = c.curriculum_id;

      var afgeleid = periodeVan[c.trimester_id + CONFIG_SLEUTEL_SCHEIDING + lp.leerjaar_id];
      if (afgeleid === undefined || afgeleid !== c.periode_id) {
        meld('PERIODE_AFWIJKEND', SIGNALERING_ERNST.WAARSCHUWING, c.curriculum_id, 'curriculum', c,
          'Curriculumregel ' + c.curriculum_id + ' heeft periode "' + c.periode_id + '", afgeleid uit trimester en leerjaar is dat "' +
          (afgeleid === undefined ? 'niet te bepalen' : afgeleid) + '". Het trimester wint; de verplichting blijft bestaan.');
      }
      geldig.push(c);
    });

    t.nietVak += nietVak * klassen.length;
    t.verzorgdNee += nee * klassen.length;
    t.verzorgdLeeg += aantalLeeg * klassen.length;
    t.verzorgdOnbekend += onbekend * klassen.length;
    if (aantalLeeg > 0) {
      meld('VERZORGD_LEEG', SIGNALERING_ERNST.WAARSCHUWING, lp.lespakket_id, 'lespakketten', lp,
        'Lespakket ' + lp.lespakket_id + ': ' + aantalLeeg + ' curriculumregel(s) van het type Vak hebben een lege verzorgd. ' +
        'Een lege waarde telt als niet verzorgd; er worden geen verplichtingen voor aangemaakt.');
    }

    // 3. Per klas van dit lespakket de verplichtingen maken.
    klassen.forEach(function (k) {
      geldig.forEach(function (c) {
        var sleutel = verplichtingen_maakSleutel_([jaar, c.trimester_id, lp.opleiding_id, c.onderwijs_eenheid_id, k.klas_id]);
        if (sleutel in gezien) {
          meld('DUBBELE_SLEUTEL', SIGNALERING_ERNST.FOUT, sleutel, 'curriculum', c,
            'Verplichting ' + sleutel + ' bestaat al (curriculumregel ' + gezien[sleutel] + '). De tweede telt niet mee.');
          return;
        }
        gezien[sleutel] = c.curriculum_id;
        verplichtingen.push({
          sleutel: sleutel,
          academischjaarId: jaar,
          trimesterId: c.trimester_id,
          opleidingId: lp.opleiding_id,
          onderwijsEenheidId: c.onderwijs_eenheid_id,
          klasId: k.klas_id,
          lespakketId: lp.lespakket_id,
          curriculumId: c.curriculum_id,
          bronRij: c._bronRij
        });
        t.verplichtingen++;
      });
    });
  });

  // 4. Opleidingen zonder klassen in dit jaar (PB-10).
  opleidingenInScope.forEach(function (oplId) {
    if (perOpleiding[oplId].klassen === 0) {
      meld('OPLEIDING_ZONDER_KLASSEN', SIGNALERING_ERNST.WAARSCHUWING, oplId, 'opleidingen', opleidingen[oplId],
        'Opleiding ' + oplId + ' heeft geen klassen in ' + jaar + '. Er worden geen verplichtingen aangemaakt.');
    }
  });

  // 5. Vaste volgorde: opleiding, klas, trimester, onderwijseenheid.
  verplichtingen.sort(function (a, b) {
    return verplichtingen_vergelijk_(a.opleidingId, b.opleidingId) ||
      verplichtingen_vergelijk_(a.klasId, b.klasId) ||
      verplichtingen_vergelijk_(a.trimesterId, b.trimesterId) ||
      verplichtingen_vergelijk_(a.onderwijsEenheidId, b.onderwijsEenheidId);
  });

  var perType = {};
  signaleringen.forEach(function (s) {
    var k = s.ernst + ' / ' + s.type;
    perType[k] = (perType[k] || 0) + 1;
  });

  return {
    verplichtingen: verplichtingen,
    signaleringen: signaleringen,
    samenvatting: {
      academischjaarId: jaar,
      alleOpleidingen: selectie.alleOpleidingen,
      opleidingId: selectie.opleidingId,
      totaalVerplichtingen: verplichtingen.length,
      perOpleiding: perOpleiding,
      signaleringenPerType: perType
    }
  };
}

// ── Wrapper voor jou (zonder parameters) ───────────────────────────────────────

/** Schrijft het resultaat van een run in het uitvoerlogboek. Alleen lezen en loggen. */
function verplichtingen_logResultaat_(selectie, leesSignaleringen, uit) {
  var s = uit.samenvatting;
  Logger.log('DRY-RUN verwachte onderwijsagenda\'s: er is niets geschreven.');
  Logger.log('Selectie: academisch jaar ' + s.academischjaarId + ', opleiding ' + (s.alleOpleidingen ? 'ALLE' : s.opleidingId));
  Logger.log('Per opleiding (uitgesloten = aantal klas-regelcombinaties):');
  Object.keys(s.perOpleiding).sort(verplichtingen_vergelijk_).forEach(function (o) {
    var t = s.perOpleiding[o];
    Logger.log('  ' + o + ': klassen ' + t.klassen + ', verplichtingen ' + t.verplichtingen +
      ' | uitgesloten: geen Vak ' + t.nietVak + ', verzorgd nee ' + t.verzorgdNee +
      ', verzorgd leeg ' + t.verzorgdLeeg + ', verzorgd onbekend ' + t.verzorgdOnbekend);
  });
  Logger.log('Totaal verplichtingen: ' + s.totaalVerplichtingen);

  var alle = leesSignaleringen.concat(uit.signaleringen);
  var perType = {};
  alle.forEach(function (x) {
    var k = x.ernst + ' / ' + x.type;
    perType[k] = (perType[k] || 0) + 1;
  });
  Logger.log('Signaleringen: ' + alle.length);
  Object.keys(perType).sort(verplichtingen_vergelijk_).forEach(function (k) { Logger.log('  ' + k + ': ' + perType[k]); });
  alle.slice(0, 25).forEach(function (x) {
    Logger.log('  [' + x.ernst + '] ' + x.type + ' | ' + x.bronregel + ' | ' + x.tekst);
  });
  if (alle.length > 25) Logger.log('  ... en ' + (alle.length - 25) + ' meer.');

  Logger.log('Voorbeeld (eerste 10 verplichtingen):');
  uit.verplichtingen.slice(0, 10).forEach(function (v) { Logger.log('  ' + v.sleutel); });
}

/**
 * Leidt de verwachte onderwijsagenda's af voor de selectie in Script Properties
 * (GENEREER_ACADEMISCHJAAR_ID en GENEREER_OPLEIDING_ID) en toont het resultaat
 * in het uitvoerlogboek. Schrijft NIETS: geen bron, geen registratie.
 */
function genereerVerplichtingen_dryRun() {
  var selectie = config_genereerSelectie_();
  var basedata = bron_leesBasedata_();
  var uit = verplichtingen_leidAf_(basedata, selectie);
  verplichtingen_logResultaat_(selectie, basedata.signaleringen, uit);
}
