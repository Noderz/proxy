'use strict';
var fs = require('fs'),
	path = require('path'),
	nodehttp = require('sys-nodehttp'),
	rewriter = require('../'),
	config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'))),
	server = new nodehttp.server({
		port: config.port,
		address: config.address,
		static: path.join(__dirname, 'public'),
		ssl: config.ssl ? {
			key: fs.readFileSync(path.join(__dirname, 'ssl.key'), 'utf8'),
			cert: fs.readFileSync(path.join(__dirname, 'ssl.crt'), 'utf8'),
		} : false,
		adblock: true,
		ruffle: true,
	}),
	rw = new rewriter({
		prefix: '/service',
		codec: rewriter.codec.xor,
		server: server,
		title: 'Service',
		interface: config.interface,
	}),
	add_proto = url => (!/^(?:f|ht)tps?\:\/\//.test(url)) ? 'https://' + url : url,
	is_url = str => (/^https?:\/{2}|\S+\./g).test(str),
	gateway = (req, res) => {
		var data = req.method == 'GET' ? req.query : req.body;
		
		if(!data.url)return res.cgi_status(400, 'Missing `url` param');
		
		var url = req.method == 'GET' ? rewriter.codec.base64.decode(data.url) : data.url;
		
		url = is_url(url) ? add_proto(url) : 'https://www.google.com/search?q=' + encodeURIComponent(url);
		
		switch(req.query.route){
			case'vi':
				
				res.cookies.gateway = { value: 'vi' };
				res.redirect('/' + encodeURI(url));
				
				break;
			case'ap':
				
				res.cookies.gateway = { value: 'ap' };
				res.redirect('/session?url=' + encodeURIComponent(rewriter.codec.base64.encode(url)));
				
				break;
			default:
				
				res.cookies.gateway = { value: 'sp' };
				res.redirect(rw.url(url, { origin: req.url }));
				
				break;
		}
	};

server.get('/uptime', (req, res) => res.send(process.uptime()));

server.use('/prox', gateway);
server.use('/gateway', gateway);

// console.log(rw.unurl('https://localhost:7080/serviceurl=hvtrs8%252F-gsl%252Ctuivcj.vv-gsl%21opieil%253Dvwklkgjt&route=false&ref=hvtrs8%2F-wuw%2Ctuivcj.vv-

console.log(rw.unurl('https://localhost:7080/serviceurl=hvtrs8%252F-jwsvbwind%252Cn%257Bc1.adl.fieivanoaecnqpccgs%252Ccmm-CK%252F42-WgbEL%252Cjqol&route=false&ref=hvtrs8%2F-1t1%2Clml-'));