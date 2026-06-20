const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
let client = new MongoClient(uri);
module.exports = async () => {
  if (!client.topology || !client.topology.isConnected()) await client.connect();
  return client.db('icecloud');
};
