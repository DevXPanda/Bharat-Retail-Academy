import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './recordings.controller.js';
import { bulkBody, createRecordingBody, idParam, listRecordingsQuery, statusBody, updateRecordingBody } from './recordings.validation.js';

const router = Router();
const staff = authorize('admin', 'teacher');

router.use(authenticate);

router.get('/summary', controller.summary);
router.get('/sidebar', authorize('admin'), controller.sidebar);
router.get('/', validate({ query: listRecordingsQuery }), controller.list);
router.post('/', staff, validate({ body: createRecordingBody }), controller.create);
router.post('/bulk', staff, validate({ body: bulkBody }), controller.bulk);
router.post('/:id/view', validate({ params: idParam }), controller.view);
router.patch('/:id', staff, validate({ params: idParam, body: updateRecordingBody }), controller.update);
router.patch('/:id/status', staff, validate({ params: idParam, body: statusBody }), controller.update);
router.delete('/:id', staff, validate({ params: idParam }), controller.remove);

export default router;
