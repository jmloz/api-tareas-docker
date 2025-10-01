// src/models/index.js
const User = require('./User');
const Task = require('./Task');

// Relaciones
User.hasMany(Task, {
  foreignKey: 'userId',
  as: 'tareas',
  onDelete: 'CASCADE'
});

Task.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

module.exports = {
  User,
  Task
};