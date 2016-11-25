'use strict';

module.exports = function(stream) {
  let nextPromise, resolve, reject;
  let paused = false;
  let finished = false;
  let returned = false;
  let iterating = false;

  function createNextPromise() {
    if (finished) return;
    returned = false;
    nextPromise = new Promise((resolveNext, rejectNext) => {
      resolve = resolveNext;
      reject = rejectNext;
    });
  }

  createNextPromise();

  stream.on('data', (data) => {
    if (finished) return;
    stream.pause();
    paused = true;
    const currentResolve = resolve;
    createNextPromise();
    currentResolve(data);
  });

  stream.on('end', () => {
    if (finished) return;
    finished = true;
    resolve();
    stream = null;
  });

  stream.on('error', (err) => {
    if (finished) return;
    finished = true;
    reject(err);
    stream = null;
  });

  stream.resume();

  function getNext() {
    if (returned && !finished) {
      return Promise.reject(new Error('Previous promise must be resolved before a new promise can be requested.'));
    }
    let promise = nextPromise;
    returned = true;
    setImmediate(()=>{
      if (paused && !finished) {
        paused = false;
        stream.resume();
      }
    });
    return promise;
  }

  let iterator={};
  let nextValue = undefined;
  let nextErr = undefined;
  let nextReturned = true;

  function nextData(err, value) {
    let thisErr = nextErr;
    let thisValue = nextValue;
    nextValue = value;
    nextErr = err;
    nextReturned = false;
    if (thisErr) throw thisErr;
    return thisValue;
  }

  function next() {
    return getNext().then(value => nextData(null, value), err => nextData(err));
  }

  iterator[Symbol.iterator] = function() {
    if (iterating) throw new Error('Cannot iterate over a stream multiple times.');
    iterating = true;
    return {
      next: function(){
        if (nextReturned) {
          throw new Error('Previous promise must be resolved before the next iteration can be requested.')
        }
        nextReturned = true;
        if (nextErr) throw nextErr;
        return {
          done: nextValue === undefined,
          value: next()
        }
      }
    }
  };

  nextValue = iterator;

  return next();
};
