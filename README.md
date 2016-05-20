# Elastic Event

Use elastic-event-js to feed and query an ElasticSearch API with data from the
browser.

[Event logging using ElasticSearch](http://blog.cloudoki.com/event-logging-elasticsearch/)

[API Reference](http://cloudoki.github.io/elastic-event-js/docs/)

* [Features](#features)
* [Install](#install)
* [Usage](#usage)
* [Examples](#examples)
* [Building](#building)
* [Linting check](#linting-check)
* [Documentation](#documentation)a

## Features

- No dependencies
- Small: 3.13 KB
- No pre-flight requests
- Simple Interface
- Bulk saving of events for reduced overhead
- Save queued events before unload of window

## Install

```
npm install Cloudoki/elastic-event-js
```

```
bower install Cloudoki/elastic-event-js
```

```html
<script src="https://cloudoki.github.io/elastic-event-js/dist/elastic-event.min.js" type="text/javascript"></script>
```

## Usage

Configuration

```javascript
var elasticevent = new ElasticEvent({
  host: 'https://api.elasticsearch.com',
  index: 'your_index',
  setupIntervalSend: true,
  setupBeforeUnload: true
});
```

Identify a session

```javascript
elasticevent.identify({
  sessionId: new Date().getTime()
});
```

Track an event, this sets `_type` to click.

```javascript
function onClick () {
  elasticevent.track('click');
}
```

Track an event with more details

```javascript
function onClick(event) {
  elasticevent.track('click', {
    x: (event.clientX / window.innerWidth).toPrecision(8),
    y: (event.clientY / window.innerHeight).toPrecision(8)
  });
}
```

Querying with an elastic DSL helper library, here we use the
[Bodybuilder](https://github.com/danpaz/bodybuilder) but you may also use others, like [esq](https://github.com/holidayextras/esq) or [elastic.js](https://github.com/fullscale/elastic.js)

```javascript
elasticevent.search(
  new Bodybuilder()
    .filter('term', 'sessionId.raw', elasticevent.traits.sessionId)
    .size(50)
    .build('v2'),
    null,
  function(err, resp) {
    console.log(resp);
  });
```

## Examples

You may need to disable your ad blocker for the examples to work.

- [simple-click](http://cloudoki.github.io/elastic-event-js/examples/simple-click/):
A simple click event and query by identity

- [track-mouse](http://cloudoki.github.io/elastic-event-js/examples/track-mouse/): An example were the mouse movement and clicks are tracked and queried. More details on this example on this [blog post](http://blog.cloudoki.com/event-logging-elasticsearch/).

To run the examples locally you can serve them with:

```
npm run static
```

## Building

- [webpack](https://github.com/webpack/webpack)

```
npm run build -s
```

## Linting check

- [eslint](http://eslint.org/)

```
npm run lint -s

```
## Documentation

- [jsDoc](http://usejsdoc.org/)

You may also build and serve the API reference locally:

```
npm run docs -s
```

Documentation will be generated at `./docs`

To inspect the `./docs` you may want to serve your local files.

```
npm run static
```
