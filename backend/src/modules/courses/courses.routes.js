import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './courses.controller.js';
import { createCourseBody, idParam, listCoursesQuery, reviewBody, updateCourseBody } from './courses.validation.js';

const router = Router();

router.use(authenticate);

router.get('/options', authorize('admin', 'teacher'), controller.options);
router.get('/summary', authorize('admin'), controller.summary);
router.get('/', authorize('admin', 'teacher'), validate({ query: listCoursesQuery }), controller.list);
router.post('/', authorize('admin'), validate({ body: createCourseBody }), controller.create);
router.get('/:id', authorize('admin', 'teacher'), validate({ params: idParam }), controller.getOne);
router.get('/:id/students', authorize('admin', 'teacher'), validate({ params: idParam }), controller.students);
router.patch('/:id', authorize('admin'), validate({ params: idParam, body: updateCourseBody }), controller.update);
router.delete('/:id', authorize('admin'), validate({ params: idParam }), controller.remove);
router.post('/:id/reviews', authorize('student'), validate({ params: idParam, body: reviewBody }), controller.review);

export default router;
