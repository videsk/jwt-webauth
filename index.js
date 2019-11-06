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

export default class WebAuth {

    constructor({ keys, tokens, remember, config, expired }) {
        this.tokens = {
            access: (tokens && 'access' in tokens) ? tokens.access : null, // Set access token
            refresh: (tokens && 'refresh' in tokens) ? tokens.refresh : null // Set refresh token
        };
        this.payloads = { access: null, refresh: null }; // Payload of access and refresh token
        this.keys = {
            access: (keys && 'access' in keys) ? keys.access : 'auth-key', // Key of access token for save in local or session storage
            refresh: (keys && 'refresh' in keys) ? keys.refresh : 'auth-key-refresh' // Key of refresh token for save in local or session storage
        };
        this.debug = ('debug' in config && typeof config.debug === 'boolean') ? config.debug : false; // By default is false
        this.remember = (typeof remember === 'boolean') ? remember : undefined; // By default is undefined
        this.config = (typeof config === 'object') ? config : null; // Parameters for validate and get new token
        this.expired = (typeof expired === 'function') ? expired : () => {}; // Handler for positive or negative result of validation
        this.interval = { execute: null, try: 0 };
    }

    init() {
        return new Promise((resolve, reject) => {
            try {
                this.Debug('info', 'Initializing WebAuth... (36)');
                // Save access token
                this.tokens.access = this.tokens.access || this.getFromStorage(this.keys.access);
                // Save refresh token
                this.tokens.refresh = this.tokens.refresh || this.getFromStorage(this.keys.refresh);
                // Set remember
                this.remember = (typeof this.remember === 'boolean') ? this.remember : this.checkStorage(this.keys.access).remember;
                this.Debug('info', 'Configuration in process... (43)');
                // Refresh or add token
                this.setup()
                    .then(() => {
                        this.Debug('info', 'Checking expiration... (47)');
                        this.checkExpiration('access')
                          .then(valid => {
                              this.Debug('info', 'Creating pathname object... (50)');
                            // Get parameters
                            const pathnameObject = { pathname: Object.assign(this.getSearchOrHash(), this.nestedPathname()) };
                            this.Debug('info', 'Creating final object with token, payload and pathname... (53)');
                            // base object
                            const finalObj = { valid, tokens: this.tokens, payloads: this.payloads };
                            // merge two obj
                            Object.assign(finalObj, pathnameObject);
                            this.Debug('info', `Is valid? --> ${this.validateURL()}... (59)`);
                            // Set in constant the endpoint validate access token
                            const { access } = (this.validateURL()) && this.config.url['endpoints'];
                            this.Debug('info', `Checking via HTTP to ${this.config.url.base}/${access}... (67)`);
                            // Check in backend
                            if (this.validateURL()) this.checkHTTP({ endpoint: access })
                                .then((result) => {
                                    this.Debug('info', 'Finished initialization... (61)');
                                    resolve(finalObj);
                                    this.Debug('info', 'Returned an Object... (63)');
                                })
                                .catch((status) => {
                                    this.Debug('info', 'Access token expired... (66)');
                                    this.Debug('info', 'Trying to get a new... (67)');
                                    if (this.CheckStatus(status) && 'refresh' in this.tokens) this.getNewToken()
                                      .then(() => resolve())
                                      .catch(e => reject(e));
                                });
                            else reject();
                        })
                          .catch(e => this.Debug('error', 'Error trying to get the expiration of token... (76)'))
                    })
                    .catch(e => {
                        this.cleanTokens();
                        reject(e);
                    });
            }
            catch(e) {reject(e)}
        });
    }

    setup() {
        return new Promise((resolve, reject) => {
            if (this.debug) console.group('Setup');
            // Save JWT in dynamic route
            const route = (this.remember) ? 'localStorage' : 'sessionStorage';
            // Remove all others JWT storage
            this.cleanTokens();
            // Refresh or save in dynamic route
            if (!this.tokens.access) reject('Token is not defined');
            else {
                this.Debug('info', `Saving access token in ${route}... (91)`);
                // Save access token
                window[route].setItem(this.keys.access, this.tokens.access);
                if (this.tokens.refresh) this.Debug('info', `Saving refresh token in ${route}... (94)`);
                // Save refresh token
                if (this.tokens.refresh) window[route].setItem(this.keys.refresh, this.tokens.refresh);
                // Set payload of access token
                this.setPayload('access');
                // Set payload of refresh token
                if (this.tokens.access) this.setPayload('refresh');
                /*
                **  Here check the access token
                **  if is expired try to use refresh token for get a new
                **  in other case reject and execute return catch
                */
                // Add checker for expiration time of JWT
                this.createChecker();
                // Finish
                resolve();
            }
            if (this.debug) console.groupEnd('Setup');
        });
    }

