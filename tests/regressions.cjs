const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { AxiosError } = require('axios');

// Transpile the real modules and replace only browser/application boundaries.
function loadSource(relativePath, mocks) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
        .replace(/import\.meta\.env\.VITE_BACKEND_URL/g, "'http://test.invalid'");
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', outputText)(
        name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
    return module.exports;
}

function client() {
    const storage = new Map();
    global.localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key)
    };
    global.window = { localStorage };
    global.location = { pathname: '/' };
    return loadSource('src/config/axios-customize.ts', {
        '@/redux/store': { store: { dispatch: action => {
            if (action.type === 'logout') localStorage.removeItem('access_token');
        } } },
        '@/redux/slice/accountSlide': {
            setLogoutAction: () => ({ type: 'logout' }),
            setRefreshTokenAction: payload => ({ type: 'refreshError', payload })
        },
        antd: { notification: { error() {} } }
    }).default;
}

function response(config, status, data) {
    return { config, status, data, headers: {}, statusText: String(status) };
}
function unauthorized(config) {
    return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null,
        response(config, 401, { statusCode: 401, message: 'Unauthorized' }));
}

test('concurrent expired requests refresh once and retry with the new access token', async () => {
    const api = client();
    localStorage.setItem('access_token', 'expired');
    let refreshes = 0;
    api.defaults.adapter = async config => {
        if (config.url === '/api/v1/auth/refresh') {
            refreshes++;
            assert.equal(config.headers.Authorization, undefined);
            return response(config, 200, { data: { access_token: 'fresh' } });
        }
        if (config.headers.Authorization !== 'Bearer fresh') throw unauthorized(config);
        return response(config, 200, { statusCode: 200, data: { success: true } });
    };
    const results = await Promise.all(Array.from({ length: 5 }, () => api.get('/protected')));
    assert.equal(refreshes, 1);
    assert.ok(results.every(result => result.data.success));
    assert.equal(localStorage.getItem('access_token'), 'fresh');
});

test('a failed refresh terminates without recursive refresh and logs out', { timeout: 3000 }, async () => {
    const api = client();
    localStorage.setItem('access_token', 'expired');
    let refreshes = 0;
    api.defaults.adapter = async config => {
        if (config.url === '/api/v1/auth/refresh') refreshes++;
        throw unauthorized(config);
    };
    const result = await api.get('/protected');
    assert.equal(result.statusCode, 401);
    assert.equal(refreshes, 1);
    assert.equal(localStorage.getItem('access_token'), null);
});

test('network errors retain the original error and empty deletes expose HTTP 204', async () => {
    const api = client();
    const failure = new Error('Network unavailable');
    api.defaults.adapter = async () => { throw failure; };
    await assert.rejects(api.get('/protected'), error => error === failure);
    api.defaults.adapter = async config => response(config, 204, '');
    const deleted = await api.delete('/api/v1/users/1');
    assert.equal(deleted.statusCode, 204);
});

test('account reducer ends loading on failure and preserves company on successful login', () => {
    const account = loadSource('src/redux/slice/accountSlide.ts', { '@/config/api': { callFetchAccount: async () => ({}) } });
    const initial = account.default(undefined, { type: 'init' });
    const rejected = account.default(initial, { type: 'account/fetchAccount/rejected' });
    assert.equal(rejected.isLoading, false);
    assert.equal(rejected.isAuthenticated, false);
    const empty = account.default(initial, { type: 'account/fetchAccount/fulfilled', payload: undefined });
    assert.equal(empty.isLoading, false);
    const user = { id: '1', name: 'Employee', email: 'user@example.test', role: { name: 'USER' }, company: { id: 2, name: 'Bakery' } };
    const loggedIn = account.default(initial, account.setUserLoginInfo(user));
    assert.equal(loggedIn.user.company.id, 2);
    const fetched = account.default(initial, { type: 'account/fetchAccount/fulfilled', payload: { user } });
    assert.equal(fetched.user.company.name, 'Bakery');
});
