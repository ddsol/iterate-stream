# Iterate-Stream

### Installation

```sh
npm install iterate-stream --save
```

### Intro

Streams don't fit coroutines very well. Streams are asynchronous emitters and so you can't loop over the data.

However, with [co](https://github.com/tj/co) and [bluebird-co](https://github.com/novacrazy/bluebird-co) you can loop over asynchronous sources by suspending in the middle of the loop with a `yield`.

This package allows you to turn a stream into an iterable that you can use with `for (x of y)`.

Because streams are asynchronous, it's imperative that somewhere in the loop you put a `yield` to pause the loop until the next item is available. This means you can only use this inside of a generator function (or `async` function if your environment supports it).

It works by returning promises as the iterated values. Each promise will be resolved when either the next item in the stream is available, or when the stream ends or errors.

Because the iterable needs to know if an item is the last item upon return of the item, `iterable-stream` makes sure it always knows the outcome of the previous item. In other words, the current item's promise doesn't resolve until the next item is available.

Because of this, the `iterable-stream` function itself returns a promise that you must wait on to get the iterator itself.

The result is a very clean stream handling.

```js
    for (let item of yield iterateStream(stream)) {
      console.log(yield item);
    }
```

### API

```js
iterateStream(stream)
```
Returns a Promise which will resolve to an [iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators#Iterables). The returned iterable will return an iterator that will return promises.

An error will be thrown if the previous promise was not resolved by the time the next one is requested.

An error will also be thrown if more than one iterator is requested.

If an error occurs on the stream, the final promise will be rejected with the error.

### Example

```js
'use strict';

const co =require('co');
const fs = require('fs');
const byline = require('byline');
const iterateStream = require('iterate-stream');

co(function*(){
  try {
    let readme = fs.createReadStream('very-large-text-file.txt', { encoding: 'utf8' });
    let stream = byline(readme, { keepEmptyLines: true });
    let lineNum = 1;

    for (let line of yield iterateStream(stream)) {
      console.log(`${lineNum++}: ${yield line}`);
    }
  } catch (err) {
    console.error(err.stack);
  }
});

```