    checkExpiration(token) {
        return new Promise((resolve, reject) => {
           try {
               this.Debug('info', 'Checking token expiration... (125)');
                // Set expiration time of JWT in local time
                const expiration = this.payloads[token].exp*1000;
                // Get local time of user
                const today = new Date().getTime();
                // Check if the expiration date is greater of today
                const valid = expiration >= today;
                this.Debug('info', `The token is ${valid}... (132)`);
                // Return value in callback or directly
                resolve(valid);
           }
           catch(e) {reject(e)};
        });
    }

    setPayload(token) {
        if (this.debug) console.group('Setting Payload');
        // Error if payload isn't a object
        const error = () => {
            this.Debug('error', { token: this.tokens[token], payload: this.payloads[token] });
            this.Debug('error', new Error('[Auth Web] Payload isn\'t an object'));
            return {};
        };
        this.Debug('info', 'Decoding payload of JWT... (148)');
        // Decode JWT and get-set payload
        const payload = jwt_decode(this.tokens[token]);
        // Debug
        this.Debug('info', `Return ${token} JWT... (152)`);
        this.Debug('info', payload);
        // Set payload
        this.Debug('info', `Setting ${token} token... (155)`);
        this.payloads[token] = (typeof payload === 'object') ? payload : error();
        if (this.debug) console.groupEnd('Setting Payload');
    }

    checkStorage(key) {
        this.Debug('info', 'Checking storage... (161)');
        const storage = (window.localStorage.getItem(key)) ? 'localStorage' : 'sessionStorage'; // Get the store of token/refresh token
        const remember = (storage === 'localStorage');
        return { storage, remember };
    }

    getFromStorage(key) {
        return window[this.checkStorage(key).storage].getItem(key);
    }

    cleanTokens() {
        this.Debug('info', 'Cleaning tokens... (172)');
        // Remove from localStorage
        window.localStorage.removeItem(this.keys.access);
        window.localStorage.removeItem(this.keys.refresh);
        // Remove from sessionStorage
        window.sessionStorage.removeItem(this.keys.access);
        window.sessionStorage.removeItem(this.keys.refresh);
    }

    getPathname() {
        return window.location.pathname; // Get the pathname
    }

    nestedPathname() {
        if (this.debug) console.group('Parsing nested path');
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
        if (this.debug) console.groupEnd('Parsing nested path');
        // Return array with list
        return { plain: this.getPathname(), byLevels: array };
    }

