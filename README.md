# JWT WebAuth

A Javascript frontend authorization tokens handler that works with JWT to check expiration and token transactions with the server.
 
Handle authorization tokens as sessions, based on `accessToken` and `refreshToken`, that will save it in local or session storage, and create an automatic renew when tokens expire and can integrate with request interceptors.

[![Test Coverage](https://api.codeclimate.com/v1/badges/77b2345715c0e444b9bf/test_coverage)](https://codeclimate.com/github/videsk/jwt-webauth/test_coverage) [![Maintainability](https://api.codeclimate.com/v1/badges/77b2345715c0e444b9bf/maintainability)](https://codeclimate.com/github/videsk/jwt-webauth/maintainability) ![license](https://camo.githubusercontent.com/76d5d2b7f6cb797adf6c30fafa4a2cb2f4390155/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f6d61746961736c6f70657a642f584465627567676572) ![size](https://img.shields.io/bundlephobia/min/@videsk/jwt-webauth) ![sizesrc](https://img.shields.io/github/size/videsk/jwt-webauth/index.js) ![issues](https://img.shields.io/github/issues-raw/videsk/jwt-webauth) ![rank](https://img.shields.io/librariesio/sourcerank/npm/@videsk/jwt-webauth) ![version](https://img.shields.io/npm/v/@videsk/jwt-webauth) ![downloads](https://img.shields.io/npm/dt/@videsk/jwt-webauth) [![DeepScan grade](https://deepscan.io/api/teams/7725/projects/20720/branches/573138/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=7725&pid=20720&bid=573138)

```
BREAK CHANGE!
We release new version with the name jwt-webauth, previous version is deprecated.
```

## Features

* Automatic save tokens in session or local storage
* Automatic storage for remember a session or not
* Expiration observer
* Server-side validation
* Automatically and manually renew the access token with the refresh token
* Events for expiration, renewed, empty and errors
* Compatibility with native fetch API or any HTTP library

## Installation

From NPM

`npm i @videsk/jwt-webauth`

Self-hosted

`<script src="/dist/jwt-webauth.min.js"></script>`
 
## How to use
For start, you need instance `WebAuth`.

```js
const auth = new WebAuth(options);
```

### Options

The class receive one argument as `object`. That object contains the following keys:

```js
const { keys, events, attempts, delay } = options;
```

**keys** (optional)

This key, have the "key name" that will store in local or session storage. By default, are `auth-key` and `auth-key-refresh`, for access and refresh token respectively.

```js
const keys = {
    accessToken: 'auth-key',
    refreshToken: 'auth-key-refresh'
};
```

**events** (optional)

Set event callbacks by `object`

**attempts** (optional)

Number of attempts before throw error.

**delay**

Minutes to subtract to JWT expiration to consider is expired. Example: 5 min before expire to force renew.

## Init

```js
// Set empty, auto handle existing saved tokens
auth.set();
// Set with accessToken only
auth.set(accessToken);
// Set with accessToken and refreshToken
auth.set(accessToken, refreshToken);
// Also can set if you want "remember session"
auth.set(accessToken, refreshToken, true);
```

This automatically start to observe the expiration of access and/or refresh token. Also check validity of access token by the server and when expire automatically will try to get a new one, only if you set a refresh token.

### Force renew

This property allows you to force renew the access token with the refresh token, so this is relevant when you integrate with interceptors. In case a request returns `401 Unauthorized` (typically token expire or blacklisted) you can force renew.

```js
auth.renew();
```

This is very useful not only when user do a request, seconds before the observer can check that access token was expired, also when access and/or refresh token was invalidated by the server in a blacklist by security reasons (ex. password reset).

So, is important use it directly in your interceptors when you know that access token was expired, blacklisted or invalidated by the server.

### Events

WebAuth require as mandatory a few events for `verify` and `renew` access token.

The mandatory event is `verify` to check server-side validation. If is not present will throw an error.

In case you can to use refresh token needs to set the `renew` event. Otherwise, if refresh token is present will throw an error.

**Read more about server-side validation in the next section.**

The other available events are:

```js
const events = {
    expired: () => {},
    error: () => {},
    renewed: () => {},
    empty: () => {},
    ready: () => {},
};
```

To set them, you can do it with this elegant way:

```js
auth.on('name-event', callback);

// Example
auth.on('expired', function () {
    // Do something
});

// Or less elegant
auth.events.expired = () => {
    // Do something
};
```
Remember that both method will override the default empty function. So, define a callback per event only one time on your code.

In case of `expired` event, returns the name of token was expired that will be `accessToken` or `refreshToken`. So, you can difference like this:

```js
auth.on('expired', function (tokenName) {
    if (tokenName === 'accessToken') return; // Set function when not use refreshToken
    // Is refreshToken
    logoutUser();
});
```

The `ready` events is useful to set in the base of HTML or template app to know when the accessToken is valid or was renewed. Example:

```js
auth.on('ready', function() {
    // The accessToken and/or refreshToken are valid
    // Or accessToken is expired, WebAuth will try to renew, then if the renovation is successful the event will be triggered
});
```

So, is recommended to add the `ready` event to the base of the app. With that, you can ensure that `ready` event will be triggered only if accessToken and/or refreshToken are being valid. Inclusive if was valid from the first time the app was loaded or need to be renewed. Both cases ensure that the app can load with valid accessToken.

### Stop and clean

This two properties allows you to `clean` tokens from storage and `logout` the observer. The `logout` also clean the tokens, so use stop when you want to reactivate observer manually with `.set()`.

```js
// Only clean tokens
auth.clean();
// Stop all and clean tokens
auth.logout();
```

We recommend to use `.logout()` when the user logout from the web app.

### Server side validation

When you start `WebAuth`, will try to check validity executing `verify` event, in case the event return false will be considered as expired otherwise is valid. `WebAuth` will try to get a new access token, executing the `renew` event only if refresh token is present.

If `renew` throw an error, `WebAuth` will try the number of attempts to set on `options`, which by default is 3.

```js
const auth = new WebAuth();

auth.on('verify', async () => {
    const response = await fetch('.../verify');
    const output = await response.json();
    return output.isValid;
});

auth.on('renew', async () => {
    const response = await fetch('.../renew');
    const output = await response.json();
    return output.accessToken;
});
```

In case exceed the attempts, the event error will throw, and the tokens will remove from the session or local storage. That behavior is by security reasons, to avoid store tokens without server validation.

This is really helpful when user lose connection, also in that cases you can complement with manually Internet connection check, so you can call `logout()` method to avoid `WebAuth` remove tokens. 

## Lifecycle

This is the lifecycle of `WebAuth`, when use accessToken and refreshToken.

```shell
    Instance WebAuth
            ↓
set(accessToken, refreshToken) → observer start → (if empty, no tokens) → fire empty()
            ↓
    fire verify event
            ↓                           
    (accessToken expire) → fire expire('accessToken')
            ↓                       
    fire renew event ⇿ (if fails) ← try renew x times → fire error(error)
            ↓
        save tokens → observer start → fire renewed()
            ↓
    refreshToken expire
            ↓
fire expired('refreshToken')
            ↓
  end (here request login) → fire logout event
```

If you don't use a refreshToken, the lifecycle will be like this:

```shell
    Instance WebAuth
            ↓
    fire verify event
            ↓
set(accessToken, refreshToken) → observer start → (if empty, no tokens) → fire empty()
            ↓
(accessToken expire) → fire expire('accessToken')
            ↓
           end → fire logout evet
```

# Debugging

We recommend to use event `error` to check all issues with server side validations. This library was tested so should not throw unhandled errors related to observer.

```js
// Development environment
auth.on('error', function (error) {
    debugger;
    console.log(error);
});

// Production
auth.on('error', function (error) {
    // Here can integrate with error monitoring like Sentry
});
```

We strongly recommend use `error` event with error monitoring like Sentry, Bugsnag, LogRocket, etc. The cases when error event should be fired are a malformed JWT and server error response.

# Testing

This library was tested with `Mocha`, `chai` and `chai-http`. Also was created a polyfill of `window` to test with `localStorage` and `sessionStorage` in Node, [check here](https://github.com/videsk/window-node-polyfill).

For coverage was used `nyc`.

# License

This library was developed by [Videsk](https://videsk.io) with ♥ license LGPL-2.1. 
