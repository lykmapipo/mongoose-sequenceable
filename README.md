# mongoose-sequenceable

[![Build Status](https://app.travis-ci.com/lykmapipo/mongoose-sequenceable.svg?branch=master)](https://app.travis-ci.com/lykmapipo/mongoose-sequenceable)
[![Dependencies Status](https://david-dm.org/lykmapipo/mongoose-sequenceable.svg)](https://david-dm.org/lykmapipo/mongoose-sequenceable)
[![Coverage Status](https://coveralls.io/repos/github/lykmapipo/mongoose-sequenceable/badge.svg?branch=master)](https://coveralls.io/github/lykmapipo/mongoose-sequenceable?branch=master)
[![GitHub License](https://img.shields.io/github/license/lykmapipo/mongoose-sequenceable)](https://github.com/lykmapipo/mongoose-sequenceable/blob/develop/LICENSE)

[![Commitizen Friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Code Style](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)
[![npm version](https://img.shields.io/npm/v/@lykmapipo/mongoose-sequenceable)](https://www.npmjs.com/package/@lykmapipo/mongoose-sequenceable)

mongoose plugin to support sequence fields. 

## Requirements

- [NodeJS v13+](https://nodejs.org)
- [Npm v6.12+](https://www.npmjs.com/)
- [MongoDB v4+](https://www.mongodb.com/)
- [Mongoose v6+](https://github.com/Automattic/mongoose)

## Install
```sh
$ npm install --save mongoose @lykmapipo/mongoose-sequenceable
```

## Usage

```javascript
import mongoose from 'mongoose';
import '@lykmapipo/mongoose-sequenceable';

const Ticket = mongoose.model(
  'Ticket',
  new mongoose.Schema({
    customer: { type: String, required: true },
    number: { type: String, required: true, sequenceable: true },
  })
);

Ticket.create({ customer: 'Joe Doe' }, (error, ticket) => {
  console.log(ticket.number); //=> 210001
});
```

## References
- [Create an Auto-Incrementing Sequence Field](https://docs.mongodb.com/v3.0/tutorial/create-an-auto-incrementing-field)

## Contribute
It will be nice, if you open an issue first so that we can know what is going on, then, fork this repo and push in your ideas. Do not forget to add a bit of test(s) of what value you adding.

## Licence
The MIT License (MIT)

Copyright (c) lykmapipo & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
