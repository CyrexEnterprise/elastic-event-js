(function () {
  var prevX = null;
  var prevY = null;

  window.drawLine = function (ctx, style, px, py, x, y) {
    ctx.beginPath();
    ctx.strokeStyle = style;
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  window.drawDot = function (ctx, style, x, y) {
    ctx.beginPath();
    ctx.strokeStyle = style;
    ctx.fillStyle = style;
    ctx.arc(x, y, 3, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
  };

  function drawHandler(ctx, type, event) {
    event = event || window.event;

    if (type === 'click') {
      window.drawDot(ctx, 'red', event.clientX, event.clientY);
    } else {
      if (prevX !== null) {
        window.drawLine(ctx, 'white', prevX, prevY, event.clientX, event.clientY);
      }
      prevX = event.clientX;
      prevY = event.clientY;
    }
  }

  window.drawmouse = function () {
    var prevOnMouseMove = document.onmousemove;
    var prevOnClick = document.onclick;
    var ctx = document.getElementById('canvas').getContext('2d');
    document.onmousemove = prevOnMouseMove ? function (event) {
      drawHandler(ctx, 'position', event);
      prevOnMouseMove.apply(null, arguments);
    } : drawHandler.bind(null, ctx, 'position');

    document.onclick = prevOnClick ? function (event) {
      drawHandler(ctx, 'click', event);
      prevOnClick.apply(null, arguments);
    } : drawHandler.bind(null, ctx, 'click');
  };
})(); // eslint-disable-line
