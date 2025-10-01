const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validarCampos } = require('../middlewares/validation');
const { protectRoute } = require('../middlewares/auth');
const {
  register,
  login,
  profile,
  updateProfile
} = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter and one number'),
  validarCampos
], register);

// POST /api/auth/login
router.post('/login', [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validarCampos
], login);

// GET /api/auth/profile
router.get('/profile', protectRoute, profile);

// PUT /api/auth/profile
router.put('/profile', [
  protectRoute,
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  validarCampos
], updateProfile);

module.exports = router;