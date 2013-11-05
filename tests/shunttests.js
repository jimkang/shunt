// These tests need to be run with the "--ui tdd" switch.

var assert = require('assert');
var uid = require('./uid').uid;
var Writable = require('stream').Writable;

/* Settings */

var settings = {
  operatives: {
    addArrayToRunningSum: function addArrayToRunningSum(params, done) {
      var value = params.reduce(
        function add(sum, next) { return sum + next; }, 0
      );
      session.runningSum += value;
      done('Added', session.runningSum);
    },
    multiplyArrayAndRunningSum: function multiplyArrayAndRunningSum(params, 
      done) {

      var value = params.reduce(
        function multiply(product, next) { return product * next; }, 1
      );
      session.runningSum *= value;
      done('Multiplied', session.runningSum);      
    },
    giveBackANumberLater: function giveBackANumberLater(params, done) {
      setTimeout(function giveNumber() {
        done('Gave back', params.number);
      },
      params.delay);
    },
    failureOp: function failureOp(params, done) {
      done('Failed', null);
    },
    pickKeyFromDict: function pickKeyFromDict(params, done) {
      done('Got', params.dict[params.key]);
    }
  }
};

/* Session */

var session = {
  runningSum: 0,
  shunt: null
};

/* The tests */

suite('Instantiation', function instantiationSuite() {

  test('should create the module', function instantiateModule() {
    session.shunt = require('../shunt').createShunt();
    assert.ok(session.shunt, 'Could not create shunt');
  });

});

suite('Set up', function setUpSuite() {

  test('should set operatives', function instantiateModule() {
    session.shunt
      .addOperative('addArrayToRunningSum', 
        settings.operatives.addArrayToRunningSum)
      .addOperative('multiplyArrayAndRunningSum', 
        settings.operatives.multiplyArrayAndRunningSum)
      .addOperative('giveBackANumberLater', 
        settings.operatives.giveBackANumberLater)
      .addOperative('failureOp', 
        settings.operatives.failureOp)
      .addOperative('pickKeyFromDict', 
        settings.operatives.pickKeyFromDict);

    assert.equal('function', 
      typeof session.shunt.operativesForOpNames.addArrayToRunningSum,
      'Could not find operative in shunt operative map.');
    assert.equal('function', 
      typeof session.shunt.operativesForOpNames.multiplyArrayAndRunningSum,
      'Could not find operative in shunt operative map.');
    assert.equal('function', 
      typeof session.shunt.operativesForOpNames.giveBackANumberLater,
      'Could not find operative in shunt operative map.');
    assert.equal('function', 
      typeof session.shunt.operativesForOpNames.failureOp,
      'Could not find operative in shunt operative map.');
    assert.equal('function', 
      typeof session.shunt.operativesForOpNames.pickKeyFromDict,
      'Could not find operative in shunt operative map.');
  });

});

suite('Single op', function singleOpSuite() {

  test('should execute addArrayToRunningSum once', 
    function runAddArrayToRunningSum(testDone) {
      var resultStream = Writable({objectMode: true});
      resultStream._write = function checkResult(result, encoding, next) {
        assert.equal(result.status, 'Added');
        assert.equal(result.value, 22);
        assert.equal(session.runningSum, 22);
        next();
      };
      resultStream.on('finish', testDone);

      session.shunt.runSequenceGroup([
          [
            {
              id: 'singleAddArrayTestOp',
              op: 'addArrayToRunningSum',
              params: [3, 4, 5, 10]
            }
          ]
        ],
        resultStream);
    }
  );

  test('should execute multiplyArrayAndRunningSum once', 
    function runMultiplyArrayAndRunningSum(testDone) {
      session.runningSum = 2;

      var resultStream = Writable({objectMode: true});
      resultStream._write = function checkResult(result, encoding, next) {
        assert.equal(result.status, 'Multiplied');
        assert.equal(result.value, 1200);
        assert.equal(session.runningSum, 1200);
        next();
      };
      resultStream.on('finish', testDone);

      session.shunt.runSequenceGroup([
          [
            {
              id: 'singleMultiplyArrayAndRunningSum',
              op: 'multiplyArrayAndRunningSum',
              params: [3, 4, 5, 10]
            }
          ]
        ],
        resultStream);
    }
  );

  test('should execute async op (giveBackANumberLater) once', 
    function runGiveBackANumberLater(testDone) {
      var resultStream = Writable({objectMode: true});
      resultStream._write = function checkResult(result, encoding, next) {
        assert.equal(result.status, 'Gave back');
        assert.equal(result.value, 666);
        next();
      };
      resultStream.on('finish', testDone);

      session.shunt.runSequenceGroup([
          [
            {
              id: 'singleGiveBackANumberLater',
              op: 'giveBackANumberLater',
              params: {
                number: 666,
                delay: 300
              }
            }
          ]
        ],
        resultStream);
    }
  );


  suiteTeardown(function resetSum() {
    session.runningSum = 0;
  });
});


