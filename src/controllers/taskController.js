const { Task } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { completed, priority, page = 1, limit = 10, search } = req.query;

    // Build filters
    const where = { userId };

    if (completed !== undefined) {
      where.completed = completed === 'true';
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Pagination
    const offset = (page - 1) * limit;

    const { count, rows } = await Task.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['completed', 'ASC'],
        ['dueDate', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: {
        tasks: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting tasks',
      error: error.message
    });
  }
};

const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({
      where: { id, userId }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    logger.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting task',
      error: error.message
    });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, tags } = req.body;
    const userId = req.user.id;

    const task = await Task.create({
      title,
      description,
      dueDate,
      priority,
      tags,
      userId
    });

    logger.info(`Task created: ${task.id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });
  } catch (error) {
    logger.error('Error creating task:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, completed, dueDate, priority, tags } = req.body;

    // Verify task exists and belongs to user
    const task = await Task.findOne({ where: { id, userId } });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Update task
    await task.update({
      title,
      description,
      completed,
      dueDate,
      priority,
      tags
    });

    logger.info(`Task updated: ${id} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });
  } catch (error) {
    logger.error('Error updating task:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify task exists and belongs to user
    const task = await Task.findOne({ where: { id, userId } });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Delete task
    await task.destroy();

    logger.info(`Task deleted: ${id} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
};

const getStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const total = await Task.count({ where: { userId } });
    const completed = await Task.count({ where: { userId, completed: true } });
    const pending = await Task.count({ where: { userId, completed: false } });

    const byPriority = await Task.findAll({
      where: { userId },
      attributes: [
        'priority',
        [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });

    res.json({
      success: true,
      data: {
        total,
        completed,
        pending,
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = parseInt(item.get('count'));
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting statistics',
      error: error.message
    });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStatistics
};