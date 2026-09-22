import { TTLockService } from './ttlockService';

describe('TTLock Service (src/services/ttlockService.ts)', () => {
  it('should successfully unlock door in online_cloud mode when gateway is online', async () => {
    const lockId = 'lock_test_1001';
    const result = await TTLockService.unlockLock(lockId, true);

    expect(result.success).toBe(true);
    expect(result.mode).toBe('online_cloud');
    expect(result.message).toContain('разблокирован');
  });

  it('should fallback to offline_passcode mode when gateway is offline', async () => {
    const lockId = 'lock_test_1002';
    const result = await TTLockService.unlockLock(lockId, false);

    expect(result.success).toBe(true);
    expect(result.mode).toBe('offline_passcode');
    expect(result.offlinePasscode).toBeDefined();
    expect(result.offlineEkeyToken).toBeDefined();
    expect(result.message).toContain('автономный режим');
  });

  it('should return gateway status result correctly', async () => {
    const gatewayId = 'gw_astana_01';
    const result = await TTLockService.checkGatewayStatus(gatewayId, 'online');

    expect(result.gatewayId).toBe(gatewayId);
    expect(result.status).toBe('online');
    expect(result.lastPingAt).toBeInstanceOf(Date);
  });
});
