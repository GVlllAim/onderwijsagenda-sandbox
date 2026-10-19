/**
 * gas-stubs.js — Nagebootste Google Apps Script-diensten voor sandboxtests in Node.
 *
 * Wordt door run.js in dezelfde context geladen als de servercode.
 *
 * BRONBESCHERMING: een spreadsheet die met { alleenLezen: true } is aangemaakt
 * (de bronnen gs_basedata, gs_docentenbeheer, rooster) gooit een fout bij ELKE
 * schrijfpoging. Zet dit niet uit: zo bewijst elke test dat de app niet naar
 * een bron schrijft (KWALITEITSREGELS §1).
 *
 * Testhulpen (beginnen met __):
 *   __reset()                                   alles leegmaken (run.js doet dit vóór elke test)
 *   __maakSpreadsheet(id, { tab: [[kop...], [rij...]] }, { alleenLezen })
 *   __leesTabblad(id, tab)                      2D-array met de huidige inhoud
 *   __zetGebruiker(email)                       wie is Session.getActiveUser()
 *   __zetProperties({ SLEUTEL: 'waarde' })      Script Properties vullen
 *   __maakMap(id) / __maakBestand(id, naam)     Drive-objecten
 *   __laatKopierenFalen(bestandId)              volgende makeCopy van dit bestand faalt
 *   __schrijfpogingenNaarBron()                 aantal geweigerde schrijfpogingen
 *   __formatenVan(id, tab)                      lijst met setNumberFormat-aanroepen op dat tabblad
 *
 * SHEETS-GEDRAG (T001c): net als in Google Sheets wordt een tekst die op een datum of een getal
 * lijkt bij setValues/setValue omgezet naar een echte datum of een getal, tenzij de cel eerst het
 * formaat '@' (platte tekst) heeft gekregen via setNumberFormat('@'). appendRow wordt niet omgezet.
 */

var __state;

function __reset() {
  __state = {
    spreadsheets: {},
    properties: {},
    gebruiker: 'test@sandbox.local',
    mappen: {},
    bestanden: {},
    faalKopie: {},
    bronSchrijfpogingen: 0,
    cache: {},
    teller: 0,
    log: []
  };
}
__reset();

function __bronFout(id, actie) {
  __state.bronSchrijfpogingen++;
  throw new Error('BRONBESCHERMING: schrijfpoging (' + actie + ') naar alleen-lezen bron ' + id);
}

// ── Spreadsheets ───────────────────────────────────────────────────────────────

function __maakSpreadsheet(id, tabbladen, opties) {
  var ss = { id: id, alleenLezen: !!(opties && opties.alleenLezen), tabs: {},
             tijdzone: (opties && opties.tijdzone) || 'America/Paramaribo',
             tekstCellen: {}, formaten: [] };
  Object.keys(tabbladen || {}).forEach(function (naam) {
    ss.tabs[naam] = tabbladen[naam].map(function (r) { return r.slice(); });
  });
  __state.spreadsheets[id] = ss;
  return ss;
}

function __leesTabblad(id, naam) {
  var ss = __state.spreadsheets[id];
  if (!ss || !ss.tabs[naam]) throw new Error('Onbekend tabblad ' + id + '/' + naam);
  return ss.tabs[naam].map(function (r) { return r.slice(); });
}

function __schrijfpogingenNaarBron() { return __state.bronSchrijfpogingen; }

function __formatenVan(id, naam) {
  var ss = __state.spreadsheets[id];
  if (!ss) throw new Error('Onbekende spreadsheet ' + id);
  return ss.formaten.filter(function (f) { return f.tab === naam; }).map(function (f) { return Object.assign({}, f); });
}

function __breedte(data) {
  return data.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
}

