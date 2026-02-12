class AuthSession extends EventTarget {

  /**
   * Initializes a new instance of the constructor.
   *
   * @param {boolean} [persistent=false] - The flag indicating whether the session should be persistent.
   *
   * @return {void}
   */
  constructor(persistent = false) {
    super();
    this.options = this.constructor.options;
    this.persistent = persistent;
    this.checkerService = Promise.resolve;
    this.renewalService = Promise.resolve;
    this.addEventListener('token:expired', this.renew.bind(this));
  }

  /**
   * Returns the storage type based on the value of the 'persistent' property.
   * @returns {string} The storage type, either 'localStorage' or 'sessionStorage'.
   */
  get storage() {
    return this.persistent ? 'localStorage' : 'sessionStorage';
  }

  /**
   * Retrieves the access token from the specified storage.
   * @returns {*} The access token.
   */
  get accessToken() {
    return window[this.storage].getItem(this.options.accessTokenStorageKey);
  }

  /**
   * Sets the access token in the storage.
   * @param {string} token The access token to be set
   */
  set accessToken(token) {
    window[this.storage].setItem(this.options.accessTokenStorageKey, token);
  }

  /**
   * Refreshes the access token by retrieving it from the storage.
   * @returns {string} The refresh token stored in the storage.
   */
  get refreshToken() {
    return window[this.storage].getItem(this.options.refreshTokenStorageKey);
  }

  /**
   * Sets the refresh token in the storage.
   * @param {string} token The refresh token.
   */
  set refreshToken(token) {
    window[this.storage].setItem(this.options.refreshTokenStorageKey, token);
  }

  /**
   * Returns the tokens for authentication.
   * @returns {Object} The tokens object.
   * @property {string} accessToken - The access token.
   * @property {string} refreshToken - The refresh token.
   */
  get tokens() {
    return { accessToken: this.accessToken, refreshToken: this.refreshToken };
  }

  /**
   * Returns a function that can be used to check a value or a promise for a particular condition.
   * The returned function can be called with either a value or a promise, and will return a promise
   * that resolves to true if the condition is met, and false otherwise.
   * @returns {Function|(() => Promise<void>)|(<T>(value: T) => Promise<Awaited<T>>)|(<T>(value: (PromiseLike<T> | T)) => Promise<Awaited<T>>)}
   *          The checker function
   */
  get checker() {
    return this.checkerService;
  }

  /**
   * Setter method for the checker property.
   * @param {Function|Promise} callback - The callback function or the promise to set as the checker.
   *                                    If a function is provided, it will be used directly.
   *                                    If a promise is provided, it will be resolved and the result will be used.
   */
  set checker(callback) {
    this.checkerService = typeof callback === 'function' ? callback : Promise.resolve;
  }

  /**
   * Retrieves the renewal method.
   * @returns {Function|(() => Promise<void>)|(<T>(value: T) => Promise<Awaited<T>>)|(<T>(value: (PromiseLike<T> | T)) => Promise<Awaited<T>>)}
   *        The renewal method.
   */
  get renewal() {
    return this.renewalService;
  }

  /**
   * Sets the renewal callback function or promise.
   * @param {function|Promise} callback - The callback function or promise to be executed for renewal.
   */
  set renewal(callback) {
    this.renewalService = typeof callback === 'function' ? callback : Promise.resolve;
  }

  /**
   * Checks if the access token is valid by invoking the checker service.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the access token is valid.
   * @throws {Error} If the access token is undefined.
   */
  async check() {
    if (!this.accessToken) throw new Error('The access token is undefined');
    const response = await this.checkerService(this.accessToken, this.refreshToken).catch(e => e);
    if (response instanceof Error) this.expired();
    return !(response instanceof Error);
  }

  /**
   * Renews the access token using the refresh token.
   *
   * @param {number} attempts - The number of attempts made to renew the token.
   * @returns {Promise<NodeJS.Timeout|void>} - A promise that resolves to a timeout or void.
   * @throws {Error} - Throws an error if the refresh token is undefined.
   */
  async renew(attempts = 0) {
    if (!this.refreshToken) throw new Error('The refresh is undefined');
    if (attempts >= this.options.maxRetries) return this.expired();
    const accessToken = await this.renewalService(this.refreshToken, this.accessToken).catch(e => e);
    if (accessToken instanceof Error) return setTimeout(this.renew.bind(this), this.options.retryDelay);
    this.accessToken = accessToken;
    this.dispatchEvent('token:renewed', { detail: this.tokens });
  }

  /**
   * Checks if the token has expired.
   * @return {void}
   */
  expired() {
    const canceled = !this.dispatchEvent('token:expired', { detail: this.tokens });
    if (!canceled) this.purge();
  }

  /**
   * Purges the session by removing the access and refresh tokens from storage and triggering the 'session:purged' event.
   *
   * @returns {void}
   */
  purge() {
    window[this.storage].removeItem(this.options.accessTokenStorageKey);
    window[this.storage].removeItem(this.options.refreshTokenStorageKey);
    this.dispatchEvent('session:purged');
  }

  /**
   * Dispatch a custom event
   * @param eventName {String} Event name
   * @param options {Object=} Options of the event
   * @param options.detail {*} Details of event
   * @param options.composed {Boolean=} Allow transfer the event outside shadow DOM
   * @param options.bubbles {Boolean} Bubble the event through the DOM
   * @param options.cancelable {Boolean} Enable cancel the event or not
   * @returns {boolean}
   */
  dispatchEvent(eventName, options = {}) {
    const event = new CustomEvent(eventName, Object.assign({ bubbles: true, composed: true, cancelable: true }, options));
    return super.dispatchEvent(event);
  }

  /**
   * Retrieves the options for the method.
   *
   * @returns {Object} The options object containing the following properties:
   *          - accessTokenStorageKey: The key used for storing the access token in storage.
   *          - refreshTokenStorageKey: The key used for storing the refresh token in storage.
   *          - maxRetries: The maximum number of retries allowed.
   *          - retryDelay: The delay in milliseconds between retries.
   */
  static get options() {
    return {
      accessTokenStorageKey: 'session-resources-token',
      refreshTokenStorageKey: 'session-token',
      maxRetries: 3,
      retryDelay: 500,
    };
  }

}

export default AuthSession;
