import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './batches.controller.js';
import { assignStudentsBody, bulkBody, createBatchBody, idParam, listBatchesQuery, studentParam, updateBatchBody } from './batches.validation.js';

const router = Router();

router.use(authenticate, authorize('admin', 'teacher'));

router.get('/options', controller.options);
router.get('/summary', authorize('admin'), controller.summary);
router.get('/upcoming', authorize('admin'), controller.upcoming);
router.post('/bulk', authorize('admin'), validate({ body: bulkBody }), controller.bulk);
router.get('/', validate({ query: listBatchesQuery }), controller.list);
router.post('/', authorize('admin'), validate({ body: createBatchBody }), controller.create);
router.get('/:id', validate({ params: idParam }), controller.getOne);
router.patch('/:id', authorize('admin'), validate({ params: idParam, body: updateBatchBody }), controller.update);
router.delete('/:id', authorize('admin'), validate({ params: idParam }), controller.remove);
router.post('/:id/students', authorize('admin'), validate({ params: idParam, body: assignStudentsBody }), controller.assignStudents);
router.delete('/:id/students/:studentId', authorize('admin'), validate({ params: studentParam }), controller.removeStudent);

export default router;
