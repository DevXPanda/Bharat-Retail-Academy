import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './liveClasses.controller.js';
import { chatBody, createClassBody, idParam, listClassesQuery, updateClassBody } from './liveClasses.validation.js';

const router = Router();
const staff = authorize('admin', 'teacher');

router.use(authenticate);

router.get('/summary', controller.summary);
router.get('/upcoming', controller.upcoming);
router.get('/today', controller.today);
router.get('/', validate({ query: listClassesQuery }), controller.list);
router.post('/', staff, validate({ body: createClassBody }), controller.create);

router.get('/:id', validate({ params: idParam }), controller.getOne);
router.patch('/:id', staff, validate({ params: idParam, body: updateClassBody }), controller.update);
router.get('/:id/students', staff, validate({ params: idParam }), controller.students);
router.post('/:id/start', staff, validate({ params: idParam }), controller.start);
router.post('/:id/end', staff, validate({ params: idParam }), controller.end);
router.get('/:id/access', validate({ params: idParam }), controller.access);
router.post('/:id/join', validate({ params: idParam }), controller.join);
router.post('/:id/leave', validate({ params: idParam }), controller.leave);
router.get('/:id/chat', validate({ params: idParam }), controller.chat);
router.post('/:id/chat', validate({ params: idParam, body: chatBody }), controller.postChat);

export default router;
