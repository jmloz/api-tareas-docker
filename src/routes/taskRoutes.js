const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { protectRoute } = require('../middlewares/auth');
const { validarCampos } = require('../middlewares/validation');

// Import controllers
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStatistics
} = require('../controllers/taskController');

// All routes require authentication
router.use(protectRoute);

// GET /api/tasks/statistics - Get statistics (must be before /:id)
router.get('/statistics', getStatistics);

// GET /api/tasks - Get all tasks
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a number greater than 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('completed').optional().isBoolean().withMessage('Completed must be true or false'),
  query('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  validarCampos
], getTasks);

// GET /api/tasks/:id - Get specific task
router.get('/:id', [
  param('id').isInt().withMessage('ID must be an integer'),
  validarCampos
], getTask);

// POST /api/tasks - Create new task
router.post('/', [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description').optional().trim(),
  body('dueDate').optional().isISO8601().withMessage('Must be a valid date'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  validarCampos
], createTask);

// PUT /api/tasks/:id - Update task
router.put('/:id', [
  param('id').isInt().withMessage('ID must be an integer'),
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim(),
  body('completed').optional().isBoolean(),
  body('dueDate').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  validarCampos
], updateTask);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', [
  param('id').isInt().withMessage('ID must be an integer'),
  validarCampos
], deleteTask);

module.exports = router;