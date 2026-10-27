import { Router } from 'express';
import { PlayProposalsController } from '../controllers/playProposalsController';
import { authenticateJwt, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// ── Публичные (без JWT, но с опциональным пользователем) ─────────────────────
router.get('/', PlayProposalsController.list as any);
router.get('/map', PlayProposalsController.mapPoints as any);

// ── Требуют JWT ───────────────────────────────────────────────────────────────
router.get('/my', authenticateJwt, PlayProposalsController.myProposals as any);
router.get('/:id', PlayProposalsController.getById as any);              // JWT опциональный (для my_participation_status)
router.post('/', authenticateJwt, PlayProposalsController.create as any);
router.patch('/:id', authenticateJwt, PlayProposalsController.update as any);
router.post('/:id/cancel', authenticateJwt, PlayProposalsController.cancel as any);
router.post('/:id/complete', authenticateJwt, PlayProposalsController.complete as any);

// ── Участие ───────────────────────────────────────────────────────────────────
router.post('/:id/join', authenticateJwt, PlayProposalsController.join as any);
router.post(
  '/:id/participants/:participantId/respond',
  authenticateJwt,
  PlayProposalsController.respondToParticipant as any
);
router.post('/:id/withdraw', authenticateJwt, PlayProposalsController.withdraw as any);
router.delete(
  '/:id/participants/:participantId',
  authenticateJwt,
  PlayProposalsController.removeParticipant as any
);

// ── Чат ───────────────────────────────────────────────────────────────────────
router.get('/:id/messages', authenticateJwt, PlayProposalsController.getMessages as any);
router.post('/:id/messages', authenticateJwt, PlayProposalsController.sendMessage as any);

export default router;
