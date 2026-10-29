import { prisma } from '../config/prisma';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: 'proposal_join' | 'proposal_approved' | 'proposal_rejected' | 'proposal_removed' | 'proposal_cancelled' | 'new_message';
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Отправка внутрисистемного уведомления и логирование
   * В дальнейшем здесь подключается FCM (Firebase Cloud Messaging) или OneSignal
   */
  public static async send(payload: NotificationPayload): Promise<void> {
    const fcmServerKey = process.env.FCM_SERVER_KEY;

    console.log(`[NotificationService] 🔔 In-App Notification -> User: ${payload.userId} | ${payload.title}: ${payload.body}`);

    // If FCM push notifications are configured in environment
    if (fcmServerKey) {
      try {
        console.log(`[NotificationService] Sending push via FCM to user: ${payload.userId}`);
        // FCM payload integration stub for future token dispatch
      } catch (err: any) {
        console.warn(`[NotificationService] FCM error:`, err.message);
      }
    }
  }

  public static async notifyProposalJoin(organizerId: string, applicantName: string, proposalId: string) {
    await this.send({
      userId: organizerId,
      title: 'Новая заявка на игру',
      body: `${applicantName} хочет присоединиться к вашей игре!`,
      type: 'proposal_join',
      metadata: { proposalId },
    });
  }

  public static async notifyProposalApproved(userId: string, proposalSport: string, proposalId: string) {
    await this.send({
      userId,
      title: 'Заявка одобрена!',
      body: `Организатор подтвердил ваше участие в игре (${proposalSport})!`,
      type: 'proposal_approved',
      metadata: { proposalId },
    });
  }

  public static async notifyProposalRejected(userId: string, proposalSport: string, proposalId: string) {
    await this.send({
      userId,
      title: 'Заявка отклонена',
      body: `К сожалению, ваше участие в игре (${proposalSport}) было отклонено.`,
      type: 'proposal_rejected',
      metadata: { proposalId },
    });
  }

  public static async notifyProposalCancelled(userId: string, proposalSport: string, proposalId: string) {
    await this.send({
      userId,
      title: 'Игра отменена',
      body: `Организатор отменил совместную игру (${proposalSport}).`,
      type: 'proposal_cancelled',
      metadata: { proposalId },
    });
  }
}
