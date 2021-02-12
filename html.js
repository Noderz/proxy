'use strict';

if(!global._pm_)global._pm_ = {};
if(!global._pm_.fills)global._pm_.fills = {};
if(!global._pm_.hooked)global._pm_.hooked = Symbol();

Object.assign(global._pm_, {
	hooked: Symbol(),
	fills: {},
	blob_store: new Map(),
	url_store: new Map(),
	hooked: 'pm.hooked',
	prw: prw,
}, global._pm_);

var rewriter = require('./rewrite.js'),
	rw = new rewriter(rewrite_conf),
	pm = {
		get_href(){
			var x = global.location.href;
			
			if(!x || !x.hostname)try{
				x = global.parent.location.href;
			}catch(err){}
			
			try{ x = new URL(x) }catch(err){};
			
			return x;
		},
		rw_data: data => Object.assign({ url: pm.url, base: pm.url, origin: pm.get_href() }, data ? data : {}),
		init: global.__pm_init__,
		odoc: document,
		url: global._pm_.url || (global._pm_.url = new URL(global._pm_.url || rw.unurl(global.location.href, { origin: global.location }))),
		/* restore args */
		unnormal: arg => (arg && arg[_pm_.hooked]) ? arg[_pm_.hooked] : arg,
		normal(args){ // normalize arguments
			return args.map(arg => !arg ? arg : arg.pm_doc
				? document
				: arg.pm_win
					? window
					: arg
			);
		},
	},
	hook = win => {
		if(win[_pm_.hooked])return;
		
		win[_pm_.hooked] = true;
		
		win.XMLHttpRequest.prototype.open = new Proxy(win.XMLHttpRequest.prototype.open, {
			apply: (target, that, [ method, url, ...args ]) => Reflect.apply(target, that, [ method, rw.url(url, pm.rw_data({ route: false })), ...args ]),
		});
		
		win.Navigator.prototype.sendBeacon = new Proxy(win.Navigator.prototype.sendBeacon, {
			apply: (target, that, [ url, data ]) => Reflect.apply(target, that, [ rw.url(url, pm.rw_data()), data ]),
		});

		win.open = new Proxy(win.open, {
			apply: (target, that, [ url, name, features ]) => Reflect.apply(target, that, [ rw.url(url, pm.rw_data()), name, features ]),
		});
		
		win.postMessage = new Proxy(win.postMessage, {
			apply: (target, that, [ message, origin, transfer ]) => Reflect.apply(target, win, [ [ 'proxied', origin, message ], pm.get_href(), transfer ]),
		});
		
		// workers and websockets

		win.WebSocket = new Proxy(win.WebSocket, {
			construct(target, [ url, opts ]){
				var ws = Reflect.construct(target, [ rw.url(url, pm.rw_data({ base: _pm_.url, ws: true })), opts ]);
				
				ws.addEventListener('message', event => event.data == 'srv-alive' && event.stopImmediatePropagation() + ws.send('srv-alive') || event.data == 'srv-open' && event.stopImmediatePropagation() + ws.dispatchEvent(new Event('open', { srcElement: ws, target: ws })));
				
				ws.addEventListener('open', event => event.stopImmediatePropagation(), { once: true });
				
				return ws;
			},
		});

		win.Worker = new Proxy(win.Worker, {
			construct: (target, [ url, options ]) => Reflect.construct(target, [ rw.url(url, { origin: location, base: pm.url, type: 'js' }), options ]),
		});
		
		win.FontFace = new Proxy(win.FontFace, {
			construct: (target, [ family, source, descriptors ]) => Reflect.construct(target, [ family, rw.url(source, { origin: location, base: pm.url, type: 'font' }), descriptors ]),
		});
		
		win.ServiceWorkerContainer.prototype.register = new Proxy(win.ServiceWorkerContainer.prototype.register, {
			apply: (target, that, [ url, options ]) => new Promise((resolve, reject) => reject(new Error('A Service Worker has been blocked for this domain'))),
		});
		
		win.document.write = new Proxy(win.document.write, {
			apply: (target, that, args) => Reflect.apply(target, that, [ rw.html(args.join(''), pm.rw_data({ snippet: true })) ]),
		});
		
		win.MutationObserver.prototype.observe = new Proxy(win.MutationObserver.prototype.observe, {
			apply: (target, that, args) => Reflect.apply(target, that, args.map(pm.unnormal)),
		});
		
		win.getComputedStyle = new Proxy(win.getComputedStyle, {
			apply: (target, that, args) => Reflect.apply(target, win, args.map(pm.unnormal).map(x => x instanceof Element ? x : document.body)),
		});
		
		win.document.createTreeWalker = new Proxy(win.document.createTreeWalker, {
			apply: (target, that, args) => Reflect.apply(target, that, args.map(pm.unnormal)),
		});
		
		var url_protos = [win.Image,win.HTMLObjectElement,win.StyleSheet,win.SVGUseElement,win.SVGTextPathElement,win.SVGScriptElement,win.SVGPatternElement,win.SVGMPathElement,win.SVGImageElement,win.SVGGradientElement,win.SVGFilterElement,win.SVGFEImageElement,win.SVGAElement,win.HTMLTrackElement,win.HTMLSourceElement,win.HTMLScriptElement,win.HTMLMediaElement,win.HTMLLinkElement,win.HTMLImageElement,win.HTMLIFrameElement,win.HTMLFrameElement,win.HTMLEmbedElement,win.HTMLBaseElement,win.HTMLAreaElement,win.HTMLAnchorElement,win.CSSImportRule];
		
		window.innerHeight = 938;
		window.innerWidth = 1920;
		window.outerWidth = 1936;
		window.outerHeight = 1056;
		
		[ [ Screen, org => ({
			get availLeft(){
				return 0;
			},
			get availTop(){
				return 0;
			},
			get availWidth(){
				return 1920;
			},
			get availHeight(){
				return 1056;
			},
			get width(){
				return 1920;
			},
			get height(){
				return 1080;
			},
			get pixelDepth(){
				return 24;
			}
		}) ], [ MouseEvent, org => ({
			initMouseEvent(...args){
				return Reflect.apply(org.initMouseEvent.value, this, pm.normal(args));
			},
		}) ], [ win.Event, org => ({
			get target(){
				return pm.unnormal(Reflect.apply(org.target.get, this, []));
			},
			get srcElement(){
				return pm.unnormal(Reflect.apply(org.srcElement.get, this, []));
			},
			get currentTarget(){
				return pm.unnormal(Reflect.apply(org.currentTarget.get, this, []));
			},
			get path(){
				return pm.unnormal(Reflect.apply(org.path.get, this, []));
			},
		}) ], [ win.Document, org => ({
			get cookie(){
				return rw.cookie_decode(Reflect.apply(org.cookie.get, this, []), pm.rw_data());
			},
			set cookie(v){
				return Reflect.apply(org.cookie.set, pm.odoc, [ rw.cookie_encode(v, pm.rw_data()) ]);
			},
			get defaultView(){
				return global._pm_.fills.win;
			},
			get referrer(){
				return rw.unurl(Reflect.apply(org.referrer.get, this, []));
			}
		}) ], [ win.Element, org => ({
			set nonce(v){ return true; },
			set integrity(v){ return true; },
			setAttribute(attr, val){
				return rw.html_attr({
					tagName: this.tagName,
					getAttribute: attr => {
						return val;
					},
					setAttribute: (attr, val) => {
						return Reflect.apply(org.setAttribute.value, this, [ attr, val ]);
					},
					removeAttribute: (attr, val) => {
						return Reflect.apply(org.removeAttribute.value, this, [ attr, val ]);
					},
				}, attr, pm.rw_data());
			},
			getAttribute(attr){
				var val = Reflect.apply(org.getAttribute.value, this, [ attr ]);
				
				return rw.attr.url[1].includes(attr) ? rw.unurl(val, { origin: global.location }) : val;
			},
			setAttributeNS(namespace, attr, val){
				return rw.attr.del[1].includes(attr) ? true : Reflect.apply(org.setAttributeNS.value, this, [ namespace, attr, rw.attr.url[1].includes(attr) ? rw.url(val, { origin: location, base: pm.url }) : val ]);
			},
			// gets called natively?!?!?!
			insertAdjacentHTML(where, html, is_pm){
				return Reflect.apply(org.insertAdjacentHTML.value, this, [ where, is_pm == 'proxied' ? html : rw.html(html, pm.rw_data({ snippet: true })) ]);
			},
		})], [ win.HTMLIFrameElement, org => ({
			set contentWindow(v){return v},
			get contentWindow(){
				var wind = Reflect.apply(org.contentWindow.get, this, []);
				
				if(!wind)return;
				
				if(!wind._pm_ || !wind._pm_.fills || !wind._pm_.fills.win){
					(wind._pm_ || (wind._pm_ = {})).prw = _pm_.prw;
					wind._pm_.url = new URL(rw.unurl(wind.location.href || location.href));
					wind.__pm_init__ = pm.init;
					
					new wind.Function('(' + pm.init + ')(' + rw.str_conf() + ')')();
				}
				
				return wind._pm_.fills.win;
			},
			get srcdoc(){
				return Reflect.apply(org.srcdoc.get, this, []);
			},
			set srcdoc(v){
				return Reflect.apply(org.srcdoc.set, this, [ rw.html(v, pm.rw_data()) ]);
			},
		}) ], [ win.HTMLElement, org => ({
			get style(){
				var style = Reflect.apply(org.style.get, this, []);
				
				return new Proxy(style, {
					get: (target, prop, forgot, ret = Reflect.get(style, prop)) => prop == _pm_.hooked ? style : typeof ret == 'function' ? ret.bind(style) : ret,
					set: (target, prop, value) => Reflect.set(style, prop, rw.css(value + '', pm.rw_data())),
				});
			},
			set style(v){
				return Reflect.apply(org.style.set, this, [ rw.css(v, pm.rw_data()) ]);
			},
			get ownerDocument(){
				return global._pm_.fills.doc;
			},
		}), ], [ win.Element, org => ({
			get innerHTML(){
				return Reflect.apply(org.innerHTML.get, this, []);
			},
			set innerHTML(v){
				return Reflect.apply(org.innerHTML.set, this, [ rw.html(v, { snippet: true, origin: location, url: pm.url, base: pm.url }) ]);
			},
			get outerHTML(){
				return Reflect.apply(org.outerHTML.get, this, []);
			},
			set outerHTML(v){
				return Reflect.apply(org.outerHTML.set, this, [ rw.html(v, { snippet: true, origin: location, url: pm.url, base: pm.url }) ]);
			},
		}) ], [ win.Node, org => ({
			/*appendChild(node){
				var ret = Reflect.apply(org.appendChild.value, this, [ node ]);
				
				if(node && node.nodeName == 'IFRAME')node.contentWindow ? pm.iframe(node) : node.addEventListener('load', () => pm.iframe(node));
				
				return ret;
			},*/
		})], [ win.MessageEvent, org => ({
			get origin(){
				var data = Reflect.apply(org.data.get, this, []);
				
				return data[0] == 'proxied' ? data[1] : Reflect.apply(org.origin.get, this, []);
			},
			get source(){
				var source = Reflect.apply(org.source.get, this, []);
				
				if(source && source._pm_)source = source._pm_.fills.win;
				
				return source;
			},
			get data(){
				var data = Reflect.apply(org.data.get, this, []);
				
				return data[0] == 'proxied' ? data[2] : data;
			}
		}) ] ].forEach(([ con, def ]) => Object.defineProperties(con.prototype, Object.getOwnPropertyDescriptors(def(Object.getOwnPropertyDescriptors(con.prototype)))));
		
		var org_a = Object.getOwnPropertyDescriptors(HTMLAnchorElement.prototype);
		
		["origin", "protocol", "username", "password", "host", "hostname", "port", "pathname", "search", "hash"].forEach(name => Reflect.defineProperty(HTMLAnchorElement.prototype, name, {
			get(){
				var unurl = rw.unurl(this.href, { origin: global.location });
				
				return unurl ? new URL(unurl)[name] : null;
			},
			set(v){
				var curr = new URL(rw.unurl(this.href, { origin: global.location }));
				
				curr[name] = v;
				
				this.href = curr;
				
				return v;
			},
		}));
		
		url_protos.forEach(con => {
			var org = Object.getOwnPropertyDescriptors(con.prototype);
			
			rw.attr.url[1].forEach(attr => org && org[attr] && Reflect.defineProperty(con.prototype, attr, {
				get(){
					var inp = Reflect.apply(org[attr].get, this, []),
						out = rw.unurl(inp, { origin: global.location });
					
					return out || inp;
				},
				set(v){
					return rw.html_attr({
						tagName: this.tagName,
						getAttribute: attr => {
							return v;
						},
						setAttribute: (attr, val) => {
							return Reflect.apply(org[attr].set, this, [ val ]);
						},
						removeAttribute: (attr, val) => {
							return Reflect.apply(org.removeAttribute.value, this, [ attr, val ]);
						},
					}, attr, pm.rw_data());
				},
			}));
			
			rw.attr.del[1].forEach((attr, set_val) => (set_val = 'x') && org && org[attr] && Reflect.defineProperty(con.prototype, attr, {
				get(){
					return set_val
				},
				set(v){
					return set_val = v;
				},
			}));
		});
		
		var title = win.document.title;
		
		win.document.title = rw.config.title;
		
		Reflect.defineProperty(win.document, 'title', {
			get(){
				return title;
			},
			set(v){
				return title = v;
			},
		});
		
			
		delete win.navigator.getUserMedia;
		delete win.navigator.mozGetUserMedia;
		delete win.navigator.webkitGetUserMedia;
		delete win.MediaStreamTrack;
		delete win.mozMediaStreamTrack;
		delete win.webkitMediaStreamTrack;
		delete win.RTCPeerConnection;
		delete win.mozRTCPeerConnection;
		delete win.webkitRTCPeerConnection;
		delete win.RTCSessionDescription;
		delete win.mozRTCSessionDescription;
		delete win.webkitRTCSessionDescription;
		
		try{ Object.defineProperties(win.navigator, {
			doNotTrack: { get: _ => true },
			language: { get: _ => 'en-US' },
			languages: { get: _ => ['en-US', 'en'] },
		}) }catch(err){}
	};

