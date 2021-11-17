import _ from 'lodash';
import { getString, getNumber } from '@lykmapipo/env';
import moment from 'moment';
import { SCHEMA_OPTIONS, Schema, model, MongooseError, SchemaString, isInstance } from '@lykmapipo/mongoose-common';

/* constants */
const SEQUENCE_NAMESPACE = getString('SEQUENCE_NAMESPACE', 'Sequence');
const SEQUENCE_YEAR_FORMAT$1 = getString('SEQUENCE_YEAR_FORMAT', 'YY');
const SEQUENCE_START = getNumber('SEQUENCE_START', 1);
const SEQUENCE_INCREMENT = getNumber('SEQUENCE_INCREMENT', 1);
const SEQUENCE_MODEL_NAME = getString('SEQUENCE_MODEL_NAME', 'Counter');
const SEQUENCE_COLLECTION_NAME = getString(
  'SEQUENCE_COLLECTION_NAME',
  'counters'
);
const SEQUENCE_SCHEMA_OPTIONS = _.merge({}, SCHEMA_OPTIONS, {
  collection: SEQUENCE_COLLECTION_NAME,
});

// TODO:
// field
// dateFormat
// format
// padsize

/**
 * @name CounterSchema
 * @description A record of sequence documents. Used to generate sequencial
 * number for specified criteria.
 * @type {Schema}
 * @since 0.1.0
 * @version 0.1.0
 * @private
 */
const CounterSchema = new Schema(
  {
    /**
     * @name namespace
     * @description A namespece for the counter. Used to differentiate
     * counters of different use cases.
     *
     * When used as plugin, each collection/mongoose model will have its
     * own namespace derived from model name.
     * @type {object}
     * @since 0.1.0
     * @version 0.1.0
     * @instance
     * @example
     * User, Ticket etc.
     */
    namespace: {
      type: String,
      trim: true,
      required: true,
      index: true,
      searchable: true,
      taggable: true,
      default: SEQUENCE_NAMESPACE,
    },

    /**
     * @name prefix
     * @description A sequence prefix.
     * @type {object}
     * @see {@link Jurisdiction}
     * @since 0.1.0
     * @version 0.1.0
     * @instance
     * @example
     * TZ, UK, 2008 etc.
     */
    prefix: {
      type: String,
      trim: true,
      required: true,
      index: true,
      searchable: true,
      taggable: true,
      default: moment(new Date()).format(SEQUENCE_YEAR_FORMAT$1),
    },

    /**
     * @name suffix
     * @description A sequence suffix.
     * @type {object}
     * @since 0.1.0
     * @version 0.1.0
     * @instance
     * @example
     * TZ, UK, ALL etc.
     */
    suffix: {
      type: String,
      trim: true,
      index: true,
      searchable: true,
      taggable: true,
    },

    /**
     * @name sequence
     * @description Latest seqence number generated.
     * @type {object}
     * @since 0.1.0
     * @version 0.1.0
     * @instance
     * @example
     * 1, 100, 2000 etc
     */
    sequence: {
      type: Number,
      required: true,
      index: true,
      default: SEQUENCE_START,
    },
  },
  SEQUENCE_SCHEMA_OPTIONS
);

// force uniqueness of the sequence per namespace and prefix
const indexes = { namespace: 1, prefix: 1, suffix: 1, sequence: 1 };
CounterSchema.index(indexes, { unique: true });

CounterSchema.statics.MODEL_NAME = SEQUENCE_MODEL_NAME;
CounterSchema.statics.COLLECTION_NAME = SEQUENCE_COLLECTION_NAME;

/**
 * @name generate
 * @function generate
 * @param {object} optns valid counter options
 * @param {string} optns.namespace valid sequence namespace
 * @param {string} optns.prefix valid sequence prefix
 * @param {Function} done a callback to invoke on success or error
 * @returns {string | Error} next formatted sequence number or error
 * @since 0.1.0
 * @version 0.1.0
 * @public
 */
CounterSchema.statics.generate = function generate(optns, done) {
  // reference counter
  const Counter = this;

  // ensure options
  const options = _.merge(
    {},
    {
      namespace: SEQUENCE_NAMESPACE,
      prefix: moment(new Date()).format(SEQUENCE_YEAR_FORMAT$1),
      increment: SEQUENCE_INCREMENT,
    },
    optns
  );

  /**
   *
   * atomically upsert & increment sequence
   * first start with counter collection by increment the sequence
   * if we encounter error we loop till we succeed
   */
  const { namespace, prefix, suffix, increment } = options;
  const criteria = _.omitBy({ namespace, prefix, suffix }, _.isUndefined);

  return Counter.findOneAndUpdate(
    criteria,
    {
      $inc: {
        sequence: increment,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).exec(function afterFindOneAndUpdate(error, counter) {
    // generated formatted sequence
    if (!error && counter) {
      // return
      return done(null, counter);
    }

    // loop till succeed

    return Counter.generate(options, done);
  });
};

// TODO:
// CounterSchema.statics.setup = function setup() {// initialize with start};
// CounterSchema.statics.reset = function reset() {// restore to specified start};
// CounterSchema.statics.clear = function clear() {// clear counter};

/* export counter model */
const CounterModel = model(SEQUENCE_MODEL_NAME, CounterSchema);

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
        return CounterModel.generate(
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

export { CounterModel as default };
