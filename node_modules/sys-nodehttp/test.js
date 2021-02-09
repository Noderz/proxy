var http = require('http'),
	path = require('path'),
	nodehttp = require('.'),
	server = new nodehttp.server({
		address: '127.0.0.1',
		port: '8080',
		ready(){
			console.log(this.url.href);
			
			this.routes.forEach(([ method, path, handler ]) => {
				var url = new URL(path, this.url),
					start = Date.now();
				
				http.request({
					method: method,
					hostname: this.url.hostname,
					port: this.url.port,
					path: path,
				}, (res, chunks = [], complete = Date.now()) => res.on('data', chunk => chunks.push(chunk)).on('end', () => {
					var data = Number(Buffer.concat(chunks).toString('utf8'));
					
					console.log(`${method} ${path}\nclient start - client completion: ${complete - start} MS\nclient start - server recieve: ${data - start} MS\n`);
				})).end();
			});
		},
	});

server.get('/test', (req, res, next) => res.send(Date.now()));