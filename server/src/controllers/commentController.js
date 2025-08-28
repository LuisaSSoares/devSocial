// src/controllers/commentController.js

const pool = require('../../db');

// Obter comentários de um post específico
exports.getCommentsByPostId = async (req, res) => {
  const { postId } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT
          c.id, c.content, c.created_at,
          u.id AS user_id, u.username, u.profile_picture_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar comentários.' });
  }
};

// Criar um novo comentário em um post
exports.createComment = async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id; // ID do usuário autenticado

  if (!content) {
    return res.status(400).json({ message: 'O conteúdo do comentário não pode ser vazio.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, content]
    );

    // Retorna o novo comentário com as informações do usuário para atualização do front-end
    const [newComment] = await pool.query(`
      SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username, u.profile_picture_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({ message: 'Comentário adicionado com sucesso!', comment: newComment[0] });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao adicionar comentário.' });
  }
};

// Adicionado: Editar um comentário existente
exports.updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ message: 'O conteúdo do comentário não pode ser vazio.' });
  }

  try {
    // Primeiro, verifica se o usuário é o dono do comentário
    const [comment] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [commentId]);
    if (comment.length === 0) {
      return res.status(404).json({ message: 'Comentário não encontrado.' });
    }
    if (comment[0].user_id !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este comentário.' });
    }

    // Atualiza o comentário
    await pool.query('UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?', [content, commentId]);

    res.status(200).json({ message: 'Comentário atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar comentário.' });
  }
};

// Adicionado: Deletar um comentário existente
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    // Primeiro, verifica se o usuário é o dono do comentário
    const [comment] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [commentId]);
    if (comment.length === 0) {
      return res.status(404).json({ message: 'Comentário não encontrado.' });
    }
    if (comment[0].user_id !== userId) {
      return res.status(403).json({ message: 'Você não tem permissão para deletar este comentário.' });
    }

    // Deleta o comentário
    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

    res.status(200).json({ message: 'Comentário deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar comentário.' });
  }
};
