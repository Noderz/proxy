/*<--server_only*/
var fs = require('fs'),
	dns = require('dns'),
	zlib = require('zlib'),
	util = require('util'),
	path = require('path'),
	http = require('http'),
	https = require('https'),
	ws = require(path.join(__dirname, 'ws.js')),
	jsdom = require(path.join(__dirname, 'jsdom.js')).JSDOM,
	terser = require(path.join(__dirname, 'terser.js')),
	_bundler = class {
		constructor(modules, wrapper = [ '', '' ]){
			this.modules = modules;
			this.path = globalThis.fetch ? null : require('path');
			this.wrapper = wrapper;
		}
		wrap(str){
			return JSON.stringify([ str ]).slice(1, -1);
		}
		resolve_contents(path){
			return new Promise((resolve, reject) => globalThis.fetch ? fetch(path).then(res => res.text()).then(resolve).catch(reject) : fs.promises.readFile(path, 'utf8').then(resolve).catch(reject));
		}
		relative_path(path){
			return this.path ? this.path.relative(__dirname, path) : path;
		}
		run(){
			return new Promise((resolve, reject) => Promise.all(this.modules.map(data => new Promise((resolve, reject) => this.resolve_contents(data).then(text => resolve(this.wrap(new URL(this.relative_path(data), 'http:a').pathname) + '(module,exports,require,global){' + (data.endsWith('.json') ? 'module.exports=' + JSON.stringify(JSON.parse(text)) : text) + '}')).catch(err => reject('Cannot locate module ' + data + '\n' + err))))).then(mods => resolve(this.wrapper[0] + 'var require=((l,i,h)=>(h="http:a",i=e=>(n,f,u)=>{f=l[new URL(n,e).pathname];if(!f)throw new TypeError("Cannot find module \'"+n+"\'");!f.e&&f.apply((f.e={}),[{browser:!0,get exports(){return f.e},set exports(v){return f.e=v}},f.e,i(h+f.name),new(_=>_).constructor("return this")()]);return f.e},i(h)))({' + mods.join(',') + '});' + this.wrapper[1] )).catch(reject));
		}
	};
/*server_only-->*/

var URL = require('./url.js');

