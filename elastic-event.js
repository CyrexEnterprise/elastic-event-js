/**
 * ElasticEvent provides a simple interface to log and query event. Requests
 * to the ElasticSearch API are sent in bulk by keeping a queue of
 * logged events that will be sent on a set interval, before
 * unload, on max size or on command.
 *
 * @class ElasticEvent
 *
 * @param {object} [options]                      - elastic event defaults
 * @param {string} [options.host=localhost:9200]  - elasticsearch host
 * @param {string} [options.index]                - default request index
 * @param {string} [options.type]                 - default request type
 * @param {number} [options.max=256]              - default max queue length
 * @param {number} [options.interval=10000]       - default interval (ms) between
 *                                                	sending bulk requests
 * @param {boolean} [options.setupIntervalSend]   - setups the repeating sending
 *                                                	of bulk requests for the set
 *                                                	interval
 * @param {boolean} [options.setupBeforeUnload]   - setups sending bulk requests
 *                                                	before window unload
 * @constructor
 */
function ElasticEvent(options) {
  var opts = options || {};

  // make sure it is initialized with the 'new' constructor
  if (!(this instanceof ElasticEvent)) {
    return new ElasticEvent(opts);
  }

  /**
   * ElasticSearch API host url
   * @private
   * @type {string}
   */
  this.host = opts.host || 'localhost:9200';

  /**
   * index value to use for the endpoint url construction
   * (eg. localhost:9200/{index}/_bulk)
   * @private
   * @type {string}
   */
  this.index = opts.index;

  /**
   * type value to use for the endpoint url construction
   * @private
   * @type {string}
   */
  this.type = opts.type;

  /**
   * @external BulkRequest
   * @private
   * @example
   * '{ "index" : { "_index" : "test", "_type" : "type1", "_id" : "1" } }\n
   * { "field1" : "value1" }\n'
   * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html bulk API}
   */

  /**
   * store of bulk requests
   * @private
   * @type {Array.external:BulkRequest}
   */
  this.queue = [];

  /**
   * default max length of queue
   * @private
   * @type {number}
   */
  this.max = opts.max || 256;

  /**
   * traits associated to all events logged may be used to identify sources
   * of logs
   * @private
   * @type {object}
   */
  this.traits = {};

  /**
   * interval (ms) between sending bulk request
   * @private
   * @type {number}
   */
  this.interval = opts.interval || 10000;

  /**
   * interval ID of the setup repeating call
   * @private
   * @type {number}
   */
  this.intervalSend = null;

  /**
   * beforeunload event handler called when 'beforeunload' event is triggered
   * @private
   * @type {function}
   */
  this.beforeunload = null;

  if (opts.setupIntervalSend) {
    this.setupIntervalSend();
  }
  if (opts.setupBeforeUnload) {
    this.setupBeforeUnload();
  }
}

/**
 * @external response
 * @example
 * var response = {
 *     "_shards":{
 *         "total" : 5,
 *         "successful" : 5,
 *         "failed" : 0
 *     },
 *  "hits":{
 *      "total" : 1,
 *      "hits" : [
 *          {
 *              "_index" : "twitter",
 *              "_type" : "tweet",
 *                "_id" : "1",
 *                "_source" : {
 *                    "user" : "kimchy",
 *                    "postDate" : "2009-11-15T14:12:12",
 *                    "message" : "trying out Elasticsearch"
 *                }
 *            }
 *        ]
 *    }
 * };
 * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html ElasticSearch API}
 */

/**
 * This callback is displayed as part of the Requester class.
 * @callback ElasticEvent~requestCallback
 * @param {Error | null}                                    error
 * @param {external:response | object | null}               response
 * @param {number}                                          status
 */

/**
 * xhr helper function to request the ElasticSearch API without preflight
 * @private
 *
 * @param  {string} url                   - endpoint
 * @param  {string} content               - body content
 * @param  {boolean} sync                 - set true if synchronous request
 * @param  {ElasticEvent~requestCallback} [callback]  - called on load, timeout
 *                                                   		or on error
 * @return {ElasticSearch}                - chainable
 */