function __maakRange(ss, naam, rij, kol, aantalRijen, aantalKol) {
  function data() { return ss.tabs[naam]; }
  function schrijfCheck(actie) { if (ss.alleenLezen) __bronFout(ss.id, actie); }
  function celSleutel(r, c) { return naam + '|' + r + '|' + c; }
  function zoalsSheetsHetLeest(r, c, v) {
    if (typeof v !== 'string') return v;
    if (ss.tekstCellen[celSleutel(r, c)]) return v;
    if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(v)) {
      return new Date(v.length === 10 ? v + 'T00:00:00' : v.replace(' ', 'T'));
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  }
  return {
    setNumberFormat: function (formaat) {
      schrijfCheck('setNumberFormat');
      ss.formaten.push({ tab: naam, rij: rij, kol: kol, aantalRijen: aantalRijen, aantalKol: aantalKol, formaat: formaat });
      if (formaat === '@') {
        for (var r = 0; r < aantalRijen; r++) for (var c = 0; c < aantalKol; c++) ss.tekstCellen[celSleutel(rij + r, kol + c)] = true;
      }
      return this;
    },
    getValues: function () {
      var uit = [];
      for (var r = 0; r < aantalRijen; r++) {
        var bron = data()[rij - 1 + r] || [];
        var regel = [];
        for (var c = 0; c < aantalKol; c++) {
          var v = bron[kol - 1 + c];
          regel.push(v === undefined ? '' : v);
        }
        uit.push(regel);
      }
      return uit;
    },
    getValue: function () { return this.getValues()[0][0]; },
    getDisplayValues: function () {
      return this.getValues().map(function (r) { return r.map(function (v) { return String(v); }); });
    },
    setValues: function (waarden) {
      schrijfCheck('setValues');
      if (waarden.length !== aantalRijen || waarden.some(function (r) { return r.length !== aantalKol; })) {
        throw new Error('setValues: afmeting komt niet overeen met range (' + aantalRijen + 'x' + aantalKol + ')');
      }
      for (var r = 0; r < aantalRijen; r++) {
        var doel = data()[rij - 1 + r] || (data()[rij - 1 + r] = []);
        for (var c = 0; c < aantalKol; c++) doel[kol - 1 + c] = zoalsSheetsHetLeest(rij + r, kol + c, waarden[r][c]);
      }
      return this;
    },
    setValue: function (w) {
      schrijfCheck('setValue');
      var doel = data()[rij - 1] || (data()[rij - 1] = []);
      doel[kol - 1] = zoalsSheetsHetLeest(rij, kol, w);
      return this;
    },
    clearContent: function () {
      schrijfCheck('clearContent');
      for (var r = 0; r < aantalRijen; r++) {
        var doel = data()[rij - 1 + r];
        if (doel) for (var c = 0; c < aantalKol; c++) doel[kol - 1 + c] = '';
      }
      return this;
    },
    getRow: function () { return rij; },
    getColumn: function () { return kol; },
    getNumRows: function () { return aantalRijen; },
    getNumColumns: function () { return aantalKol; }
  };
}

function __maakSheet(ss, naam) {
  function data() { return ss.tabs[naam]; }
  function schrijfCheck(actie) { if (ss.alleenLezen) __bronFout(ss.id, actie); }
  return {
    getName: function () { return naam; },
    getLastRow: function () { return data().length; },
    getLastColumn: function () { return __breedte(data()); },
    getDataRange: function () {
      return __maakRange(ss, naam, 1, 1, Math.max(data().length, 1), Math.max(__breedte(data()), 1));
    },
    getRange: function (rij, kol, aantalRijen, aantalKol) {
      return __maakRange(ss, naam, rij, kol, aantalRijen || 1, aantalKol || 1);
    },
    appendRow: function (rij) { schrijfCheck('appendRow'); data().push(rij.slice()); return this; },
    deleteRow: function (nr) { schrijfCheck('deleteRow'); data().splice(nr - 1, 1); return this; },
    insertRowAfter: function (nr) { schrijfCheck('insertRowAfter'); data().splice(nr, 0, []); return this; },
    clear: function () { schrijfCheck('clear'); ss.tabs[naam] = []; return this; }
  };
}

function __maakSpreadsheetObject(ss) {
  return {
    getId: function () { return ss.id; },
    getSpreadsheetTimeZone: function () { return ss.tijdzone; },
    getSheetByName: function (naam) { return ss.tabs[naam] ? __maakSheet(ss, naam) : null; },
    getSheets: function () { return Object.keys(ss.tabs).map(function (n) { return __maakSheet(ss, n); }); },
    insertSheet: function (naam) {
      if (ss.alleenLezen) __bronFout(ss.id, 'insertSheet');
      ss.tabs[naam] = [];
      return __maakSheet(ss, naam);
    }
  };
}

var SpreadsheetApp = {
  openById: function (id) {
    var ss = __state.spreadsheets[id];
    if (!ss) throw new Error('Spreadsheet niet gevonden: ' + id);
    return __maakSpreadsheetObject(ss);
  },
  getActiveSpreadsheet: function () {
    throw new Error('getActiveSpreadsheet is niet beschikbaar: de app is zelfstandig, gebruik openById via Config');
  },
  flush: function () {}
};

// ── Properties, sessie, lock, cache, utilities, logger ────────────────────────

