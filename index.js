const { version } = require('./package.json');

class WebAuth {

    constructor(options = {}) {
        const {
            keys = { accessToken: 'auth-key', refreshToken: 'auth-key-refresh' },
            config = {
                endpoints: {
                    hostname: 'http://localhost:3000/',
                    accessToken: {
                        url: 'check-token',
                        method: 'GET',
                        authorizationType: 'Bearer',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {},
                        keys: {
                            accessToken: 'accessToken',
                            refreshToken: 'refreshToken',
                        },
                        status: {
                            expired: 401,
                            ok: 200,
                        },
                        attempts: 3
                    },
                    refreshToken: {
                        url: 'refresh-token',
                        method: 'POST',
                        authorizationType: 'Bearer',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {},
                        keys: {
                            accessToken: 'accessToken',
                            refreshToken: 'refreshToken',
                        },
                        status: {
                            expired: 401,
                            ok: 201,
                        },
                        attempts: 3
                    },
                },
            },
        } = options;

        this.keys = keys;
        this.events = {
            expired: () => {},
            error: () => {},
            renewed: () => {},
            empty: () => {},
            load: () => {},
        };
        this.config = config;
        this.storage = (window.localStorage.getItem(this.keys.accessToken)) ? 'localStorage' : 'sessionStorage';

        this._expirationAccessToken = null;
        this._expirationRefreshToken = null;
        this._stop = false;
        this.version = version;
        this._load = false;
    }

    /**
     * Set WebAuth and start observer
     * @param access {String=} - accessToken
     * @param refresh {String=} - refreshToken
     * @param remember {Boolean=} - Save in session or local storage
     * @returns {Promise<*|undefined>}
     */
    async set(access = '', refresh = '', remember) {
        if (typeof remember === 'boolean') this.storage = remember ? 'localStorage' : 'sessionStorage';
        const { accessToken = access, refreshToken = refresh } = this.constructor.getTokens(this.storage, this.keys);
        if (!accessToken) return this.events.empty();
        // Save expiration
        try {
            this._expirationAccessToken = this.constructor.getExpirationToken(accessToken);
            if (refreshToken) this._expirationRefreshToken = this.constructor.getExpirationToken(refreshToken);
        } catch (e) {
            return this.events.error(e);
        }
        this.constructor.saveTokens(this.storage, this.keys, accessToken, refreshToken);

        try {
            await this.askServer();
            return this.observer();
        } catch (e) {
            if (e instanceof Error) return this.events.error(e);
            this.events.expired('accessToken');
            return this.renew();
        }
    }

    /**
     * Set event
     * @param event
     * @param callback
     */
    on(event = '', callback = () => {}) {
        this.events[event] = callback;
    }

    /**
     * Clean tokens from storage
     */
    clean() {
        // Remove from localStorage
        window.localStorage.removeItem(this.keys.accessToken);
        window.localStorage.removeItem(this.keys.refreshToken);
        // Remove from sessionStorage
        window.sessionStorage.removeItem(this.keys.accessToken);
        window.sessionStorage.removeItem(this.keys.refreshToken);
    }

    /**
     * Start expiration tokens observer
     * @returns {Promise<*|undefined>|NodeJS.Timeout|*}
     */
    observer(attempts = 1) {
        if (this._stop || !this._expirationAccessToken) return;
        const isAccessTokenExpired = new Date().getTime() > this._expirationAccessToken;
        if (!isAccessTokenExpired && !this._load) {
            this._load = true;
            this.events.load();
        }
        if (!isAccessTokenExpired) return setTimeout(() => this.observer(), 1000);
        if (attempts < 2) this.events.expired('accessToken');
        if (!this._expirationRefreshToken) return;
        // Try to get new refreshToken
        return this.renew(attempts);
    }