ElasticEvent.prototype.xhr = function (url, content, sync, callback) {
  var xhr = new XMLHttpRequest();

  if (typeof callback === 'function') {
    xhr.ontimeout = xhr.onerror = xhr.onload = function () {
      var err = null;
      if (!xhr.status || xhr.status >= 400) {
        err = new Error(xhr.statusText || 'request failed');
      }
      callback(err, xhr.responseText ? JSON.parse(xhr.responseText) : null,
        xhr.status, xhr);
    };
  }

  xhr.open('POST', url, !sync);

  if (content) {
    // no preflight
    xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.send(content);
  } else {
    xhr.send(null);
  }

  return this;
};

/**
 * @typedef {object} ElasticEvent~requestOptions
 * @property {string}   [url]               - overides request url construction
 * @property {string}   [host=this.host]    - request host
 * @property {string}   [index=this.index]  - request index
 * @property {string}   [type=this.type]    - request type
 * @property {string}   [op=search]         - request operation
 * @property {boolean}  [sync]              - synchronous request
 */

/**
 * request the ElasticSearch API by building the request url from options and
 * instance defaults: url = {host}/{index}/{type}/_{op}
 *
 * @param  {object | string}              [data]      - body content of the request
 * @param  {ElasticEvent~requestOptions}  [options]   - request options
 * @param  {ElasticEvent~requestCallback} [callback]  - request callback
 * @return {ElasticEvent}                             - chainable
 */
ElasticEvent.prototype.request = function (data, options, callback) {
  var opts = options || {};
  var json;
  var url = opts.url || opts.host || this.host;

  if (!opts.url) {
    if (opts.index || this.index) {
      url += '/' + (opts.index || this.index);
    }
    if (opts.type || this.type) {
      url += '/' + (opts.type || this.type);
    }

    url += '/_' + (opts.op || 'search');
  }

  if (data && typeof data === 'object') {
    json = JSON.stringify(data);
  }

  this.xhr(url, json || data, opts.sync, callback);

  return this;
};

/**
 * send the bulk queued requests
 * @param  {ElasticEvent~requestOptions}  [options]     - request options
 * @param  {ElasticEvent~requestCallback} [callback]    - request callback
 * @return {ElasticEvent}                               - chainable
 */
ElasticEvent.prototype.send = function (options, callback) {
  var opts = options || {};

  if (!this.queue.length) {
    return this;
  }

  opts.op = 'bulk';

  this.request(
    this.queue.splice(0, opts.max || this.max).join(''),
    opts,
    callback
  );

  return this;
};

/**
 * add event data as a index bulk request to the queue,
 * if queue length is superior to this.max length will send all queued requests
 * @private
 *
 * @param  {object}  event                    - event/document to be added
 * @param  {object}  [meta]                   - meta data on this document
 * @param  {string}  [meta.index=this.index]  - set this specific event index
 * @param  {string}  [meta.type=this.type]    - set this specific event type
 * @param  {string}  [meta.id]                - set this specific event id
 * @return {ElasticEvent}                     - chainable
 */
ElasticEvent.prototype.add = function (event, meta) {
  var data;
  var info = meta || {};
  var index = {
    _index: info.index || this.index,
    _type: info.type || this.type
  };

  if (typeof event !== 'object') {
    throw new Error('log event is not an object');
  }

  if (info.id) {
    index._id = info.id;
  }

  data = JSON.stringify({ index: index }) + '\n' +
    JSON.stringify(event) + '\n';

  this.queue.push(data);

  if (this.queue.length > this.max) {
    this.send();
  }

  return this;
};

/**
 * baseEvent helper function to mixin this.traits to the event provided
 * @private
 *
 * @param  {object} [event] - event/document data
 * @return {object}         - mixed in traits with event object
 */
ElasticEvent.prototype.baseEvent = function (event) {
  var baseEvent = event || {};
  var trait;

  for (trait in this.traits) {
    // makes sure no inherited prototype get included
    if (this.traits.hasOwnProperty(trait) &&
      // only sets a trait if it is not present in the event object
      !baseEvent.hasOwnProperty(trait)) {
      baseEvent[trait] = this.traits[trait];
    }
  }

  return baseEvent;
};

