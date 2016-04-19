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
  }

  ElasticEvent.prototype.init = function (options) {
    var self = this;
    var unload;
    var unloadInterval;

    if (this.close) {
      throw new Error('already initialized');
    }

    this.max = options.max || 256;
    this.host = options.host || 'localhost:9200';
    this.index = options.index || 'event';
    this.type = options.type;
    this.url = this.host + '/' + this.index;
    if (this.type) {
      this.url += '/' + this.type;
    }

    unloadInterval = setInterval(
      this.send.bind(this, false),
      options.interval || 10000
    );

    // make sure it sends queued events on exit
    unload = this.send.bind(this, true);

    window.addEventListener('beforeunload', unload);

    this.close = function () {
      self.send();
      self.close = null;
      clearInterval(unloadInterval);
      window.removeEventListener('beforeunload', unload);
    };
  };

  function request(url, data, async) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, async);
    xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.send(data);
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

  ElasticEvent.prototype.log = function (event, meta) {
    var data;
    var info = meta || {};
    var index = {
      _index: info.index || this.index,
      _type: info.type || this.type || 'log'
    };

    if (typeof event !== 'object') {
      throw new Error('log event is not an object');
    }

    if (info.id) {
      index._id = meta.id;
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
