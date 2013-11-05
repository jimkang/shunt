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

suite('Set up operatives', function setUpSuite() {

  test('should set operatives', function instantiateModule() {
    session.shunt
      .addOperative('addArrayToRunningSum', 
        settings.operatives.addArrayToRunningSum)
      .addOperative('multiplyArrayAndRunningSum', 
        settings.operatives.multiplyArrayAndRunningSum)
      .addOperative('giveBackANumberLater', 
        settings.operatives.giveBackANumberLater)
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

  test('should execute pickKeyFromDict once', 
    function runPickKeyFromDict(testDone) {
      var planArray = ['hide', 'GET', 'chomp'];

      var resultStream = Writable({objectMode: true});
      resultStream._write = function checkResult(result, encoding, next) {
        assert.equal(result.status, 'Got');
        assert.deepEqual(result.value, planArray);
        next();
      };
      resultStream.on('finish', testDone);

      session.shunt.runSequenceGroup([
          [
            {
              id: 'singlePickKeyFromDict',
              op: 'pickKeyFromDict',
              params: {
                dict: {
                  name: 'mrrp',
                  profitable: true,
                  plan: planArray
                },
                key: 'plan'
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

suite('Op sequences', function sequenceSuite() {

  test('should execute addArrayToRunningSum and multiplyArrayAndRunningSum', 
    function runAddAndMultiplySequence(testDone) {
      var resultStream = Writable({objectMode: true});

      resultStream._write = function checkResult(result, encoding, next) {
        switch (result.id) {
          case 'testOp1':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 22);
            assert.equal(session.runningSum, 22);
            break;
          case 'testOp2':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 11000);
            assert.equal(session.runningSum, 11000);
            break;
          case 'testOp3':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 11755);
            assert.equal(session.runningSum, 11755);
            break;
        }

        next();
      };
      
      resultStream.on('finish', testDone);

      session.shunt.runSequenceGroup([
          [
            {
              id: 'testOp1',
              op: 'addArrayToRunningSum',
              params: [3, 4, 5, 10]
            },
            {
              id: 'testOp2',
              op: 'multiplyArrayAndRunningSum',
              params: [1000, 0.5]
            },
            {
              id: 'testOp3',
              op: 'addArrayToRunningSum',
              params: [800, -45]
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