function __zetProperties(obj) { Object.keys(obj).forEach(function (k) { __state.properties[k] = String(obj[k]); }); }
function __zetGebruiker(email) { __state.gebruiker = email; }

var PropertiesService = {
  getScriptProperties: function () {
    return {
      getProperty: function (k) { return Object.prototype.hasOwnProperty.call(__state.properties, k) ? __state.properties[k] : null; },
      setProperty: function (k, v) { __state.properties[k] = String(v); return this; },
      getProperties: function () { return Object.assign({}, __state.properties); },
      deleteProperty: function (k) { delete __state.properties[k]; return this; }
    };
  }
};

var Session = {
  getActiveUser: function () { return { getEmail: function () { return __state.gebruiker; } }; },
  getEffectiveUser: function () { return { getEmail: function () { return __state.gebruiker; } }; },
  getScriptTimeZone: function () { return 'America/Paramaribo'; }
};

var LockService = {
  getScriptLock: function () {
    return {
      tryLock: function () { return true; },
      waitLock: function () {},
      releaseLock: function () {},
      hasLock: function () { return true; }
    };
  }
};
LockService.getDocumentLock = LockService.getScriptLock;
LockService.getUserLock = LockService.getScriptLock;

var CacheService = {
  getScriptCache: function () {
    return {
      get: function (k) { return Object.prototype.hasOwnProperty.call(__state.cache, k) ? __state.cache[k] : null; },
      put: function (k, v) { __state.cache[k] = String(v); },
      remove: function (k) { delete __state.cache[k]; }
    };
  }
};

var Utilities = {
  getUuid: function () {
    __state.teller++;
    return '00000000-0000-4000-8000-' + String(__state.teller).padStart(12, '0');
  },
  formatDate: function (d, tz, patroon) {
    // Eenvoudige nabootsing: ondersteunt yyyy, MM, dd, HH, mm, ss. Tijdzone wordt genegeerd.
    var p = function (n) { return String(n).padStart(2, '0'); };
    return String(patroon)
      .replace('yyyy', d.getFullYear()).replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate()))
      .replace('HH', p(d.getHours())).replace('mm', p(d.getMinutes())).replace('ss', p(d.getSeconds()));
  },
  sleep: function () {}
};

var Logger = { log: function () { __state.log.push(Array.prototype.slice.call(arguments).join(' ')); } };

// ── Drive ────────────────────────────────────────────────────────────────────

function __maakMap(id) { __state.mappen[id] = { id: id, bestanden: [] }; return id; }
function __maakBestand(id, naam, mapId) {
  __state.bestanden[id] = { id: id, naam: naam, mapId: mapId || null };
  if (mapId && __state.mappen[mapId]) __state.mappen[mapId].bestanden.push(id);
  return id;
}
function __laatKopierenFalen(bestandId) { __state.faalKopie[bestandId] = true; }

function __mapObject(map) {
  return {
    getId: function () { return map.id; },
    getFiles: function () {
      var lijst = map.bestanden.slice(), i = 0;
      return {
        hasNext: function () { return i < lijst.length; },
        next: function () { return __bestandObject(__state.bestanden[lijst[i++]]); }
      };
    },
    getFilesByName: function (naam) {
      var lijst = map.bestanden.filter(function (b) { return __state.bestanden[b].naam === naam; }), i = 0;
      return {
        hasNext: function () { return i < lijst.length; },
        next: function () { return __bestandObject(__state.bestanden[lijst[i++]]); }
      };
    }
  };
}

function __bestandObject(b) {
  return {
    getId: function () { return b.id; },
    getName: function () { return b.naam; },
    makeCopy: function (naam, map) {
      if (__state.faalKopie[b.id]) { delete __state.faalKopie[b.id]; throw new Error('Kopiëren mislukt (gesimuleerd) voor ' + b.id); }
      __state.teller++;
      var nieuwId = 'kopie-' + __state.teller;
      __maakBestand(nieuwId, naam || b.naam, map ? map.getId() : null);
      return __bestandObject(__state.bestanden[nieuwId]);
    }
  };
}

var DriveApp = {
  getFileById: function (id) {
    if (!__state.bestanden[id]) throw new Error('Bestand niet gevonden: ' + id);
    return __bestandObject(__state.bestanden[id]);
  },
  getFolderById: function (id) {
    if (!__state.mappen[id]) throw new Error('Map niet gevonden: ' + id);
    return __mapObject(__state.mappen[id]);
  }
};
