// ============================================================
// 配置（请修改为你自己的仓库信息）
// ============================================================
const REPO_OWNER = 'IceCloudPlux';
const REPO_NAME = 'IceCloudPlux-Website';  // ⚠️ 注意这里改成你的仓库名
const BRANCH = 'main';
const DATA_PATH = '_data';
const OBSCURE_SALT = 'SALT_';

function encodeObscure64(str) {
    const salted = OBSCURE_SALT + str + '_' + OBSCURE_SALT;
    let encoded = btoa(unescape(encodeURIComponent(salted)));
    encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return encoded;
}

function decodeObscure64(encoded) {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    try {
        const decoded = decodeURIComponent(escape(atob(base64)));
        if (decoded.startsWith(OBSCURE_SALT) && decoded.endsWith('_' + OBSCURE_SALT)) {
            return decoded.slice(OBSCURE_SALT.length, -(OBSCURE_SALT.length + 1));
        }
        return decoded;
    } catch (e) {
        return null;
    }
}

// ============================================================
// GitHub API 函数（修复版）
// ============================================================
async function getFileContent(path, token = '') {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`;
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `token ${token}`;

    try {
        const res = await fetch(url, { headers });
        const text = await res.text();
        console.log(`[getFileContent] ${path} 状态码: ${res.status}`);

        // 检查是否为有效 JSON
        if (!text.startsWith('{') && !text.startsWith('[')) {
            const match = text.match(/<title>(.*?)<\/title>/);
            const title = match ? match[1] : '响应不是 JSON';
            throw new Error(`${title} (HTTP ${res.status})`);
        }

        const data = JSON.parse(text);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

        const content = atob(data.content.replace(/\s/g, ''));
        return { content: JSON.parse(content), sha: data.sha };
    } catch (err) {
        console.error(`[getFileContent] 获取 ${path} 失败:`, err);
        throw err;
    }
}

async function saveFileContent(path, data, token, message = '更新数据', sha = null) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const payload = {
        message: message,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
        branch: BRANCH
    };
    if (sha) payload.sha = sha;

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '保存失败');
    }
    return await res.json();
}

async function loadData(fileName, token = '') {
    const path = `${DATA_PATH}/${fileName}.json`;
    try {
        const result = await getFileContent(path, token);
        if (result) return result.content;
        return [];
    } catch (e) {
        if (e.message && e.message.includes('404')) {
            return [];
        }
        throw e;
    }
}

async function saveData(fileName, data, token, message) {
    const path = `${DATA_PATH}/${fileName}.json`;
    let sha = null;
    try {
        const existing = await getFileContent(path, token);
        if (existing) sha = existing.sha;
    } catch (e) { /* ignore */ }
    return await saveFileContent(path, data, token, message, sha);
}

// ============================================================
// 主题切换与导航栏
// ============================================================
function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
}

// ============================================================
// Token 管理
// ============================================================
function getToken() {
    return localStorage.getItem('gh_token') || '';
}

function setToken(token) {
    localStorage.setItem('gh_token', token);
}

function clearToken() {
    localStorage.removeItem('gh_token');
}

// ============================================================
// 导出全局
// ============================================================
window.REPO_OWNER = REPO_OWNER;
window.REPO_NAME = REPO_NAME;
window.BRANCH = BRANCH;
window.DATA_PATH = DATA_PATH;
window.loadData = loadData;
window.saveData = saveData;
window.getFileContent = getFileContent;
window.saveFileContent = saveFileContent;
window.encodeObscure64 = encodeObscure64;
window.decodeObscure64 = decodeObscure64;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.initNavbarScroll = initNavbarScroll;
window.getToken = getToken;
window.setToken = setToken;
window.clearToken = clearToken;
