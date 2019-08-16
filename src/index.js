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

    init(callback) {
        // Check if exist key in localStorage or sessionStorage
        const cToken = window[this.checkStorage()].getItem(this.key);
        // Save storage token or new token
        this.token = this.token || cToken;
        // Refresh or add token
        this.setup(result => {
            if (result) throw new Error('Token cannot be empty'); // Return error if the token isn't set
            else{
                // Set payload of JWT
                this.setPayload();
                // Check the expiration of JWT
                this.checkExpiration(result => {
                    if (result && typeof callback === 'function') callback({ valid: true, token: this.token, payload: this.payload }); // Return valid JWT
                    else if(typeof callback === 'function') callback({ valid: false, token: this.token, payload: this.payload }); // Return invalid JWT
                    else this.Debug('info', { valid: false, token: this.token, payload: this.payload }); // Return debug
                });
            }
        });
    }

    setup(callback) {
        // Default value for response on callback
        let response = false;
        // Save JWT in dynamic route
        const route = (this.remember) ? 'localStorage' : 'sessionStorage';
        // Remove all others JWT storage
        this.cleanTokens();
        // Refresh or save in dynamic route
        if (this.token) window[route].setItem(this.key, this.token);
        else response = true;
        // Execute callback
        if (typeof callback === 'function') callback(response);
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
};

module.exports = WebAuth;
