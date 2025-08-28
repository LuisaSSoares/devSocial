// src/routes/commentRoutes.js

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Obter comentários de um post (pode ser público)
router.get('/:postId', commentController.getCommentsByPostId);

// Adicionar um comentário (requer autenticação)
router.post('/:postId', authMiddleware.verifyToken, commentController.createComment);

// Adicionado: Editar um comentário (requer autenticação)
router.put('/:commentId', authMiddleware.verifyToken, commentController.updateComment);

// Adicionado: Deletar um comentário (requer autenticação)
router.delete('/:commentId', authMiddleware.verifyToken, commentController.deleteComment);

module.exports = router;
