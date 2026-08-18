const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
    }

    const params = req.body;
    const sign = params.sign;
    delete params.sign;
    const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + `&key=${process.env.EPAY_KEY}`;
    const calcSign = crypto.createHash('md5').update(signStr).digest('hex');
    if (calcSign !== sign) {
        return res.status(400).send('Sign mismatch');
    }

    if (params.status !== '1') {
        return res.status(200).send('Payment not completed');
    }

    const out_trade_no = params.out_trade_no;
    const match = out_trade_no.match(/PLUX(\d+)/);
    if (!match) {
        return res.status(400).send('Invalid order number');
    }
    const productId = parseInt(match[1]);

    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.REPO_OWNER || 'IceCloudPlux';
    const repoName = process.env.REPO_NAME || 'IceCloudPlux.github.io';
    const branch = 'main';
    const licensePath = '_data/licenses.json';

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${licensePath}?ref=${branch}`;
    let licenseData, sha;
    try {
        const getRes = await axios.get(url, {
            headers: { Authorization: `token ${githubToken}` }
        });
        const content = Buffer.from(getRes.data.content, 'base64').toString('utf-8');
        licenseData = JSON.parse(content);
        sha = getRes.data.sha;
    } catch (e) {
        if (e.response && e.response.status === 404) {
            licenseData = [];
            sha = null;
        } else {
            throw e;
        }
    }

    const plainKey = 'PLUX-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    // 使用 Obscure64 编码（需与前端一致）
    const encodedKey = encodeObscure64(plainKey);

    const newLicense = {
        id: licenseData.length ? Math.max(...licenseData.map(l => l.id)) + 1 : 1,
        license_key: encodedKey,
        product_id: productId,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        max_servers: 1,
        activated_servers: []
    };
    licenseData.push(newLicense);

    const updatePayload = {
        message: `Add license for order ${out_trade_no}`,
        content: Buffer.from(JSON.stringify(licenseData, null, 2)).toString('base64'),
        branch: branch,
        sha: sha
    };
    await axios.put(url, updatePayload, {
        headers: { Authorization: `token ${githubToken}` }
    });

    res.send('success');
};

// 注意：此函数需要在顶部引入 encodeObscure64，但由于云函数环境，我们可在函数内定义。
// 为保持一致性，将 encodeObscure64 复制到函数内（略）
// 实际部署时应将 common.js 中的函数提取到共享模块。
