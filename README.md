# Front Authorization Handler

A Javascript frontend authorization tokens handler that works with JWT to check expiration and token transactions with the server.
 
Handle authorization tokens as sessions, based on `accessToken` and `refreshToken`, that will save it in local or session storage, and create an automatic renew when tokens expire and can integrate with request interceptors.

 ![license](https://camo.githubusercontent.com/76d5d2b7f6cb797adf6c30fafa4a2cb2f4390155/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f6d61746961736c6f70657a642f584465627567676572) ![size](https://img.shields.io/bundlephobia/min/@videsk/front-auth-handler) ![sizesrc](https://img.shields.io/github/size/videsk/front-auth-handler/index.js) ![issues](https://img.shields.io/github/issues-raw/videsk/front-auth-handler) ![rank](https://img.shields.io/librariesio/sourcerank/npm/@videsk/front-auth-handler) ![version](https://img.shields.io/npm/v/@videsk/front-auth-handler) ![downloads](https://img.shields.io/npm/dt/@videsk/front-auth-handler) [![DeepScan grade](https://deepscan.io/api/teams/7725/projects/9797/branches/130453/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=7725&pid=9797&bid=130453)

```
Use the latest version! Previous version < 3.0.0 are insecure
and has not been tested.
```

## Features

* Automatic save tokens in session or local storage
* Automatic storage for remember a session or not
* Expiration observer
* Server side validation
* Automatically and manually renew the access token with the refresh token
* Events for expiration, renewed, empty and errors

## Installation

From NPM

`npm i @videsk/front-auth-handler`

Self hosted

`<script src="/dist/web-auth.min.js"></script>`
 
## How to use
For start you need instance `WebAuth`.

```js
const auth = new WebAuth(options);
```

### Options

The class receive one argument as `object`. That object contains the following keys:

```js
const options = { keys, config };
```

**keys**

This key, have the "key name" that will store in local or session storage. By default, are `auth-key` and `auth-key-refresh`, for access and refresh token respectively.

```js
const keys = {
    accessToken: 'auth-key',
    refreshToken: 'auth-key-refresh'
};
```

**config**

In case of config, this key has the major of configuration of WebAuth, so we recommend go to `index.js` [file](https://github.com/videsk/front-auth-handler/blob/master/index.js) and copy the default object.

In previous versions, use server side validation was optional, now from version 3.0.0 is mandatory, so this decision was took by security concerns. Please not send PR or issue requesting that.

### Start to handle

After you pass the options that is optional (but you will work in `http://localhost:3000`, by default) can start to handle with the following code:

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

WebAuth from version 3.0.0 was added events, can help to know when access and refresh token was expired, renewed or something not works.

The available events are:

```js
const events = {
    expired: () => {}, 
    error: () => {}, 
    renewed: () => {}, 
    empty: () => {},
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


### Stop and clean

This two properties allows you to `clean` tokens from storage and `stop` the observer. The `stop` also clean the tokens, so use stop when you want to reactivate observer manually with `.set()`.

```js
// Only clean tokens
auth.clean();
// Stop all and clean tokens
auth.stop();
```

We recommend to use `.stop()` when the user logout from the web app.

### Server side validation

When you start `WebAuth`, try to check validity to the endpoint, in case the server returns an expired response, `WebAuth` will try to get a new one with the refreshToken.

In the `config` key, you will see that the two endpoints have `status` and `attempts`. These keys help to handle the response of the server, so in case of `status = { ok: 200, expired: 401 }` tells to `WebAuth` when the server returns a new one or validate correctly the accessToken. And in case of `attempts` in when the server returns other code that is not specified on the `status` and give the possibility to try again, also when the user does not have Internet connection.

When `WebAuth` detects issues trying to get a response of the server, automatically start to try N times you set on `attempts`, as a number of intervals and factor. That means:

```js
setTimeout(() => recursive(attempts + 1), 1000 * attempts + 1);

// Example with the 3 attempts by default

// First attempt
setTimeout(() => recursive(1), 1000);
// Second attempt
setTimeout(() => recursive(2), 2000);
// Third attempt
setTimeout(() => recursive(3), 3000);
// ...

// So in a period of 6 seconds WebAuth will try to get a ok or expired response from server with 3 attempts
```

In case exceed the attempts the event error will throw, and the tokens will remove from the session or local storage. That behavior is by security reasons, to avoid store tokens without server validation, so you can override calling to method `stop()`.

This is really helpful when user lose connection, also in that cases you can complement with manually Internet connection check, so you can call `stop()` method to avoid `WebAuth` remove tokens. 

## Lifecycle

This is the lifecycle of `WebAuth`, when use accessToken and refreshToken.

```shell
    Instance WebAuth
            ↓
set(accessToken, refreshToken) → observer start → (if empty, no tokens) → fire empty()
            ↓
server side accessToken validate
            ↓                           
    (accessToken expire) → fire expire('accessToken')
            ↓                       
    renew automatically ⇿ (if fails) ← try renew x times → fire error(error)
            ↓
        save tokens → observer start → fire renewed()
            ↓
    refreshToken expire
            ↓
fire expired('refreshToken')
            ↓
  end (here request login)
```

If you don't use a refreshToken, the lifecycle will be like this:

```shell
    Instance WebAuth
            ↓
server side accessToken validate
            ↓
set(accessToken, refreshToken) → observer start → (if empty, no tokens) → fire empty()
            ↓
(accessToken expire) → fire expire('accessToken')
            ↓
           end
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

# Changelog

See changelog [here](https://github.com/videsk/front-auth-handler/blob/master/CHANGELOG.MD).

# License

This library was developed by [Videsk](https://videsk.io) with ♥ license LGPL-2.1. 
