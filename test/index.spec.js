'use strict';

/* dependencies */
const { expect } = require('chai');
const { include } = require('@lykmapipo/include');
const { clear } = require('@lykmapipo/mongoose-test-helpers');
const mongoose = include(__dirname, '..');
const { Schema, SchemaString, model } = require('@lykmapipo/mongoose-common');


describe('sequenceable', () => {

  before(done => clear(done));

  const Ticket = model(new Schema({
    number: { type: String, sequenceable: true, required: true }
  }));

  it('should add validator to schema string', () => {
    expect(mongoose).to.exist;
    expect(SchemaString.prototype.sequenceable).to.exist;
    expect(SchemaString.prototype.sequenceable).to.be.a('function');
  });

  it('should be able to generate sequence', (done) => {
    const ticket = new Ticket();
    ticket.validate((error) => {
      expect(error).to.not.exist;
      expect(ticket.number).to.exist;
      done(error, ticket);
    });
  });

  after(done => clear(done));

});