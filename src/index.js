/*
**  Web Auth by Videsk 2019 - Apache 2.0
**
**  Class for manage authorization for Rest API
**  Check automatically expiration of JWT Token
**  Easy access to payload of JWT
**  Automatically use of refresh token for get a new access token
**  JWT decode dependency
**
**  Github: https://github.com/videsk/front-auth-handler - NPM: https://npmjs.com/package/@videsk/front-auth-handler
 */

import jwt_decode from 'jwt-decode';

class WebAuth {

    constructor({ key, tokens, debug, remember, config, expired }) {
        this.tokens = {
            access: (tokens && 'access' in tokens) ? tokens.access : null, // Set access token
            refresh: (tokens && 'refresh' in tokens) ? tokens.refresh : null // Set refresh token
        };
        this.payloads = { access: null, refresh: null }; // Payload of access and refresh token
        this.keys = {
            access: (key && 'access' in key) ? key.access : 'auth-key', // Key of access token for save in local or session storage
            refresh: (key && 'refresh' in key) ? key.refresh : 'auth-key-refresh' // Key of refresh token for save in local or session storage
        };
        this.debug = (typeof debug === 'boolean') ? debug : false; // By default is false
        this.remember = (typeof remember === 'boolean') ? remember : false; // By default is false
        this.config = (typeof config === 'object') ? config : null; // Parameters for validate and get new token
        this.expired = (typeof expired === 'function') ? expired : null; // Handler for positive or negative result of validation
        this.interval = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            // Save access token
            this.token = this.token || this.getFromStorage(this.keys.access);
            // Save refresh token
            this.refresh = this.refresh || this.getFromStorage(this.keys.refresh);
            // Refresh or add token
            this.setup()
                .then(() => {
                        // Set payload of access token
                        this.setPayload('access');
                        // Set payload of refresh token
                        if (this.tokens.access) this.setPayload('refresh');
                        /*
                        **  Here check the access token
                        **  if is expired try to use refresh token for get a new
                        **  in other case reject and execute return catch
                         */
                        this.checkExpiration('access',valid => {
                            // Get parameters
                            const pathnameObject = { pathname: Object.assign(this.getSearchOrHash(), this.nestedPathname()) };
                            // base obj
                            const finalObj = { valid, tokens: this.tokens, payloads: this.payloads };
                            // merge two obj
                            Object.assign(finalObj, pathnameObject);
                            // Add checker for expiration time of JWT
                            this.createChecker();
                            // Check in backend
                            this.checkHTTP()
                                .then(() => resolve(finalObj)) // Return valid JWT
                                .catch(() => reject(finalObj));
                        });
                })
                .catch(e => {
                    this.cleanTokens();
                    reject(e);
                });
        });
    }

    setup() {
        return new Promise((resolve, reject) => {
            // Save JWT in dynamic route
            const route = (this.remember) ? 'localStorage' : 'sessionStorage';
            // Remove all others JWT storage
            this.cleanTokens();
            // Refresh or save in dynamic route
            if (!this.tokens.access) reject('Token is not defined');
            else {
                // Save access token
                window[route].setItem(this.keys.access, this.tokens.access);
                // Save refresh token
                if (this.tokens.refresh) window[route].setItem(this.keys.refresh, this.tokens.refresh);
                // Finish
                resolve();
            }
        });
    }

    checkExpiration(token, callback) {
        // Set expiration time of JWT in local time
        const expiration = this.payloads[token].exp*1000;
        // Get local time of user
        const today = new Date().getTime();
        // Check if the expiration date is greater of today
        if (expiration >= today) callback(true); else callback(false);
    }

    setPayload(token) {
        // Error if payload isn't a object
        const error = () => {
            this.Debug('error', { token: this.tokens[token], payload: this.payloads[token] });
            this.Debug('error', new Error('Payload isn\'t an object'));
            return {};
        };
        // Decode JWT and get-set payload
        const payload = jwt_decode(this.tokens[token]);
        // Debug
        this.Debug('info', payload);
        // Set payload
        this.payloads[token] = (typeof payload === 'object') ? payload : error();
    }

    checkStorage(key) {
        return (window.localStorage.getItem(key)) ? 'localStorage' : 'sessionStorage'; // Get the store of token/refresh token
    }

    getFromStorage(key) {
        return window[this.checkStorage(key)].getItem(key);
    }

    cleanTokens() {
        // Remove from localStorage
        window.localStorage.removeItem(this.key);
        window.localStorage.removeItem(this.refreshKey);
        // Remove from sessionStorage
        window.sessionStorage.removeItem(this.key);
        window.sessionStorage.removeItem(this.refreshKey);
    }

    getPathname() {
        return window.location.pathname; // Get the pathname
    }

    nestedPathname() {
        // Get the current pathname
        let pathname = this.getPathname();
        // Remove the first element in array is slash
        pathname = pathname.split('/');
        // Remove the first empty element
        pathname.shift();
        // Create array with path
        let array = [];
        // Push elements to array
        pathname.map((path, index) => array.push({ path: pathname[index], level: index }));
        // Return array with list
        return { plain: this.getPathname(), byLevels: array };
    }

    getSearchOrHash() {
        // Format hash, get search parameters and return object
        const formatter = (value) => {
            // nested formatter for search parameters
            const searchFormatter = (parameters) => {
                // return obj
                const obj = {};
                // add parameters like key and value
                parameters.split('&').map(p => obj[p.split('=')[0]] = p.split('=')[1]);
                // return obj
                return obj
            };
            // object with all parameters of url
            let obj = {};
            // Get all parameters (split by ? for get all)
            const parameters = value.split('?');
            // map parameters and add to the correct key
            parameters.map(p => {
                if (p.includes('#')) obj.hash = p.replace('#', '');
                else if (p.includes('&')) obj.search = searchFormatter(p);
            });
            // return obj
            return obj;
        };
        // Get search parameters
        const search = window.location.search;
        // Get hash
        const hash = window.location.hash;
        // return object based on url
        return (search) ? formatter(search) : formatter(hash);
    }

    // Working for the next version 1.2.0
    checkHTTP(urlKey = 'check') {
        return new Promise((resolve, reject) => {
            if (this.config
                && typeof this.config === 'object' // Validate is object
                && 'url' in this.config
                && typeof this.config.url === 'object') {
                // Create a new header
                const header = new Headers();
                // Destructing object and get keys
                const { headers, url, prefix, method, body } = this.config;
                // Map checker object only if exist
                if (headers) Object.keys(headers).map(key => {
                    // Key to lower case
                    const foo = key.toLowerCase();
                    // check the key is not reserved
                    if (foo !== 'authorization') header.append(key, headers[key]);
                });
                // Add to header object
                header.append('Authorization', `${prefix || 'Bearer'} ${this.token}`);
                // fetch to url
                fetch(url[urlKey], { method: method || 'POST', header, body: body || {} })
                    .then(response => {
                        // Return response
                        resolve(response);
                    })
                    .catch(e => reject(e)); // Reject is not valid or something happen with server/url
            } else {
                // Check if checker is declared like object or not backend validation
                if (typeof this.config === 'undefined') resolve(); // Not backend validation is required
                else reject('Config dont\'t have the correct format or url key not found.'); // Some declarations are not correct
            }
        });
    }

    getNewToken() {
        // Get new token if the access token expired
    }

    createChecker(token) {
        // Handler of JWT expiration
        const handler = () => {
            if (new Date().getTime() > this.payloads[token].exp*1000) {
                // Clear interval
                clearInterval(this.interval);
                // Execute custom expired function
                this.expired();
            }
        };
        // Create interval
        this.interval = window.setInterval(handler, 1000);
    }

    Debug(type, message) {
        const route = (typeof type === 'string') ? type : 'info';
        if(this.debug) console[route](message);
    }
}

module.exports = WebAuth;