    /**
     * Force renew accessToken
     * @returns {Promise<*|undefined|NodeJS.Timeout>}
     */
    async renew(attempts = 1) {
        // Check refreshToken was not expired
        const isRefreshTokenExpired = new Date().getTime() > this._expirationRefreshToken;
        if (isRefreshTokenExpired) return this.events.expired('refreshToken');

        const { refreshToken: config } = this.config.endpoints;
        const { refreshToken } = this.constructor.getTokens(this.storage, this.keys);
        try {
            const { accessToken } = config.keys;
            const response = await this.askServer('refreshToken');
            this.constructor.saveTokens(this.storage, this.keys, response[accessToken], refreshToken);
            this._expirationAccessToken = this.constructor.getExpirationToken(response[accessToken]);
            this._expirationRefreshToken = this.constructor.getExpirationToken(refreshToken);
            this.events.renewed();
            return this.observer();
        } catch (e) {
            if (!(e instanceof Error)) return; // Only if was expired
            if (attempts >= config.attempts) return this.events.error(e);
            setTimeout(() => this.observer(attempts + 1), 1000 * (attempts + 1));
        }
    }

    /**
     * Send to server request to check or renew access token
     * @param tokenName {String} - Could be accessToken or refreshToken
     * @returns {Promise<any>}
     */
    async askServer(tokenName = 'accessToken') {
        if (this._stop) return;
        const {url, body, headers, method, authorizationType, keys, status} = this.config.endpoints[tokenName];
        // Create payload
        const tokens = this.constructor.getTokens(this.storage, this.keys);
        const xHeaders = Object.assign(headers, {Authorization: `${authorizationType} ${tokens[tokenName]}`});
        const xBody = Object.assign(body, { [keys[tokenName]]: tokens[tokenName] });
        // Send request
        const fullURL = `${this.config.endpoints.hostname}${url}`;
        const payload = { method, headers: xHeaders };
        if (['post', 'patch', 'put'].includes(method.toLowerCase())) payload.body = JSON.stringify(xBody);
        const response = await fetch(fullURL, payload);
        if (response.status === status.ok) return response.json();
        if (response.status !== status.expired && response instanceof Error) throw response;
        // Clean store and fire expired event
        throw this.events.expired(tokenName);
    }

    /**
     * Stop observer and clean tokens
     * @param value
     */
    stop(value = true) {
        this._stop = value;
        this._load = false;
        this.clean();
    }

    /**
     * Get tokens from storage
     * @param storage {String} - Session or local storage
     * @param keys {Object} - Key names of storage
     * @returns {{accessToken: *, refreshToken: *}}
     */
    static getTokens(storage = 'sessionStorage', keys = {}) {
        const accessToken = window[storage].getItem(keys.accessToken);
        const refreshToken = window[storage].getItem(keys.refreshToken);
        return (accessToken || refreshToken) ? { accessToken, refreshToken } : {};
    }

    /**
     * Save tokens in storage
     * @param storage {String} - Name of storage
     * @param keys {Object} - Key names of storage
     * @param accessToken {String} - JWT access
     * @param refreshToken {String} - JWT refresh
     */
    static saveTokens(storage = 'sessionStorage', keys = {}, accessToken = '', refreshToken = '') {
        window[storage].setItem(keys.accessToken, accessToken);
        window[storage].setItem(keys.refreshToken, refreshToken);
    }

    /**
     * Get expiration of JWT
     * @param JWT {String} - Valid JWT
     * @returns {number|number}
     */
    static getExpirationToken(JWT = '') {
        const decoded = JSON.parse(atob(JWT.split('.')[1]));
        if (typeof decoded !== 'object') throw new Error('Invalid JWT, please check.');
        return ('exp' in decoded) ? decoded.exp * 1000 : Infinity;
    }

    /**
     * Get the name of storage based on tokens existence
     * @param key
     * @returns {string} - Key name want search in storage
     */
    static getStorage(key = '') {
        return (window.localStorage.getItem(key)) ? 'localStorage' : 'sessionStorage';
    }
}

if (typeof define === 'function' && define.amd) {
    define('WebAuth', [], function() {
        return WebAuth;
    });
}

if (typeof module !== 'undefined') {
    module.exports = WebAuth;
}
