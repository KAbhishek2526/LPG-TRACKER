const db = require('../../config/db');

const syncOfflinePackets = async (req, res) => {
  const { packets } = req.body;
  const user_id = req.user ? req.user.id : null;

  if (!Array.isArray(packets) || packets.length === 0) {
    return res.status(400).json({ error: 'No packets provided' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    for (const packet of packets) {
      const { endpoint, payload } = packet;
      const { client_timestamp, cylinder_id, ...data } = payload;
      
      const serverNow = new Date();
      const clientTime = new Date(client_timestamp);
      const sync_delay_ms = serverNow.getTime() - clientTime.getTime();
      
      const delayHours = sync_delay_ms / (1000 * 60 * 60);
      let isAnomaly = false;
      
      if (delayHours > 24) {
        isAnomaly = true;
        await client.query(`
          INSERT INTO anomalies (type, details, severity)
          VALUES ($1, $2, $3)
        `, ['LATE_OFFLINE_SYNC', `Sync delay: ${delayHours.toFixed(2)} hours for cylinder ${cylinder_id}`, 'HIGH']);
        
        if (user_id) {
          await client.query(`
            UPDATE users SET fraud_score = fraud_score + 20 WHERE id = $1
          `, [user_id]);
        }
      }

      await client.query(`
        INSERT INTO events (cylinder_id, action, performed_by, location_lat, location_lng, metadata, blockchain_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        cylinder_id || null, 
        endpoint.includes('deliver') ? 'OFFLINE_DELIVERY' : 'OFFLINE_SCAN', 
        user_id, 
        payload.location_lat || null, 
        payload.location_lng || null, 
        JSON.stringify({ ...data, sync_delay_ms, client_timestamp, isAnomaly }),
        'PENDING'
      ]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true, processed: packets.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Sync Error:", error);
    res.status(500).json({ error: 'Sync failed' });
  } finally {
    client.release();
  }
};

module.exports = { syncOfflinePackets };
