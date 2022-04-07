/**
 * Copyright (C) CURRENT_YEAR by Videsk - All Rights Reserved
 * @name LIBRARY_NAME
 * @author Videsk
 * @license LICENSE
 * Written by AUTHOR_LIBRARY
 *
 * DESCRIPTION_LIBRARY
 *
*/

class WebAuth {
    /**
     * Constructor WebAuth
     * @param options {Object} - Options
     * @param options.keys {Object} - Keys name for store in local or session storage
     * @param options.events {Object} - Events
     * @param options.attempts {Number} - Attempts before throw event
     * @param options.delay {Number} - Delay to match JWT expiration
     */
    constructor(options = {}) {
        const { keys, events = {}, attempts = 3, delay = 0 } = options;
        this.keys = this.constructor.getKeys(keys);
        this.events = Object.assign({}, events);
        this.storage = this.constructor.getStorage(this.keys.accessToken);
        this.attempts = attempts;
        this.delay = delay;
        this.version = 'VERSION';
        this.log = this.constructor.debugFromStorage();
        this.running = false;
        this.debug = this.log ? this.constructor.debugWrapper : () => {};
    }

    /**
     * Set event
     * @param name {String} - Name of event
     * @param callback {Function} - Callback will be executed
     * @returns {WebAuth}
     */
    on(name, callback) {
        this.events[name] = callback;
        return this;
    }

    /**
     * Set tokens
     * @param access {String} - Access token
     * @param refresh {String} - Refresh token
     * @param remember {Boolean} - Store in session or local storage
     * @returns {Promise<String|undefined>}
     */
    async set(access = '', refresh = '', remember = false) {
        this.running = true;
        this.storage = remember ? 'localStorage' : 'sessionStorage';
        const { accessToken = access, refreshToken = refresh } = this.getTokens();
        this.debug('log', 'Initializing WebAuth with tokens', accessToken, refreshToken);
        if (!accessToken) return this.fire('empty', accessToken);
        const tokens = [accessToken];
        if (refreshToken) tokens.push(refreshToken);
        this.validate(tokens);
        this.setToken({ accessToken, refreshToken });
        try {
            const isValid = await this.fire('verify', accessToken, refreshToken, this.events.expired, this.events.error);
            this.debug('info', 'The verification of accessToken is', isValid);
            if (!isValid && !refreshToken) return this.fire('expired', 'accessToken');
            if (isValid) this.fire('ready');
            return isValid ? this.observer() : this.renew();
        } catch (error) {
            this.debug('error', 'Error trying to verifying accessToken.', error);
            this.fire('expired', 'accessToken');
            if (refreshToken) return this.renew();
        }
    }

    /**
     * Observe JWT expiration
     * @param attempts {Number} - Number of attempts
     * @returns {NodeJS.Timeout|undefined|Promise<String|undefined>|void}
     */
    observer(attempts = 1) {
        this.debug('log', 'Observer running');
        const { accessToken, refreshToken } = this.getTokens();
        if (!this.running || !accessToken) return this.debug('warn', 'accessToken is expired or WebAuth is not running.');
        const expired = this.constructor.delayedDate(this.delay) > this.getExpiration(accessToken);
        this.debug('log', 'accessToken is expired?', expired);
        if (!expired) return setTimeout(this.observer.bind(this), 1000);
        if (!refreshToken) return this.fire('expired', 'accessToken');
        return this.renew(attempts);
    }

    /**
     * Renew access token
     * @param attempts {Number} - Number of attempts
     * @returns {Promise<NodeJS.Timeout|String|undefined|*>}
     */
    async renew(attempts = 1) {
        this.debug('log', 'Trying to renew accessToken with refreshToken');
        if (attempts === 1) this.fire('expired', 'accessToken');
        const { accessToken, refreshToken} = this.getTokens();
        const expired = new Date().getTime() > this.getExpiration(refreshToken);
        this.debug('log', 'refreshToken is expired?', expired);
        if (expired) return this.fire('expired', 'refreshToken');
        try {
            const newAccessToken = await this.fire('renew', refreshToken, accessToken, this.events.expired, this.events.error);
            if (!newAccessToken) throw new Error('Renewed accessToken is empty, please check.');
            this.debug('info', 'accessToken has renewed', newAccessToken);
            this.setToken('accessToken', newAccessToken);
            this.fire('renewed');
            return this.observer();
        } catch (error) {
            this.debug('error', 'Error trying to renew accessToken', error);
            if (attempts >= this.attempts) return this.fire('error', error);
            this.debug('log', `Re-trying to get a new accessToken for ${attempts}nd time.`);
            setTimeout(this.observer.bind(this), 1000, attempts + 1);
        }
    }

