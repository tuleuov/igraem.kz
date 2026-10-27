import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { TTLockService } from './ttlockService';

export class CronService {
  public static initGatewayMonitoring() {
    const cronExpr = ENV.CRON_GATEWAY_MONITOR;
    console.log(`[CronService] Initializing Gateway Monitoring Cron Job with schedule: "${cronExpr}"`);

    cron.schedule(cronExpr, async () => {
      console.log(`[CronService] Executing periodic Wi-Fi Gateway health check...`);
      try {
        const gateways = await prisma.gateway.findMany();

        for (const gateway of gateways) {
          const checkResult = await TTLockService.checkGatewayStatus(gateway.ttlock_gateway_id, gateway.status);

          // Update Gateway in DB if status changed or ping timestamp
          await prisma.gateway.update({
            where: { id: gateway.id },
            data: {
              status: checkResult.status,
              last_ping_at: checkResult.lastPingAt,
            },
          });

          // Write log entry
          await prisma.gatewayStatusLog.create({
            data: {
              gateway_id: gateway.id,
              status: checkResult.status,
              response_raw: JSON.stringify(checkResult.rawResponse || {}),
              checked_at: checkResult.lastPingAt,
            },
          });

          console.log(`[CronService] Gateway "${gateway.gateway_name}" (${gateway.ttlock_gateway_id}): Status = ${checkResult.status}`);
        }
      } catch (error: any) {
        console.error(`[CronService] Error in Gateway Monitoring Cron Job:`, error);
      }
    });
  }

  public static initNoShowAutoCheck() {
    console.log('[CronService] Initializing Automated 60-second No-Show Auto-Ban Background Worker...');
    setInterval(async () => {
      try {
        const { BookingsController } = require('../controllers/bookingsController');
        await BookingsController.processNoShowAutoBans();
      } catch (error: any) {
        console.error('[CronService] Error in No-Show Background Worker:', error.message);
      }
    }, 60000);
  }

  /**
   * Авто-переходы статусов для PlayProposal («Сыграем»):
   *  - open → in_progress: если event_date+start_time уже наступило
   *  - in_progress → completed: если end_time+2ч (или start_time+4ч) прошло
   * Запускается каждые 5 минут.
   */
  public static initPlayProposalStatusTransitions() {
    console.log('[CronService] Initializing Play Proposal status transition job (every 5 min)...');

    cron.schedule('*/5 * * * *', async () => {
      try {
        const nowAlmaty = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Almaty' })
        );
        const todayDate = nowAlmaty.toISOString().slice(0, 10); // YYYY-MM-DD
        const nowTime = `${String(nowAlmaty.getHours()).padStart(2, '0')}:${String(nowAlmaty.getMinutes()).padStart(2, '0')}`; // HH:mm

        // 1. open → in_progress (event_date <= today AND start_time <= nowTime)
        const toStart = await prisma.playProposal.findMany({
          where: {
            status: 'open',
            OR: [
              { event_date: { lt: todayDate } },
              { event_date: todayDate, start_time: { lte: nowTime } },
            ],
          },
          select: { id: true },
        });

        if (toStart.length > 0) {
          await prisma.playProposal.updateMany({
            where: { id: { in: toStart.map((p) => p.id) } },
            data: { status: 'in_progress' },
          });
          console.log(`[CronService] Proposals open→in_progress: ${toStart.length}`);
        }

        // 2. in_progress → completed
        // Строим список кандидатов и проверяем каждого по end_time или start_time+4h
        const inProgress = await prisma.playProposal.findMany({
          where: { status: 'in_progress' },
          select: { id: true, event_date: true, start_time: true, end_time: true },
        });

        const toComplete: string[] = [];
        for (const p of inProgress) {
          const [startH, startM] = p.start_time.split(':').map(Number);
          const eventStart = new Date(
            new Date(`${p.event_date}T${p.start_time}:00`).toLocaleString('en-US', {
              timeZone: 'Asia/Almaty',
            })
          );

          let cutoff: Date;
          if (p.end_time) {
            const eventEnd = new Date(
              new Date(`${p.event_date}T${p.end_time}:00`).toLocaleString('en-US', {
                timeZone: 'Asia/Almaty',
              })
            );
            cutoff = new Date(eventEnd.getTime() + 2 * 60 * 60 * 1000); // end_time + 2ч
          } else {
            cutoff = new Date(eventStart.getTime() + 4 * 60 * 60 * 1000); // start_time + 4ч
          }

          if (nowAlmaty >= cutoff) {
            toComplete.push(p.id);
          }
        }

        if (toComplete.length > 0) {
          await prisma.playProposal.updateMany({
            where: { id: { in: toComplete } },
            data: { status: 'completed' },
          });
          console.log(`[CronService] Proposals in_progress→completed: ${toComplete.length}`);
        }
      } catch (error: any) {
        console.error('[CronService] Error in Play Proposal status transition job:', error.message);
      }
    });
  }
}
