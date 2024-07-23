import('@videsk/window-node-polyfill');
import atob from 'atob';
import chai, {expect} from 'chai';
import chaiHttp from 'chai-http';

global.window.atob = atob;
chai.use(chaiHttp);

import { server, jwt, secretAccessToken, secretRefreshToken } from './server';
import AuthSession from '../src';

const wait = (timeout = 1500) => new Promise(resolve => setTimeout(resolve, timeout));

function randomKeys() {
    const randomString = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return { keys: { accessToken: randomString(), refreshToken: randomString() } }
}

function checkStoreIsEmpty(key, key2) {
    return !(window.localStorage.getItem(key) && window.localStorage.getItem(key2) && window.sessionStorage.getItem(key) && window.sessionStorage.getItem(key2));
}

function checkJWTExpire(auth, jwt) {
    const expired = auth.getExpiration(jwt);
    return expired < new Date().getTime();
}

function generateExpiredTokens(storageKeys, refresh = false, expiresAccessToken = '0.1s', expiresRefreshToken = '3s') {
    const payload = { iat: Math.floor(new Date().getTime() / 1000) };
    const accessToken = jwt.sign(payload, secretAccessToken, { expiresIn: expiresAccessToken });
    const refreshToken = jwt.sign(payload, secretRefreshToken, { expiresIn: expiresRefreshToken });
    window.localStorage.setItem(storageKeys.accessToken, accessToken);
    window.sessionStorage.setItem(storageKeys.accessToken, accessToken);
    if (refresh) window.localStorage.setItem(storageKeys.refreshToken, refreshToken);
    if (refresh) window.sessionStorage.setItem(storageKeys.refreshToken, refreshToken);
    return { accessToken, refreshToken };
}

const randomPort = Math.floor(Math.random() * (9999 - 3001)) + 3000;
const hostname = `http://localhost:${randomPort}`;
const events = ['renew', 'verify', 'expired', 'renewed', 'ready', 'empty', 'logout', 'error'];

if (process.env.DEBUG) window.localStorage.setItem('debug', '*');

function resetStorage() {
    window.localStorage.store = {};
    window.sessionStorage.store = {};
}

