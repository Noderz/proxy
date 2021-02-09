'use strict';

if(global.URL){
	module.exports = global.URL;
}else{
	var relative = Object.create(null);
	relative['ftp'] = 21;
	relative['file'] = 0;
	relative['gopher'] = 70;
	relative['http'] = 80;
	relative['https'] = 443;
	relative['ws'] = 80;
	relative['wss'] = 443;

	var relativePathDotMapping = Object.create(null);
	relativePathDotMapping['%2e'] = '.';
	relativePathDotMapping['.%2e'] = '..';
	relativePathDotMapping['%2e.'] = '..';
	relativePathDotMapping['%2e%2e'] = '..';

	function isRelativeScheme(scheme) {
	return relative[scheme] !== undefined;
	}

	function invalid() {
	clear.call(this);
	this._isInvalid = true;
	}

	function IDNAToASCII(h) {
	if ('' == h) {
	  invalid.call(this);
	}
	// XXX
	return h.toLowerCase()
	}

	function percentEscape(c) {
	var unicode = c.charCodeAt(0);
	if (unicode > 0x20 &&
	   unicode < 0x7F &&
	   // " # < > ? `
	   [0x22, 0x23, 0x3C, 0x3E, 0x3F, 0x60].indexOf(unicode) == -1
	  ) {
	  return c;
	}
	return encodeURIComponent(c);
	}

	function percentEscapeQuery(c) {
	// XXX This actually needs to encode c using encoding and then
	// convert the bytes one-by-one.

	var unicode = c.charCodeAt(0);
	if (unicode > 0x20 &&
	   unicode < 0x7F &&
	   // " # < > ` (do not escape '?')
	   [0x22, 0x23, 0x3C, 0x3E, 0x60].indexOf(unicode) == -1
	  ) {
	  return c;
	}
	return encodeURIComponent(c);
	}

	var EOF = undefined,
	  ALPHA = /[a-zA-Z]/,
	  ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;

	function parse(input, stateOverride, base) {

	var state = stateOverride || 'scheme start',
		cursor = 0,
		buffer = '',
		seenAt = false,
		seenBracket = false;

	loop: while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
	  var c = input[cursor];
	  switch (state) {
		case 'scheme start':
		  if (c && ALPHA.test(c)) {
			buffer += c.toLowerCase(); // ASCII-safe
			state = 'scheme';
		  } else if (!stateOverride) {
			buffer = '';
			state = 'no scheme';
			continue;
		  } else {
			break loop;
		  }
		  break;

		case 'scheme':
		  if (c && ALPHANUMERIC.test(c)) {
			buffer += c.toLowerCase(); // ASCII-safe
		  } else if (':' == c) {
			this._scheme = buffer;
			buffer = '';
			if (stateOverride) {
			  break loop;
			}
			if (isRelativeScheme(this._scheme)) {
			  this._isRelative = true;
			}
			if ('file' == this._scheme) {
			  state = 'relative';
			} else if (this._isRelative && base && base._scheme == this._scheme) {
			  state = 'relative or authority';
			} else if (this._isRelative) {
			  state = 'authority first slash';
			} else {
			  state = 'scheme data';
			}
		  } else if (!stateOverride) {
			buffer = '';
			cursor = 0;
			state = 'no scheme';
			continue;
		  } else if (EOF == c) {
			break loop;
		  } else {
			break loop;
		  }
		  break;

		case 'scheme data':
		  if ('?' == c) {
			this._query = '?';
			state = 'query';
		  } else if ('#' == c) {
			this._fragment = '#';
			state = 'fragment';
		  } else {
			// XXX error handling
			if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
			  this._schemeData += percentEscape(c);
			}
		  }
		  break;

		case 'no scheme':
		  if (!base || !(isRelativeScheme(base._scheme))) {
			invalid.call(this);
		  } else {
			state = 'relative';
			continue;
		  }
		  break;

		case 'relative or authority':
		  if ('/' == c && '/' == input[cursor+1]) {
			state = 'authority ignore slashes';
		  } else {
			state = 'relative';
			continue
		  }
		  break;

		case 'relative':
		  this._isRelative = true;
		  if ('file' != this._scheme)
			this._scheme = base._scheme;
		  if (EOF == c) {
			this._host = base._host;
			this._port = base._port;
			this._path = base._path.slice();
			this._query = base._query;
			this._username = base._username;
			this._password = base._password;
			break loop;
		  } else if ('/' == c || '\\' == c) {
			state = 'relative slash';
		  } else if ('?' == c) {
			this._host = base._host;
			this._port = base._port;
			this._path = base._path.slice();
			this._query = '?';
			this._username = base._username;
			this._password = base._password;
			state = 'query';
		  } else if ('#' == c) {
			this._host = base._host;
			this._port = base._port;
			this._path = base._path.slice();
			this._query = base._query;
			this._fragment = '#';
			this._username = base._username;
			this._password = base._password;
			state = 'fragment';
		  } else {
			var nextC = input[cursor+1];
			var nextNextC = input[cursor+2];
			if (
			  'file' != this._scheme || !ALPHA.test(c) ||
			  (nextC != ':' && nextC != '|') ||
			  (EOF != nextNextC && '/' != nextNextC && '\\' != nextNextC && '?' != nextNextC && '#' != nextNextC)) {
			  this._host = base._host;
			  this._port = base._port;
			  this._username = base._username;
			  this._password = base._password;
			  this._path = base._path.slice();
			  this._path.pop();
			}
			state = 'relative path';
			continue;
		  }
		  break;

		case 'relative slash':
		  if ('/' == c || '\\' == c) {
			if ('file' == this._scheme) {
			  state = 'file host';
			} else {
			  state = 'authority ignore slashes';
			}
		  } else {
			if ('file' != this._scheme) {
			  this._host = base._host;
			  this._port = base._port;
			  this._username = base._username;
			  this._password = base._password;
			}
			state = 'relative path';
			continue;
		  }
		  break;

		case 'authority first slash':
		  if ('/' == c) {
			state = 'authority second slash';
		  } else {
			state = 'authority ignore slashes';
			continue;
		  }
		  break;

		case 'authority second slash':
		  state = 'authority ignore slashes';
		  if ('/' != c) {
			continue;
		  }
		  break;

		case 'authority ignore slashes':
		  if ('/' != c && '\\' != c) {
			state = 'authority';
			continue;
		  } else {
		  }
		  break;

		case 'authority':
		  if ('@' == c) {
			if (seenAt) {
			  buffer += '%40';
			}
			seenAt = true;
			for (var i = 0; i < buffer.length; i++) {
			  var cp = buffer[i];
			  if ('\t' == cp || '\n' == cp || '\r' == cp) {
				continue;
			  }
			  // XXX check URL code points
			  if (':' == cp && null === this._password) {
				this._password = '';
				continue;
			  }
			  var tempC = percentEscape(cp);
			  (null !== this._password) ? this._password += tempC : this._username += tempC;
			}
			buffer = '';
		  } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
			cursor -= buffer.length;
			buffer = '';
			state = 'host';
			continue;
		  } else {
			buffer += c;
		  }
		  break;

		case 'file host':
		  if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
			if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ':' || buffer[1] == '|')) {
			  state = 'relative path';
			} else if (buffer.length == 0) {
			  state = 'relative path start';
			} else {
			  this._host = IDNAToASCII.call(this, buffer);
			  buffer = '';
			  state = 'relative path start';
			}
			continue;
		  } else if ('\t' == c || '\n' == c || '\r' == c) {
		  } else {
			buffer += c;
		  }
		  break;

		case 'host':
		case 'hostname':
		  if (':' == c && !seenBracket) {
			// XXX host parsing
			this._host = IDNAToASCII.call(this, buffer);
			buffer = '';
			state = 'port';
			if ('hostname' == stateOverride) {
			  break loop;
			}
		  } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
			this._host = IDNAToASCII.call(this, buffer);
			buffer = '';
			state = 'relative path start';
			if (stateOverride) {
			  break loop;
			}
			continue;
		  } else if ('\t' != c && '\n' != c && '\r' != c) {
			if ('[' == c) {
			  seenBracket = true;
			} else if (']' == c) {
			  seenBracket = false;
			}
			buffer += c;
		  } else {
		  }
		  break;

		case 'port':
		  if (/[0-9]/.test(c)) {
			buffer += c;
		  } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c || stateOverride) {
			if ('' != buffer) {
			  var temp = parseInt(buffer, 10);
			  if (temp != relative[this._scheme]) {
				this._port = temp + '';
			  }
			  buffer = '';
			}
			if (stateOverride) {
			  break loop;
			}
			state = 'relative path start';
			continue;
		  } else if ('\t' == c || '\n' == c || '\r' == c) {
		  } else {
			invalid.call(this);
		  }
		  break;

		case 'relative path start':
		  state = 'relative path';
		  if ('/' != c && '\\' != c) {
			continue;
		  }
		  break;

		case 'relative path':
		  if (EOF == c || '/' == c || '\\' == c || (!stateOverride && ('?' == c || '#' == c))) {
			var tmp;
			if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
			  buffer = tmp;
			}
			if ('..' == buffer) {
			  this._path.pop();
			  if ('/' != c && '\\' != c) {
				this._path.push('');
			  }
			} else if ('.' == buffer && '/' != c && '\\' != c) {
			  this._path.push('');
			} else if ('.' != buffer) {
			  if ('file' == this._scheme && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == '|') {
				buffer = buffer[0] + ':';
			  }
			  this._path.push(buffer);
			}
			buffer = '';
			if ('?' == c) {
			  this._query = '?';
			  state = 'query';
			} else if ('#' == c) {
			  this._fragment = '#';
			  state = 'fragment';
			}
		  } else if ('\t' != c && '\n' != c && '\r' != c) {
			buffer += percentEscape(c);
		  }
		  break;

		case 'query':
		  if (!stateOverride && '#' == c) {
			this._fragment = '#';
			state = 'fragment';
		  } else if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
			this._query += percentEscapeQuery(c);
		  }
		  break;

		case 'fragment':
		  if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
			this._fragment += c;
		  }
		  break;
	  }

	  cursor++;
	}
	}

	function clear() {
	this._scheme = '';
	this._schemeData = '';
	this._username = '';
	this._password = null;
	this._host = '';
	this._port = '';
	this._path = [];
	this._query = '';
	this._fragment = '';
	this._isInvalid = false;
	this._isRelative = false;
	}

	// Does not process domain names or IP addresses.
	// Does not handle encoding for the query parameter.
	function jURL(url, base /* , encoding */) {
	if (base !== undefined && !(base instanceof jURL))
	  base = new jURL(String(base));

	url = String(url);

	this._url = url;
	clear.call(this);

	var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
	// encoding = encoding || 'utf-8'

	parse.call(this, input, null, base);
	}

	jURL.prototype = {
	toString: function() {
	  return this.href;
	},
	get href() {
	  if (this._isInvalid)
		return this._url;

	  var authority = '';
	  if ('' != this._username || null != this._password) {
		authority = this._username +
			(null != this._password ? ':' + this._password : '') + '@';
	  }

	  return this.protocol +
		  (this._isRelative ? '//' + authority + this.host : '') +
		  this.pathname + this._query + this._fragment;
	},
	set href(href) {
	  clear.call(this);
	  parse.call(this, href);
	},

	get protocol() {
	  return this._scheme + ':';
	},
	set protocol(protocol) {
	  if (this._isInvalid)
		return;
	  parse.call(this, protocol + ':', 'scheme start');
	},

	get host() {
	  return this._isInvalid ? '' : this._port ?
		  this._host + ':' + this._port : this._host;
	},
	set host(host) {
	  if (this._isInvalid || !this._isRelative)
		return;
	  parse.call(this, host, 'host');
	},

	get hostname() {
	  return this._host;
	},
	set hostname(hostname) {
	  if (this._isInvalid || !this._isRelative)
		return;
	  parse.call(this, hostname, 'hostname');
	},

	get port() {
	  return this._port;
	},
	set port(port) {
	  if (this._isInvalid || !this._isRelative)
		return;
	  parse.call(this, port, 'port');
	},

	get pathname() {
	  return this._isInvalid ? '' : this._isRelative ?
		  '/' + this._path.join('/') : this._schemeData;
	},
	set pathname(pathname) {
	  if (this._isInvalid || !this._isRelative)
		return;
	  this._path = [];
	  parse.call(this, pathname, 'relative path start');
	},

	get search() {
	  return this._isInvalid || !this._query || '?' == this._query ?
		  '' : this._query;
	},
	set search(search) {
	  if (this._isInvalid || !this._isRelative)
		return;
	  this._query = '?';
	  if ('?' == search[0])
		search = search.slice(1);
	  parse.call(this, search, 'query');
	},

	get hash() {
	  return this._isInvalid || !this._fragment || '#' == this._fragment ?
		  '' : this._fragment;
	},
	set hash(hash) {
	  if (this._isInvalid)
		return;
	  this._fragment = '#';
	  if ('#' == hash[0])
		hash = hash.slice(1);
	  parse.call(this, hash, 'fragment');
	},

	get origin() {
	  var host;
	  if (this._isInvalid || !this._scheme) {
		return '';
	  }
	  // javascript: Gecko returns String(""), WebKit/Blink String("null")
	  // Gecko throws error for "data://"
	  // data: Gecko returns "", Blink returns "data://", WebKit returns "null"
	  // Gecko returns String("") for file: mailto:
	  // WebKit/Blink returns String("SCHEME://") for file: mailto:
	  switch (this._scheme) {
		case 'data':
		case 'file':
		case 'javascript':
		case 'mailto':
		  return 'null';
	  }
	  host = this.host;
	  if (!host) {
		return '';
	  }
	  return this._scheme + '://' + host;
	}
	};

	// Copy over the static methods
	var OriginalURL = global.URL;
	if (OriginalURL) {
	jURL.createObjectURL = function(blob) {
	  // IE extension allows a second optional options argument.
	  // http://msdn.microsoft.com/en-us/library/ie/hh772302(v=vs.85).aspx
	  return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
	};
	jURL.revokeObjectURL = function(url) {
	  OriginalURL.revokeObjectURL(url);
	};
	}

	module.exports = jURL;

	try{!function(t,e){if(new t("q=%2B").get("q")!==e||new t({q:e}).get("q")!==e||new t([["q",e]]).get("q")!==e||"q=%0A"!==new t("q=\n").toString()||"q=+%26"!==new t({q:" &"}).toString()||"q=%25zx"!==new t({q:"%zx"}).toString())throw t;global.URLSearchParams=t}(URLSearchParams,"+")}catch(t){!function(t,a,o){"use strict";var u=t.create,h=t.defineProperty,e=/[!'\(\)~]|%20|%00/g,n=/%(?![0-9a-fA-F]{2})/g,r=/\+/g,i={"!":"%21","'":"%27","(":"%28",")":"%29","~":"%7E","%20":"+","%00":"\0"},s={append:function(t,e){p(this._ungap,t,e)},delete:function(t){delete this._ungap[t]},get:function(t){return this.has(t)?this._ungap[t][0]:null},getAll:function(t){return this.has(t)?this._ungap[t].slice(0):[]},has:function(t){return t in this._ungap},set:function(t,e){this._ungap[t]=[a(e)]},forEach:function(e,n){var r=this;for(var i in r._ungap)r._ungap[i].forEach(t,i);function t(t){e.call(n,t,a(i),r)}},toJSON:function(){return{}},toString:function(){var t=[];for(var e in this._ungap)for(var n=v(e),r=0,i=this._ungap[e];r<i.length;r++)t.push(n+"="+v(i[r]));return t.join("&")}};for(var c in s)h(f.prototype,c,{configurable:!0,writable:!0,value:s[c]});function f(t){var e=u(null);switch(h(this,"_ungap",{value:e}),!0){case!t:break;case"string"==typeof t:"?"===t.charAt(0)&&(t=t.slice(1));for(var n=t.split("&"),r=0,i=n.length;r<i;r++){var a=(s=n[r]).indexOf("=");-1<a?p(e,g(s.slice(0,a)),g(s.slice(a+1))):s.length&&p(e,g(s),"")}break;case o(t):for(var s,r=0,i=t.length;r<i;r++){p(e,(s=t[r])[0],s[1])}break;case"forEach"in t:t.forEach(l,e);break;default:for(var c in t)p(e,c,t[c])}}function l(t,e){p(this,e,t)}function p(t,e,n){var r=o(n)?n.join(","):n;e in t?t[e].push(r):t[e]=[r]}function g(t){return decodeURIComponent(t.replace(n,"%25").replace(r," "))}function v(t){return encodeURIComponent(t).replace(e,d)}function d(t){return i[t]}global.URLSearchParams=f}(Object,String,Array.isArray)}!function(d){var r=!1;try{r=!!Symbol.iterator}catch(t){}function t(t,e){var n=[];return t.forEach(e,n),r?n[Symbol.iterator]():{next:function(){var t=n.shift();return{done:void 0===t,value:t}}}}"forEach"in d||(d.forEach=function(n,r){var i=this,t=Object.create(null);this.toString().replace(/=[\s\S]*?(?:&|$)/g,"=").split("=").forEach(function(e){!e.length||e in t||(t[e]=i.getAll(e)).forEach(function(t){n.call(r,t,e,i)})})}),"keys"in d||(d.keys=function(){return t(this,function(t,e){this.push(e)})}),"values"in d||(d.values=function(){return t(this,function(t,e){this.push(t)})}),"entries"in d||(d.entries=function(){return t(this,function(t,e){this.push([e,t])})}),!r||Symbol.iterator in d||(d[Symbol.iterator]=d.entries),"sort"in d||(d.sort=function(){for(var t,e,n,r=this.entries(),i=r.next(),a=i.done,s=[],c=Object.create(null);!a;)e=(n=i.value)[0],s.push(e),e in c||(c[e]=[]),c[e].push(n[1]),a=(i=r.next()).done;for(s.sort(),t=0;t<s.length;t++)this.delete(s[t]);for(t=0;t<s.length;t++)e=s[t],this.append(e,c[e].shift())}),function(f){function l(t){var e=t.append;t.append=d.append,URLSearchParams.call(t,t._usp.search.slice(1)),t.append=e}function p(t,e){if(!(t instanceof e))throw new TypeError("'searchParams' accessed on an object that does not implement interface "+e.name)}function t(e){var n,r,i,t=e.prototype,a=v(t,"searchParams"),s=v(t,"href"),c=v(t,"search");function o(t,e){d.append.call(this,t,e),t=this.toString(),i.set.call(this._usp,t?"?"+t:"")}function u(t){d.delete.call(this,t),t=this.toString(),i.set.call(this._usp,t?"?"+t:"")}function h(t,e){d.set.call(this,t,e),t=this.toString(),i.set.call(this._usp,t?"?"+t:"")}!a&&c&&c.set&&(i=c,r=function(t,e){return t.append=o,t.delete=u,t.set=h,g(t,"_usp",{configurable:!0,writable:!0,value:e})},n=function(t,e){return g(t,"_searchParams",{configurable:!0,writable:!0,value:r(e,t)}),e},f.defineProperties(t,{href:{get:function(){return s.get.call(this)},set:function(t){var e=this._searchParams;s.set.call(this,t),e&&l(e)}},search:{get:function(){return c.get.call(this)},set:function(t){var e=this._searchParams;c.set.call(this,t),e&&l(e)}},searchParams:{get:function(){return p(this,e),this._searchParams||n(this,new URLSearchParams(this.search.slice(1)))},set:function(t){p(this,e),n(this,t)}}}))}var g=f.defineProperty,v=f.getOwnPropertyDescriptor;try{t(HTMLAnchorElement),/^function|object$/.test(typeof URL)&&URL.prototype&&t(URL)}catch(t){}}(Object)}(global.URLSearchParams.prototype,Object);

	var URLSearchParams = global.URLSearchParams;

	Object.defineProperty(jURL.prototype, 'searchParams', {
		get(){
			var params = new URLSearchParams(this.search),
				oset = params.set;
			
			params.set = (key, val) => {
				oset(key, val);
				
				this.query = params.toString();
			};
			
			return params;
		}
	});
};