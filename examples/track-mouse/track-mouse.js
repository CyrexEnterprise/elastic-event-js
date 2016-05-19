(function () {
  function trackHandler(elasticevent, type, event) {
    event = event || window.event;

    elasticevent.track(type, {
      x: (event.clientX / window.innerWidth).toPrecision(8),
      y: (event.clientY / window.innerHeight).toPrecision(8)
    });
  }

  window.trackmouse = function (elasticevent) {
    var prevOnMouseMove = document.onmousemove;
    var prevOnClick = document.onclick;

    document.onmousemove = prevOnMouseMove ? function (event) {
      trackHandler(elasticevent, 'position', event);
      prevOnMouseMove.apply(null, arguments);
    } : trackHandler.bind(null, elasticevent, 'position');

    document.onclick = prevOnClick ? function (event) {
      trackHandler(elasticevent, 'click', event);
      prevOnClick.apply(null, arguments);
    } : trackHandler.bind(null, elasticevent, 'click');
  };
})(); // eslint-disable-line
