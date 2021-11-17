import _ from 'lodash';
import { getNumber, getString } from '@lykmapipo/env';
import moment from 'moment';
import {
  SchemaString,
  MongooseError,
  isInstance,
} from '@lykmapipo/mongoose-common';
import Counter from './counter.model';

/* constants */
const $error = '`{VALUE}` is not a valid sequence value for path `{PATH}`.';
MongooseError.messages.String.sequenceable = $error;
const DEFAULT_VALUE = 'sequence';
const SEQUENCE_YEAR_FORMAT = getString('SEQUENCE_YEAR_FORMAT', 'YY');
const SEQUENCE_PAD = getNumber('SEQUENCE_PAD', '0');
const SEQUENCE_LENGTH = getNumber('SEQUENCE_LENGTH', 4);
const SEQUENCE_SEPARATOR = getNumber('SEQUENCE_SEPARATOR', '');

/**
 * @function createPrefix
 * @name createPrefix
 * @description create prefix generator
 * @param {string | Function} [prefix] custom prefix
 * @returns {Function} valid prefix
 * @private
 */
function createPrefix(prefix) {
  if (_.isFunction(prefix)) {
    return prefix;
  }
  return function doPrefix() {
    if (_.isEmpty(prefix)) {
      return moment(new Date()).format(SEQUENCE_YEAR_FORMAT);
    }
    return prefix;
  };
}

/**
 * @function createSuffix
 * @name createSuffix
 * @description create suffix generator
 * @param {string | Function} [suffix] custom suffix
 * @returns {Function} valid suffix
 * @private
 */
function createSuffix(suffix) {
  if (_.isFunction(suffix)) {
    return suffix;
  }
  return function doSuffix() {
    if (_.isEmpty(suffix)) {
      return '';
    }
    return suffix;
  };
}

/**
 * @function createFormat
 * @name createFormat
 * @description create sequence formatter
 * @param {Function} [format] custom sequence formatter
 * @returns {Function} valid format
 * @private
 */
function createFormat(format) {
  if (_.isFunction(format)) {
    return format;
  }
  return function doFormat(optns) {
    // obtain options
    const { prefix, sequence, suffix, length, pad, separator } = optns;
    // add pads if sequence length < length
    let $sequence = _.padStart(sequence, length, pad);
    // format sequence number
    $sequence = [prefix, $sequence, suffix].join(separator);
    // return formatted sequence
    return $sequence;
  };
}

/**
 * @function createValidator
 * @name createValidator
 * @description Sequence validator factory
 * @param {object} optns valid sequenciable options
 * @returns {Function} sequence validator
 * @private
 */
function createValidator(optns) {
  // dont use arrow: this will be binded to instance
  return function sequenceValidator(v) {
    return new Promise(
      function generateSequence(resolve /* , reject */) {
        /* this -> Model instance */

        // normalize options
        let options = _.merge({}, optns);
        const { increment, pathName } = options;
        let { namespace, prefix, suffix } = options;
        let { length, pad, separator, format } = options;
        const modelName = _.get(this, 'constructor.modelName');
        namespace = namespace || modelName;
        prefix = _.bind(createPrefix(prefix), this)();
        suffix = _.bind(createSuffix(suffix), this)();
        length = length || SEQUENCE_LENGTH;
        pad = pad || SEQUENCE_PAD;
        separator = separator || SEQUENCE_SEPARATOR;
        format = _.bind(createFormat(format), this);

        // re-construct sequence generator options
        options = {
          namespace,
          prefix,
          increment,
          suffix,
          length,
          pad,
          separator,
        };
        options = _.omitBy(options, _.isUndefined);

        // exit early if path has valid sequence
        const isSequence = v !== DEFAULT_VALUE && _.startsWith(v, prefix);
        if (isSequence) {
          return resolve(true);
        }

        // generate sequence
        return Counter.generate(
          options,
          function onSequence(error, counter) {
            // set generated sequence
            if (isInstance(this) && pathName) {
              if (isInstance(counter)) {
                const date = moment(new Date());
                const fmtOptns = {
                  namespace: counter.namespace,
                  prefix: counter.prefix,
                  sequence: counter.sequence,
                  suffix: counter.suffix,
                  length,
                  pad,
                  separator,
                  date,
                };
                this[pathName] = format(fmtOptns);
              } else {
                this[pathName] = undefined;
              }
            }

            // notify generation completed
            const isValid = !_.isError(error) && !_.isEmpty(this[pathName]);
            return resolve(isValid);
          }.bind(this)
        );
      }.bind(this)
    );
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
 * @param {boolean | object} optns sequenceable validation options
 * @param {string} [message] optional custom error message
 * @returns {object} this valid SchemaType
 * @public
 */
SchemaString.prototype.sequenceable = function sequenceable(optns, message) {
  /* this -> String -> SchemaType */

  // ensure no sequence validator exists
  if (this.sequenceableValidator) {
    this.validators = this.validators.filter(function doFilter(v) {
      return v.validator !== this.sequenceableValidator;
    }, this);
  }

  // force default value for sequencing
  this.defaultValue = DEFAULT_VALUE;

  // obtain current schema path name
  const pathName = this.path;

  // add sequenceable validator
  const defaults = { pathName };
  const shouldApply = optns !== null && optns !== undefined;
  if (shouldApply) {
    // normalize options
    const options = _.isBoolean(optns)
      ? defaults
      : _.merge({}, defaults, optns);

    // collect sequenceable validation message
    let msg = message || MongooseError.messages.String.sequenceable;
    msg = options.message || msg;

    // add sequenceable validator
    this.sequenceableValidator = createValidator(options);
    this.validators.push({
      validator: this.sequenceableValidator,
      message: msg,
      type: 'sequenceable',
    });
  }

  /* return */
  return this;
};

/* exports reference to counter model */
export default Counter;