    /**
     * Clean all tokens from storages
     */
    clean() {
        this.debug('log', 'Cleaning store...');
        const keys = Object.keys(this.keys);
        keys.forEach(key => {
            window.localStorage.removeItem(key);
            window.sessionStorage.removeItem(key);
        });
    }

    /**
     * Logout and clean all
     */
    logout() {
        this.debug('log', 'Login out...');
        this.running = false;
        this.clean();
        this.fire('logout');
    }

    /**
     * Validate JWT
     * @param jwt {String|[String]} - JWT
     * @returns {*}
     */
    validate(jwt = '') {
        this.debug('log', 'Validating JWT', jwt);
        const verify = (token) => JSON.parse(window.atob(token.split('.')[1]));
        try {
            if (Array.isArray(jwt)) return jwt.some(token => !verify(token));
            return verify(jwt);
        } catch (error) {
            throw this.fire('error', error);
        }
    }

    /**
     * Get all token or by name
     * @param token {"accessToken"|"refreshToken"=} - Name of token
     * @returns {String|{accessToken: String, refreshToken: String}}
     */
    getTokens(token) {
        const tokens = {
            accessToken: window[this.storage].getItem(this.keys.accessToken) || undefined,
            refreshToken: window[this.storage].getItem(this.keys.refreshToken) || undefined
        };
        this.debug('log', `Getting token from ${this.storage}`, tokens);
        return token ? tokens[token] : tokens;
    }

    /**
     * Store token in the storage
     * @param key {String|Object} - Token name
     * @param value {String} - Token value
     */
    setToken(key = '', value = '') {
        if (typeof key === 'object') return Object.keys(key).forEach(name => this.setToken(name, key[name]));
        this.debug('log', `Saving ${key} on ${this.storage} as ${this.keys[key]}`, value);
        window[this.storage].setItem(this.keys[key], value);
    }

    /**
     * Get token expiration
     * @param jwt {String} - JWT
     * @returns {number}
     */
    getExpiration(jwt) {
        this.debug('log', 'Getting expiration of JWT', jwt);
        const decoded = this.validate(jwt);
        if (typeof decoded !== 'object') throw this.fire('error', new Error('Invalid JWT'), decoded);
        this.debug('log', 'JWT decoded', decoded);
        return ('exp' in decoded) ? decoded.exp * 1000 : Infinity;
    }

    fire(eventName, ...args) {
        this.debug('info', `Firing event ${eventName}`, ...args);
        if (eventName in this.events) return this.events[eventName](...args);
        if (eventName === 'verify' && !(eventName in this.events) && 'error' in this.events) throw this.events.error();
        else if (eventName === 'verify' && !(eventName in this.events) && !('error' in this.events)) throw new Error('Provide a valid verification method.');
    }

    /**
     * Get keys name for storage
     * @param keys
     * @returns {{accessToken: (string|*), refreshToken: (string|*)}}
     */
    static getKeys(keys = {}) {
        return { accessToken: keys.accessToken || 'auth-key', refreshToken: keys.refreshToken || 'auth-key-refresh' }
    }

    /**
     * Get storage
     * @param accessTokenKey {String} - Key on storage
     * @returns {string}
     */
    static getStorage(accessTokenKey) {
        return window.localStorage.getItem(accessTokenKey) ? 'localStorage' : 'sessionStorage';
    }

    /**
     * Get date with minutes of delay
     * @param minutes
     * @returns {Date}
     */
    static delayedDate(minutes = 0) {
        return new Date(new Date().setMinutes(new Date().getMinutes() - minutes));
    }

    static debugWrapper(level = 'log', ...args) {
        const colors = { log: 'gray', info: 'blue', warn: 'yellow', error: 'red' };
        const style = `color: ${colors[level]};`;
        return console.log('%cWebAuth', style, '>', ...args);
    }

    /**
     * Activate debug if is activated by storage
     * @returns {boolean}
     */
    static debugFromStorage() {
        const activators = ['webauth', '*'];
        const value = window.localStorage.getItem('debug') || window.sessionStorage.getItem('debug') || '';
        return activators.includes(value);
    }

}

module.exports = WebAuth;
