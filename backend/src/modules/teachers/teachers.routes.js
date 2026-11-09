import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './teachers.controller.js';
import { createTeacherBody, idParam, listTeachersQuery, updateTeacherBody } from './teachers.validation.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/summary', controller.summary);
router.get('/', validate({ query: listTeachersQuery }), controller.list);
router.post('/', validate({ body: createTeacherBody }), controller.create);
router.get('/:id', validate({ params: idParam }), controller.getOne);
router.get('/:id/conversations/:conversationId', validate({ params: idParam.extend({ conversationId: idParam.shape.id }) }), controller.conversation);
router.patch('/:id', validate({ params: idParam, body: updateTeacherBody }), controller.update);
router.delete('/:id', validate({ params: idParam }), controller.remove);

export default router;
