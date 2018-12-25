'use strict';


/**
 * @module Counter
 * @name Counter
 * @description A record of sequence documents. 
 * 
 * Used to generate sequencial number for specified criteria.
 *
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 */

//namespace
//field
//suffix
//dateFormat
//format
//padsize
//pad
//length


/* dependencies */
const _ = require('lodash');
const moment = require('moment');
const { getString, getNumber } = require('@lykmapipo/env');
const { Schema, SCHEMA_OPTIONS, model } = require('@lykmapipo/mongoose-common');
const actions = require('mongoose-rest-actions');


/* constants */
const SEQUENCE_NAMESPACE = getString('SEQUENCE_NAMESPACE', 'Sequence');
const SEQUENCE_YEAR_FORMAT = getString('SEQUENCE_YEAR_FORMAT', 'YY');
const SEQUENCE_START = getNumber('SEQUENCE_START', 1);
const SEQUENCE_INCREMENT = getNumber('SEQUENCE_INCREMENT', 1);
const SEQUENCE_PAD = getNumber('SEQUENCE_PAD', '0');
const SEQUENCE_LENGTH = getNumber('SEQUENCE_LENGTH', 4);


/* schema options */
const MODEL_NAME = getString('MODEL_NAME', 'Counter');
// const COLLECTION_NAME = getString('COLLECTION_NAME', 'counters');


/**
 * @name CounterSchema
 * @type {Schema}
 * @since 0.1.0
 * @version 0.1.0
 * @private
 */
const CounterSchema = new Schema({
  /**
   * @name namespace
   * @description A namespece for the counter. Used to differentiate 
   * counters of different use cases.
   *
   * When used as plugin, each collection/mongoose model will have its 
   * own namespace derived from model name. 
   *
   * @type {Object}
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
    default: SEQUENCE_NAMESPACE
  },


  /**
   * @name prefix
   * @description A sequence prefix.
   *
   * @type {Object}
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
    default: moment(new Date()).format(SEQUENCE_YEAR_FORMAT)
  },


  /**
   * @name suffix
   * @description A sequence suffix.
   *
   * @type {Object}
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
   *
   * @type {Object}
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
    default: SEQUENCE_START
  }

}, SCHEMA_OPTIONS);


//------------------------------------------------------------------------------
// index
//------------------------------------------------------------------------------


/* force uniqueness of the sequence per namespace and prefix */
const indexes = ({ namespace: 1, prefix: 1, suffix: 1, sequence: 1 });
CounterSchema.index(indexes, { unique: true });


//------------------------------------------------------------------------------
// statics
//------------------------------------------------------------------------------

CounterSchema.statics.MODEL_NAME = 'Counter';

/**
 * @name generate
 * @function generate
 * @param {Object} optns valid counter options
 * @param {String} optns.namespace valid sequence namespace
 * @param {String} opts.prefix valid sequence prefix
 * @param {Function} done a callback to invoke on success or error
 * @return {String|Error} next formatted sequence number or error
 * @since 0.1.0
 * @version 0.1.0
 * @public
 */
CounterSchema.statics.generate = function (optns, done) {
  //reference counter
  const Counter = this;

  //ensure options
  const options = _.merge({}, {
    namespace: SEQUENCE_NAMESPACE,
    prefix: moment(new Date()).format(SEQUENCE_YEAR_FORMAT),
    increment: SEQUENCE_INCREMENT,
    length: SEQUENCE_LENGTH,
    pad: SEQUENCE_PAD
  }, optns);

  /**
   *
   * atomically upsert & increment sequence
   * first start with counter collection by increment the sequence
   * if we encounter error we loop till we succeed
   */
  const { namespace, prefix, suffix, increment } = options;
  const { length, pad } = options;
  const criteria = _.omitBy({ namespace, prefix, suffix }, _.isUndefined);

  Counter
    .findOneAndUpdate(
      criteria, {
        $inc: {
          sequence: increment
        }
      }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      })
    .exec(function (error, counter) {

      //generated formatted sequence
      if (!error && counter) {
        //add pads if sequence length < length
        let sequence = _.padStart(counter.sequence, length, pad);

        // format sequence number
        //TODO use specified formatter
        sequence = [prefix, sequence, suffix].join('');

        //return
        done(null, sequence, counter);
      }

      //loop till succeed
      else {
        Counter.generate(options, done);
      }

    });

};


CounterSchema.statics.setup = function setup() {
  // initialize with start
};
CounterSchema.statics.reset = function reset() {
  // restore to specified start
};
CounterSchema.statics.clear = function clear() {
  // clear counter
};


/*
 *------------------------------------------------------------------------------
 * Plugins
 *------------------------------------------------------------------------------
 */


/* plug mongoose rest actions */
CounterSchema.plugin(actions);


/* export incident type model */
exports = module.exports = model(MODEL_NAME, CounterSchema);