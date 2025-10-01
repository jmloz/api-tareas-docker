const { User } = require('../models');
const { generarToken } = require('../utils/jwt');
const logger = require('../config/logger');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user (password is hashed automatically by hook)
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate token
    const token = generarToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    logger.error('Error registering user:', error);

    // Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'User inactive. Contact administrator'
      });
    }

    // Validate password
    const validPassword = await user.validatePassword(password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last access
    await user.update({ lastAccess: new Date() });

    // Generate token
    const token = generarToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    logger.info(`User authenticated: ${email}`);

    res.json({
      success: true,
      message: 'Session started successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    logger.error('Error logging in:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

const profile = async (req, res) => {
  try {
    // req.user comes from auth middleware
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = req.user;

    // Update only name (email cannot be changed)
    await User.update(
      { name },
      { where: { id: user.id } }
    );

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });

    logger.info(`Profile updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  profile,
  updateProfile
};