module.exports = class {
	constructor(config){
		this.config = Object.assign({
			http_agent: module.browser ? null : new http.Agent({}),
			https_agent: module.browser ? null : new https.Agent({ rejectUnauthorized: false }),
			codec: module.exports.codec.plain,
			interface: null,
			prefix: null,
			ws: true, // websocket proxying
			timeout: 30000, // max request timeout
			title: 'Service',
		}, config);
		
		this.URL = class extends URL {
			get fullpath(){
				return this.href.substr(this.origin.length);
			}
		};
		
		if(typeof this.config.codec == 'string')this.config.codec = module.exports.codec[this.config.codec];
		
		/*<--server_only*/if(this.config.server){
			if(this.config.dns)dns.setServers(this.config.dns);
			
			this.config.server_ssl = this.config.server.ssl;
			
			this.config.server.use(this.config.prefix + '*', (req, res) => {
				if(req.url.searchParams.has('html'))return res.send(this.preload[0] || '');
				if(req.url.searchParams.has('favicon'))return res.contentType('image/png').send(Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAA', 'base64'));
				
				var url = this.unurl(req.url),
					data = { origin: req.url, url: url, base: url },
					failure = false,
					timeout = setTimeout(() => !res.resp.sent_body && (failure = true, res.cgi_status(500, 'Timeout')), this.config.timeout);
				
				if(!url || !this.http_protocols.includes(url.protocol))return res.redirect('/');
				
				// if(!url.orig)return console.trace(url);
				
				dns.lookup(url.hostname, (err, ip) => {
					if(err)return res.cgi_status(400, err);
					
					if(ip.match(this.regex.ip))return res.cgi_status(403, 'Forbidden IP');
					
					(url.protocol == 'http:' ? http : https).request({
						agent: url.protocol == 'http:' ? this.config.http_agent : this.config.https_agent,
						servername: url.hostname,
						hostname: ip,
						path: url.fullpath,
						port: url.port,
						protocol: url.protocol,
						localAddress: this.config.interface,
						headers: this.headers_encode(req.headers, data),
						method: req.method,
					}, resp => this.decompress(req, resp, body => {
						var dest = req.headers['sec-fetch-dest'],
							content_type = (resp.headers['content-type'] || '').split(';')[0],
							type =  content_type == 'text/plain' ? 'plain' : dest == 'font' ? 'font' : url.orig.searchParams.has('type') ? url.orig.searchParams.get('type') : dest == 'script' ? 'js' : (this.mime_ent.find(([ key, val ]) => val.includes(content_type)) || [])[0],
							dec_headers = this.headers_decode(resp.headers, data);
						
						res.status(resp.statusCode);
						
						for(var name in dec_headers)res.set(name, dec_headers[name]);
						
						clearTimeout(timeout);
						
						if(failure)return;
						
						res.send(url.orig.searchParams.get('route') != 'false' && ['js', 'css', 'html', 'plain', 'manifest'].includes(type) ? this[type](body, data) : body);
					})).on('error', err => {
						clearTimeout(timeout);
						
						if(failure)return;
						
						res.cgi_status(400, err);
					}).end(req.raw_body);
				});
			});
			
			if(this.config.ws){
				var wss = new ws.Server({ server: this.config.server.server });
				
				wss.on('connection', (cli, req) => {
					var req_url = new this.URL(req.url, new URL('wss://' + req.headers.host)),
						url = this.unurl(req_url);
					
					
					if(url.href.includes('studyflow'))return cli.close();
					
					var headers = this.headers_encode(req.headers, { url: url, origin: req_url, base: url }),
						srv = new ws(url, {
							headers: headers,
							agent: ['wss:', 'https:'].includes(url.protocol) ? this.config.https_agent : this.config.http_agent,
						}),
						time = 8000,
						timeout = setTimeout(() => srv.close(), time),
						interval = setInterval(() => cli.send('srv-alive'), time / 2),
						queue = [];
					
					srv.on('error', err => console.error(headers, url.href, err) + cli.close());
					
					cli.on('message', data => (clearTimeout(timeout), timeout = setTimeout(() => srv.close(), time), data != 'srv-alive' && (srv.readyState && srv.send(data) || queue.push(data))));
					
					srv.on('open', () => {
						cli.send('srv-open');
						
						queue.forEach(data => srv.send(data));
						
						srv.on('error', code => cli.close());
						
						srv.on('message', data => cli.send(data));
						
						srv.on('close', code => cli.close());
						
						cli.on('close', code => srv.close() + clearTimeout(timeout) + clearInterval(interval));
					});
				});
			}
		}/*server_only-->*/
		
		this.dom = module.browser ? global : new jsdom();
		
		if(this.dom.window && this.dom.window.DOMParser)this.html_parser = new this.dom.window.DOMParser();
		
		this.regex = {
			js: {
				prw_ind: /\/\*(pmrw\d+)\*\/[\s\S]*?\/\*\1\*\//g,
				prw_ins: /\/\*pmrwins(\d+)\*\//g,
				window_assignment: /(?<![a-z])window(?![a-z])\s*?=(?!=)this/gi,
				call_this: /(?<![a-zA-Z_\d'"$])this(?![a-zA-Z_\d'"$])/g,
				construct_this: /new pm_this\(this\)/g,
				// hooking function is more practical but cant do
				eval: /(?<![a-zA-Z0-9_$.,])(?:window\.|this)?eval(?![a-zA-Z0-9_$])/g,
				import_exp: /(?<!['"])(import\s+[{"'`*](?!\*)[\s\S]*?from\s*?(["']))([\s\S]*?)(\2;)/g,
				// work on getting import() function through
				// (match, start, quote, url, end) 
				export_exp: /export\s*?\{[\s\S]*?;/g,
			},
			css: {
				url: /(?<![a-z])(url\s*?\(("|'|))([\s\S]*?)\2\)/gi,
				import: /(@import\s*?(\(|"|'))([\s\S]*?)(\2|\))/gi,
			},
			html: {
				srcset: /(\S+)(\s+\d\S)/g,
				newline: /\n/g,
			},
			url: {
				proto: /^([^\/]+:)/,
				host: /(:\/+)_(.*?)_/,
				parsed: /^\/\w+-/,
			},
			skip_header: /(?:^sec-websocket-key|^cf-(connect|ip|visitor|ray)|^real|^forwarded-|^x-(real|forwarded|frame)|^strict-transport|content-(security|encoding|length)|transfer-encoding|access-control|sourcemap|trailer)/i,
			sourcemap: /sourceMappingURL/gi,
			server_only: /\/\*<--server_only\*\/[\s\S]*?\/\*server_only-->\*\//g,
			ip: /^192\.168\.|^172\.16\.|^10\.0\.|^127\.0/,
		};
		
		this.mime = {
			js: [ 'text/javascript', 'text/emcascript', 'text/x-javascript', 'text/x-emcascript', 'application/javascript', 'application/x-javascript', 'application/emcascript', 'application/x-emcascript' ],
			css: [ 'text/css' ],
			html: [ 'text/html' ],
			xml: [ 'application/xml', 'application/xhtml+xml', 'application/xhtml+xml' ],
		};

		this.mime_ent = Object.entries(this.mime);

		this.attr = {
			html: [ [ 'iframe' ], [ 'srcdoc' ] ],
			css: [ '*', [ 'style' ] ],
			url: [ [ 'track', 'template', 'source', 'script', 'object', 'media', 'link', 'input', 'image', 'video', 'iframe', 'frame', 'form', 'embed', 'base', 'area', 'anchor', 'a', 'img', 'use' ], [ 'srcset', 'href', 'xlink:href', 'src', 'action', 'content', 'data', 'poster' ] ],
			// js attrs begin with on
			del: [ '*', ['nonce', 'integrity'] ],
		};
		
		this.attr_ent = Object.entries(this.attr);
		
		this.protocols = [ 'http:', 'https:', 'ws:', 'wss:' ];
		
		this.http_protocols = [ 'http:', 'https:' ];
		
		/*<--server_only*/if(!module.browser){
			var bundler = new _bundler([
					path.join(__dirname, 'html.js'),
					path.join(__dirname, 'url.js'),
					__filename,
				]);
			
			this.preload = ['alert("preload.js not ready!");', 0];
			
			this.bundle = async () => {
				var times = await Promise.all(bundler.modules.map(data => new Promise(resolve => fs.promises.stat(data).then(data => resolve(data.mtimeMs))))).then(data => data.join(''));
				
				if(this.preload[1] == times)return;
				
				var ran = await bundler.run().then(code => code.replace(this.regex.server_only, '')),
					merged = 'document.currentScript.remove();window.__pm_init__=(rewrite_conf,prw)=>{' + ran + 'require("./html.js")};window.__pm_init__(' + this.str_conf() + ')';
				
				console.log('bundle updated');
				
				this.preload = [ await terser.minify(merged, {
					compress: {
						toplevel: true,
						drop_debugger: false,
					},
				}).then(data => data.code).catch(console.error), times ];
			};
			
			new _bundler([
				path.join(__dirname, 'url.js'),
				__filename,
			]).run().then(code => terser.minify(code.replace(this.regex.server_only, ''))).then(data => {
				this.prw = data.code + 'return require("./rewrite.js")';
			});
			
			terser.minify('function ' + this.globals).then(data => this.glm = this.config.glm = data.code);
			
			this.bundle();
			setInterval(this.bundle, 2000);
		}else/*server_only-->*/{
			this.prw = this.config.prw
			this.glm = this.config.glm;
			this.preload = [ 'alert("how!")', Date.now() ];
		}
	}
	decompress(req, res, callback){
		var chunks = [];
		
		if(req.method != 'HEAD' && res.statusCode != 204  && res.statusCode != 304)switch(res.headers['content-encoding'] || res.headers['x-content-encoding']){
			case'gzip':
				res = res.pipe(zlib.createGunzip({
					flush: zlib.Z_SYNC_FLUSH,
					finishFlush: zlib.Z_SYNC_FLUSH
				}));
				
				break;
			case'deflate':
				return res.once('data', chunk =>
					res.pipe((chunk[0] & 0x0F) === 0x08 ? zlib.createInflate() : zlib.createInflateRaw()).on('data', chunk => chunks.push(chunk)).on('end', () => callback(Buffer.concat(chunks)))
				);
				
				break;
			case'br':
				res = res.pipe(zlib.createBrotliDecompress());
				
				break;
		}
		
		res.on('data', chunk => chunks.push(chunk)).on('end', () => callback(Buffer.concat(chunks)));
	}
	valid_url(...args){
		var out;
		
		try{ out = new this.URL(...args) }catch(err){}
		
		return out;
	}
	str_conf(){
		return JSON.stringify({
			codec: this.config.codec.name,
			prefix: this.config.prefix,
			title: this.config.title,
			server_ssl: this.config.server_ssl,
			ws: this.config.ws,
			prw:  this.prw,
			glm:  this.glm,
		});
	}
	globals(url, rw){
		var global = new (_=>_).constructor('return this')(),
			def = {
				get doc(){
					return global.document;
				},
				handler: (tg, prox_targ) => (Object.defineProperties(prox_targ, Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(tg)).map(([ key, val ]) => (val.hasOwnProperty('configurable') && (val.configurable = true), [ key, val ])))), {
					set: (t, prop, value) => def.ref.set(tg, prop, value),
					has: (t, ...a) => def.ref.has(tg, ...a),
					ownKeys: (t, ...a) => def.ref.ownKeys(tg, ...a),
					enumerate: (t, ...a) => def.ref.enumerate(tg, ...a),
					getOwnPropertyDescriptor: (t, p) => def.ref.getOwnPropertyDescriptor(prox_targ, p),
					defineProperty: (t, prop, desc) => {
						
						/*Reflect.defineProperty(prox_targ, prop, desc);
						desc[def.has_prop(desc, 'value') ? 'writable' : 'configurable'] = true;
						hook defineProperty on object and EVERYTHINg
						*/
						Reflect.defineProperty(prox_targ, prop, desc);
						
						return Reflect.defineProperty(tg, prop, desc);
					},
					deleteProperty: (t, ...a) => def.ref.deleteProperty(tg, ...a),
					getPrototypeOf: t => def.ref.getPrototypeOf(tg),
					setPrototypeOf: (t, ...a) => def.ref.setPrototypeOf(tg, ...a),
					isExtensible: t => def.ref.isExtensible(tg),
					preventExtensions: t => def.ref.preventExtensions(tg),
				}),
				/* if a property can be changed and manipulated */
				prop: (o, p, d) => (d = Object.getOwnPropertyDescriptor(o, p), !d ? true : d && (!d.configurable || !d.writable) && (!d.configurable ? def.ref.deleteProperty(o, p) : true) && Object.defineProperty(o, p, Object.assign(d, { configurable: true }, def.has_prop(d, 'writable') ? { writable: true } : {}))),
				bind_orig: Function.prototype.bind.pm_orig || Function.prototype.bind,
				bind: (a, b) => def.ref.apply(def.bind_orig, a, [ b ]),
				/* restore args */
				unnormal: arg => arg && arg[_pm_.hooked] ? arg[_pm_.hooked] : arg,
				func_str: Function.prototype.toString,
				is_native: func => typeof func == 'function' && def.ref.apply(def.func_str, func, []) == 'function ' + func.name + '() { [native code] }',
				ref: Object.fromEntries(["defineProperty", "deleteProperty", "apply", "construct", "get", "getOwnPropertyDescriptor", "getPrototypeOf", "has", "isExtensible", "ownKeys", "preventExtensions", "set", "setPrototypeOf"].map(x => [ x, Reflect[x] ])),
				storage_handler: {
					get: (target, prop, ret) => prop == 'pm_hooked' || (typeof (ret = def.ref.get(target, prop)) == 'function' ? def.bind(ret, target) : target.getItem(prop)),
					set: (target, prop, value) => (target.setItem(prop, value), true),
				},
				proxies: new Map(),
				orig_hasOwnProperty: Object.prototype.hasOwnProperty,
				has_prop: (obj, prop) => prop && obj && def.ref.apply(def.orig_hasOwnProperty, obj, [ prop ]),
				alt_prop: (obj, prop) => def.has_prop(obj, prop) ? obj[prop] : null,
				assign_func: (func, bind) => Object.assign(Object.defineProperties(def.bind(func, bind), Object.getOwnPropertyDescriptors(func)), {
					[_pm_.hooked]: func,
				}),
				proxy_targets: {
					/* blank class to remove all native object methods */
					win: Object.setPrototypeOf({},null),
					doc: Object.setPrototypeOf({},null),
					url: Object.setPrototypeOf({},null),
				},
				defineprop_handler: {
					apply(target, that, [ obj, prop, desc ]){
						if(obj && obj.pm_proxy)desc[def.has_prop(desc, 'value') ? 'writable' : 'configurable'] = true;
						
						return Reflect.apply(target, that, [ obj, prop, desc ]);
					},
				},
			},
			URL = global.URL,
			_pm_ = global._pm_ || (global._pm_ = { blob_store: new Map(), url_store: new Map(), url: new URL(url), hooked: Symbol('pm.hooked') }),
			fills = _pm_.fills = {
				Window: global ? global.Window : undefined,
				win: new Proxy(def.proxy_targets.win, Object.assign(def.handler(global, def.proxy_targets.win), {
					get: (t, prop, rec, ret) => ['pm_proxy', _pm_.hooked].includes(prop) ? global : typeof (ret = def.ref.get(def.has_prop(def.win_binds, prop) ? def.win_binds : global, prop)) == 'function' ? def.assign_func(ret, global) : ret,
					set: (t, prop, value) => def.has_prop(def.win_binds, prop) ? (def.win_binds[prop] = value) : def.ref.set(global, prop, value),
				})),
				doc: def.doc ? new Proxy(def.proxy_targets.doc, Object.assign(def.handler(def.doc, def.proxy_targets.doc), {
					get: (t, prop, rec, ret) => prop == 'pm_proxy' ? true : prop == _pm_.hooked ? def.doc : def.has_prop(def.doc_binds, prop) ? def.doc_binds[prop] : (typeof (ret = def.ref.get(def.doc, prop))) == 'function'
						? def.assign_func(ret, def.doc) : ret,
					set: (t, prop, value) => Object.getOwnPropertyDescriptor(def.doc_binds, prop) ? (def.doc_binds[prop] = value) : def.ref.set(def.doc, prop, value),
				})) : undefined,
				imp: typeof global.importScripts == 'function' ? (...args) => global.importScripts(...args.map(url => rw.url(url, { base: fills.url, origin: global.location, type: 'js' }))) : undefined,
			};
		
		if(!_pm_.hooked_all){
			_pm_.hooked_all = true;
			
			Function.prototype.bind.pm_orig = Function.prototype.bind;
			
			/* prevent mismatching or binding native function to proxied native */
			
			Function.prototype.bind = new Proxy(Function.prototype.bind, {
				apply: (target, that, args) => def.ref.apply(target, that, def.is_native(that) ? args.map(def.unnormal) : args),
			});
			
			Function.prototype.apply = new Proxy(Function.prototype.apply, {
				apply: (target, that, args) => def.ref.apply(target, that, [...args].map(arg => def.is_native(that) ? def.unnormal(arg) : arg)),
			});
			
			Function.prototype.call = new Proxy(Function.prototype.call, {
				apply: (target, that, args) => def.ref.apply(target, that || {}, [...args].map(arg => def.is_native(that) ? def.unnormal(arg) : arg)),
			});
		}
		
		if(global.fetch && !global.fetch[_pm_.hooked]){
			global.fetch = new Proxy(global.fetch, {
				apply: (target, that, [ url, opts ]) => Reflect.apply(target, global, [ rw.url(url, { base: fills.url, origin: global.location, route: false }), opts ]),
			});
			
			global.fetch[_pm_.hooked] = true;
		}
		
		if(global.Function && !global.Function[_pm_.hooked]){
			global.Function = new Proxy(global.Function, {
				construct(target, args){
					var ref = Reflect.construct(target, args);
					
					return Object.assign(Object.defineProperties(Reflect.construct(target, [ ...args.slice(0, -1), 'return(()=>' + rw.js(args.slice(-1)[0], { url: fills.url, origin: global.location, base: fills.url, global: true }) + ')()' ]), Object.getOwnPropertyDescriptors(ref)), {
						toString: ref.toString.bind(ref),
					});
				},
				apply(target, that, args){
					var params = args.slice(0, -1),
						script = args.slice(-1)[0];
					
					return Reflect.apply(target, that, [ ...params, 'return(()=>' + rw.js(script , _pm_) + ')()' ])
				},
			});
			
			global.Function[_pm_.hooked] = true;
		}
		
		if(global.Blob && !global.Blob[_pm_.hooked]){
			global.Blob = new Proxy(global.Blob, {
				construct(target, [ data, opts ]){
					var decoded = opts && rw.mime.js.includes(opts.type) && Array.isArray(data) ? [ rw.js(rw.decode_blob(data), { url: _pm_.fills.url, origin: global.location, base: _pm_.fills.url }) ] : data,
						blob = Reflect.construct(target, [ decoded, opts ]);
					
					_pm_.blob_store.set(blob, decoded[0]);
					
					return blob;
				},
			});
			
			global.Blob[_pm_.hooked] = true;
		}
		
		if(global.URL && global.URL.createObjectURL && !global.URL.createObjectURL[_pm_.hooked]){
			var orig = global.URL.createObjectURL;
			
			/* add to blobstore and remove when needed */
			global.URL.createObjectURL = new Proxy(global.URL.createObjectURL, {
				apply(target, that, [ blob ]){
					var url = Reflect.apply(target, that, [ blob ]);
					
					_pm_.url_store.set(url, _pm_.blob_store.get(blob));
					
					return url;
				},
			});
			
			global.URL.createObjectURL.pm_orig = orig;
			
			global.URL.createObjectURL[_pm_.hooked] = true;
		}
		
		if(global.URL && global.URL.revokeObjectURL && !global.URL.revokeObjectURL[_pm_.hooked]){
			global.URL.revokeObjectURL = new Proxy(global.URL.revokeObjectURL, {
				apply(target, that, [ url ]){
					var ret = Reflect.apply(target, that, [ url ]);
					
					/* blobs can get recycled, _pm_.blob_store.delete(_pm_.url_store.get(url)); */
					_pm_.url_store.delete(url);
					
					return ret;
				},
			});
			
			global.URL.revokeObjectURL[_pm_.hooked] = true;
		}
		
		if(Object.defineProperty && !Object.defineProperty[_pm_.hooked]){
			Object.defineProperty = new Proxy(Object.defineProperty, def.defineprop_handler);
			
			Object.defineProperty[_pm_.hooked] = true;  
		}
		
		if(Reflect.defineProperty && !Reflect.defineProperty[_pm_.hooked]){
			Reflect.defineProperty = new Proxy(Reflect.defineProperty, def.defineprop_handler);
			
			Reflect.defineProperty[_pm_.hooked] = true;  
		}
		
		/* bind to new url instance */
		
		def.get_href = () => {
			var x = global.location.href;
			
			if(!x || !x.hostname)try{
				x = global.parent.location.href;
			}catch(err){}
			
			try{ x = new URL(x) }catch(err){};
			
			return x;
		};
		
		if(global.location){
			def.url_binds = {
				replace(url){
					return global.location.replace(rw.url(url, { base: fills.url, origin: global.location }));
				},
				assign(url){
					return global.location.assign(rw.url(url, { base: fills.url, origin: global.location }));
				},
				reload(){
					global.location.reload();
				},
			};
			
			/* url object proto properties wont change per instance
			update href */
			
			fills._url = new URL(rw.unurl(global.location, { origin: global.location }));
			
			fills.url = new Proxy(def.proxy_targets.url, Object.assign(def.handler(global.location, def.proxy_targets.url), {
				get: (target, prop, ret) => prop == 'pm_proxy' ? global.location : def.alt_prop(def.url_binds, prop) || (fills._url.href = rw.unurl(global.location, { origin: global.location }), typeof (ret = fills._url[prop]) == 'function' ? def.bind(ret, fills._url) : ret),
				set: (target, prop, value) => {
					fills._url.href = rw.unurl(global.location, { origin: global.location });
					
					/* cant change much */
					if(fills._url.protocol == 'blob:')return true;
					
					var ohref = fills._url.href;
					
					fills._url[prop] = value;
					
					if(fills._url.href != ohref)global.location.href = rw.url(fills._url.href, { url: rw.unurl(global.location, { origin: global.location }), origin: global.location });
					
					return true;
				},
			}));
		}
		
		if(global.cookieStore && !global.cookieStore[_pm_.hooked]){
			// cookieStorecookieStorecookieStorecookieStorecookieStorecookieStore
		}
		
		if(global.Storage && !global.Storage[_pm_.hooked]){
			var stro = {
				get_item: global.Storage.prototype.getItem,
				set_item: global.Storage.prototype.setItem,
				rem_item: global.Storage.prototype.removeItem,
				key_item: global.Storage.prototype.key,
				origin: prop => prop.split('@').splice(-1).join(''),
				/* sometimes host not set */
				name: prop => (typeof prop != 'string' ? 'prop' : prop) + '@' + new URL(rw.unurl(def.get_href(), { origin: global.location })).hostname,
				unname: (prop = '', split) => (split = prop.split('@'), split.splice(-1), split.join('')),
			};
			
			global.Storage.prototype.getItem = new Proxy(global.Storage.prototype.getItem, {
				apply: (target, that, [ prop ]) => Reflect.apply(target, that, [ stro.name(prop) ]),
			});
			
			global.Storage.prototype.setItem = new Proxy(global.Storage.prototype.setItem, {
				apply: (target, that, [ prop, value ]) => Reflect.apply(target, that, [ stro.name(prop), value ]),
			});
			
			global.Storage.prototype.removeItem = new Proxy(global.Storage.prototype.removeItem, {
				apply: (target, that, [ prop, ]) => Reflect.apply(target, that, [ stro.name(prop) ]),
			});
			
			global.Storage.prototype.clear = new Proxy(global.Storage.prototype.clear, {
				apply: (target, that) => Object.keys(that).forEach(val => stro.origin(val) == pm.url.hostname && that.removeItem(prop))
			});
			
			global.Storage.prototype.key = new Proxy(global.Storage.prototype.key, {
				apply: (target, that, [ key ]) => stro.unname(Reflect.apply(target, that, [ key ])),
			});
			
			global.Storage[_pm_.hooked] = true;
		}
		
		if(global.localStorage && !global.localStorage[_pm_.hooked]){
			var ls = new Proxy(global.localStorage, def.storage_handler);
			
			delete global.localStorage;
			
			global.localStorage = ls;
			
			global.localStorage[_pm_.hooked] = true;
		}
		
		if(global.sessionStorage && !global.sessionStorage[_pm_.hooked]){
			var st = new Proxy(global.sessionStorage, def.storage_handler);
			
			delete global.sessionStorage;
			
			global.sessionStorage = st;
			
			global.sessionStorage[_pm_.hooked] = true;
		}
		
		/* NOTE TO SELF SET THE PM HOOKED ATTRIBUTE OR WATCH PERFORMANCE LITERALLY DIE */
		
		try{
			fills.par = global.parent && global.parent._pm_ ? global.parent._pm_.fills.win : fills.win;
			fills.top = global.top && global.top._pm_ ? global.top._pm_.fills.win : fills.win;
			
			/* set url_store in parent?? */
		}catch(err){
			fills.par = fills.win;
			fills.top = fills.win;
		}
		
		/* to avoid did not return original value, set proxy target to {} */
		
		def.win_binds = {
			document: fills.doc,
			top: fills.top,
			parent: fills.par,
			self: fills.win,
			window: fills.win,
			constructor: global.Window,
			Window: global.Window,
			get location(){
				return fills.url;
			},
			set location(value){
				return fills.url.href = value;
			},
			get origin(){
				return fills.url.origin;
			},
		};
		
		def.doc_binds = {
			get URL(){
				return fills.url.href;
			},
			get referrer(){
				var ret = def.doc.referrer;
				
				return ret ? (rw.unurl(ret, global.location, fills.url, { origin: global.location })||{href:''}).href : fills.url.href;
			},
			get location(){
				return fills.url;
			},
			set location(value){
				return fills.url.href = value;
			},
			get domain(){
				return fills.url.hostname;
			},
		};
		
		global.pm_this = x => (x||0)._pm_?x._pm_.fills.win:x;
		// get scope => eval inside of scope
		global.pm_eval = js => '(()=>' + rw.js('return eval(' + rw.wrap(rw.js(js, { url: fills.url, origin: global.location, base: fills.url, scope: false })) + ')', { url: fills.url, origin: location, base: fills.url, rewrite: false }) + ')()';
		
		return fills;
	}
	html_serial(dom){
		if(module.browser)return dom.querySelector('#pro-root').innerHTML;
		
		var out, odoc = this.dom.window._document;
		
		this.dom.window._document = dom;
		
		out = this.dom.serialize();
		
		this.dom.window._document = odoc;
		
		return out;
	}
	wrap(str){
		return JSON.stringify([ str ]).slice(1, -1);
	}
	hash(r,e=5381,t=r.length){for(;t;)e=33*e^r.charCodeAt(--t);return e>>>0}
	url(value, data = {}){
		if(data.ws && !this.config.ws)throw new TypeError('WebSockets are disabled');
		
		if(typeof value == 'undefined')return value;
		
		var oval = value;
		
		if(!data.origin)throw new TypeError('give origin');
		
		data.base = this.valid_url(data.base || this.unurl(data.origin));
		
		data.origin = new URL(data.origin).origin;
		
		if(module.browser && data.base.origin == 'null'){
			var x = global.location.href;
			
			if(!x || !x.hostname)try{
				x = global.parent.location.href;
			}catch(err){}
			
			try{ x = new URL(x) }catch(err){};
			
			data.base = x;
		}
		
		if(module.browser && value instanceof global.Request)value = value.url;
		if(typeof value == 'object')value = value.hasOwnProperty('url') ? value.url : value + '';
		
		if(value.startsWith('blob:') && data.type == 'js' && module.browser){
			var raw = global._pm_.url_store.get(value);
			
			if(raw)return (URL.createObjectURL.pm_orig || URL.createObjectURL)(new Blob([ this.js(raw, { url: data.base, origin: data.origin }) ]));
		}
		
		if(value.match(this.regex.url.proto) && !this.protocols.some(proto => value.startsWith(proto)))return value;
		
		var url = this.valid_url(value, data.base);
		
		if(!url)return console.log(value), console.log(data.base), value;
		
		var out = url.href,
			query = new URLSearchParams();
		
		if(url.pathname.match(this.regex.url.parsed) && url.pathname.startsWith(this.config.prefix))return value;
		
		if(url.origin == data.origin && url.origin == data.base.origin)console.error('origin conflict', url.href, data.base.href, data.origin);
		if(url.origin == data.origin)out = data.base.origin + url.fullpath;
		
		query.set('url', this.config.codec.encode(out, data));
		if(data.type)query.set('type', data.type);
		if(data.hasOwnProperty('route'))query.set('route', data.route);
		
		query.set('ref', this.config.codec.encode(data.base.href, data));
		
		var qd = encodeURIComponent(query + ''),
			out = (data.ws ? data.origin.replace(this.regex.url.proto, 'ws' + (this.config.server_ssl ? 's' : '') + '://') : data.origin) + this.config.prefix + qd.length.toString(16) + '-' + qd;
		
		if(module.browser && oval instanceof global.Request)out = new global.Request(out, oval);
		
		return out;
	}
	unurl(value, data = {}){
		var url = new this.URL(value, data.origin || 'http:a'),
			osearch,
			start = this.config.prefix.length,
			size = url.pathname.substr(start, url.pathname.indexOf('-', start + 1) - start),
			start2 = start + size.length + 1;
		
		if(url){
			osearch = url.search;
			
			try{
				url.search = decodeURIComponent(url.pathname.substr(start2, start2 + parseInt(size, 16)));
			}catch(err){
				console.log(value, err);
				return value;
			}
		}
		
		if(!url.searchParams.has('url'))return url.orig = url, url;
		
		var out = this.valid_url(this.config.codec.decode(url.searchParams.get('url'), data));
		
		if(out && osearch)out.search = osearch;
		if(out)out.orig = url;
		
		return out;
	}
	headers_decode(value, data = {}){
		var out = {};
		
		for(var header in value){
			var val = typeof value[header] == 'object' ? value[header].join('') : value[header];
			
			switch(header.toLowerCase()){
				case'set-cookie':
					
					out[header] = this.cookie_encode(val, { origin: data.origin, url: data.url, base: data.base });
					
					break;
				case'websocket-origin':
					
					out[header] = this.config.codec.decode(data.url.searchParams.get('origin'), data) || data.url.origin;
					
					break;
				case'websocket-location':
				case'location':
					
					out[header] = this.url(val, { origin: data.origin, url: data.url, base: data.base });
					
					break;
				default:
					
					if(!header.match(this.regex.skip_header))out[header] = val;
					
					break;
			}
		};
		
		out['x-rwog'] = JSON.stringify(value);
		
		return out;
	}
	/*<--server_only*/headers_encode(value, data = {}){
		var out = {};
		
		for(var header in value){
			var val = typeof value[header] == 'object' ? value[header].join('') : value[header];
			
			switch(header.toLowerCase()){
				case'referrer':
				case'referer':
					
					out[header] = data.origin.searchParams.has('ref') ? this.config.codec.decode(data.origin.searchParams.get('ref'), data) : data.url.href;
					
					break;
				case'cookie':
					
					out[header] = this.cookie_decode(val, data);
					
					break;
				case'host':
					
					out[header] = data.url.host;
					
					break;
				case'sec-websocket-key': break;
				case'origin':
					
					var url;

					if(data.url.orig)url = this.valid_url(this.config.codec.decode(data.url.orig.searchParams.get('ref'), data));
					
					out[header] = out.Origin = url ? url.origin : data.url.origin;
					
					break;
				default:
					
					if(!header.match(this.regex.skip_header))out[header] = val;
					
					break;
			}
		}
		
		out['accept-encoding'] = 'gzip, deflate, br';
		
		out['upgrade-insecure-requests'] = '1';
		
		delete out['cache-control'];
		
		out.host = data.url.host;
		
		return out;
	}/*server_only-->*/
	cookie_encode(value, data = {}){
		return value.split(';').map(split => {
			var split = (split + '').trim().split('=');
			
			if(split[0] == 'secure')return '';
			else if(split[0] == 'domain')split[1] = data.origin.hostname;
			else if(split[0] == 'path')split[1] = '/';
			else if(!['expires', 'path', 'httponly', 'samesite'].includes(split[0]))split[0] += '@' + data.url.hostname;
			
			
			return split[0] + (split[1] ? '=' + split[1] + ';' : ';');
		}).join(' ');
	}
	cookie_decode(value, data = {}){
		return value.split(';').map(split => {
			var split = (split + '').trim().split('='),
				fn = split[0].split('@'),
				origin = fn.splice(-1).join('');
			
			return fn && data.url.hostname.includes(origin) ? fn[0] + '=' + split[1] + ';' : null;
		}).filter(v => v).join(' ');
	}
	/* methods */
	js(value, data = {}){
		value = this.plain(value, data);
		
		if(value.startsWith('{/*pmrw'))return value;
		
		var js_imports = [], js_exports = [], prws = [];
		
		if(data.rewrite != false)value = value
		.replace(this.regex.sourcemap, 'undefined')
		.replace(this.regex.js.prw_ind, match => (prws.push(match), '/*pmrwins' + (prws.length - 1) + '*/'))
		.replace(this.regex.js.call_this, 'pm_this(this)')
		.replace(this.regex.js.eval, '(x=>eval(pm_eval(x)))')
		.replace(this.regex.js.construct_this, 'new(pm_this(this))')
		// move import statements
		// .replace(this.regex.js.import_exp, (match, start, quote, url, end) => (js_imports.push(start + this.url(url, data.furl, data.url) + end), ''))
		// .replace(this.regex.js.export_exp, match => (js_exports.push(match), ''))
		;
		
		var id = this.hash(value);
		
		if(data.scope !== false)value = js_imports.join('\n') + '{/*pmrw' + id + '*/let fills=' + (data.global == true ? '_pm_.fills' : `(${this.glm})(${this.wrap(data.url + '')},new((()=>{${this.prw}})())(${this.str_conf()}))`) + ',Window=fills.win?fills.win.Window:fills.Window,location=fills.url,self=fills.win,globalThis=fills.win,top=fills.top,parent=fills.par,frames=fills.win,window=fills.win,document=fills.doc,importScripts=fills.imp;\n' + value.replace(this.regex.js.prw_ins, (match, ind) => prws[ind]) + '\n/*pmrw' + id + '*/}';
		// + js_exports.join('\n');
		// fills=void 0;
		return value;
	}
	css(value, data = {}){
		if(!value)return '';
		
		value = value.toString('utf8');
		
		[
			[this.regex.css.url, (m, start, quote = '', url) => start + this.url(url, data) + quote + ')'],
			[this.regex.sourcemap, 'undefined'],
			
			[this.regex.css.import, (m, start, quote, url) => start + this.url(url, data) + quote ],
		].forEach(([ reg, val ]) => value = value.replace(reg, val));
		
		return value;
	}
	manifest(value, data = {}){
		var json;
		
		try{ json = JSON.parse(value) }catch(err){ console.log(err); return value };
		
		return JSON.stringify(json, (key, val) => ['start_url', 'key', 'src'].includes(key) ? this.url(val, data) : val);
	}
	html(value, data = {}){
		value = this.plain(value, data);
		
		var document = this.html_parser.parseFromString(module.browser ? '<div id="pro-root">' + value + '</div>' : value, 'text/html'),
			charset = '<meta charset="ISO-8859-1">';
		
		document.querySelectorAll(module.browser ? '#pro-root *' : '*').forEach(node => {
			switch((node.tagName || '').toLowerCase()){
				case'meta':
					
					if(node.outerHTML.toLowerCase().includes('charset'))charset = node.outerHTML;
					
					if(node.getAttribute('http-equiv') && node.getAttribute('content'))node.setAttribute('content', node.getAttribute('content').replace(/url=(.*?$)/, (m, url) => 'url=' + this.url(url, data)));
					
					// node.remove();
					
					break;
				case'title':
					
					node.remove();
					
					break;
				case'link':
					
					if(node.rel && node.rel.includes('icon'))node.remove();
					// else if(node.rel == 'manifest')node.href = this.url(node.href, { origin: data.url, base: data.base, type: 'manifest' });
					
					break;
				case'script':
					var type = node.getAttribute('type') || this.mime.js[0];
					
					// 3rd true indicates this is a global script
					if(this.mime.js.includes(type) && node.innerHTML)node.textContent = this.js(node.textContent, data);
					
					break;
				case'style':
					
					node.innerHTML = this.css(node.innerHTML, data);
					
					break;
				case'base':
					
					if(node.href)data.url = data.base = new URL(node.href, data.url.href);
					
					node.remove();
					
					break;
			}
			
			node.getAttributeNames().forEach(name => !name.startsWith('data-') && this.html_attr(node, name, data));
		});
		
		if(!data.snippet)document.head.insertAdjacentHTML('afterbegin', `${charset}<title>${this.config.title}</title><link type='image/x-icon' rel='shortcut icon' href='.${this.config.prefix}?favicon'><script src=".${this.config.prefix}?html=${this.preload[1]}"></script>`, 'proxied');
		
		return this.html_serial(document);
	}
	html_attr(node, name, data){
		var ovalue, value = node.rworig_getAttribute ? node.rworig_getAttribute(name) : node.getAttribute(name);
		
		ovalue = value;
		
		if(!value)return;
		
		value = (value + '').replace(this.regex.newline, '');
		
		var	tag = (node.tagName || '').toLowerCase(),
			attr_type = name.startsWith('on') || (this.attr_ent.find(x => (x[1][0] == '*' || x[1][0].includes(tag)) && x[1][1].includes(name))||[])[0];
		
		switch(attr_type){
			case'url':
				value = name == 'srcset' ?
					value.replace(this.regex.html.srcset, (m, url, size) => this.url(url, data) + size)
					: name == 'xlink:href' && value.startsWith('#')
						? value
						: this.url(value, { origin: data.origin, base: data.base, url: data.url, type: node.rel == 'manifest' ? 'manifest' : tag == 'script' ? 'js' : null });
				break;
			case'del':
				return node.removeAttribute(name);
				break;
			case'css':
				value = this.css(value, data);
				break;
			case'js':
				value = 'eval(atob(decodeURIComponent("' + btoa(unescape(encodeURIComponent(this.js(value, data)))) + '")))';
				break;
			case'html':
				value = this.html(value, { snippet: true, url: data.url, origin: data.origin });
				break;
		}
		
		node.setAttribute(name, value);
	}
	plain(value, data){
		if(!value)return '';
		
		value = value + '';
		
		// replace ip and stuff
		
		return value;
	}
	decode_blob(data){ // blob => string
		var decoder = new TextDecoder();
		
		return data.map(chunk => {
			if(typeof chunk == 'string')return chunk;
			else return decoder.decode(chunk);
		}).join('');
	}
}

module.exports.codec = {
	base64: {
		name: 'base64',
		encode(str){
			if(!str)return str;
			
			var b64chs = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='),
				u32, c0, c1, c2, asc = '',
				pad = str.length % 3;
			
			for(var i = 0; i < str.length;) {
				if((c0 = str.charCodeAt(i++)) > 255 || (c1 = str.charCodeAt(i++)) > 255 || (c2 = str.charCodeAt(i++)) > 255)throw new TypeError('invalid character found');
				u32 = (c0 << 16) | (c1 << 8) | c2;
				asc += b64chs[u32 >> 18 & 63]
					+ b64chs[u32 >> 12 & 63]
					+ b64chs[u32 >> 6 & 63]
					+ b64chs[u32 & 63];
			}
			return pad ? asc.slice(0, pad - 3) + '==='.substr(pad) : asc;
		},
		decode(str){
			if(!str)return str;
			
			var b64tab = {"0":52,"1":53,"2":54,"3":55,"4":56,"5":57,"6":58,"7":59,"8":60,"9":61,"A":0,"B":1,"C":2,"D":3,"E":4,"F":5,"G":6,"H":7,"I":8,"J":9,"K":10,"L":11,"M":12,"N":13,"O":14,"P":15,"Q":16,"R":17,"S":18,"T":19,"U":20,"V":21,"W":22,"X":23,"Y":24,"Z":25,"a":26,"b":27,"c":28,"d":29,"e":30,"f":31,"g":32,"h":33,"i":34,"j":35,"k":36,"l":37,"m":38,"n":39,"o":40,"p":41,"q":42,"r":43,"s":44,"t":45,"u":46,"v":47,"w":48,"x":49,"y":50,"z":51,"+":62,"/":63,"=":64};
			
			str = str.replace(/\s+/g, '');
			
			//if(!b64re.test(str))throw new TypeError('malformed base64.');
			
			str += '=='.slice(2 - (str.length & 3));
			var u24, bin = '', r1, r2;
			
			for (var i = 0; i < str.length;) {
				u24 = b64tab[str.charAt(i++)] << 18
				| b64tab[str.charAt(i++)] << 12
				| (r1 = b64tab[str.charAt(i++)]) << 6
				| (r2 = b64tab[str.charAt(i++)]);
				bin += r1 === 64 ? String.fromCharCode(u24 >> 16 & 255)
					: r2 === 64 ? String.fromCharCode(u24 >> 16 & 255, u24 >> 8 & 255)
						: String.fromCharCode(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
			}
			
			return bin;
		},
	},
};

module.exports.codec.plain = {
	encode(str){
		return str;
	},
	decode(str){
		return str;
	},
};