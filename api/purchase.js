const auth = require('./_lib/auth');
const db = require('./_lib/db');
const crypto = require('crypto');

// 商品列表（写死或从数据库）
const products = {
  'guild-pro': { name: '高级公会系统', price: 29.99 },
  'particle-pack': { name: '粒子特效扩展包', price: 19.99 },
  'anti-cheat': { name: '高级反作弊系统', price: 39.99 }
};

module.exports = auth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { productId } = req.body;
  if (!productId || !products[productId]) return res.status(400).json({ error: '无效产品' });
  const database = await db();
  const user = await database.collection('users').findOne({ _id: new require('mongodb').ObjectId(req.userId) });
  const product = products[productId];
  if (user.balance < product.price) return res.status(400).json({ error: '余额不足，请联系管理员充值' });
  // 扣款
  await database.collection('users').updateOne(
    { _id: user._id },
    { $inc: { balance: -product.price } }
  );
  // 生成许可证
  const licenseKey = 'IC-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  await database.collection('licenses').insertOne({
    userId: req.userId,
    productId,
    productName: product.name,
    licenseKey,
    createdAt: new Date()
  });
  res.json({ message: '购买成功', licenseKey });
});
