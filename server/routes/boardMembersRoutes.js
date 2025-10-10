import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getBoardMembers,
  addBoardMember,
  removeBoardMember,
  inviteBoardMemberByEmail,
} from "../controllers/boardMembersController.js";

const router = Router();

router.get("/:boardId/members", requireAuth, getBoardMembers);

router.post("/:boardId/members", requireAuth, addBoardMember);
router.post("/:boardId/members/invite", requireAuth, inviteBoardMemberByEmail);

router.delete("/:boardId/members/:userId", requireAuth, removeBoardMember);

export default router;
