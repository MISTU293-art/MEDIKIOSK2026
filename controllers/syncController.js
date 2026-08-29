const SyncService = require('../services/syncService');
const logger = require('../utils/logger');

exports.syncQueue = async (req, res) => {
  try {
    const { kioskId = 'KIOSK-01', queuedSubmissions = [] } = req.body;
    if (!Array.isArray(queuedSubmissions)) {
      return res.status(400).json({ success: false, error: 'queuedSubmissions must be an array.' });
    }

    const syncResult = await SyncService.processSyncBatch(kioskId, queuedSubmissions);
    return res.json({ success: true, ...syncResult });
  } catch (err) {
    logger.error('Sync queue batch error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Sync processing failed.' });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const { kioskId = 'KIOSK-01', pendingCount = 0 } = req.body;
    await SyncService.recordHeartbeat(kioskId, req.ip, pendingCount);
    return res.json({ success: true, timestamp: new Date().toISOString(), status: 'online' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Heartbeat ping failed.' });
  }
};
