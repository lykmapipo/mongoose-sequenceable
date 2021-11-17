import _ from 'lodash';
import { getString, getNumber } from '@lykmapipo/env';
import moment from 'moment';
import { Schema, SCHEMA_OPTIONS, model } from '@lykmapipo/mongoose-common';

/* constants */
const SEQUENCE_NAMESPACE = getString('SEQUENCE_NAMESPACE', 'Sequence');
const SEQUENCE_YEAR_FORMAT = getString('SEQUENCE_YEAR_FORMAT', 'YY');
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
      default: moment(new Date()).format(SEQUENCE_YEAR_FORMAT),
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
      prefix: moment(new Date()).format(SEQUENCE_YEAR_FORMAT),
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
export default CounterModel;
