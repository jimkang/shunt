// These tests need to be run with the "--ui tdd" switch.

var assert = require('assert');
var uid = require('./uid').uid;
var Writable = require('stream').Writable;

/* Settings */

var settings = {
  operatives: {
    addArrayToRunningSum: function addArrayToRunningSum(params, done, 
      prevOpResult) {

      var value = params.reduce(
        function add(sum, next) { return sum + next; }, 0
      );
      var runningSum = value;
      if (prevOpResult && typeof prevOpResult.value === 'number') {
        runningSum += prevOpResult.value;
      }
      done('Added', runningSum);
    },
    multiplyArrayToRunningProd: function multiplyArrayToRunningProd(params, 
      done, prevOpResult) {

      var value = params.reduce(
        function multiply(product, next) { return product * next; }, 1
      );
      var runningProduct = value;
      if (prevOpResult && typeof prevOpResult.value === 'number') {
        runningProduct *= prevOpResult.value;
      }

      done('Multiplied', runningProduct);      
    },
    giveBackANumberLater: function giveBackANumberLater(params, done,
      prevOpResult) {

      setTimeout(function giveNumber() {
        done('Gave back', params.number);
      },
      params.delay);
    },
    pickKeyFromDict: function pickKeyFromDict(params, done, prevOpResult) {
      done('Got', params.dict[params.key]);
    }
  }
};

/* Session */

var session = {
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
      .addOperative('multiplyArrayToRunningProd', 
        settings.operatives.multiplyArrayToRunningProd)
      .addOperative('giveBackANumberLater', 
        settings.operatives.giveBackANumberLater)
      .addOperative('pickKeyFromDict', 
        settings.operatives.pickKeyFromDict);

    assert.equal('function', 
      typeof session.shunt.operativesForOpNames.addArrayToRunningSum,
      'Could not find operative in shunt operative map.');
    assert.equal('function', 
      typeof session.shunt.operativesForOpNames.multiplyArrayToRunningProd,
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

  test('should execute multiplyArrayToRunningProd once', 
    function runmultiplyArrayToRunningProd(testDone) {
      var resultStream = Writable({objectMode: true});
      resultStream._write = function checkResult(result, encoding, next) {
        assert.equal(result.status, 'Multiplied');
        assert.equal(result.value, 600);
        next();
      };
      resultStream.on('finish', testDone);

      session.shunt.runSequenceGroup([
          [
            {
              id: 'singlemultiplyArrayToRunningProd',
              op: 'multiplyArrayToRunningProd',
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

});

suite('Op sequences', function sequenceSuite() {

  test('should execute addArrayToRunningSum and multiplyArrayToRunningProd', 
    function runAddAndMultiplySequence(testDone) {
      var resultStream = Writable({objectMode: true});

      resultStream._write = function checkResult(result, encoding, next) {
        switch (result.id) {
          case 'testOp1':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 22);
            break;
          case 'testOp2':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 11000);
            break;
          case 'testOp3':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 11755);
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
            op: 'multiplyArrayToRunningProd',
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

  test('should execute giveBackANumberLater, multiply, and add', 
    function runMultiplyGiveBackAddSequence(testDone) {
      var resultStream = Writable({objectMode: true});

      resultStream._write = function checkResult(result, encoding, next) {
        switch (result.id) {
          case 'testOp1':
            assert.equal(result.status, 'Gave back');
            assert.equal(result.value, 666);
            break;
          case 'testOp2':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 2331000);
            break;
          case 'testOp3':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 2335568);
            break;
        }

        next();
      };

      resultStream.on('finish', testDone);

      session.shunt.runSequenceGroup([
        [
          {
            id: 'testOp1',
            op: 'giveBackANumberLater',
            params: {
                number: 666,
                delay: 300
              }
          },
          {
            id: 'testOp2',
            op: 'multiplyArrayToRunningProd',
            params: [1000, 0.5, 7]
          },
          {
            id: 'testOp3',
            op: 'addArrayToRunningSum',
            params: [1, 4567]
          }
        ]
      ],
      resultStream);
    }
  );

});

suite('Op sequence groups', function sequenceGroupSuite() {

  test('should execute add and multiply independently of each other', 
    function runAddAndMultiplySequence(testDone) {
      var resultStream = Writable({objectMode: true});

      resultStream._write = function checkResult(result, encoding, next) {
        switch (result.id) {
          case 'testOp1':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 22);
            break;
          case 'testOp2':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 500);
            break;
          case 'testOp3':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 755);
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
          }
        ],
        [
          {
            id: 'testOp2',
            op: 'multiplyArrayToRunningProd',
            params: [1000, 0.5]
          }
        ],
        [
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

  test('should execute three sequences independently of each other', 
    function runAddAndMultiplySequence(testDone) {
      var resultStream = Writable({objectMode: true});

      resultStream._write = function checkResult(result, encoding, next) {
        // console.log('Got result for ', result.id);
        switch (result.id) {
          case 'testOp1':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 22);
            break;
          case 'testOp2':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 11000);
            break;
          case 'testOp3':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 11755);
            break;
          case 'testOp4':
            assert.equal(result.status, 'Gave back');
            assert.equal(result.value, 666);
            break;
          case 'testOp5':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 2331000);
            break;
          case 'testOp6':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 2335568);
            break;
          case 'testOp7':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 5040);
            break;
          case 'testOp8':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 126);
            break;
          case 'testOp9':
            assert.equal(result.status, 'Multiplied');
            assert.equal(result.value, 3780000000);
            break;
          case 'testOp10':
            assert.equal(result.status, 'Added');
            assert.equal(result.value, 3780001245);
            break;
          case 'testOp11':
            assert.equal(result.status, 'Gave back');
            assert.equal(result.value, 24);
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
            op: 'multiplyArrayToRunningProd',
            params: [1000, 0.5]
          },
          {
            id: 'testOp3',
            op: 'addArrayToRunningSum',
            params: [800, -45]
          }
        ],
        [
          {
            id: 'testOp4',
            op: 'giveBackANumberLater',
            params: {
              number: 666,
              delay: 300
            }
          },
          {
            id: 'testOp5',
            op: 'multiplyArrayToRunningProd',
            params: [1000, 0.5, 7]
          },
          {
            id: 'testOp6',
            op: 'addArrayToRunningSum',
            params: [1, 4567]
          }
        ],
        [
          {
            id: 'testOp7',
            op: 'multiplyArrayToRunningProd',
            params: [1, 2, 3, 4, 5, 6, 7]
          },
          {
            id: 'testOp8',
            op: 'multiplyArrayToRunningProd',
            params: [0.125, 0.2]
          },
          {
            id: 'testOp9',
            op: 'multiplyArrayToRunningProd',
            params: [1000, 5000, 2, 3]
          },
          {
            id: 'testOp10',
            op: 'addArrayToRunningSum',
            params: [900, 345]
          },
          {
            id: 'testOp11',
            op: 'giveBackANumberLater',
            params: {
              number: 24,
              delay: 200
            }
          }
        ]
      ],
      resultStream);
    }
  );

});

