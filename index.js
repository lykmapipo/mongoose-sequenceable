'use strict';


/**
 * @name sequenceable
 * @description mongoose plugin to support sequence fields.
 * @param {Schema} schema valid mongoose schema
 * @param {Object} [optns] valid sequenceable plugin options
 * @see {@link https://docs.mongodb.com/v3.0/tutorial/create-an-auto-incrementing-field/}
 * @return {Function} valid mongoose plugin
 * @author lally elias <lallyelias87@mail.com>
 * @since  0.1.0
 * @version 0.1.0
 * @example
 * const mongoose = require('@lykmapipo/mongoose-sequenceable');
 * const EmployeeSchema = new Schema({
 *   ssn: { 
 *     sequenceable: {
 *       namespace: 'ssn', 
 *       increment: 1, 
 *       prefix: 'EM', 
 *       prefix: fn, 
 *       suffix: fn,
 *       format: fn
 *      } 
 *   }
 * });
 */


/* dependencies */
const _ = require('lodash');
const mongoose = require('mongoose');
const { include } = require('@lykmapipo/include');
const { SchemaString, MongooseError } = require('@lykmapipo/mongoose-common');
const { isInstance } = require('@lykmapipo/mongoose-common');
const Counter = include(__dirname, 'lib', 'counter.model');


/* constants */
const _error = ('`{VALUE}` is not a valid sequence value for path `{PATH}`.');
MongooseError.messages.String.sequenceable = _error;
const DEFAULT_VALUE = 'sequence';


/**
 * Sets sequenceable validator and transformer.
 *
 * ####Example:
 *
 *     var s = new Schema({ ssn: { type: String, sequenceable: true }})
 *     var M = db.model('M', s);
 *     var m = new M();
 *     m.save(function (err) {
 *       console.log(m.ssn) // '20180001'
 *     })
 *     
 *
 * @param {Boolean|Object} optns sequenceable validation options
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @api public
 */
SchemaString.prototype.sequenceable = function sequenceable(optns, message) {

  if (this.sequenceableValidator) {
    this.validators = this.validators.filter(function (v) {
      return v.validator !== this.sequenceableValidator;
    }, this);
  }

  // force default value for sequencing
  this.defaultValue = DEFAULT_VALUE;

  // obtain schema path name
  const pathName = this.path;

  // run validator
  if (optns !== null && optns !== undefined) {

    // normalize options
    let options = (_.isBoolean(optns) ? {} : _.merge({}, optns));

    // collect sequenceable validator options
    let msg = (message || MongooseError.messages.String.sequenceable);
    msg = (options.message || msg);

    // collect validator
    this.validators.push({
      isAsync: true,
      validator: this.sequenceableValidator = function (v, cb) {
        // TODO return if value is not DEFAULT_SEQUENCE
        // obtain model name
        const namespace = _.get(this, 'constructor.modelName');
        options = _.merge({}, { namespace }, options);
        //TODO ignore is path has valid sequence pattern
        // generate sequence
        Counter.generate(options, function (error, sequence) {
          // set generated sequence
          if (isInstance(this)) {
            this[pathName] = sequence;
          }

          // notify generation completed
          const isValid = (!_.isError(error) && !_.isEmpty(sequence));
          cb(isValid);
        }.bind(this));
      },
      message: msg,
      type: 'sequenceable'
    });
  }

  return this;

};


/* exports mongoose */
module.exports = exports = mongoose;