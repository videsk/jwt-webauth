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
    constructor({ key, jwt, debug, remember }) {
        this.token = jwt; // JWT Token
        this.payload = null; // Payload of token
        this.key = key || 'auth-key'; // String of auth-key
        this.debug = debug || false; // By default is false
        this.remember = remember || false; // By default is false
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
                            const obj = { valid, token: this.token, payload: this.payload };
                            if (valid) resolve(obj); // Return valid JWT
                            else this.Debug('warn', obj); // Return debug
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

    Debug(type, message) {
        const route = (typeof type === 'string') ? type : 'info';
        if(this.debug) console[route](message);
    }
}

module.exports = WebAuth;
