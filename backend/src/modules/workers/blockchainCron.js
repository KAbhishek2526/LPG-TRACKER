const cron = require('node-cron');
const crypto = require('crypto');
const { ethers } = require('ethers');
const db = require('../../config/db');

const rpcUrl = process.env.POLYGON_RPC_URL;
const privateKey = process.env.POLYGON_PRIVATE_KEY;
let provider, wallet;

if (rpcUrl && privateKey) {
  provider = new ethers.JsonRpcProvider(rpcUrl);
  wallet = new ethers.Wallet(privateKey, provider);
} else {
  console.log("WARNING: Polygon RPC or Private Key not set. Blockchain worker will run in mock mode.");
}

// Run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('Running blockchain cron job to anchor PENDING events...');
  try {
    const { rows } = await db.query(`SELECT id, cylinder_id, action, metadata FROM events WHERE blockchain_status = 'PENDING'`);
    if (rows.length === 0) return;
    
    console.log(`Found ${rows.length} pending events to anchor.`);

    for (const event of rows) {
      const metadata = event.metadata || {};
      const client_timestamp = metadata.client_timestamp || new Date().toISOString();
      const payloadString = `${event.id}${event.cylinder_id}${event.action}${client_timestamp}`;
      
      const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
      let txHash = `mock_tx_${payloadHash.substring(0, 10)}`;
      
      if (wallet) {
        // Constructing a zero-value transaction with payloadHash in data payload to anchor securely on chain
        const tx = await wallet.sendTransaction({
          to: wallet.address,
          data: '0x' + payloadHash
        });
        await tx.wait();
        txHash = tx.hash;
      }
      
      await db.query(`
        UPDATE events 
        SET blockchain_status = 'ANCHORED', 
            blockchain_tx_hash = $1 
        WHERE id = $2
      `, [txHash, event.id]);
      
      console.log(`Anchored event ${event.id} on chain. Tx: ${txHash}`);
    }
  } catch (error) {
    console.error('Error during blockchain cron job:', error);
  }
});
