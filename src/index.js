/*
**  Web Auth by Videsk 2019 - Apache 2.0
**
**  Class for manage authorization for Rest API
**  Check automatically expiration of JWT Token
**  Easy access to payload of JWT
**  JWT decode dependency
**
**  Github: https://github.com/matiaslopezd/web-auth-manager - NPM: https://npmjs.com/package/@videsk/web-auth-manager
 */

import jwt_decode from 'jwt-decode';

class WebAuth {
    constructor({ key, jwt, debug, remember, checker }) {
        this.token = jwt; // JWT Token
        this.payload = null; // Payload of token
        this.key = key || 'auth-key'; // String of auth-key
        this.debug = debug || false; // By default is false
        this.remember = remember || false; // By default is false
        this.checker = checker;
    }

    init() {
        return new Promise((resolve, reject) => {
            // Check if exist key in localStorage or sessionStorage
            const cToken = window[this.checkStorage()].getItem(this.key);
            // Save storage token or new token
            this.token = this.token || cToken;
            // Refresh or add token
            this.setup()
                .then(() => {
                        // Set payload of JWT
                        this.setPayload();
                        // Check the expiration of JWT
                        this.checkExpiration(valid => {
                            // Get parameters
                            const newObj = this.getSearchOrHash();
                            // base obj
                            const obj = { valid, token: this.token, payload: this.payload, pathname: this.getPathname() };
                            // merge two obj
                            Object.assign(obj, newObj);
                            // validate
                            if (valid) resolve(obj); // Return valid JWT
                            else reject(obj);
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
            if (!this.token) reject('Token is not defined');
            else {
                window[route].setItem(this.key, this.token);
                resolve();
            }
        });
    }

    checkExpiration(callback) {
        // Set expiration time of JWT in local time
        const expiration = this.payload.exp*1000;
        // Get local time of user
        const today = new Date().getTime();
        // Check if the expiration date is greater of today
        if (expiration >= today) callback(true); else callback(false);
    }

    setPayload() {
        // Error if payload isn't a object
        const error = () => {
            this.Debug('error', { token: this.token, payload: this.payload });
            this.Debug('error', new Error('Payload isn\'t an object'));
            return {};
        };
        // Decode JWT and get-set payload
        const cPayload = jwt_decode(this.token);
        // Debug
        this.Debug('info', cPayload);
        // Set payload
        this.payload = (typeof cPayload === 'object') ? cPayload : error();
    }

    checkStorage() {
        return (window.localStorage.getItem(this.key)) ? 'localStorage' : 'sessionStorage';
    }

    cleanTokens() {
        window.localStorage.removeItem(this.key);
        window.sessionStorage.removeItem(this.key);
    }

    getPathname() {
        return window.location.pathname;
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
            // map paramaters and add to the correct key
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
    checkHTTP() {
        return new Promise((resolve, reject) => {
            if (typeof this.checker === 'object' && 'url' in this.checker && 'header') {
                // Create a new header
                const headers = new Headers();
                // Map checker object
                Object.keys(this.checker).map(key => {
                    // Key to lower case
                    const foo = key.toLowerCase();
                    // check the key is not reserved
                   if (foo !== 'authorization'
                       && foo !== 'prefix'
                       && foo !== 'body'
                       && foo !== 'method') headers.append(key, this.checker.header[key]);
                });
                // Add to header object
                headers.append('Authorization', `${this.checker.prefix} ${this.token}`);
                // fetch to url
                fetch(this.checker.url, { method: this.checker.method || 'POST', headers, body: this.checker.body || {} })
                    .then(response => {
                        // Return response
                        resolve(response);
                    })
                    .catch(e => reject(e)); // Reject is not valid or something happen with server
            }
            else reject('Checker key not have the correct format or url/header keys not found');
        });
    }

    Debug(type, message) {
        const route = (typeof type === 'string') ? type : 'info';
        if(this.debug) console[route](message);
    }
}

module.exports = WebAuth;
