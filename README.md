basicset-shunt
==============

This is a module that dispatches operations. I use it for APIs that support batch processing.

Usage
-----

First, you create the shunt object.

    var shunt = require('basicset-shunt').createShunt();

Then, you define _operatives_, which are function that carry out the work of the operations.

    shunt
      .addOperative('sumUpArray', function(params, done, prevOpResult) {
        var value = params.reduce(
          function add(sum, next) { return sum + next; }, 0
        );
        done('Added', value);        
      })
      .addOperative('multiplyArray', function(params, done, prevOpResult) {
        var value = params.reduce(
          function multiply(product, next) { return product * next; }, 1
        );
        done('Multiplied', runningProduct);
      })
      .addOperative('delayNumberReturn', function(params, done, prevOpResult) {
        setTimeout(function giveNumber() {
          done('Gave back', params.number);
        },
        params.delay);
      });

addOperative tells shunt which functions map to which string keys. Each operative is expected to have a function signature that takes:

1. __params__, which can be anything
2. __done__, a callback function which takes a status string (which could indicate an error) and whatever value the operative wants to report.
3. __prevOpResult__, which is the _result_ object (explained further down) from the previous operation in the sequence. This could be null.

Finally, you call _runSequenceGroup_, passing it:

1. opSequenceGroups: An array of arrays containing _operation_ objects. Each subarray is a sequence. The operations in that sequence are guaranteed to run one after another, and each operation will have access to the result of the previous one.

The sequences themselves do not run in a guaranteed order. If you have a bunch of operations you want to run and don't care about order, you can pass an array of arrays, each of which has only one operation object.

2. writableStream: A [http://nodejs.org/api/stream.html#stream_class_stream_writable](writble stream) in object mode. runSequenceGroup will write result objects (the results of the operations) to it as it produces them.

    var resultStream = Writable({objectMode: true});

    resultStream._write = function reportResult(result, encoding, next) {
      console.log('id:', result.id);
      console.log('status:', result.status);
      console.log('value:', result.value);
      next();
    };

    resultStream.on('finish', function reportDone() {
      console.log('All done with operations.');
    });

    shunt.runSequenceGroup([
      [
        {
          id: 'op1',
          op: 'delayNumberReturn',
          params: [3, 4, 5, 10]
        },
        {
          id: 'op2',
          op: 'multiplyArray',
          params: [1000, 0.5]
        }
      ],
      [
        {
          id: 'op3',
          op: 'sumUpArray',
          params: [800, -45]
        }
      ]
    ],
    resultStream);

Operation objects
-----------------

Each operation object should have these properties:
- __id__: A unique identifier that the client can use to match results to the requestion operations.
- __op__: A string indicating the operative to use to execute the operation.
- __params__: The params to pass to the operative. Can be anything the operative expects.

Result objects
--------------

Result objects properties:
- __id__: An identifier that matches the operation object that was used to produce this result.
- __status__: A string indicating how the operation went.
- __value__: The result of the operation.


How to run the tests
--------------------

    mocha --ui tdd -R spec tests/shunttests.js

License
-------

MIT.
