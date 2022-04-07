require('@videsk/window-node-polyfill');
global.window.atob = require('atob');
global.fetch = require('node-fetch');
const chai = require('chai'), chaiHttp = require('chai-http');
chai.use(chaiHttp);

const { server } = require('./server');

const WebAuth = require('../src');

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

const randomPort = Math.floor(Math.random() * (9999 - 3001)) + 3000;
const hostname = `http://localhost:${randomPort}`;
const events = ['renew', 'verify', 'expired', 'renewed', 'ready', 'empty', 'logout', 'error'];

if (process.env.DEBUG) window.localStorage.setItem('debug', '*');

describe('Test WebAuth', function () {

    before(function(done) {
        this.app = server.listen(randomPort);
        this.app.once('listening', done);
    });

    after(function (done) {
        this.app.close();
        done();
    });

    it('Initialize without options', function () {
        new WebAuth(randomKeys());
    });

    it('Set event', function () {
        const auth = new WebAuth(randomKeys());
        auth.on('empty', () => {});
        chai.expect(auth.events.empty).to.be.a('function');
    });

    it('Set events', function (done) {
        const auth = new WebAuth(randomKeys());
        events.forEach(event => {
            auth.on(event, 'test');
            chai.expect(auth.events[event]).to.be.equal('test');
        });
        done();
    });

    it('Empty set', function (done) {
        const auth = new WebAuth(randomKeys());
        auth.on('empty', done);
        auth.set();
    });

    it('Instance and logout', function () {
        const auth = new WebAuth(randomKeys());
        auth.set();
        auth.logout();
        chai.expect(auth.running).to.be.equal(false);
    });

    it('Handle with manually observer init', function () {
        const auth = new WebAuth(randomKeys());
        return auth.observer();
    });

    it('Got an error with invalid JWT', function () {
        const auth = new WebAuth(randomKeys());
        return new Promise(resolve => {
            auth.on('error', resolve);
            auth.set('invalidJWT', 'invalidJWT');
        });
    });

    it('Start observer', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', () => true);
        return auth.set(accessToken);
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
        await auth.set(accessToken, refreshToken, true);
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
            await auth.set(accessToken, refreshToken);
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
            auth.set(accessToken, refreshToken);
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
            return auth.set(accessToken, refreshToken);
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
            await auth.set(accessToken, refreshToken);
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
            await auth.set(accessToken, refreshToken);
        });
    }).timeout(5000);

    it('Login and set accessToken and refreshToken, then wait to receive expired refreshToken', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        return new Promise(async resolve => {
            auth.on('expired', (token) => {
                if (token === 'accessToken') return;
                chai.expect(token).to.be.a('string');
                chai.expect(token).to.equal('refreshToken');
                auth.logout();
                resolve();
            });
            await auth.set(accessToken, refreshToken);
        });
    }).timeout(15000);

    it('Login and set accessToken and refreshToken, then force renew', async function () {
        const response = await chai.request(hostname).get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth(randomKeys());
        auth.on('verify', async () => {
            const response = await chai.request(hostname).get('/check-token').catch(e => e);
            return !(response instanceof Error);
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
            await auth.set(accessToken, refreshToken);
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
            await auth.set(login2.accessToken, login2.refreshToken);
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
            const response = await chai.request(hostname).get('/check-token').catch(e => e);
            return !(response instanceof Error);
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

});
