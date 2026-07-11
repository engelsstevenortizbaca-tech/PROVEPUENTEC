'use strict';

const { pool } = require('../database/pool');

// Acceso a datos de usuarios, roles y su relación (RBAC).
const userRepository = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT id, nombre, apellido, email, password_hash, telefono, avatar_url,
              estado, email_verificado_at, created_at, updated_at, deleted_at
         FROM usuarios
        WHERE email = :email
        LIMIT 1`,
      { email }
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, nombre, apellido, email, password_hash, telefono, avatar_url,
              estado, email_verificado_at, created_at, updated_at, deleted_at
         FROM usuarios
        WHERE id = :id
        LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async existsByEmail(email) {
    const [rows] = await pool.execute('SELECT 1 FROM usuarios WHERE email = :email LIMIT 1', {
      email,
    });
    return rows.length > 0;
  },

  async create({ nombre, apellido, email, passwordHash, telefono = null }) {
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono)
       VALUES (:nombre, :apellido, :email, :passwordHash, :telefono)`,
      { nombre, apellido, email, passwordHash, telefono }
    );
    return result.insertId;
  },

  async updatePasswordHash(id, passwordHash) {
    await pool.execute('UPDATE usuarios SET password_hash = :passwordHash WHERE id = :id', {
      id,
      passwordHash,
    });
  },

  async markEmailVerified(id) {
    await pool.execute(
      'UPDATE usuarios SET email_verificado_at = CURRENT_TIMESTAMP WHERE id = :id',
      { id }
    );
  },

  async getRoleByName(nombre) {
    const [rows] = await pool.execute(
      'SELECT id, nombre FROM roles WHERE nombre = :nombre LIMIT 1',
      { nombre }
    );
    return rows[0] || null;
  },

  async getRolesByUserId(usuarioId) {
    const [rows] = await pool.execute(
      `SELECT r.nombre
         FROM roles r
         JOIN usuario_rol ur ON ur.rol_id = r.id
        WHERE ur.usuario_id = :usuarioId`,
      { usuarioId }
    );
    return rows.map((row) => row.nombre);
  },

  async assignRole(usuarioId, rolId) {
    await pool.execute(
      `INSERT IGNORE INTO usuario_rol (usuario_id, rol_id)
       VALUES (:usuarioId, :rolId)`,
      { usuarioId, rolId }
    );
  },
};

module.exports = userRepository;
