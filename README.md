# Front Authorization Handler
 A Javascript frontend authorization tokens manager/handler that works with JWT.
 
 This library allows you forget manage authorizations tokens, and instantiate a automatic way to manage JWT tokens in localStorage or sessionStorage and many more features.
 
**IMPORTANT: If you not set backend validation, this library try "validate" JWT only checking format and expiration time of token. For secure validation of JWT you need the signature (backend).**

```
From the version 2.0.0 code is totally rebased.
If you use previous versions please check the new changes.
```

## Features

* Automatically manage storage of tokens
* Check and handle storage in every initialization
* Automatically create a expiration checker
* Backend HTTP tokens validation
* Automatically get a new access token with a refresh token
* Custom function for expiration

Also you can access to all functions manually.

 
## How to use
For start you need instance `WebAuth` class.

```js
const auth = new WebAuth({ keys: Object, tokens: Object, remember: Boolean, config: Object, expired: Function });
```


The keys `keys`, `tokens`, `remember`, `config` and `expired` need the follow information:

```js
{
    keys: {
        access: String, // Name set in local or session storage, by default: "auth-key" [Optional]
        refresh: String, // Name set in local or session storage, by default: "auth-key-refresh" [Optional]
    },
    tokens: {
        access: String, //[Mandatory]
        refresh: String, //[Optional]
    },
    remember: Boolean, // This tell to class if save in local or session storage, by default: false
    config: { ... }, // See more info in "Validate JWT in backend" section
    expired: () => {} // This function is executed during an active session and when access token expires and/or refresh token expires/invalidate. By default is a empty function [Optional]
}
```

Now to instance the new manager need initialize.
```js
auth.init().then((result) => {
    // Here do something
    console.log(result);
    // Output: { valid: Boolean, tokens: Object, payloads: Object, pathname: Object }
})
.catch(() => {
    // Is not valid
    // Logout or anything you want
})
```

The object in the result have a pathname key that have the follow information:

```js
{
    pathname: {
        plain: 'https://app.domain.com/page/34234#example?name=example&number=555',
        byLevels: [
            { path: 'page', level: 0 },
            { path: '34234', level: 1 }
        ],
        hash: 'example',
        search: {
            name: 'example',
            number: '555' // All values will be in String!!After you can parse
        }
    }
}
```

## Check JWT when reload page
For check when user reload app only you need is instance without token and `WebAuth` check automatically in localStorage and sessionStorage if exist valid JWT.

**Not forget add `keys` and `config` if you have custom keys, backend validation and refresh token implementation.**

```js
// No custom keys and config
const auth = new WebAuth({});
// With custom keys and config
const auth = new WebAuth({ keys, config });

auth.init().then((result) => {
    // Exist valid JWT
    // Ex: Redirect to result.pathname
})
.catch(() => {
    /// Not exist valid JWT
    //  Ex: Redirect to login or refresh access token
});
```

### Validate JWT in backend
This library not validate JWT only check expiration time and body of token. That mean is very ease change token with DevTools in sessionStorage or localStorage, for that reason we recommend set backend validation with this function.

For validate in your backend only need set key `config` like object with the follow properties:

```js
... = new WebAuth({
    config: {
        url: {
            base: 'https://api.mydomain.com', // Never add '/' to the end
            endpoints: {
                // Check endpoint for check validity of access token
                check: 'validate-access-token',
                // Endpoint for get a new access token with refresh token
                refresh: 'refresh-token' // Example
            },
            keys: {
                access: String, // This is uses for access to object returned in HTTP request
                refresh: String // This is uses for access to object returned in HTTP request
            },
        },
        // Authorization is added automatically.
        // Use prefix for set type of authorization
        headers: {
            Origin: 'https://mydefault.com:80',
        },
        prefix: String, // Prefix of Authorization header. By default is 'Bearer'
        // By default all are POST
        methods: {
            access: String, // Method for validate access token in backend
            refresh: String // Method for validate refresh token in backend
        },
        // Here add custom body for access and refresh HTTP request
        bodies: {
            access: Object || String, // Optional, by default is empty object
            refresh: Object || String, // Optional, by default is empty object
        },
    }
});
```

### Expiration time
When you initialize WebAuth, automatically create a expiration checker with a `setInterval` that check expiration of access token **every 1 second**. If token expires will be executed `expired` function.

But if you set a `refresh token`, so WebAuth try to get a new `access token`. If the server return a 403 error, it runs `expired` function, but if the server returns other error different of 403, WebAuth enter in a loop for try 5 times, before apply a delay of 5 seconds.

This is designed for avoid crash app if the server is not available.

## Key schema
Every initialization returns a object with:

* `valid`: Boolean indicate if access token is valid
* `tokens`: Object with the access and refresh tokens
* `payloads`: Object with JWT payload of access and refresh tokens
* `pathname`: Object with pathname in special format

## Force to clean tokens
If you need clean all tokens like log out, only need execute the follow code line.
```js
auth.cleanTokens();
```
