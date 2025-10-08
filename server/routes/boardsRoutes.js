import { Router } from "express";
import { getMyBoards } from '../controllers/boardsController.js';
import {requireAuth} from '../middleware/requireAuth.js';
import { getBoardMembers, addBoardMember, removeBoardMember } from '../controllers/boardMembersController.js';

const router = Router();

router.get('/my', requireAuth, getMyBoards);
router.get('/:boardId/members', requireAuth, getBoardMembers);

router.post('/:boardId/members', requireAuth, addBoardMember);

router.delete('/:boardId/members/:userId', requireAuth, removeBoardMember);

export default router;