    getSearchOrHash() {
        if (this.debug) console.group('Getting search or hash in url');
        // Format hash, get search parameters and return object
        const formatter = (value) => {
            this.Debug('info', 'Parsing URL for format... (206)');
            // nested formatter for search parameters
            const searchFormatter = (parameters) => {
                this.Debug('info', 'Parsing search parameters in URL... (209)');
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
            this.Debug('info', 'Mapping and separating hash and search parameters... (221)');
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
        if (this.debug) console.groupEnd('Getting search or hash in url');
        // return object based on url
        return (search) ? formatter(search) : formatter(hash);
    }

    checkHTTP({ endpoint, token = 'access' }) {
        if (this.debug) console.group('HTTP check');
        return new Promise((resolve, reject) => {
            try {
                this.Debug('info', `Checking ${token} token by HTTP request... (243)`);
                // Validate all mandatory keys exists
                if (this.validateURL()) {
                    // Create a new header
                    const header = new Headers();
                    // Destructing object and get keys
                    const { headers, url, prefix, methods, bodies } = this.config;
                    // Map checker object only if exist
                    if (headers && headers[token]) Object.keys(headers).map(key => {
                        // Key to lower case
                        const foo = key.toLowerCase();
                        // check the key is not reserved
                        if (foo !== 'authorization') header.append(key, headers[key]);
                    });
                    this.Debug('info', `Adding access token to header... (260)`);
                    // Add to header objects
                    header.append('Authorization', `${prefix || 'Bearer'} ${this.tokens['access']}`);
                    this.Debug('info', `Fetching to ${url.base}/${endpoint}... (258)`);
                    // fetch to url
                    fetch(`${url.base}/${endpoint}`, {
                        method: (methods) ? methods[token] : 'POST',
                        headers: header,
                        body: (bodies) ? bodies[token] : {},
                    })
                        .then(response => {
                            this.Debug('info', `Response with code ${response.status}... (2)`);
                            // Return depending of status response
                            if (response.status === 200 || response.status === 204) this.parse(response)
                                .then((r) => resolve(r));
                            else reject(response);
                        })
                        .catch((response) => {
                            this.Debug('info', 'Something is bad, please check request in Network DevTools tab.');
                            this.parse(response).then((x, status) => reject(status));
                        }); // Reject, is not valid or something happen with server/url
                } else {
                    this.Debug('info', 'Exiting HTTP validation... (272)');
                    // Check if checker is declared like object or not backend validation
                    if (typeof this.config.url === 'undefined') resolve(); // Not backend validation is required
                    else reject('[Auth Web] Config dont\'t have the correct format or url key not found.'); // Some declarations are not correct
                }
            } catch(e) {reject(console.log(e))}
            if (this.debug) console.groupEnd('HTTP check');
        });
    }

    getNewToken() {
        return new Promise((resolve, reject) => {
            this.Debug('info', 'Trying to get a new access token... (271)');
            if (this.validateURL() && 'refresh' in this.tokens) {
                // Get endpoint of refresh token
                const {endpoints, keys} = this.config.url;
                // Get new token if the access token expired
                this.checkHTTP({ endpoint: endpoints.access, token: 'refresh' })
                    .then((response) => {
                        // Set new access token
                        this.tokens.access = response[keys.access];
                        // Setup the new token in storage
                        this.setup()
                            .then(() => resolve())
                            .catch(() => reject());
                    })
                    .catch((status) => reject(status));
            } else reject(this.Debug('error', '[Auth Web] Trying to get a access token without mandatory keys.'));
        });
    }

    createChecker() {
        /* This function try to get new access token
        * with the refresh token, if is exist refresh token
        * All expires if server return error 4XX
         */
        this.Debug('info', 'Creating checker... (295)');
        // Handler of JWT expiration
        const handler = () => {
            if (!this.checkExpiration('access') && this.interval.try <= 5) {
                // Clear interval
                window.clearInterval(this.interval.execute);
                // First try to get a new access token with the refresh token
                if (this.validateURL()
                    && 'refresh' in this.tokens) this.getNewToken()
                    // If the response is with 4XX Forbidden execute expired function
                    // Else maybe the server have a bad day and need create the checker again
                    .catch((status) => (this.CheckStatus(status)) ? this.expire() : this.createChecker(this.interval.try++));
                // If you don't have refresh token implementation only expire token
                else this.expire();
            }
            // If the server die or something goes wrong, try recursive but with 5 seconds of delay
            else if (this.interval.try > 5) setTimeout(() => this.createChecker(this.interval.try = 0), 5000);
        };
        // Create interval
        this.interval.execute = window.setInterval(handler, 1000);
    }

    validateURL() {
        this.Debug('info', 'Validating URL... (318)');
        // Validate exist all keys and types of keys are correct
        return (typeof this.config === 'object'
            && 'url' in this.config
            && typeof this.config.url === 'object'
            && 'endpoints' in this.config.url
            && typeof this.config.url['endpoints'] === 'object'
            && 'access' in this.config.url['endpoints']);
    }

    parse(response) {
        // Parse fetch
        return new Promise((resolve, reject) => {
            this.Debug('info', 'Parsing fetch response... (353)');
           response.json()
               .then((r) => resolve(r, response.status))
               .catch((e) => reject(e));
        });
    }

    CheckStatus(status) {
        this.Debug('info', 'Checking status of fetch... (361)');
        this.Debug('info', `The status is ${status}... (362)`);
        const DefaultStatus = (this.validateURL() && 'status' in this.config.url.status) && this.config.url.status;
        return DefaultStatus === status;
    }

    expire() {
        this.Debug('info', 'Token has expired... (339)');
        this.cleanTokens();
        this.expired();
    }

    Debug(type, message) {
        const route = (typeof type === 'string') ? type : 'info';
        if(this.config.debug) console[route](message);
    }
};
