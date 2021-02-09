#
# NODEHTTP
## lightweight express alternative, similar syntax

### adding to your package

```sh
npm i sys-nodehttp
```

### usage:

(make sure you do not have any conflicting package names)

```js
var path = require('path'),
	nodehttp = require('sys-nodehttp'),
	server = new nodehttp.server({
		// a directory named web serves static content
		static: path.join(__dirname, 'web'),
		// request routes
		routes: [
			[ 'GET', '/api', (req, res) => {
				res.send('Hello world!');
			} ],
			[ 'POST', '/api', (req, res) => {
				console.log('Recieved POST with body:', req.body);
			} ],
		],
		port: process.env.PORT || 8080,
		address: '0.0.0.0',
	});
```

todo: add docs via jsdoc 😳
