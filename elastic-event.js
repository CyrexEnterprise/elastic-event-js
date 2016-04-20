(function (root, factory) {
  // AMD
  if (typeof define === 'function' && define.amd) {
    define(factory);
    // CommonJS
  } else if (typeof module === 'object' && module.exports && require) {
    module.exports = factory();
    // Globals
  } else {
    /* eslint-disable no-param-reassign */
    root.elasticevent = factory();
    /* eslint-enable no-param-reassign */
  }
})(this, function () {
  function ElasticEvent() {
    this.queue = [];
    this.max = 256;
    this.interval = 10000;
    this.host = 'localhost:9200';
    this.traits = {};
  }

  ElasticEvent.prototype.setupIntervalSend = function (options) {
    if (this.intervalSend) {
      throw new Error('already setup intervalSend');
    }

    this.interval = options.interval || this.interval;

    this.intervalSend = setInterval(
      this.send.bind(this, null, null),
      this.interval
    );
  };

  ElasticEvent.prototype.setupBeforeUnload = function () {
    if (this.beforeunload) {
      throw new Error('already setup beforeUnload');
    }

    // make sure it sends queued events on exit
    this.beforeunload = this.send.bind(this, {
      sync: true
    }, null);

    window.addEventListener('beforeunload', this.beforeunload);
  };

  ElasticEvent.prototype.setup = function (options) {
    this.setupIntervalSend(options);
    this.setupBeforeUnload();
  };

  ElasticEvent.prototype.close = function (callback) {
    if (this.intervalSend) {
      clearInterval(this.intervalSend);
      this.intervalSend = null;
    }
    if (this.beforeunload) {
      window.removeEventListener('beforeunload', this.beforeunload);
      this.beforeunload = null;
    }
    self.send(null, callback);
  };

  ElasticEvent.prototype.init = function (options) {
    this.config(options);
    this.setup(options);
  };

  ElasticEvent.prototype.config = function (options) {
    this.max = options.max || this.max;
    this.host = options.host || this.host;
    this.index = options.index || this.index;
    this.type = options.type || this.type;
  };

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
    return xhr;
  };

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

    return this.xhr(url, json || data, opts.sync, callback);
  };

  ElasticEvent.prototype.send = function (options, callback) {
    var opts = options || {};

    if (!this.queue.length) {
      return;
    }

    opts.op = 'bulk';

    this.request(
      this.queue.splice(0, opts.max || this.max).join(''),
      opts,
      callback
    );
  };

  ElasticEvent.prototype.search = function (query, options, callback) {
    var opts = options || {};

    opts.op = 'search';

    this.request(
      query,
      opts,
      callback
    );
  };

  ElasticEvent.prototype.identify = function (traits) {
    var trait;
    for (trait in traits) {
      if (traits.hasOwnProperty(trait)) {
        this.traits[trait] = traits[trait];
      }
    }
  };

  ElasticEvent.prototype.baseEvent = function (event) {
    var baseEvent = event || {};
    var trait;

    for (trait in this.traits) {
      if (this.traits.hasOwnProperty(trait) &&
        !baseEvent.hasOwnProperty(trait)) {
        baseEvent[trait] = this.traits[trait];
      }
    }

    return baseEvent;
  };

  ElasticEvent.prototype.track = function (type, event) {
    if (typeof type !== 'string') {
      throw new Error('invalid typeof type');
    }

    this.add(this.baseEvent(event), {
      type: type
    });
  };

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
  };

  ElasticEvent.prototype.createInstance = function () {
    return new ElasticEvent();
  };

  return new ElasticEvent();
});
