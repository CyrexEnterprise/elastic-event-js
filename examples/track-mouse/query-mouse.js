(function () {
  var queryFrom = 0;
  var prevX = null;
  var prevY = null;
  var x = null;
  var y = null;

  function response(ctx, err, resp) {
    if (err) {
      return console.error(err);
    }

    queryFrom += resp.hits.hits.length;

    resp.hits.hits.forEach(function (obj) {
      x = parseInt(Number(obj._source.x) * window.innerWidth, 10);
      y = parseInt(Number(obj._source.y) * window.innerHeight, 10);

      if (obj._type === 'position') {
        if (prevX !== null) {
          window.drawLine(ctx, 'blue', prevX, prevY, x, y);
        }
        prevX = x;
        prevY = y;
      } else if (obj._type === 'click') {
        window.drawDot(ctx, 'green', x, y);
      }
    });
  }

  function queryHandler(ctx, elasticevent, Bodybuilder) {
    elasticevent.search(
      new Bodybuilder()
        .filter('term', 'sessionId.raw', elasticevent.traits.sessionId)
        .sort('@timestamp')
        .size(50)
        .from(queryFrom)
        .build('v2'),
        null,
      response.bind(null, ctx));
  }

  window.querymouse = function (elasticevent, Bodybuilder, interval) {
    var ctx = document.getElementById('canvas').getContext('2d');

    return setInterval(queryHandler.bind(null, ctx, elasticevent, Bodybuilder),
      interval || 1000);
  };
})(); // eslint-disable-line
