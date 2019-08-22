# Front Authorization Handler
 A Javascript frontend authorization key handler that works with JWT.
 
 This library allows you do easy way to manage JWT in localStorage or sessionStorage.
 
## How to use
 For start you need instance `WebAuth` class.

```js
const auth = new WebAuth({ token: String, remember: Boolean, debug: Boolean });
```

After to instance the new manager need initialize.
```js
auth.init().then((result) => {
    // Here do something
    console.log(result);
    // Output: { token: String, valid: Boolean, payload: Object, pathname: String, hash: String, search: Object }
})
.catch(() => {
    // Is not valid
})
```

### Check JWT when reload page
For check when user reload app only you need is instance without token and `WebAuth` check automatically in localStorage and sessionStorage if exist valid JWT.

```js
const auth = new WebAuth({});
auth.init().then((result) => {
    // Exist valid JWT
    // Ex: Redirect to result.pathname
})
.catch(() => {
    /// Not exist valid JWT
    //  Ex: Redirect to login or refresh access token
});
```

## Key schema
Every initialization returns a object with:

* `valid`: Boolean indicate is valid or not
* `token`: String is the token validated
* `payload`: Object with payload of valid JWT
* `pathname`: String with pathname when is initialized
* `hash`: String with hash (Only if exist)
* `search`: Object with search parameters (Only if exist)

## Force to clean tokens
If you need clean all token only need execute the follow code line
```js
auth.cleanTokens();
```