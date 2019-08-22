!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.WebAuth=t():e.WebAuth=t()}(window,function(){return function(e){var t={};function n(o){if(t[o])return t[o].exports;var r=t[o]={i:o,l:!1,exports:{}};return e[o].call(r.exports,r,r.exports,n),r.l=!0,r.exports}return n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)n.d(o,r,function(t){return e[t]}.bind(null,r));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){"use strict";var o,r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},a=function(){function e(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}return function(t,n,o){return n&&e(t.prototype,n),o&&e(t,o),t}}(),i=n(1),c=(o=i)&&o.__esModule?o:{default:o};var u=function(){function e(t){var n=t.key,o=t.jwt,r=t.debug,a=t.remember,i=t.checker;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.token=o,this.payload=null,this.key=n||"auth-key",this.debug=r||!1,this.remember=a||!1,this.checker=i}return a(e,[{key:"init",value:function(){var e=this;return new Promise(function(t,n){var o=window[e.checkStorage()].getItem(e.key);e.token=e.token||o,e.setup().then(function(){e.setPayload(),e.checkExpiration(function(o){var r=e.getSearchOrHash(),a={valid:o,token:e.token,payload:e.payload,pathname:e.getPathname()};Object.assign(a,r),o?t(a):n(a)})}).catch(function(t){e.cleanTokens(),n(t)})})}},{key:"setup",value:function(){var e=this;return new Promise(function(t,n){var o=e.remember?"localStorage":"sessionStorage";e.cleanTokens(),e.token?(window[o].setItem(e.key,e.token),t()):n("Token is not defined")})}},{key:"checkExpiration",value:function(e){e(1e3*this.payload.exp>=(new Date).getTime())}},{key:"setPayload",value:function(){var e=this,t=(0,c.default)(this.token);this.Debug("info",t),this.payload="object"===(void 0===t?"undefined":r(t))?t:(e.Debug("error",{token:e.token,payload:e.payload}),e.Debug("error",new Error("Payload isn't an object")),{})}},{key:"checkStorage",value:function(){return window.localStorage.getItem(this.key)?"localStorage":"sessionStorage"}},{key:"cleanTokens",value:function(){window.localStorage.removeItem(this.key),window.sessionStorage.removeItem(this.key)}},{key:"getPathname",value:function(){return window.location.pathname}},{key:"getSearchOrHash",value:function(){var e=function(e){var t={};return e.split("?").map(function(e){e.includes("#")?t.hash=e.replace("#",""):e.includes("&")&&(t.search=function(e){var t={};return e.split("&").map(function(e){return t[e.split("=")[0]]=e.split("=")[1]}),t}(e))}),t},t=window.location.search,n=window.location.hash;return e(t||n)}},{key:"checkHTTP",value:function(){var e=this;return new Promise(function(t,n){if("object"===r(e.checker)&&"url"in e.checker){var o=new Headers;Object.keys(e.checker).map(function(t){var n=t.toLowerCase();"authorization"!==n&&"prefix"!==n&&"body"!==n&&"method"!==n&&o.append(t,e.checker.header[t])}),o.append("Authorization",e.checker.prefix+" "+e.token),fetch(e.checker.url,{method:e.checker.method||"POST",headers:o,body:e.checker.body||{}}).then(function(e){t(e)}).catch(function(e){return n(e)})}else n("Checker key not have the correct format or url/header keys not found")})}},{key:"Debug",value:function(e,t){var n="string"==typeof e?e:"info";this.debug&&console[n](t)}}]),e}();e.exports=u},function(e,t,n){"use strict";var o=n(2);function r(e){this.message=e}r.prototype=new Error,r.prototype.name="InvalidTokenError",e.exports=function(e,t){if("string"!=typeof e)throw new r("Invalid token specified");var n=!0===(t=t||{}).header?0:1;try{return JSON.parse(o(e.split(".")[n]))}catch(e){throw new r("Invalid token specified: "+e.message)}},e.exports.InvalidTokenError=r},function(e,t,n){"use strict";var o=n(3);e.exports=function(e){var t=e.replace(/-/g,"+").replace(/_/g,"/");switch(t.length%4){case 0:break;case 2:t+="==";break;case 3:t+="=";break;default:throw"Illegal base64url string!"}try{return function(e){return decodeURIComponent(o(e).replace(/(.)/g,function(e,t){var n=t.charCodeAt(0).toString(16).toUpperCase();return n.length<2&&(n="0"+n),"%"+n}))}(t)}catch(e){return o(t)}}},function(e,t,n){"use strict";var o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";function r(e){this.message=e}r.prototype=new Error,r.prototype.name="InvalidCharacterError",e.exports="undefined"!=typeof window&&window.atob&&window.atob.bind(window)||function(e){var t=String(e).replace(/=+$/,"");if(t.length%4==1)throw new r("'atob' failed: The string to be decoded is not correctly encoded.");for(var n,a,i=0,c=0,u="";a=t.charAt(c++);~a&&(n=i%4?64*n+a:a,i++%4)?u+=String.fromCharCode(255&n>>(-2*i&6)):0)a=o.indexOf(a);return u}}])});
//# sourceMappingURL=web-auth.bundle.js.map