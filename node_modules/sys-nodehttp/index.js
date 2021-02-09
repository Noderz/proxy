'use strict';
var fs = require('fs'),
	url = require('url'),
	path = require('path'),
	util =  require('util'),
	http = require('http'),
	https = require('https'),
	events = require('events');

// incase this is confused for util or sys module
exports.format = util.format;

exports.btoa = str => Buffer.from(str || '', 'utf8').toString('base64');
exports.atob = str => Buffer.from(str || '', 'base64').toString('utf8');
exports.wrap = str => JSON.stringify([ str ]).slice(1, -1);

exports.valid_json = json => {  try{ return JSON.parse(json) }catch(err){ return null } };

// mime types, status codes, 
exports.http = {body:['PUT','PATCH','DELETE','POST'],status_codes:{"100":"Continue","101":"Switching Protocols","102":"Processing","103":"Early Hints","200":"OK","201":"Created","202":"Accepted","203":"Non-Authoritative Information","204":"No Content","205":"Reset Content","206":"Partial Content","207":"Multi-Status","208":"Already Reported","226":"IM Used","300":"Multiple Choices","301":"Moved Permanently","302":"Found","303":"See Other","304":"Not Modified","305":"Use Proxy","307":"Temporary Redirect","308":"Permanent Redirect","400":"Bad Request","401":"Unauthorized","402":"Payment Required","403":"Forbidden","404":"Not Found","405":"Method Not Allowed","406":"Not Acceptable","407":"Proxy Authentication Required","408":"Request Timeout","409":"Conflict","410":"Gone","411":"Length Required","412":"Precondition Failed","413":"Payload Too Large","414":"URI Too Long","415":"Unsupported Media Type","416":"Range Not Satisfiable","417":"Expectation Failed","418":"I'm a Teapot","421":"Misdirected Request","422":"Unprocessable Entity","423":"Locked","424":"Failed Dependency","425":"Too Early","426":"Upgrade Required","428":"Precondition Required","429":"Too Many Requests","431":"Request Header Fields Too Large","451":"Unavailable For Legal Reasons","500":"Internal Server Error","501":"Not Implemented","502":"Bad Gateway","503":"Service Unavailable","504":"Gateway Timeout","505":"HTTP Version Not Supported","506":"Variant Also Negotiates","507":"Insufficient Storage","508":"Loop Detected","509":"Bandwidth Limit Exceeded","510":"Not Extended","511":"Network Authentication Required"},mimes:{"323":"text/h323","3g2":"video/3gpp2","3gp":"video/3gpp","3gp2":"video/3gpp2","3gpp":"video/3gpp","7z":"application/x-7z-compressed",aa:"audio/audible",AAC:"audio/aac",aaf:"application/octet-stream",aax:"audio/vnd.audible.aax",ac3:"audio/ac3",aca:"application/octet-stream",accda:"application/msaccess.addin",accdb:"application/msaccess",accdc:"application/msaccess.cab",accde:"application/msaccess",accdr:"application/msaccess.runtime",accdt:"application/msaccess",accdw:"application/msaccess.webapplication",accft:"application/msaccess.ftemplate",acx:"application/internet-property-stream",AddIn:"text/xml",ade:"application/msaccess",adobebridge:"application/x-bridge-url",adp:"application/msaccess",ADT:"audio/vnd.dlna.adts",ADTS:"audio/aac",afm:"application/octet-stream",ai:"application/postscript",aif:"audio/aiff",aifc:"audio/aiff",aiff:"audio/aiff",air:"application/vnd.adobe.air-application-installer-package+zip",amc:"application/mpeg",anx:"application/annodex",apk:"application/vnd.android.package-archive",apng:"image/apng",application:"application/x-ms-application",art:"image/x-jg",asa:"application/xml",asax:"application/xml",ascx:"application/xml",asd:"application/octet-stream",asf:"video/x-ms-asf",ashx:"application/xml",asi:"application/octet-stream",asm:"text/plain",asmx:"application/xml",aspx:"application/xml",asr:"video/x-ms-asf",asx:"video/x-ms-asf",atom:"application/atom+xml",au:"audio/basic",avci:"image/avci",avcs:"image/avcs",avi:"video/x-msvideo",avif:"image/avif",avifs:"image/avif-sequence",axa:"audio/annodex",axs:"application/olescript",axv:"video/annodex",bas:"text/plain",bcpio:"application/x-bcpio",bin:"application/octet-stream",bmp:"image/bmp",c:"text/plain",cab:"application/octet-stream",caf:"audio/x-caf",calx:"application/vnd.ms-office.calx",cat:"application/vnd.ms-pki.seccat",cc:"text/plain",cd:"text/plain",cdda:"audio/aiff",cdf:"application/x-cdf",cer:"application/x-x509-ca-cert",cfg:"text/plain",chm:"application/octet-stream",class:"application/x-java-applet",clp:"application/x-msclip",cmd:"text/plain",cmx:"image/x-cmx",cnf:"text/plain",cod:"image/cis-cod",config:"application/xml",contact:"text/x-ms-contact",coverage:"application/xml",cpio:"application/x-cpio",cpp:"text/plain",crd:"application/x-mscardfile",crl:"application/pkix-crl",crt:"application/x-x509-ca-cert",cs:"text/plain",csdproj:"text/plain",csh:"application/x-csh",csproj:"text/plain",css:"text/css",csv:"text/csv",cur:"application/octet-stream",czx:"application/x-czx",cxx:"text/plain",dat:"application/octet-stream",datasource:"application/xml",dbproj:"text/plain",dcr:"application/x-director",def:"text/plain",deploy:"application/octet-stream",der:"application/x-x509-ca-cert",dgml:"application/xml",dib:"image/bmp",dif:"video/x-dv",dir:"application/x-director",disco:"text/xml",divx:"video/divx",dll:"application/x-msdownload","dll.config":"text/xml",dlm:"text/dlm",doc:"application/msword",docm:"application/vnd.ms-word.document.macroEnabled.12",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",dot:"application/msword",dotm:"application/vnd.ms-word.template.macroEnabled.12",dotx:"application/vnd.openxmlformats-officedocument.wordprocessingml.template",dsp:"application/octet-stream",dsw:"text/plain",dtd:"text/xml",dtsConfig:"text/xml",dv:"video/x-dv",dvi:"application/x-dvi",dwf:"drawing/x-dwf",dwg:"application/acad",dwp:"application/octet-stream",dxf:"application/x-dxf",dxr:"application/x-director",eml:"message/rfc822",emf:"image/emf",emz:"application/octet-stream",eot:"application/vnd.ms-fontobject",eps:"application/postscript",es:"application/ecmascript",etl:"application/etl",etx:"text/x-setext",evy:"application/envoy",exe:"application/vnd.microsoft.portable-executable","exe.config":"text/xml",f4v:"video/mp4",fdf:"application/vnd.fdf",fif:"application/fractals",filters:"application/xml",fla:"application/octet-stream",flac:"audio/flac",flr:"x-world/x-vrml",flv:"video/x-flv",fsscript:"application/fsharp-script",fsx:"application/fsharp-script",generictest:"application/xml",gif:"image/gif",gpx:"application/gpx+xml",group:"text/x-ms-group",gsm:"audio/x-gsm",gtar:"application/x-gtar",gz:"application/x-gzip",h:"text/plain",hdf:"application/x-hdf",hdml:"text/x-hdml",heic:"image/heic",heics:"image/heic-sequence",heif:"image/heif",heifs:"image/heif-sequence",hhc:"application/x-oleobject",hhk:"application/octet-stream",hhp:"application/octet-stream",hlp:"application/winhlp",hpp:"text/plain",hqx:"application/mac-binhex40",hta:"application/hta",htc:"text/x-component",htm:"text/html",html:"text/html",htt:"text/webviewhtml",hxa:"application/xml",hxc:"application/xml",hxd:"application/octet-stream",hxe:"application/xml",hxf:"application/xml",hxh:"application/octet-stream",hxi:"application/octet-stream",hxk:"application/xml",hxq:"application/octet-stream",hxr:"application/octet-stream",hxs:"application/octet-stream",hxt:"text/html",hxv:"application/xml",hxw:"application/octet-stream",hxx:"text/plain",i:"text/plain",ical:"text/calendar",icalendar:"text/calendar",ico:"image/x-icon",ics:"text/calendar",idl:"text/plain",ief:"image/ief",ifb:"text/calendar",iii:"application/x-iphone",inc:"text/plain",inf:"application/octet-stream",ini:"text/plain",inl:"text/plain",ins:"application/x-internet-signup",ipa:"application/x-itunes-ipa",ipg:"application/x-itunes-ipg",ipproj:"text/plain",ipsw:"application/x-itunes-ipsw",iqy:"text/x-ms-iqy",isp:"application/x-internet-signup",isma:"application/octet-stream",ismv:"application/octet-stream",ite:"application/x-itunes-ite",itlp:"application/x-itunes-itlp",itms:"application/x-itunes-itms",itpc:"application/x-itunes-itpc",IVF:"video/x-ivf",jar:"application/java-archive",java:"application/octet-stream",jck:"application/liquidmotion",jcz:"application/liquidmotion",jfif:"image/pjpeg",jnlp:"application/x-java-jnlp-file",jpb:"application/octet-stream",jpe:"image/jpeg",jpeg:"image/jpeg",jpg:"image/jpeg",js:"application/javascript",json:"application/json",jsx:"text/jscript",jsxbin:"text/plain",latex:"application/x-latex","library-ms":"application/windows-library+xml",lit:"application/x-ms-reader",loadtest:"application/xml",lpk:"application/octet-stream",lsf:"video/x-la-asf",lst:"text/plain",lsx:"video/x-la-asf",lzh:"application/octet-stream",m13:"application/x-msmediaview",m14:"application/x-msmediaview",m1v:"video/mpeg",m2t:"video/vnd.dlna.mpeg-tts",m2ts:"video/vnd.dlna.mpeg-tts",m2v:"video/mpeg",m3u:"audio/x-mpegurl",m3u8:"audio/x-mpegurl",m4a:"audio/m4a",m4b:"audio/m4b",m4p:"audio/m4p",m4r:"audio/x-m4r",m4v:"video/x-m4v",mac:"image/x-macpaint",mak:"text/plain",man:"application/x-troff-man",manifest:"application/x-ms-manifest",map:"text/plain",master:"application/xml",mbox:"application/mbox",mda:"application/msaccess",mdb:"application/x-msaccess",mde:"application/msaccess",mdp:"application/octet-stream",me:"application/x-troff-me",mfp:"application/x-shockwave-flash",mht:"message/rfc822",mhtml:"message/rfc822",mid:"audio/mid",midi:"audio/mid",mix:"application/octet-stream",mk:"text/plain",mk3d:"video/x-matroska-3d",mka:"audio/x-matroska",mkv:"video/x-matroska",mmf:"application/x-smaf",mno:"text/xml",mny:"application/x-msmoney",mod:"video/mpeg",mov:"video/quicktime",movie:"video/x-sgi-movie",mp2:"video/mpeg",mp2v:"video/mpeg",mp3:"audio/mpeg",mp4:"video/mp4",mp4v:"video/mp4",mpa:"video/mpeg",mpe:"video/mpeg",mpeg:"video/mpeg",mpf:"application/vnd.ms-mediapackage",mpg:"video/mpeg",mpp:"application/vnd.ms-project",mpv2:"video/mpeg",mqv:"video/quicktime",ms:"application/x-troff-ms",msg:"application/vnd.ms-outlook",msi:"application/octet-stream",mso:"application/octet-stream",mts:"video/vnd.dlna.mpeg-tts",mtx:"application/xml",mvb:"application/x-msmediaview",mvc:"application/x-miva-compiled",mxf:"application/mxf",mxp:"application/x-mmxp",nc:"application/x-netcdf",nsc:"video/x-ms-asf",nws:"message/rfc822",ocx:"application/octet-stream",oda:"application/oda",odb:"application/vnd.oasis.opendocument.database",odc:"application/vnd.oasis.opendocument.chart",odf:"application/vnd.oasis.opendocument.formula",odg:"application/vnd.oasis.opendocument.graphics",odh:"text/plain",odi:"application/vnd.oasis.opendocument.image",odl:"text/plain",odm:"application/vnd.oasis.opendocument.text-master",odp:"application/vnd.oasis.opendocument.presentation",ods:"application/vnd.oasis.opendocument.spreadsheet",odt:"application/vnd.oasis.opendocument.text",oga:"audio/ogg",ogg:"audio/ogg",ogv:"video/ogg",ogx:"application/ogg",one:"application/onenote",onea:"application/onenote",onepkg:"application/onenote",onetmp:"application/onenote",onetoc:"application/onenote",onetoc2:"application/onenote",opus:"audio/ogg",orderedtest:"application/xml",osdx:"application/opensearchdescription+xml",otf:"application/font-sfnt",otg:"application/vnd.oasis.opendocument.graphics-template",oth:"application/vnd.oasis.opendocument.text-web",otp:"application/vnd.oasis.opendocument.presentation-template",ots:"application/vnd.oasis.opendocument.spreadsheet-template",ott:"application/vnd.oasis.opendocument.text-template",oxps:"application/oxps",oxt:"application/vnd.openofficeorg.extension",p10:"application/pkcs10",p12:"application/x-pkcs12",p7b:"application/x-pkcs7-certificates",p7c:"application/pkcs7-mime",p7m:"application/pkcs7-mime",p7r:"application/x-pkcs7-certreqresp",p7s:"application/pkcs7-signature",pbm:"image/x-portable-bitmap",pcast:"application/x-podcast",pct:"image/pict",pcx:"application/octet-stream",pcz:"application/octet-stream",pdf:"application/pdf",pfb:"application/octet-stream",pfm:"application/octet-stream",pfx:"application/x-pkcs12",pgm:"image/x-portable-graymap",pic:"image/pict",pict:"image/pict",pkgdef:"text/plain",pkgundef:"text/plain",pko:"application/vnd.ms-pki.pko",pls:"audio/scpls",pma:"application/x-perfmon",pmc:"application/x-perfmon",pml:"application/x-perfmon",pmr:"application/x-perfmon",pmw:"application/x-perfmon",png:"image/png",pnm:"image/x-portable-anymap",pnt:"image/x-macpaint",pntg:"image/x-macpaint",pnz:"image/png",pot:"application/vnd.ms-powerpoint",potm:"application/vnd.ms-powerpoint.template.macroEnabled.12",potx:"application/vnd.openxmlformats-officedocument.presentationml.template",ppa:"application/vnd.ms-powerpoint",ppam:"application/vnd.ms-powerpoint.addin.macroEnabled.12",ppm:"image/x-portable-pixmap",pps:"application/vnd.ms-powerpoint",ppsm:"application/vnd.ms-powerpoint.slideshow.macroEnabled.12",ppsx:"application/vnd.openxmlformats-officedocument.presentationml.slideshow",ppt:"application/vnd.ms-powerpoint",pptm:"application/vnd.ms-powerpoint.presentation.macroEnabled.12",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",prf:"application/pics-rules",prm:"application/octet-stream",prx:"application/octet-stream",ps:"application/postscript",psc1:"application/PowerShell",psd:"application/octet-stream",psess:"application/xml",psm:"application/octet-stream",psp:"application/octet-stream",pst:"application/vnd.ms-outlook",pub:"application/x-mspublisher",pwz:"application/vnd.ms-powerpoint",qht:"text/x-html-insertion",qhtm:"text/x-html-insertion",qt:"video/quicktime",qti:"image/x-quicktime",qtif:"image/x-quicktime",qtl:"application/x-quicktimeplayer",qxd:"application/octet-stream",ra:"audio/x-pn-realaudio",ram:"audio/x-pn-realaudio",rar:"application/x-rar-compressed",ras:"image/x-cmu-raster",rat:"application/rat-file",rc:"text/plain",rc2:"text/plain",rct:"text/plain",rdlc:"application/xml",reg:"text/plain",resx:"application/xml",rf:"image/vnd.rn-realflash",rgb:"image/x-rgb",rgs:"text/plain",rm:"application/vnd.rn-realmedia",rmi:"audio/mid",rmp:"application/vnd.rn-rn_music_package",rmvb:"application/vnd.rn-realmedia-vbr",roff:"application/x-troff",rpm:"audio/x-pn-realaudio-plugin",rqy:"text/x-ms-rqy",rtf:"application/rtf",rtx:"text/richtext",rvt:"application/octet-stream",ruleset:"application/xml",s:"text/plain",safariextz:"application/x-safari-safariextz",scd:"application/x-msschedule",scr:"text/plain",sct:"text/scriptlet",sd2:"audio/x-sd2",sdp:"application/sdp",sea:"application/octet-stream","searchConnector-ms":"application/windows-search-connector+xml",setpay:"application/set-payment-initiation",setreg:"application/set-registration-initiation",settings:"application/xml",sgimb:"application/x-sgimb",sgml:"text/sgml",sh:"application/x-sh",shar:"application/x-shar",shtml:"text/html",sit:"application/x-stuffit",sitemap:"application/xml",skin:"application/xml",skp:"application/x-koan",sldm:"application/vnd.ms-powerpoint.slide.macroEnabled.12",sldx:"application/vnd.openxmlformats-officedocument.presentationml.slide",slk:"application/vnd.ms-excel",sln:"text/plain","slupkg-ms":"application/x-ms-license",smd:"audio/x-smd",smi:"application/octet-stream",smx:"audio/x-smd",smz:"audio/x-smd",snd:"audio/basic",snippet:"application/xml",snp:"application/octet-stream",sql:"application/sql",sol:"text/plain",sor:"text/plain",spc:"application/x-pkcs7-certificates",spl:"application/futuresplash",spx:"audio/ogg",src:"application/x-wais-source",srf:"text/plain",SSISDeploymentManifest:"text/xml",ssm:"application/streamingmedia",sst:"application/vnd.ms-pki.certstore",stl:"application/vnd.ms-pki.stl",sv4cpio:"application/x-sv4cpio",sv4crc:"application/x-sv4crc",svc:"application/xml",svg:"image/svg+xml",swf:"application/x-shockwave-flash",step:"application/step",stp:"application/step",t:"application/x-troff",tar:"application/x-tar",tcl:"application/x-tcl",testrunconfig:"application/xml",testsettings:"application/xml",tex:"application/x-tex",texi:"application/x-texinfo",texinfo:"application/x-texinfo",tgz:"application/x-compressed",thmx:"application/vnd.ms-officetheme",thn:"application/octet-stream",tif:"image/tiff",tiff:"image/tiff",tlh:"text/plain",tli:"text/plain",toc:"application/octet-stream",tr:"application/x-troff",trm:"application/x-msterminal",trx:"application/xml",ts:"video/vnd.dlna.mpeg-tts",tsv:"text/tab-separated-values",ttf:"application/font-sfnt",tts:"video/vnd.dlna.mpeg-tts",txt:"text/plain",u32:"application/octet-stream",uls:"text/iuls",user:"text/plain",ustar:"application/x-ustar",vb:"text/plain",vbdproj:"text/plain",vbk:"video/mpeg",vbproj:"text/plain",vbs:"text/vbscript",vcf:"text/x-vcard",vcproj:"application/xml",vcs:"text/plain",vcxproj:"application/xml",vddproj:"text/plain",vdp:"text/plain",vdproj:"text/plain",vdx:"application/vnd.ms-visio.viewer",vml:"text/xml",vscontent:"application/xml",vsct:"text/xml",vsd:"application/vnd.visio",vsi:"application/ms-vsi",vsix:"application/vsix",vsixlangpack:"text/xml",vsixmanifest:"text/xml",vsmdi:"application/xml",vspscc:"text/plain",vss:"application/vnd.visio",vsscc:"text/plain",vssettings:"text/xml",vssscc:"text/plain",vst:"application/vnd.visio",vstemplate:"text/xml",vsto:"application/x-ms-vsto",vsw:"application/vnd.visio",vsx:"application/vnd.visio",vtt:"text/vtt",vtx:"application/vnd.visio",wasm:"application/wasm",wav:"audio/wav",wave:"audio/wav",wax:"audio/x-ms-wax",wbk:"application/msword",wbmp:"image/vnd.wap.wbmp",wcm:"application/vnd.ms-works",wdb:"application/vnd.ms-works",wdp:"image/vnd.ms-photo",webarchive:"application/x-safari-webarchive",webm:"video/webm",webp:"image/webp",webtest:"application/xml",wiq:"application/xml",wiz:"application/msword",wks:"application/vnd.ms-works",WLMP:"application/wlmoviemaker",wlpginstall:"application/x-wlpg-detect",wlpginstall3:"application/x-wlpg3-detect",wm:"video/x-ms-wm",wma:"audio/x-ms-wma",wmd:"application/x-ms-wmd",wmf:"application/x-msmetafile",wml:"text/vnd.wap.wml",wmlc:"application/vnd.wap.wmlc",wmls:"text/vnd.wap.wmlscript",wmlsc:"application/vnd.wap.wmlscriptc",wmp:"video/x-ms-wmp",wmv:"video/x-ms-wmv",wmx:"video/x-ms-wmx",wmz:"application/x-ms-wmz",woff:"application/font-woff",woff2:"application/font-woff2",wpl:"application/vnd.ms-wpl",wps:"application/vnd.ms-works",wri:"application/x-mswrite",wrl:"x-world/x-vrml",wrz:"x-world/x-vrml",wsc:"text/scriptlet",wsdl:"text/xml",wvx:"video/x-ms-wvx",x:"application/directx",xaf:"x-world/x-vrml",xaml:"application/xaml+xml",xap:"application/x-silverlight-app",xbap:"application/x-ms-xbap",xbm:"image/x-xbitmap",xdr:"text/plain",xht:"application/xhtml+xml",xhtml:"application/xhtml+xml",xla:"application/vnd.ms-excel",xlam:"application/vnd.ms-excel.addin.macroEnabled.12",xlc:"application/vnd.ms-excel",xld:"application/vnd.ms-excel",xlk:"application/vnd.ms-excel",xll:"application/vnd.ms-excel",xlm:"application/vnd.ms-excel",xls:"application/vnd.ms-excel",xlsb:"application/vnd.ms-excel.sheet.binary.macroEnabled.12",xlsm:"application/vnd.ms-excel.sheet.macroEnabled.12",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",xlt:"application/vnd.ms-excel",xltm:"application/vnd.ms-excel.template.macroEnabled.12",xltx:"application/vnd.openxmlformats-officedocument.spreadsheetml.template",xlw:"application/vnd.ms-excel",xml:"text/xml",xmp:"application/octet-stream",xmta:"application/xml",xof:"x-world/x-vrml",XOML:"text/plain",xpm:"image/x-xpixmap",xps:"application/vnd.ms-xpsdocument","xrm-ms":"text/xml",xsc:"application/xml",xsd:"text/xml",xsf:"text/xml",xsl:"text/xml",xslt:"text/xml",xsn:"application/octet-stream",xss:"application/xml",xspf:"application/xspf+xml",xtp:"application/octet-stream",xwd:"image/x-xwindowdump",z:"application/x-compress",zip:"application/zip"}};

exports.hash = str => { var hash = 5381, i = str.length; while(i)hash = (hash * 33) ^ str.charCodeAt(--i); return hash >>> 0; };

exports.sanitize = str => (str + '').split('').map(char => '&#' + char.charCodeAt() + ';').join('');

exports.path_regex = /[\/\\]+/g;

exports.request = class extends events {
	constructor(req, res, server){
		super();
		
		this.server = server;
		
		try{
			this.url = new URL(req.url.replace(exports.path_regex, '/'), 'http' + (server.ssl ? 's' : '') + '://' + req.headers.host);
		}catch(err){
			this.url = new URL('http' + (server.ssl ? 's' : '') + '://' + req.headers.host);
		}
		
		Object.defineProperty(this.url, 'fullpath', {
			get: _ => this.url.href.substr(this.url.origin.length),
		});
		
		this.headers = req.headers;
		this.real_ip = this.headers['cf-connecting-ip'] ||  this.headers['x-real-ip'] || '127.0.0.1';
		
		this.query = Object.fromEntries(Array.from(this.url.searchParams.entries()));
		this.method = req.method;
		this.cookies = req.headers.cookie ? Object.fromEntries((req.headers.cookie + '').split(';').map(split => (split + '').trim().split('='))) : {};
		
		this.req = req;
		
		this.body = {};
		
		this.req.on('close', err => this.emit('close', err));
	}
	process(){
		return new Promise((resolve, reject) => {
			if(!exports.http.body.includes(this.method))return resolve();
			
			var post_chunks = [];
			
			this.req.on('data', chunk => post_chunks.push(chunk)).on('end', () => {
				this.raw_body = Buffer.concat(post_chunks);
				
				switch((this.req.headers['content-type'] + '').replace(/;.*/, '')){
					case'text/plain':
						
						this.body = this.raw_body.toString('utf8');
						
						break;
					case'application/json':
						
						this.body = exports.valid_json(this.raw_body.toString('utf8')) || {};
						
						break;
					case'application/x-www-form-urlencoded':
						
						this.body = Object.fromEntries([...new URLSearchParams(this.raw_body.toString('utf8')).entries()]);
						
						break;
				}
				
				resolve();
			});
		});
	}
}

exports.response = class extends events {
	constructor(req, res, server){
		super();
		
		this.server = server;
		
		this.org_res = res;
		
		this.req = new exports.request(req, res, server);
		
		this.resp = { status: 200 };
		
		this.cookies = {};
		
		this.headers = new Map();
	}
	status(code){
		this.resp.status = code;
		
		return this;
	}
	set(name, value){
		this.headers[(name + '').toLowerCase()] = value + '';
		
		return this;
	}
	get(name){
		return this.req.headers[name];
	}
	finalize(){
		if(this.resp.sent_head)throw new TypeError('response headers already sent!');
		
		this.resp.sent_head = true;
		
		var status = this.resp.status;
		
		// lowercase headers
		for(var name in this.headers){
			var val = this.headers[name];
			
			if(typeof val == 'number')val = val + '';
			
			delete this.headers[name];
			
			this.headers[name.toLowerCase()] = val;
		}
		
		// remove trailers on chunked
		if(this.headers['content-encoding'] == 'chunked' && this.headers.trailers)delete this.headers.trailers;
		
		// handle cookies
		
		if(Object.keys(this.cookies).length && !this.headers['set-cookie']){
			this.headers['set-cookie'] = [];
			
			for(var name in this.cookies){
				var data = this.cookies[name],
					out = [
						name + '=' + data.value,
					];
				
				if(data.expires){
					if(typeof data.expires == 'number')data.expires = new Date(data.expires);
					
					out.push('expires=' + (data.expires instanceof Date ? data.expires.toGMTString() : data.expires));
				}
				
				if(data.samesite)out.push('samesite=' + data.samesite);
				if(data.secure)out.push('secure');
				
				this.headers['set-cookie'].push(out.join('; '));
			}
			
			this.headers['set-cookie'] = this.headers['set-cookie'].join(' ');
		}
		
		this.org_res.writeHead(status, this.headers);
	}
	pipe_from(stream){
		this.finalize();
		
		stream.on('data', chunk => this.write(chunk));
		stream.on('end', chunk => this.end(chunk));
	}
	write(data){
		var buf = (Buffer.isBuffer(data) ? data : Buffer.from(data)).slice(0, this.server.max_response_size);
		
		this.org_res.write(buf);
		
		return this;
	}
	end(data){
		if(data){
			var buf = (Buffer.isBuffer(data) ? data : Buffer.from(data)).slice(0, this.server.max_response_size);
			
			this.org_res.end(buf);
		}else{
			this.org_res.end();
		}
		
		return this;
	}
	send(body){
		if(this.resp.sent_body)throw new TypeError('response body already sent!');
		
		this.finalize();
		
		if(['boolean', 'number'].includes(typeof body))body += '';
		
		this.write(body);
		
		this.org_res.end();
		
		this.resp.sent_body = true;
		
		return this;
	}
	json(object){
		this.send(JSON.stringify(object));
		
		return this;
	}
	static(){
		if(this.req.url.pathname.startsWith('/cgi/'))return this.cgi_status(403);
		
		var pub_file = path.join(this.server.static, this.req.url.pathname);
		
		if(!fs.existsSync(pub_file))return this.cgi_status(404);
		
		if(fs.statSync(pub_file).isDirectory()){
			if(!this.req.url.pathname.endsWith('/'))return this.redirect(301, this.req.url.pathname + '/');
			
			pub_file = path.join(pub_file, 'index.html');
		}
		
		if(!fs.existsSync(pub_file))return this.cgi_status(404);
		
		var mime = exports.http.mimes[(path.extname(pub_file) + '').substr(1)];
		
		this.status(200);
		this.set('content-type', mime);
		
		if(mime == 'text/html' && this.server.execution)return fs.promises.readFile(pub_file, 'utf8').then(body => this.send(exports.html(pub_file, body, this.req, this, {}))).catch(err => this.send(util.format(err)));
		
		this.pipe_from(fs.createReadStream(pub_file));
	}
	cgi_status(code, message = exports.http.status_codes[code], title = code){
		if(this.resp.sent_body)throw new TypeError('response body already sent!');
		if(this.resp.sent_head)throw new TypeError('response headers already sent!');
		
		if(message instanceof Error)title = message.code, message = '<pre>' + exports.sanitize(exports.format(message)) + '</pre>';
		else message = '<h2>' + exports.sanitize(message) + '</h2>';
		
		var exposed_vars = {
				title: exports.sanitize(title),
				reason: message,
			},
			loca = path.join(this.server.static, 'cgi', 'error.html'),
			text = fs.existsSync(loca) ? fs.readFileSync(loca, 'utf8') : '<h1><?=$title?></h1> <?=$reason?>';
		
		this.set('content-type', 'text/html');
		this.status(code);
		
		this.send(exports.html(loca, text, this.req, this, {
			'$title': title,
			'$reason': message,
		}));
		
		return this;
	}
	redirect(status, redir){
		if(!redir)redir = status, status = 302;
		
		// url.resolve(this.req.url.origin, redir);
		redir = redir;
		
		this.set('location', redir);
		this.set('content-type', 'text/html');
		this.status(status);
		
		this.send(`You should be redirected to <a href=${exports.wrap(redir)}>${redir}</a> shortly..`);
		
		return this;
	}
	content_type(value){
		this.set('content-type', value);
		
		return this;
	}
	contentType(value){
		this.set('content-type', value);
		
		return this;
	}
};

exports.regex = {
	exp: /<\?(=|js)([\s\S]*?)\?>/g,
	state: /\$\S/,
	proto: /^(?:f|ht)tps?\:\/\//,
};

exports.html = (fn, body, req, res, state) => {
	// allow storing of data in here
	// have NO references
	// garbage collection is important
	
	// replace and execute both in the same regex to avoid content being insert and ran
	
	body = body.replace(exports.regex.exp, (m, type, exp) => {
		exp = (type == '=' ? 'echo(' + exp + ')' : exp).replace(exports.regex.state, 'state.$&');
		
		var out = '',
			func,
			args = {
				__dirname: path.dirname(fn),
				file(file){
					return path.resolve(args.__dirname, file);
				},
				state: state,
				echo(str){
					return out += str;
				},
				include(file){
					var text = fs.readFileSync(args.file(file), 'utf8');
					
					if(path.extname(file) == '.js')text = '<?js\n' + text + '\n?>';
					
					out += exports.html(file, text, req, res, state);
				},
				require(file){
					return require(path.resolve(args.__dirname, file))
				},
				filemtime(file){
					file = path.resolve(args.__dirname, file);
					
					if(!fs.existsSync(file))throw new TypeError('cannot find file ' + exports.wrap(file));
					
					return fs.statSync(file).mtimeMs;
				},
				req: req,
				res: res,
			};
		
		try{
			func = new Function(Object.keys(args).concat(Object.keys(res.server.global)), exp);
			
			try{
				Reflect.apply(func, state, Object.values(args).concat(Object.values(res.server.global)));
			}catch(err){
				var message = '@' + fn + ', error at execution:\n' + util.format(err);
				
				console.error(message);
				
				out += '<pre>' + message + '</pre>';
			}
		}catch(err){
			var message = '@' + fn + ', error at construction:\n' + util.format(err);
			
			console.error(message);
			
			out += '<pre>' + message + '</pre>';
		}
		
		return out;
	});
	
	return body;
};

exports.fake_ip = [0,0,0,0].map(_ => ~~(Math.random() * 255) + 1).join('.');

exports.add_proto = url => !url.match(exports.regex.proto) ? 'https://' + url : url;

/*
exports.min = {
	html: { decodeEntities: true, collapseWhitespace: true, removeComments: true, removeTagWhitespace: true, minifyCSS: true, minifyJS: true, quoteCharacter: '\'' },
	css: { minifyCSS: true },
};

exports.minify_cache = {};

exports.minify = (data, name, opts) => {
	var dhash = exports.hash(data);
	
	if(!exports.minify_cache[name])exports.minify_cache[name] = {};
	
	if(exports.minify_cache[name].hash == dhash)return exports.minify_cache[name].data;
	
	exports.minify_cache[name].hash = dhash;
	return exports.minify_cache[name].data = minifier.minify(data, opts);
};
*/

exports.size = {
	b: 1,
	kb: 1e3,
	mb: 1e6,
	gb: 1e9,
	tb: 1e12,
	pb: 1e+15,
}

/** 
* [create_server create an http(s) server with config provided]
* @param {Object} config
* @param {Array} config.routes all routes to go through, [ ['/regex or string', (req, res) => {} ] ]
* @param {Number} config.port port to run server on
* @param {String} config.address address to run server on
* @param {String} config.static static directory to load files from
* @param {String} config.max_response_size maximum response size ( BYTES )
* @param {Object} config.ssl ssl data to use with server, if not specified server will be HTTP only
* @param {Object} config.ssl.key location to key file
* @param {Object} config.ssl.crt location to crt file
* @param {Object} config.global global arguments to pass to rhtml
* @param {Function} config.ready function to call on server being ready 
*/

exports.server = class extends events {
	constructor(options){
		super();
		
		if(typeof options != 'object')throw new TypeError('a none object was specified for the config');
		
		this.options = options;
		
		this.max_response_size = options.max_response_size || exports.size.mb * 512;
		
		this.handler = async (req, res) => {
			res = new exports.response(req, res, this);
			req = res.req;
			
			if(options.handler)return options.handler(req, res);
			
			await req.process();
			
			this.pick_route(req, res, [...this.routes]);
		};
		
		this.execution = options.execution == false ? false : true;
		this.global = options.global || {};
		
		this.global.fs = fs;
		this.global.path = path;
		this.global.atob = exports.atob;
		this.global.btoa = exports.btoa;
		this.global.nodehttp = exports;
		
		this.routes = options.endpoints || options.routes || [];
		this.ssl = options.ssl;
		
		this.port = options.port || 8080;
		this.address = options.address || '127.0.0.1';
		
		this.alias = ['0.0.0.0', '127.0.0.1'].includes(this.address) ? 'localhost' : this.address;
		this.url = new URL('http' + (this.ssl ? 's' : '') + '://' + this.alias + ':' + this.port);
		
		this.static = options.static || '';
		this.static_exists = this.static && fs.existsSync(this.static);
		
		this.server = (this.ssl ? https.createServer(this.ssl, this.handler) : http.createServer(this.handler)).listen(this.port, this.address, this.ready.bind(this)).on('error', err => {
			this.emit('error', err);
		});
		
		this.server.on('upgrade', (req, socket, head) => this.emit('upgrade', req, socket, head));
		this.server.on('connection', socket => this.emit('connection', socket));
		this.server.on('close', err => this.emit('close', err));
		
		// checkContinue
	}
	pick_route(req, res, routes){
		var end = routes.findIndex(([ method, key, val, targ = 'pathname' ]) => {
				if(method != '*' && method != req.method)return;
				if(key instanceof RegExp)return key.test(req.url[targ]);
				
				var key = typeof key == 'function' ? key() : key;
				
				return key.endsWith('*') ? req.url[targ].startsWith(key.slice(0, -1)) : key == req.url[targ];
			}),
			next = () => {
				routes.splice(end, 1);
				
				this.pick_route(req, res, routes);
			};
		
		if(routes[end])routes[end][2](req, res, next);
		else if(this.static_exists)res.static();
		else res.cgi_status(404);
	}
	/**
	* add a GET route
	* @param {string} Path
	* @param {function} Handler
	*/
	get(a1, a2){
		var path = typeof a1 == 'string' ? a1 : '*',
			handler = typeof a1 == 'function' ? a1 : a2;
		
		this.routes.push([ 'GET', path, handler ]);
	}
	/**
	* add a POST route
	* @param {string} Path
	* @param {function} Handler
	*/
	post(a1, a2){
		var path = typeof a1 == 'string' ? a1 : '*',
			handler = typeof a1 == 'function' ? a1 : a2;
		
		this.routes.push([ 'POST', path, handler ]);
	}
	/**
	* add a PUT route
	* @param {string} Path
	* @param {function} Handler
	*/
	put(a1, a2){
		var path = typeof a1 == 'string' ? a1 : '*',
			handler = typeof a1 == 'function' ? a1 : a2;
		
		this.routes.push([ 'PUT', path, handler ]);
	}
	/**
	* add a PATCH route
	* @param {string} Path
	* @param {function} Handler
	*/
	patch(a1, a2){
		var path = typeof a1 == 'string' ? a1 : '*',
			handler = typeof a1 == 'function' ? a1 : a2;
		
		this.routes.push([ 'PATCH', path, handler ]);
	}
	/**
	* add a DELETE route
	* @param {string} Path
	* @param {function} Handler
	*/
	delete(a1, a2){
		var path = typeof a1 == 'string' ? a1 : '*',
			handler = typeof a1 == 'function' ? a1 : a2;
		
		this.routes.push([ 'DELETE', path, handler ]);
	}
	/**
	* add a route for all
	* @param {string} Path
	* @param {function} Handler
	*/
	use(a1, a2){
		var path = typeof a1 == 'string' ? a1 : '*',
			handler = typeof a1 == 'function' ? a1 : a2;
		
		this.routes.push([ '*', path, handler ]);
	}
	ready(){
		this.emit('ready');
		
		if(this.options.ready)this.options.ready.call(this);
		else console.log(`[${process.pid}] server listening on ${this.url}`);
	}
}