const options = {
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
};

module.exports = options;
