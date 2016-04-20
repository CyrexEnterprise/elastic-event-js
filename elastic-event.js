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
    this.url = this.host;
  }

  ElasticEvent.prototype.setupIntervalSend = function (options) {
    if (this.intervalSend) {
      throw new Error('already setup intervalSend');
    }

    this.interval = options.interval || this.interval;

    this.intervalSend = setInterval(
      this.send.bind(this, false),
      this.interval
    );
  };

  ElasticEvent.prototype.setupBeforeUnload = function () {
    if (this.beforeunload) {
      throw new Error('already setup beforeUnload');
    }

    // make sure it sends queued events on exit
    this.beforeunload = this.send.bind(this, true);
    window.addEventListener('beforeunload', this.beforeunload);
  };

  ElasticEvent.prototype.setup = function (options) {
    this.setupIntervalSend(options);
    this.setupBeforeUnload();
  };

  ElasticEvent.prototype.close = function () {
    self.send();
    if (this.intervalSend) {
      clearInterval(this.intervalSend);
      this.intervalSend = null;
    }
    if (this.beforeunload) {
      window.removeEventListener('beforeunload', this.beforeunload);
      this.beforeunload = null;
    }
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

    this.url = this.host;

    if (this.index) {
      this.url += '/' + this.index;
    }
    if (this.type) {
      this.url += '/' + this.type;
    }
  };

  function request(url, data, async, callback) {
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

    xhr.open('POST', url, async);

    if (data) {
      xhr.setRequestHeader('Content-Type', 'text/plain');
      xhr.send(data);
    } else {
      xhr.send(null);
    }
    return xhr;
  }

  ElasticEvent.prototype.send = function (sync) {
    if (!this.queue.length) {
      return;
    }
    request(
      this.url + '/_bulk',
      this.queue.splice(0, this.max).join(''),
      !sync
    );
  };

  ElasticEvent.prototype.search = function (query, callback) {
    request(
      this.url + '/_search',
      query ? JSON.stringify(query) : null,
      true,
      callback
    );
  };

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  ElasticEvent.prototype.identify = function (userId) {
    this.sessionId = this.sessionid || uuid();

    if (userId && typeof userId !== 'string') {
      throw new Error('invalid typeof userId');
    }

    if (userId) {
      this.userId = userId;
    }
  };

  ElasticEvent.prototype.baseEvent = function (event) {
    var baseEvent = event || {};

    if (this.userId) {
      baseEvent.userId = this.userId;
    }

    if (this.sessionId) {
      baseEvent.sessionId = this.sessionId;
    }

    baseEvent.timestamp = new Date().toISOString();

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
