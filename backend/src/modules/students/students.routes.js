import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './students.controller.js';
import { createStudentBody, enrollBody, enrollmentParam, groupsQuery, idParam, listStudentsQuery, rosterQuery, updateStudentBody } from './students.validation.js';

const router = Router();

router.use(authenticate);

router.get('/roster', authorize('admin', 'teacher'), validate({ query: rosterQuery }), controller.roster);
router.get('/roster/summary', authorize('admin', 'teacher'), controller.rosterSummary);
router.get('/roster/groups', authorize('admin', 'teacher'), validate({ query: groupsQuery }), controller.rosterGroups);

router.get('/summary', authorize('admin'), controller.summary);
router.get('/export', authorize('admin'), validate({ query: listStudentsQuery }), controller.exportCsv);
router.get('/', authorize('admin', 'teacher'), validate({ query: listStudentsQuery }), controller.list);
router.post('/', authorize('admin'), validate({ body: createStudentBody }), controller.create);

router.get('/:id', authorize('admin', 'teacher'), validate({ params: idParam }), controller.getOne);
router.get('/:id/conversations/:conversationId', authorize('admin'), validate({ params: idParam.extend({ conversationId: idParam.shape.id }) }), controller.conversation);
router.patch('/:id', authorize('admin'), validate({ params: idParam, body: updateStudentBody }), controller.update);
router.delete('/:id', authorize('admin'), validate({ params: idParam }), controller.remove);

router.post('/:id/enrollments', authorize('admin'), validate({ params: idParam, body: enrollBody }), controller.addEnrollment);
router.delete('/:id/enrollments/:enrollmentId', authorize('admin'), validate({ params: enrollmentParam }), controller.removeEnrollment);

export default router;
