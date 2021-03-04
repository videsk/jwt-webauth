# Examples

Here you can check examples using WebAuth.

**Remember you will need one or two endpoints. In case only want works with accessToken you need pass the endpoint to check validity of token, in case works with both access and refresh you need pass check and refresh endpoints.**

## Using access and refresh tokens

This example is the common of cases of web app like dashboard.

```js
/**
 * This will go in main html, vue, svelte, react or angular page,
 * like footer, header, App.vue, App.svelte, App.js, app.component.html, etc.
 */

const options = {
  config: {
      endpoints: {
          hostname: 'https://api.supersaas.com/', 
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
          }
      }
  }
};

// Instance WebAuth
const auth = new WebAuth(options);
// Start without token
auth.set();
// This will fire empty event
auth.on('empty', function() {
    // It's ok, we will pass tokens in login
});


// Now in login page
const { accessToken, refreshToken } = await login(user, password);
auth.set(accessToken, refreshToken, getRememberFromCheckbox());
```

So, instancing in the main page where your `WebAuth` instance can be accesible to other pages, `WebAuth` can easily handle the tokens as a session.

In case the user want logout before tokens expire, you need stop or clean tokens:

```js
async function logout() {
    await serverLogout(); // Invalidate tokens!
    auth.stop();
}
```

## Using only accessToken

This example is not recommended for a dashboard, you can use it in apps with one time access.

**Remember by security reasons the accessToken need expire soon, so not set expiration more than 24 hours.**

```js
/**
 * This will go in main html, vue, svelte, react or angular page,
 * like footer, header, App.vue, App.svelte, App.js, app.component.html, etc.
 */

const options = {
  config: {
      endpoints: {
          hostname: 'https://api.supersaas.com/', 
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
          }
      }
  }
};

// Example how get accessToken
const accessToken = new URLSearchParams(window.location.search).get('accessToken');

// Instance WebAuth
const auth = new WebAuth(options);
// Start with accessToken
auth.set(accessToken);
// When expire
auth.on('expire', function () {
    // Do something
});
```
