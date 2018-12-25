'use strict';


/**
 * @name sequenceable
 * @description mongoose plugin to support sequence fields.
 * @return {Object} valid mongoose instance.
 * @author lally elias <lallyelias87@mail.com>
 * @since  0.1.0
 * @version 0.1.0
 * @license MIT
 * @public
 * @example
 * const mongoose = require('@lykmapipo/mongoose-sequenceable');
 * 
 * new Schema({
 *   ssn: { type: String, sequenceable: true }
 * });
 *
 * new Schema({
 *   number: { type: String, sequenceable: { increment: 10 } }
 * });
 * 
 */


/* dependencies */
const _ = require('lodash');
const { getNumber } = require('@lykmapipo/env');
const mongoose = require('mongoose');
const { include } = require('@lykmapipo/include');
const { SchemaString, MongooseError } = require('@lykmapipo/mongoose-common');
const { isInstance } = require('@lykmapipo/mongoose-common');
const Counter = include(__dirname, 'lib', 'counter.model');


/* constants */
const _error = ('`{VALUE}` is not a valid sequence value for path `{PATH}`.');
MongooseError.messages.String.sequenceable = _error;
const DEFAULT_VALUE = 'sequence';
const SEQUENCE_PAD = getNumber('SEQUENCE_PAD', '0');
const SEQUENCE_LENGTH = getNumber('SEQUENCE_LENGTH', 4);


/**
 * @description default sequence formatter
 * @param {Object} optns
 * @param {String} optns.namespace sequence namespace
 * @param {String} optns.prefix sequence prefix
 * @param {String} optns.sequence sequence number
 * @param {String} optns.suffix sequence suffix
 * @param {String} optns.length sequence length
 * @param {String} optns.pad sequence pad
 * @private
 */
function _format(optns) {
  // obtain options
  const { prefix, sequence, suffix, length, pad } = optns;
  //add pads if sequence length < length
  let _sequence = _.padStart(sequence, length, pad);
  // format sequence number
  _sequence = [prefix, _sequence, suffix].join('');
  // return formatted sequence
  return _sequence;
}


/**
 * @description Sequence validator factory
 * @param {Object} optns valid sequenciable options
 * @private
 */
function createValidator(optns) {
  return function sequenceValidator(v, cb) {
    /* this -> Model instance */

    // TODO return if value is not DEFAULT_SEQUENCE

    // normalize options
    let options = _.merge({}, optns);
    let { namespace, prefix, increment, suffix } = options;
    let { length, pad, format, pathName } = options;
    namespace = (namespace ? namespace : _.get(this, 'constructor.modelName'));
    prefix = (_.isFunction(prefix) ? _.bind(prefix, this)() : prefix);
    suffix = (_.isFunction(suffix) ? _.bind(suffix, this)() : suffix);
    length = (length || SEQUENCE_LENGTH);
    pad = (pad ? pad : SEQUENCE_PAD);
    format =
      (_.isFunction(format) ? _.bind(format, this) : _.bind(_format, this));

    // re-construct sequence generator options
    options = ({ namespace, prefix, increment, suffix, length, pad });
    options = _.omitBy(options, _.isUndefined);

    //TODO ignore is path has valid sequence pattern
    // generate sequence
    Counter.generate(options, function afterGenerateSequence(error, counter) {
      // set generated sequence
      if (isInstance(this) && pathName) {
        if (isInstance(counter)) {
          const { namespace, prefix, sequence, suffix } = counter.toObject();
          this[pathName] =
            format({ namespace, prefix, sequence, suffix, length, pad });
        } else {
          this[pathName] = undefined;
        }
      }

      // notify generation completed
      const isValid = (!_.isError(error) && !_.isEmpty(this[pathName]));
      cb(isValid);
    }.bind(this));

  };
}


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
  /* this -> String -> SchemaType */

  // ensure no sequence validator exists
  if (this.sequenceableValidator) {
    this.validators = this.validators.filter(function (v) {
      return v.validator !== this.sequenceableValidator;
    }, this);
  }

  // force default value for sequencing
  this.defaultValue = DEFAULT_VALUE;

  // obtain current schema path name
  const pathName = this.path;

  // add sequenceable validator
  const defaults = { pathName };
  const shouldApply = (optns !== null && optns !== undefined);
  if (shouldApply) {
    // normalize options
    let options =
      (_.isBoolean(optns) ? defaults : _.merge({}, defaults, optns));

    // collect sequenceable validation message
    let msg = (message || MongooseError.messages.String.sequenceable);
    msg = (options.message || msg);

    // add sequenceable validator
    this.validators.push({
      isAsync: true,
      validator: this.sequenceableValidator = createValidator(options),
      message: msg,
      type: 'sequenceable'
    });
  }

  /* return */
  return this;

};


/* exports mongoose */
module.exports = exports = mongoose;