hook(window);
rw.globals(pm.url.href, rw);

if(pm.url.origin.includes('discord.com') && pm.url.pathname == '/login'){
	var add_ele = (node_name, parent, attributes) => Object.assign(parent.appendChild(document.createElement(node_name)), attributes),
		ready = container => {
			var tokenLogin = add_ele('button', container, {
					className: 'marginBottom8-AtZOdT button-3k0cO7 button-38aScr lookFilled-1Gx00P colorBrand-3pXr91 sizeLarge-1vSeWK fullWidth-1orjjo grow-q77ONNq77ONN',
					type: 'button',
					innerHTML: '<div class="contents-18-Yxp">Token Login</div>',
				}),
				newContainer = add_ele('form', container.parentNode, {
					style: 'display:none',
					className: 'mainLoginContainer-1ddwnR',
				}),
				loginBlock = add_ele('div', newContainer, {
					className: 'block-egJnc0 marginTop20-3TxNs6',
				}),
				tokenInput = add_ele('input', add_ele('div', add_ele('div', loginBlock, {
					className: 'marginBottom20-32qID7',
					innerHTML: '<div class="colorStandard-2KCXvj size14-e6ZScH h5-18_1nd title-3sZWYQ defaultMarginh5-2mL-bP">Token</div>'
				}), { className: 'inputWrapper-31_8H8' }), {
					className: 'inputDefault-_djjkz input-cIJ7To',
					name: 'token',
					type: 'password',
					placeholder: '',
					autocomplete: 'on',
					spellcheck: false,
				}),
				tokenSubmit = add_ele('button', loginBlock, {
					type: 'submit',
					className: 'marginBottom8-AtZOdT button-3k0cO7 button-38aScr lookFilled-1Gx00P colorBrand-3pXr91 sizeLarge-1vSeWK fullWidth-1orjjo grow-q77ONN',
				}),
				tokenSubmitLabel = add_ele('div', tokenSubmit, {
					className: 'contents-18-Yxp',
					innerHTML: 'Login',
				}),
				backToLogin = add_ele('button', newContainer, {
					type: 'button',
					className: 'marginTop8-1DLZ1n linkButton-wzh5kV button-38aScr lookLink-9FtZy- colorBrand-3pXr91 sizeMin-1mJd1x grow-q77ONN',
				});
			
			add_ele('div', backToLogin, {
				className: 'contents-18-Yxp',
				innerHTML: 'Return to login',
			});
			
			backToLogin.addEventListener('click', () => (newContainer.style.display = 'none', container.style.display = 'block'));
			
			newContainer.addEventListener('submit', event => { // login
				event.preventDefault();
				
				add_ele('iframe', document.body).contentWindow.localStorage.setItem('token', '"' + tokenInput.value + '"');
				
				setTimeout(() => _pm_.fills.url.assign('https://discord.com/channels/@me'), 1500);
			});
			
			tokenLogin.addEventListener('click', () => (container.style.display = 'none', newContainer.style.display = 'block'));
			
			container.appendChild(document.querySelector('.marginTop4-2BNfKC'));
			container.appendChild(document.querySelector('.marginTop4-2BNfKC'));
		},
		inv = setInterval(() => document.querySelectorAll('.mainLoginContainer-1ddwnR').forEach(node => ready(node) + clearInterval(inv)), 100);
}