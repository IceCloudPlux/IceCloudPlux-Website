const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { productId } = req.body;
    if (!productId) {
        return res.status(400).json({ error: 'Missing productId' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Missing GitHub token' });
    }

    const repoOwner = process.env.REPO_OWNER || 'IceCloudPlux';
    const repoName = process.env.REPO_NAME || 'IceCloudPlux.github.io';
    const productsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/_data/products.json`;

    try {
        const prodRes = await axios.get(productsUrl, {
            headers: { Authorization: `token ${token}` }
        });
        const content = Buffer.from(prodRes.data.content, 'base64').toString('utf-8');
        const products = JSON.parse(content);
        const product = products.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const out_trade_no = 'PLUX' + productId + Date.now() + Math.floor(Math.random() * 1000);

        const params = {
            pid: process.env.EPAY_PID,
            type: 'alipay',
            out_trade_no,
            notify_url: process.env.NOTIFY_URL,
            return_url: process.env.RETURN_URL,
            name: product.name,
            money: product.price.toFixed(2),
            sitename: 'IceCloud & Plux'
        };
        const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + `&key=${process.env.EPAY_KEY}`;
        params.sign = crypto.createHash('md5').update(signStr).digest('hex');
        params.sign_type = 'MD5';

        const epayRes = await axios.post(process.env.EPAY_API_URL || 'https://epay.ffomu.net/api/submit', params);
        const data = epayRes.data;
        if (data.code === 0) {
            return res.json({ pay_url: data.qrcode || data.payurl });
        } else {
            return res.status(400).json({ error: data.msg });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
