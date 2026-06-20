const auth = require('./_lib/auth');
const db = require('./_lib/db');
module.exports = auth(async (req, res) => {
  const database = await db();
  const licenses = await database.collection('licenses').find({ userId: req.userId }).toArray();
  res.json(licenses);
});
