/**
 * run.js — Testrunner voor de sandboxtests.
 *
 * Gebruik (vanuit de hoofdmap van het project):   node _tests/run.js
 *
 * Werking:
 *  1. Maakt één gedeelde context, zoals Apps Script alle .js-bestanden in één
 *     globale scope laadt.
 *  2. Laadt _tests/gas-stubs.js en daarna alle servercode (*.js in de hoofdmap).
 *  3. Draait alle _tests/*.test.js. Vóór elke test wordt __reset() aangeroepen.
 *
 * In een testbestand zijn beschikbaar: test(naam, fn), assert (Node), en alle
 * globale functies uit de servercode en de stubs.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var testMap = __dirname;
var hoofdMap = path.resolve(testMap, '..');

var context = vm.createContext({ console: console, assert: assert });
function laad(bestand) {
  vm.runInContext(fs.readFileSync(bestand, 'utf8'), context, { filename: bestand });
}

laad(path.join(testMap, 'gas-stubs.js'));

var serverBestanden = fs.readdirSync(hoofdMap)
  .filter(function (f) { return f.endsWith('.js'); })
  .sort();
serverBestanden.forEach(function (f) { laad(path.join(hoofdMap, f)); });

var tests = [];
context.test = function (naam, fn) { tests.push({ naam: naam, fn: fn }); };

var testBestanden = fs.readdirSync(testMap)
  .filter(function (f) { return f.endsWith('.test.js'); })
  .sort();
testBestanden.forEach(function (f) {
  var start = tests.length;
  laad(path.join(testMap, f));
  for (var i = start; i < tests.length; i++) tests[i].bestand = f;
});

console.log('Servercode geladen: ' + (serverBestanden.join(', ') || '(geen)'));
console.log('Testbestanden:      ' + (testBestanden.join(', ') || '(geen)'));
console.log('');

var geslaagd = 0, mislukt = 0;
tests.forEach(function (t) {
  context.__reset();
  try {
    t.fn();
    geslaagd++;
    console.log('  ✓ ' + t.bestand + ' › ' + t.naam);
  } catch (e) {
    mislukt++;
    console.log('  ✗ ' + t.bestand + ' › ' + t.naam);
    console.log('      ' + String(e && e.message || e).split('\n').join('\n      '));
  }
});

console.log('');
console.log(geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
process.exitCode = mislukt > 0 ? 1 : 0;
