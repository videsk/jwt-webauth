require('@videsk/window-node-polyfill');
global.atob = require('atob');
global.fetch = require('node-fetch');
const chai = require('chai'), chaiHttp = require('chai-http');
chai.use(chaiHttp);

const { server } = require('./server');

const WebAuth = require('../index');

const wait = (timeout = 1500) => new Promise(resolve => setTimeout(resolve, timeout));


describe('Test WebAuth', function () {

    before(function(done) {
        this.app = server.listen(3000);
        this.app.once('listening', done);
    });

    after(function (done) {
        this.app.close();
        done();
    });

    it('Initialize without options', function () {
        new WebAuth();
    });

    it('Set event', function () {
        const auth = new WebAuth();
        auth.on('empty', () => {});
        chai.expect(auth.events.empty).to.be.a('function');
    });

    it('Empty set', function (done) {
        const auth = new WebAuth();
        auth.on('empty', done);
        auth.set();
    });

    it('Instance and logout with wrapper', function () {
        const auth = new WebAuth();
        auth.set();
        auth.stop();
        chai.expect(auth._stop).to.be.equal(true);
        chai.expect(auth._load).to.be.equal(false);
    });

    it('Handle with manually observer init', function () {
        const auth = new WebAuth();
        return auth.observer();
    });

    it('Got an error with invalid JWT', function (done) {
        const auth = new WebAuth();
        auth.on('error', () => {
            done();
        });
        auth.set('invalidJWT', 'invalidJWT');
    });

    it ('Login and set accessToken only', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken } = response.body;
        const auth = new WebAuth();
        await auth.set(accessToken);
        auth.logout();
    });

    it('Login and set accessToken and refreshToken', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
        await auth.set(accessToken, refreshToken);
        auth.logout();
    });

    it('Login and set accessToken and refreshToken, then logout', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
        await auth.set(accessToken, refreshToken);
        auth.logout();
        const tokens = auth.constructor.getTokens(auth.storage, auth.keys);
        chai.expect(auth._stop).to.be.equal(true);
        chai.expect(auth._load).to.be.equal(false);
        chai.expect(tokens.accessToken).to.be.equal(undefined);
        chai.expect(tokens.refreshToken).to.be.equal(undefined);

    });

    it('Login, set accessToken and refreshToken, then wait to the load event', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
        return new Promise(resolve => {
            auth.on('load', function () {
                auth.logout();
                resolve();
            });
            auth.set(accessToken, refreshToken);
        });
    }).timeout(5000);

    it('Login, set accessToken and refreshToken, then wait to the load event when is expired', async function () {
        const response = await chai.request('http://localhost:3000').get('/login-expired');
        const { accessToken, refreshToken } = response.body;
        await wait();
        const auth = new WebAuth();
        return new Promise(resolve => {
            auth.on('load', function () {
                auth.logout();
                resolve();
            });
            auth.set(accessToken, refreshToken);
        });
    }).timeout(5000);

    it('Login and set accessToken and refreshToken, then check is in sessionStorage', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
        await auth.set(accessToken, refreshToken);
        chai.expect(window.sessionStorage.getItem('auth-key')).to.be.a('string');
        chai.expect(window.sessionStorage.getItem('auth-key-refresh')).to.be.a('string');
        auth.logout();
    });

    it('Login and set accessToken and refreshToken, then check is in localStorage', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
        await auth.set(accessToken, refreshToken, true);
        chai.expect(window.localStorage.getItem('auth-key')).to.be.a('string');
        chai.expect(window.localStorage.getItem('auth-key-refresh')).to.be.a('string');
        auth.logout();
    });

    it('Login and set accessToken and refreshToken, then wait to receive expired accessToken', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
        return new Promise(async resolve => {
            auth.on('expired', (token) => {
                chai.expect(token).to.be.a('string');
                chai.expect(token).to.equal('accessToken');
                auth.logout();
                resolve();
            });
            await auth.set(accessToken, refreshToken);
        });
    }).timeout(5000);

    it('Login and set accessToken and refreshToken, then wait to get new accessToken', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
        return new Promise(async resolve => {
            auth.on('renewed', () => {
                auth.logout();
                resolve();
            });
            await auth.set(accessToken, refreshToken);
        });
    }).timeout(5000);

    it('Login and set accessToken and refreshToken, then wait to receive expired refreshToken', async function () {
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
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
        const response = await chai.request('http://localhost:3000').get('/login');
        const { accessToken, refreshToken } = response.body;
        const auth = new WebAuth();
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
            const response = await chai.request('http://localhost:3000').get('/login');
            return response.body;
        }
        const login1 = await login();
        const auth = new WebAuth();
        return new Promise(async (resolve, reject) => {
            auth.on('error', reject);
            auth.on('expired', reject);
            await auth.set(login1.accessToken, login1.refreshToken);
            auth.logout();
            auth.on('load', resolve);
            await wait(3000);
            const login2 = await login();
            await auth.set(login2.accessToken, login2.refreshToken);
        });
    });

});