describe('Test WebAuth', function () {

    before(function(done) {
        this.app = server.listen(randomPort);
        this.app.once('listening', done);
    });

    after(function (done) {
        this.app.close();
        done();
    });

    beforeEach(function () {
       resetStorage();
    });

    it('Initialize without options', function (done) {
        new AuthSession();
        done();
    });

    it('Get default options', function (done) {
        const { accessTokenStorageKey, refreshTokenStorageKey, maxRetries, retryDelay } = AuthSession.options;
        chai.expect(accessTokenStorageKey).to.be.equal('session-resources-token');
        chai.expect(refreshTokenStorageKey).to.be.equal('session-token');
        chai.expect(maxRetries).to.be.equal(3);
        chai.expect(retryDelay).to.be.equal(500);
    });

    it('Get localStorage for persistent session', function () {
        const session = new AuthSession(true);
        chai.expect(session.storage).to.be.equal('localStorage');
    });

    it('Get sessionStorage for non persistent session', function () {
        const session = new AuthSession();
        chai.expect(session.storage).to.be.equal('sessionStorage');
    });

    it('Get accessToken correctly', function () {
        const session = new AuthSession();
        window.sessionStorage.setItem(AuthSession.options.accessTokenStorageKey, 'my-access');
        chai.expect(session.accessToken).to.be.equal('my-access');
    });

    it('Get refreshToken correctly', async function () {
        const session = new AuthSession();
        window.sessionStorage.setItem(AuthSession.options.refreshTokenStorageKey, 'my-refresh');
        chai.expect(session.refreshToken).to.be.equal('my-refresh');
    });

    it('Set accessToken', async function () {
        const session = new AuthSession();
        session.accessToken = 'my-access';
        chai.expect(session.accessToken).to.be.equal('my-access');
    });

    it('Set refreshToken', async function () {
        const session = new AuthSession();
        session.refreshToken = 'my-refresh';
        chai.expect(session.refreshToken).to.be.equal('my-refresh');
    });

    it('Throw an error when check without token', async function (done) {
        try {
            const session = new AuthSession();
            return session.check();
        } catch (error) {
            done();
        }
    });

    it('Check the accessToken is valid', async function () {
        const session = new AuthSession();
        const status = await session.check();
        chai.expect(status).to.be.equal(true);
    });

    it('Check the accessToken is not valid', async function () {
        const session = new AuthSession();
        session.checker = Promise.reject;
        const status = await session.check();
        chai.expect(status).to.be.equal(false);
    });

    it('Renew the token without', async function (done) {
        try {
            const session = new AuthSession();
            return session.renew();
        } catch (error) {
            done();
        }
    });

    it('Renew the token without', async function () {
        const session = new AuthSession();
        return session.renew();
    });


    it('Login and set accessToken only', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken } = response.body;
        const auth = new WebAuth(randomKeys());
        return new Promise(async resolve => {
            auth.on('verify', () => true);
            auth.on('logout', resolve);
            await auth.set(accessToken);
            auth.logout();
        });
    });

    it('Login and set accessToken and refreshToken', function () {
        return new Promise(async resolve => {
            const response = await chai.request(hostname).get('/login');
            const { accessToken, refreshToken } = response.body;
            const auth = new WebAuth(randomKeys());
            auth.on('verify', () => true);
            auth.on('logout', resolve);
            await auth.set(accessToken, refreshToken);
            auth.logout();
        });
    });

    it('Login, set accessToken and refreshToken, then clean storage', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', () => true);
        await auth.set(accessToken, refreshToken);
        auth.logout();
        chai.expect(window.localStorage.getItem(auth.keys.accessToken)).to.be.equal(undefined);
        chai.expect(window.sessionStorage.getItem(auth.keys.accessToken)).to.be.equal(undefined);
        chai.expect(window.localStorage.getItem(auth.keys.refreshToken)).to.be.equal(undefined);
        chai.expect(window.sessionStorage.getItem(auth.keys.refreshToken)).to.be.equal(undefined);
    });

    it('Login and set accessToken and refreshToken, then check is in sessionStorage', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        const { accessToken: keyAccess, refreshToken: keyRefresh } = auth.keys;
        auth.on('verify', () => true);
        await auth.set(accessToken, refreshToken);
        chai.expect(window.sessionStorage.getItem(keyAccess)).to.be.equal(accessToken);
        chai.expect(window.sessionStorage.getItem(keyRefresh)).to.be.equal(refreshToken);
    });

    it('Login and set accessToken and refreshToken, then check is in localStorage', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        const { accessToken: keyAccess, refreshToken: keyRefresh } = auth.keys;
        auth.on('verify', () => true);
        await auth.login(accessToken, refreshToken, true);
        chai.expect(window.localStorage.getItem(keyAccess)).to.be.equal(accessToken);
        chai.expect(window.localStorage.getItem(keyRefresh)).to.be.equal(refreshToken);
    });

    it('Login and set accessToken and refreshToken, logout and check the store is empty', function () {
        return new Promise(async resolve => {
            const response = await chai.request(hostname).get('/login');
            const { accessToken, refreshToken } = response.body;
            const auth = new WebAuth(randomKeys());
            auth.on('verify', () => true);
            auth.on('logout', () => {
                const { accessToken: key, refreshToken: key2 } = auth.keys;
                chai.expect(auth.running).to.be.equal(false);
                chai.expect(checkStoreIsEmpty(key, key2)).to.be.equal(true);
                resolve();
            });
            await auth.login(accessToken, refreshToken);
            auth.logout();
        });
    });

    it ('Login, set accessToken and refreshToken, then wait to the ready event', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', () => true);
        return new Promise(resolve => {
            auth.on('ready', resolve);
            auth.login(accessToken, refreshToken);
        });
    });

    it('Login, set accessToken and refreshToken, then wait to the ready event when is expired', async function() {
        const response = await chai.request(hostname).get('/login-expired');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', () => true);
        return new Promise(async resolve => {
            await wait();
            auth.on('ready', resolve);
            return auth.login(accessToken, refreshToken);
        });
    }).timeout(5000);

    it('Login and set accessToken and refreshToken, then wait to receive expired accessToken', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', (accessToken) => checkJWTExpire(auth, accessToken));
        auth.on('error', (...args) => console.error(...args));
        return new Promise(async resolve => {
            auth.on('expired', (token) => {
                chai.expect(token).to.be.a('string');
                chai.expect(token).to.equal('accessToken');
                auth.logout();
                resolve();
            });
            await auth.login(accessToken, refreshToken);
        });
    }).timeout(10000);

    it('Login and set accessToken and refreshToken, then wait to get new accessToken', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('renew', async () => {
            const { body } = await chai.request(hostname).get('/login');
            return body.accessToken;
        });
        return new Promise(async resolve => {
            auth.on('renewed', () => {
                auth.logout();
                resolve();
            });
            await auth.login(accessToken, refreshToken);
        });
    }).timeout(5000);

    it('Login and set accessToken and refreshToken, then wait to receive expired refreshToken', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', async () => {
            const response = await chai.request(hostname).get('/check-token');
            return (response.statusCode !== 401);
        });
        auth.on('renew', async () => {
            const { body } = await chai.request(hostname).get('/login');
            return body.accessToken;
        });
        return new Promise(async resolve => {
            auth.on('expired', (token) => {
                if (token === 'accessToken') return;
                chai.expect(token).to.be.a('string');
                chai.expect(token).to.equal('refreshToken');
                auth.logout();
                resolve();
            });
            await auth.login(accessToken, refreshToken);
        });
    }).timeout(15000);

    it('Login and set accessToken and refreshToken, then force renew', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', async () => {
            const response = await chai.request(hostname).get('/check-token');
            return (response.statusCode !== 401);
        });
        auth.on('renew', async () => {
            const { body } = await chai.request(hostname).get('/login');
            return body.accessToken;
        });
        return new Promise(async resolve => {
            auth.on('renewed', () => {
                auth.logout();
                resolve();
            });
            await auth.login(accessToken, refreshToken);
            await auth.renew();
        });
    });

    it('Login, set tokens, clean tokens, login and set tokens again', async function () {
        const login = async () => {
            const response = await chai.request(hostname).get('/login');
            return response.body;
        }
        const login1 = await login();
        const auth = new WebAuth(randomKeys());
        auth.on('verify', () => true);
        auth.on('renew', async () => {
            const { body } = await chai.request(hostname).get('/login');
            return body.accessToken;
        });
        return new Promise(async (resolve) => {
            await auth.set(login1.accessToken, login1.refreshToken);
            auth.logout();
            await wait(3000);
            const login2 = await login();
            auth.on('ready', resolve);
            await auth.login(login2.accessToken, login2.refreshToken);
        });
    }).timeout(5000);

    it('Start with expired accessToken', async function () {
        const login = async () => {
            const response = await chai.request(hostname).get('/login');
            return response.body;
        }
        const login1 = await login();
        const auth = new WebAuth(randomKeys());
        auth.on('verify', () => true);
        return new Promise(async (resolve) => {
            auth.on('expired', token => {
                chai.expect(token).to.be.a('string');
                chai.expect(token).to.equal('accessToken');
                auth.logout();
                resolve();
            });
            await wait(4000);
            await auth.set(login1.accessToken, login1.refreshToken);
        });
    }).timeout(5000);

    it('Start with expired refreshToken', async function () {
        const login = async () => {
            const response = await chai.request(hostname).get('/login');
            return response.body;
        }
        const login1 = await login();
        const auth = new WebAuth(randomKeys());
        auth.on('verify', async () => {
            const response = await chai.request(hostname).get('/check-token');
            return (response.statusCode !== 401);
        });
        return new Promise(async (resolve) => {
            auth.on('expired', token => {
                if (token === 'accessToken') return;
                chai.expect(token).to.be.a('string');
                chai.expect(token).to.equal('refreshToken');
                auth.logout();
                resolve();
            });
            await wait(4000);
            await auth.set(login1.accessToken, login1.refreshToken);
        });
    }).timeout(5000);

    it('Init with expired accessToken on storage, expect expired', async function () {
        const storageKeys = randomKeys();
        const { accessToken } = generateExpiredTokens(storageKeys);
        const auth = new WebAuth(storageKeys);
        return new Promise(async resolve => {
            auth.on('expired', async token => {
                chai.expect(token).to.be.equal('accessToken');
                resolve();
            });
            await wait(100);
            return auth.set(accessToken, null);
        });
    });

    it('Init with expired accessToken on storage, expect to be renewed', async function () {
        const storageKeys = randomKeys();
        const { accessToken, refreshToken } = generateExpiredTokens(storageKeys);
        const auth = new WebAuth(storageKeys);
        auth.on('renew', async () => {
            const { body } = await chai.request(hostname).get('/login');
            return body.accessToken;
        });
        return new Promise(async resolve => {
            auth.on('renewed', () => {
                auth.logout();
                resolve();
            });
            await wait(100);
            return auth.set(accessToken, refreshToken);
        });
    });

    it('Login with expired accessToken and refreshToken on storage, expect ready', async function () {
        const storageKeys = randomKeys();
        const { accessToken, refreshToken } = generateExpiredTokens(storageKeys, true);
        const auth = new WebAuth(storageKeys);
        auth.on('renew', async () => {
            const { body } = await chai.request(hostname).get('/login');
            return body.accessToken;
        });
        auth.on('verify', async () => {
            const response = await chai.request(hostname).get('/check-token');
            return (response.statusCode !== 401);
        });
        return new Promise(async resolve => {
            auth.on('ready', () => {
                auth.logout();
                resolve();
            });
            await wait(100);
            return auth.login(accessToken, refreshToken);
        });
    });

});