/**
 * track events you will need to specify the event type, this will mixin the
 * event with this.traits and add it to the queued requests
 *
 * @throws 'invalid type' if type parameter is not a string
 * @param  {string} type    - event type
 * @param  {object} [event] - event/document data
 * @return {ElasticEvent}   - chainable
 */
ElasticEvent.prototype.track = function (type, event) {
  if (typeof type !== 'string') {
    throw new Error('invalid type');
  }

  return this.add(this.baseEvent(event), {
    type: type
  });
};

/**
 * identify the events with the given traits, overides previously set traits,
 * will apply only to future events
 *
 * @param  {object} traits  - set traits to all events
 * @return {ElasticEvent}   - chainable
 */
ElasticEvent.prototype.identify = function (traits) {
  var trait;

  for (trait in traits) {
    if (traits.hasOwnProperty(trait)) {
      this.traits[trait] = traits[trait];
    }
  }

  return this;
};

/**
 * Query the event with the QueryDSL of ElasticSearch API
 * The elastic.js or bodybuilder libraries can be used to make building request
 * bodies simpler.
 * @external requestBodySearch
 * @example <caption>query of documents with user field equal to kimchy</caption>
 * var requestBodySearch = {
 *   "query" : {
 *     "term" : { "user" : "kimchy" }
 * };
 * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-body.html request body search API}
 * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html Query DSL}
 * @see {@link https://github.com/fullscale/elastic.js/ elastic.js}
 * @see {@link https://github.com/danpaz/bodybuilder bodybuilder}
 */

/**
 * search using the ElasticSearch API with the given body query
 * @param  {external:requestBodySearch}   [query]     - body search
 * @param  {ElasticEvent~requestOptions}  [options]   - options
 * @param  {ElasticEvent~requestCallback} [callback]  - callback
 * @return {ElasticEvent}                             - chainable
 *
 */
ElasticEvent.prototype.search = function (query, options, callback) {
  var opts = options || {};

  opts.op = 'search';

  this.request(
    query,
    opts,
    callback
  );

  return this;
};

/**
 * setupIntervalSend setups the repeating call to empty the queue of logged
 * events, interval id is stored in this.intervalSend.
 * @private
 *
 * @throws 'already setup intervalSend' if this.intervalSend is already set
 * @param  {number} [interval]    - interval (ms) of the repeating call
 * @return {ElasticEvent}         - chainable
 */
ElasticEvent.prototype.setupIntervalSend = function (interval) {
  if (this.intervalSend) {
    throw new Error('already setup intervalSend');
  }

  this.interval = interval || this.interval;

  this.intervalSend = setInterval(
    this.send.bind(this,
      // will use instance setup options
      null,
      // no callback
      null),
    this.interval
  );

  return this;
};

/**
 * setupBeforeUnload setups the synchronous call before unload of html document
 * @private
 *
 * @throws 'already setup beforeUnload' if this.beforeunload is already set
 * @return {ElasticEvent}   - chainable
 */
ElasticEvent.prototype.setupBeforeUnload = function () {
  if (this.beforeunload) {
    throw new Error('already setup beforeUnload');
  }

  this.beforeunload = this.send.bind(this, {
    sync: true
  }, null);

  window.addEventListener('beforeunload', this.beforeunload);

  return this;
};

/**
 * close empties the queue of logged events and removes the listener on
 * beforeunload and clears interval
 *
 * @param  {ElasticEvent~requestOptions}  [options]     - request options
 * @param  {ElasticEvent~requestCallback} [callback]    - request callback
 * @return {ElasticEvent}                               - chainable
 */
ElasticEvent.prototype.close = function (options, callback) {
  if (this.intervalSend) {
    clearInterval(this.intervalSend);
    this.intervalSend = null;
  }
  if (this.beforeunload) {
    window.removeEventListener('beforeunload', this.beforeunload);
    this.beforeunload = null;
  }
  self.send(options, callback);

  return this;
};

module.exports = ElasticEvent;
