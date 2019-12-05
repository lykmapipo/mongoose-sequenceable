'use strict';

/* dependencies */
const _ = require('lodash');
const async = require('async');
const { expect } = require('chai');
const { clear } = require('@lykmapipo/mongoose-test-helpers');
const mongoose = require('../');
const { Schema, SchemaString, model } = require('@lykmapipo/mongoose-common');


describe('sequenceable', () => {

  before(done => clear(done));

  //wait indexes
  before((done) => _.delay(done, 2000));

  it('should add validator to schema string', () => {
    expect(mongoose).to.exist;
    expect(SchemaString.prototype.sequenceable).to.exist;
    expect(SchemaString.prototype.sequenceable).to.be.a('function');
  });

  it('should be able to generate sequence', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: true,
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with string prefix', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: { prefix: 'VIP' },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('VIP');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with function prefix', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: { prefix: () => 'VIP' },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('VIP');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with function prefix', (done) => {
    const Ticket = model(new Schema({
      category: {
        type: String
      },
      number: {
        type: String,
        sequenceable: { prefix: function () { return this.category; } },
        required: true
      }
    }));

    const ticket = new Ticket({ category: 'VIP' });
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('VIP');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with string suffix', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: { suffix: 'TZ' },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('TZ');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with function suffix', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: { suffix: () => 'TZ' },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('TZ');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with function suffix', (done) => {
    const Ticket = model(new Schema({
      country: {
        type: String
      },
      number: {
        type: String,
        sequenceable: { suffix: function () { return this.country; } },
        required: true
      }
    }));

    const ticket = new Ticket({ country: 'TZ' });
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('TZ');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with custom increment', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: { increment: 10 },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('10');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with custom length', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: { length: 10 },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.have.length.at.least(10);
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with custom pad', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: { length: 10, pad: 'x' },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('x');
      expect(ticket.number).to.not.contain('0');
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with custom format', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: {
          format: function (options) {
            const { prefix, sequence, date } = options;
            const day = date.clone().format('MMDD');
            return [prefix, sequence, day].join('-');
          }
        },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('-');
      expect(ticket.number).to.contain(new Date().getDate());
      done(error, ticket);
    });
  });

  it('should be able to generate sequence with custom options', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: {
          prefix: 'V',
          suffix: 'TZ',
          increment: 10,
          length: 10,
          pad: '0',
          format: function (options) {
            const { prefix, sequence, suffix } = options;
            const { length, pad, date } = options;
            const day = date.clone().format('YYMMDD');
            const _sequence = _.padStart(sequence, length, pad);
            return [prefix, day, _sequence, suffix].join('-');
          }
        },
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      expect(ticket.number).to.contain('V');
      expect(ticket.number).to.contain('TZ');
      expect(ticket.number).to.contain('0');
      expect(ticket.number).to.contain('-');
      done(error, ticket);
    });
  });

  it('should not generate sequence is already set', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: true,
        required: true
      }
    }));

    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      const number = ticket.number;
      ticket.validate((_error) => {
        expect(ticket.number).to.be.equal(number);
        done(error || _error, ticket);
      });
    });
  });

  it('should be able to generate unique sequence in parallel', (done) => {
    const Ticket = model(new Schema({
      number: {
        type: String,
        sequenceable: true,
        required: true
      }
    }));

    const vip = new Ticket();
    const other = new Ticket();
    async.parallel({
      vip: (next) => vip.validate(next),
      other: (next) => other.validate(next)
    }, (error) => {
      expect(error).to.not.exist;
      expect(vip.number).to.exist;
      expect(other.number).to.exist;
      expect(other.number).to.not.be.equal(vip.number);
      done(error);
    });
  });

  after(done => clear(done));

});