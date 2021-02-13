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

// console.log(rw.unurl('https://localhost:7080/serviceurl=hvtrs8%252F-wuw%252Cgmoelg.aoo%252Fqepvkcgupl%253Fhttps%253A%2525050F%252Fwww%27272Agoogle.com%2525050Fclient%27275F204%27273F%25250506at%27277%2540p%27273Di%272726biw%27273D1%27273%254020%25250506%272762ih%2525051D%27273%25403%27273C%25250506ei%27273D-RcnYJjwCJix5NoPj6mCkAw%2524rgf%253Fhttps%253A%2525050F%252Fwww%27272Agoogle.com%2525050F&ref=hvtrs8%252F-wuw%252Cgmoelg.aoo%252F'));
// console.log('out: ' + rw.unurl(rw.url('/complete/search?q=testesttestt&cp=12&monke=true&client=gws-wiz&xssi=t&gs_ri=gws-wiz&hl=en&authuser=0&psi=kg0nYMm9D4jl5NoPn_qOkAw.1613172116460&dpr=1', { origin: 'https://localhost:7080' })));