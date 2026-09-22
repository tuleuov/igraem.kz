import { HealthController } from '../controllers/healthController';
import { prisma } from '../config/prisma';

async function runHealthTests() {
  console.log('🧪 Running Healthcheck Endpoint Unit Tests...\n');

  let passed = 0;
  let failed = 0;

  // Test Case 1: Database Health Check Success
  try {
    const reqMock: any = { id: 'test-req-123', headers: { 'x-request-id': 'test-req-123' } };
    let responseStatus: number = 0;
    let responseBody: any = null;

    const resMock: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    // Backup original $queryRaw
    const origQueryRaw = prisma.$queryRaw;
    prisma.$queryRaw = (async () => [{ '?column?': 1 }]) as any;

    await HealthController.checkHealth(reqMock, resMock);

    if (responseStatus === 200 && responseBody?.status === 'ok' && responseBody?.database === 'connected') {
      console.log('✅ [PASS] HealthCheck returns 200 OK when Database is connected');
      passed++;
    } else {
      console.error('❌ [FAIL] Expected 200 OK connected state, got:', responseStatus, responseBody);
      failed++;
    }

    // Test Case 2: Database Health Check Failure (DB Down)
    prisma.$queryRaw = (async () => {
      throw new Error('DB connection reset');
    }) as any;

    await HealthController.checkHealth(reqMock, resMock);

    if (responseStatus === 503 && responseBody?.status === 'error' && responseBody?.database === 'disconnected') {
      console.log('✅ [PASS] HealthCheck returns 503 Service Unavailable when Database is down');
      passed++;
    } else {
      console.error('❌ [FAIL] Expected 503 Service Unavailable state, got:', responseStatus, responseBody);
      failed++;
    }

    // Restore original $queryRaw
    prisma.$queryRaw = origQueryRaw;
  } catch (err: any) {
    console.error('❌ [FAIL] Test execution error:', err);
    failed++;
  }

  console.log(`\n📊 Health Check Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runHealthTests();
