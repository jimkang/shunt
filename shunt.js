function createShunt() {
  var shunt = {
    operativesForOpNames: {}
  };

  // Operatives are expected to take a params variable and call a callback that 
  // takes a status (which can be an error) and a value.
  
  shunt.addOperative = function addOperative(opname, operative) {
    this.operativesForOpNames[opname] = operative;
    return shunt;
  };

  // Runs an array of sequence groups (each of which is an array of opData 
  // objects) and writes results to the given stream.
  //
  // Groups are not guaranteed to finish one after the other.
  shunt.runSequenceGroup = function runSequenceGroup(opSequenceGroups, 
    writableStream) {

    var opResults = [];
    var finishedSequenceCount = 0;

    for (var i = 0; i < opSequenceGroups.length; ++i) {
      var sequence = opSequenceGroups[i];
      this.runSequence(sequence, i, writableStream, sequenceDone);
    }

    function sequenceDone() {
      ++finishedSequenceCount;
      if (finishedSequenceCount === opSequenceGroups.length) {
        writableStream.end();
      }
    }
  };

  // Sequences are guaranteed to finish one after the other.
  shunt.runSequence = function runSequence(opArray, sequenceNumber, 
    writableStream, sequenceDone) {

    var finishedOpCount = 0;
    var opResults = [];
    var opErrors = [];

    if (opArray.length > 0) {
      runOp(opArray[0], opDone);
    }
    else {
      sequenceDone();
    }

    function runOp(opData, done) {
      opData.sequenceNumber = sequenceNumber;
      shunt.operate(opData, opDone);
    }

    function opDone(result) {
      ++finishedOpCount;
      writableStream.write(result);

      if (finishedOpCount < opArray.length) {
        // Next tick?
        var opData = opArray[finishedOpCount];
        runOp(opData, opDone);
      }
      else {
        sequenceDone();
      }
    }
  };

  shunt.operate = function operate(opData, done) {
    if (!opData.op || !(opData.op in this.operativesForOpNames)) {
      done('Not understood', null);
    }
    else {
      var operative = this.operativesForOpNames[opData.op];
      operative(opData.params, function operativeDone(status, value) {
        var result = {
          id: opData.id,
          status: status,
          value: value
        };        
        done(result);
      });
    }
  };

  return shunt;
}

module.exports.createShunt = createShunt;
