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
//prefix
//suffix
//dateFormat
//format
//padsize
//length
//increment
//field: {sequencable: true}
//field: {sequencable: {start: 100, format: fn}}


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
// const SEQUENCE_PREFIX = getString('SEQUENCE_PREFIX', '');
const SEQUENCE_PAD_SIZE = getNumber('SEQUENCE_PAD_SIZE', 4);


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
    uppercase: true,
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
    uppercase: true,
    searchable: true,
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
    index: true,
    searchable: true
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
    index: true,
    default: SEQUENCE_START
  }

}, SCHEMA_OPTIONS);


//------------------------------------------------------------------------------
// index
//------------------------------------------------------------------------------


/* force uniqueness of the sequence per namespace and prefix */
CounterSchema.index({
  namespace: 1,
  prefix: 1,
  suffix: 1,
  sequence: 1
}, { unique: true, sparse: true });


//------------------------------------------------------------------------------
// instance
//------------------------------------------------------------------------------


/**
 * @name format
 * @function format
 * @description format a counter to meaningful(human readable) ticket number
 * @return {String} formatted ticket number
 * @see {@link https://lodash.com/docs/4.17.4#padStart}
 * @since 0.1.0
 * @version 0.1.0
 * @instance
 */
CounterSchema.methods.format = function _format() {

  //format sequence to whole meaningful(human readable) number

  //1. format a sequence by padding 0's at the begin of it
  const sequence = _.padStart(this.sequence, SEQUENCE_PAD_SIZE, '0');

  //2. format sequence number
  //TODO use specified formatter
  const formattedSequence = [this.prefix, sequence, this.suffix].join('');


  return formattedSequence;

};


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
    increment: SEQUENCE_INCREMENT
  }, optns);


  //ensure namespace
  //TODO derive from instance model if not given as option
  if (!options.namespace) {
    let error = new Error('Missing Sequence Namespace');
    error.status = 400;
    return done(error);
  }

  //ensure prefix
  //TODO derive from instance if not given as option
  if (!options.prefix) {
    let error = new Error('Missing Sequence Prefix');
    error.status = 400;
    return done(error);
  }

  /**
   *
   * atomically upsert & increment sequence
   * first start with counter collection by increment the sequence
   * if we encounter error we loop till we succeed
   */
  let criteria = _.pick(options, ['namespace', 'prefix', 'suffix']);
  criteria = _.omitBy(criteria, _.isUndefined);
  const { increment } = options;

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
        // format sequence
        const sequence = counter.format();
        //return
        return done(null, sequence);
      }

      //loop till succeed
      else {
        return Counter.generate(options, done);
      }

    });

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