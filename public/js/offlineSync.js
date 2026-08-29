/**
 * MediKiosk Offline Storage & Auto-Sync Manager
 */
class OfflineSyncManager {
  constructor() {
    this.dbName = 'medikiosk_offline_v2';
    this.db = null;
    this.isOnline = navigator.onLine;
    this.initDB();
    this.bindEvents();
    this.startHeartbeat();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('queued_intakes')) {
          db.createObjectStore('queued_intakes', { keyPath: 'sessionToken' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.checkPendingAndSync();
        resolve(this.db);
      };
      request.onerror = (e) => reject(e);
    });
  }

  bindEvents() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateOfflineUI(false);
      this.checkPendingAndSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateOfflineUI(true);
    });

    this.updateOfflineUI(!navigator.onLine);
  }

  updateOfflineUI(isOffline) {
    const pill = document.getElementById('offlinePill');
    if (pill) {
      pill.style.display = isOffline ? 'block' : 'none';
      if (isOffline) {
        pill.innerHTML = '<i class="bi bi-wifi-off text-warning me-2"></i> Offline Mode: Submissions will auto-sync on reconnect';
      }
    }
  }

  async saveIntakeOffline(payload) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('queued_intakes', 'readwrite');
      const store = tx.objectStore('queued_intakes');
      store.put({ ...payload, offlineTimestamp: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => reject(err);
    });
  }

  async checkPendingAndSync() {
    if (!navigator.onLine || !this.db) return;

    const items = await this.getAllQueued();
    if (items.length === 0) return;

    console.log(`Syncing ${items.length} offline intake submissions to server...`);
    try {
      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kioskId: 'KIOSK-01', queuedSubmissions: items })
      });
      const data = await res.json();
      if (data.success) {
        await this.clearQueued();
        console.log('Offline queue reconciled successfully!');
      }
    } catch (e) {
      console.warn('Sync failed, will retry on next connection heartbeat:', e);
    }
  }

  async getAllQueued() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('queued_intakes', 'readonly');
      const store = tx.objectStore('queued_intakes');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async clearQueued() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('queued_intakes', 'readwrite');
      const store = tx.objectStore('queued_intakes');
      store.clear();
      tx.oncomplete = () => resolve(true);
    });
  }

  startHeartbeat() {
    setInterval(async () => {
      if (navigator.onLine) {
        try {
          const queued = await this.getAllQueued();
          await fetch('/api/sync/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kioskId: 'KIOSK-01', pendingCount: queued.length })
          });
        } catch (e) {
          // offline
        }
      }
    }, 30000);
  }
}

window.OfflineSync = new OfflineSyncManager();
