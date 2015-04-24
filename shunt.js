var exportMethods = require('export-methods');

function createShunt() {
  var operativesForOpNames = {};

  // Operatives are expected to take:
  //  params, callback, (optional) prevOpResult
  // The callback takes a error and a value.
  
  function addOperative(opname, operative) {
    operativesForOpNames[opname] = operative;
    return exports;
  }

  function operativeExists(opname) {
    return (opname in operativesForOpNames);
  }

  // Runs an array of sequence groups (each of which is an array of opData 
  // objects) and writes results to the given stream.
  //
  // Groups are not guaranteed to finish one after the other.
  function runSequenceGroup(opSequenceGroups, 
    writableStream) {

    var opResults = [];
    var finishedSequenceCount = 0;

    for (var i = 0; i < opSequenceGroups.length; ++i) {
      var sequence = opSequenceGroups[i];
      runSequence(sequence, i, writableStream, sequenceDone);
    }

    function sequenceDone() {
      ++finishedSequenceCount;
      if (finishedSequenceCount === opSequenceGroups.length) {
        writableStream.end();
      }
    }
  }

  // Sequences are guaranteed to finish one after the other.
  function runSequence(opArray, sequenceNumber, writableStream, sequenceDone) {
    var finishedOpCount = 0;
    var opResults = [];
    var opErrors = [];

    if (opArray.length > 0) {
      runOp(opArray[0], opDone, null);
    }
    else {
      sequenceDone();
    }

    function runOp(opData, done, prevOpResult) {
      opData.sequenceNumber = sequenceNumber;
      operate(opData, opDone, prevOpResult);
    }

    function opDone(result) {
      ++finishedOpCount;
      writableStream.write(result);

      if (finishedOpCount < opArray.length) {
        // TODO: Next tick?
        var opData = opArray[finishedOpCount];
        runOp(opData, opDone, result);
      }
      else {
        sequenceDone();
      }
    }
  }

  function operate(opData, done, prevOpResult) {
    if (!opData.op || !(opData.op in operativesForOpNames)) {
      done('Not understood', null);
    }
    else {
      var operative = operativesForOpNames[opData.op];
      operative(opData.params, function operativeDone(error, value) {
        var result = {
          id: opData.id,
          error: error,
          value: value
        };        
        done(result);
      },
      prevOpResult);
    }
  }

  var exports = exportMethods(
    addOperative,
    operativeExists,
    runSequenceGroup,
    runSequence
  );
  
  return exports;
}

module.exports = createShunt;
