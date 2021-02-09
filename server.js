'use strict';
var fs = require('fs'),
	path = require('path'),
	config = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'config.json'))),
	nodehttp = require('sys-nodehttp'),
	rewriter = require(path.join(__dirname, 'mod', 'rewrite.js')),
	server = new nodehttp.server({
		port: config.port,
		address: config.address,
		static: path.join(__dirname, 'public'),
		ssl: config.ssl ? { key: fs.readFileSync(path.join(__dirname, 'data', 'ssl.key'), 'utf8'), cert: fs.readFileSync(path.join(__dirname, 'data', 'ssl.crt'), 'utf8') } : false,
	}),
	rw = new rewriter({
		prefix: '/service',
		codec: rewriter.codec.base64,
		server: server,
		title: 'Service',
		interface: config.interface,
	}),
	add_proto = url => (!/^(?:f|ht)tps?\:\/\//.test(url)) ? 'https://' + url : url,
	is_url = str => (/^https?:\/{2}|\S+\./g).test(str),
	gateway = (req, res) => {
		var data = req.method == 'GET' ? req.query : req.body;
		
		if(!data.url)return res.cgi_status(400, 'Missing `url` param');
		
		data.url = is_url(data.url) ? add_proto(data.url) : 'https://www.google.com/search?q=' + encodeURIComponent(data.url);
		
		switch(req.query.route){
			default:
				
				res.redirect(rw.url(add_proto(data.url), { origin: req.url }));
				
				break;
		}
	};

server.get('/uptime', (req, res) => res.send(process.uptime()));

server.use('/prox', gateway);
server.use('/gateway', gateway);
