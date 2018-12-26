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
const { getNumber, getString } = require('@lykmapipo/env');
const moment = require('moment');
const mongoose = require('mongoose');
const { include } = require('@lykmapipo/include');
const { SchemaString, MongooseError } = require('@lykmapipo/mongoose-common');
const { isInstance } = require('@lykmapipo/mongoose-common');
const Counter = include(__dirname, 'lib', 'counter.model');


/* constants */
const _error = ('`{VALUE}` is not a valid sequence value for path `{PATH}`.');
MongooseError.messages.String.sequenceable = _error;
const DEFAULT_VALUE = 'sequence';
const SEQUENCE_YEAR_FORMAT = getString('SEQUENCE_YEAR_FORMAT', 'YY');
const SEQUENCE_PAD = getNumber('SEQUENCE_PAD', '0');
const SEQUENCE_LENGTH = getNumber('SEQUENCE_LENGTH', 4);


/**
 * @description create prefix generator
 * @param {String|Function} [prefix] custom prefix
 * @private
 */
function createPrefix(prefix) {
  if (_.isFunction(prefix)) {
    return prefix;
  }
  return function _prefix() {
    if (_.isEmpty(prefix)) {
      return moment(new Date()).format(SEQUENCE_YEAR_FORMAT);
    } else {
      return prefix;
    }
  };
}


/**
 * @description create suffix generator
 * @param {String|Function} [suffix] custom suffix
 * @private
 */
function createSuffix(suffix) {
  if (_.isFunction(suffix)) {
    return suffix;
  }
  return function _suffix() {
    if (_.isEmpty(suffix)) {
      return '';
    } else {
      return suffix;
    }
  };
}


/**
 * @description create sequence formatter
 * @param {Function} [prefix] custom sequence formatter
 * @private
 */
function createFormat(format) {
  if (_.isFunction(format)) {
    return format;
  }
  return function _format(optns) {
    // obtain options
    const { prefix, sequence, suffix, length, pad } = optns;
    //add pads if sequence length < length
    let _sequence = _.padStart(sequence, length, pad);
    // format sequence number
    _sequence = [prefix, _sequence, suffix].join('');
    // return formatted sequence
    return _sequence;
  };
}


/**
 * @description Sequence validator factory
 * @param {Object} optns valid sequenciable options
 * @private
 */
function createValidator(optns) {
  return function sequenceValidator(v, cb) {
    /* this -> Model instance */

    // normalize options
    let options = _.merge({}, optns);
    let { namespace, prefix, increment, suffix } = options;
    let { length, pad, format, pathName } = options;
    namespace = (namespace ? namespace : _.get(this, 'constructor.modelName'));
    prefix = _.bind(createPrefix(prefix), this)();
    suffix = _.bind(createSuffix(suffix), this)();
    length = (length || SEQUENCE_LENGTH);
    pad = (pad ? pad : SEQUENCE_PAD);
    format = _.bind(createFormat(format), this);

    // re-construct sequence generator options
    options = ({ namespace, prefix, increment, suffix, length, pad });
    options = _.omitBy(options, _.isUndefined);

    // exit early if path has valid sequence
    const isSequence = ((v !== DEFAULT_VALUE) && _.startsWith(v, prefix));
    if (isSequence) {
      return cb(true);
    }

    // generate sequence
    Counter.generate(options, function afterGenerateSequence(error, counter) {
      // set generated sequence
      if (isInstance(this) && pathName) {
        if (isInstance(counter)) {
          const date = moment(new Date());
          const { namespace, prefix, sequence, suffix } = counter.toObject();
          const _options =
            ({ namespace, prefix, sequence, suffix, length, pad, date });
          this[pathName] = format(_options);
        } else {
          this[pathName] = undefined;
        }
      }

      // notify generation completed
      const isValid = (!_.isError(error) && !_.isEmpty(this[pathName]));
      return cb(isValid);
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