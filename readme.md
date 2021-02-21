# SystemYA Proxy

<a href="https://www.npmjs.com/package/sys-proxy">![Download](https://img.shields.io/npm/dw/sys-proxyp)</a>

## Quickstart:

```sh
git clone https://github.com/sysce/proxy ./sys-proxy

node ./sys-proxy/demo
```

## Installation:

```
npm i sys-proxy
```

### Demo:

See the [demo folder](demo/) for more usage examples

```
var nodehttp = require('sys-nodehttp'),
	rewriter = require('sys-proxy'),
	server = new nodehttp.server({
		port: 7080,
		static: path.join(__dirname, 'public'),
	}),
	rw = new rewriter({
		prefix: '/service',
		codec: rewriter.codec.xor,
		server: server,
		title: 'Service',
		// http_agent: ..,
		// https_agent: ..,
	});

// [0000] server listening on http://localhost:7080/
```

## How it works:

Recieve request => parse URL => send request to server => rewrite content => send to client

### JS:

To achieve accuracy when rewriting, this proxy uses "scoping". All js is wrapped in a [closure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) to override variables that otherwise are not possible normally (window, document)

[Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) are used to change or extend any value to be in line with rewriting URLs

Any occurance of `this` is changed to call the global rw_this function with the `this` value, if the `this` value has a property indicating that the value has a proxied version, return the proxied version.

An example:

Call the rewriter and parse:
```
if(window.location == this.location)alert('Everything checks out!');
```

Expected result:

```js
{let fills=<bundled code>,window=fills.this,document=fills.document;if(window.location == rw_this(this).location)alert('Everything checks out!');
//# sourceURL=anonymous:1
}
```

`this` in the input code is defined as `window`, the `window` has a proxied version that will also determine if any properties are proxied and give a result.

`this` => `fills.this`

`this.location` => `fills.url`

### CSS:

A basic regex to locate all `url()` blocks is used and the rewriters URL handler is called with the value and meta for the page

### HTML:

A bundled version of [JSDOM](https://www.npmjs.com/package/jsdom) is used to achieve accuracy and consistency when rewriting and [DOMParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser) in the browser.

Each property is iterated and in the rewriter a huge array containing information for determining the type of attribute being worked with is used ( this includes tag and name).

If the type is a URL then the resulting value is determined by the rewriters URL handler
If the type is JS then the resulting value is determined by the rewriters JS handler along with being wrapped for encoding
If the type is CSS then the resulting value is determined by the rewriters CSS handler along

### Manifest:

A basic JSON.stringify checking if the key is `src` or `key` or `start_url` and if it is then the rewriters URL handler is used to determine the result