// src/screens/PostDetailScreen.js

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, Image, TouchableOpacity, FlatList,
  ImageBackground, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import background from '../../assets/3348271.jpg'; // Importa a imagem de fundo
import Modal from 'react-native-modal';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const { signOut } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null); // Estado para guardar o ID do usuário atual
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  // Animação para o placeholder do input de comentário
  const newCommentAnim = useRef(new Animated.Value(newCommentContent ? 1 : 0)).current;

  // Função para animar o placeholder para cima
  const animatePlaceholderUp = (animValue) => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Função para animar o placeholder para baixo
  const animatePlaceholderDown = (animValue) => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Efeito para a animação do placeholder do novo comentário
  useEffect(() => {
    if (newCommentContent) {
      animatePlaceholderUp(newCommentAnim);
    } else {
      animatePlaceholderDown(newCommentAnim);
    }
  }, [newCommentContent]);

  // Função para buscar o ID do usuário logado
  const fetchCurrentUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setCurrentUserId(parsedUser.id);
        console.log("ID do usuário logado:", parsedUser.id);
      } else {
        console.log("ID do usuário logado: null");
      }
    } catch (error) {
      console.error("Erro ao buscar o ID do usuário:", error);
    }
  };

  // Função para buscar os dados do post e comentários
  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      // Buscar post e comentários em paralelo
      const [postResponse, commentsResponse] = await Promise.all([
        api.get(`/posts/${postId}`),
        api.get(`/comments/${postId}`),
      ]);
      setPost(postResponse.data);
      setComments(commentsResponse.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o post e os comentários.');
      console.error('Erro ao buscar post e comentários:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar os dados quando a tela é focada
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCurrentUserId();
      fetchPostAndComments();
    });
    return unsubscribe;
  }, [navigation, postId]);

  const handleNewComment = async () => {
    if (!newCommentContent.trim()) {
      Alert.alert('Atenção', 'O comentário não pode ser vazio.');
      return;
    }
    setIsSubmittingComment(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Token de autenticação não encontrado.');
        signOut();
        return;
      }

      await api.post(`/comments/${postId}`,
        { content: newCommentContent },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      setNewCommentContent('');
      fetchPostAndComments(); // Recarrega os comentários para ver o novo
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o comentário.');
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditedContent(comment.content);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      Alert.alert('Atenção', 'O comentário não pode ser vazio.');
      return;
    }
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      await api.put(`/comments/${editingComment.id}`,
        { content: editedContent },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setEditModalVisible(false);
      setEditingComment(null);
      fetchPostAndComments();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o comentário.');
      console.error('Erro ao atualizar comentário:', error);
    }
  };

  const handleDeleteComment = (comment) => {
    setCommentToDelete(comment);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      await api.delete(`/comments/${commentToDelete.id}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setDeleteModalVisible(false);
      setCommentToDelete(null);
      fetchPostAndComments();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível deletar o comentário.');
      console.error('Erro ao deletar comentário:', error);
    }
  };

  const renderComment = ({ item }) => {
    const isOwner = currentUserId && (item.user_id == currentUserId); // Usa == para comparar string com number se necessário
    console.log(`Debug: Current User ID: ${currentUserId}, Comment User ID: ${item.user_id}, Match: ${isOwner}`);
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <Image
            source={{ uri: item.profile_picture_url ? `http://localhost:3001${item.profile_picture_url}` : `https://placehold.co/40x40/4DFFFF/000000?text=${item.username[0]}` }}
            style={styles.profilePicture}
            onError={(e) => console.log('Erro ao carregar imagem:', e.nativeEvent.error)}
          />
          <Text style={styles.commentUsername}>{item.username}</Text>
        </View>
        <Text style={styles.commentContent}>{item.content}</Text>
        {isOwner && (
          <View style={styles.commentActions}>
            <TouchableOpacity onPress={() => handleEditComment(item)}>
              <Ionicons name="create-outline" size={20} color="#4DFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteComment(item)}>
              <Ionicons name="trash-outline" size={20} color="#F353D5" />
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.commentDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4DFFFF" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text style={styles.noContentText}>Post não encontrado.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={background} style={styles.background}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#E5E5E5" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalhes do Post</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.postCard}>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postContent}>{post.content}</Text>
              {post.image_url && (
                <Image
                  source={{ uri: `http://localhost:3001${post.image_url}` }}
                  style={styles.postImage}
                  onError={(e) => console.log('Erro ao carregar imagem:', e.nativeEvent.error)}
                />
              )}
              <View style={styles.postStats}>
                <Text style={styles.postStatItem}>
                  {post.likes_count} Curtidas
                </Text>
                <Text style={styles.postStatItem}>
                  {post.comments_count} Comentários
                </Text>
              </View>
            </View>

            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Comentários</Text>
              {comments.length > 0 ? (
                <FlatList
                  data={comments}
                  renderItem={renderComment}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyCommentsText}>
                  Nenhum comentário ainda. Seja o primeiro!
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.addCommentContainer}>
            <View style={styles.inputContainer}>
              <Animated.Text
                style={[
                  styles.placeholder,
                  {
                    transform: [
                      {
                        translateY: newCommentAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [15, -15],
                        }),
                      },
                    ],
                    fontSize: newCommentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 12],
                    }),
                    color: newCommentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['#A366FF', '#4DFFFF'],
                    }),
                  },
                ]}
              >
                Adicionar um comentário...
              </Animated.Text>
              <TextInput
                style={styles.input}
                value={newCommentContent}
                onChangeText={setNewCommentContent}
                multiline
                onFocus={() => animatePlaceholderUp(newCommentAnim)}
                onBlur={() => !newCommentContent && animatePlaceholderDown(newCommentAnim)}
              />
            </View>
            <TouchableOpacity
              onPress={handleNewComment}
              disabled={isSubmittingComment}
              style={[styles.commentButton, isSubmittingComment && styles.commentButtonDisabled]}
            >
              <Ionicons name="send" size={24} color="#E5E5E5" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Modal de Edição */}
      <Modal isVisible={isEditModalVisible} style={styles.modal}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Editar Comentário</Text>
          <TextInput
            style={styles.modalInput}
            value={editedContent}
            onChangeText={setEditedContent}
            multiline
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveEdit}>
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal isVisible={isDeleteModalVisible} style={styles.modal}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Excluir Comentário?</Text>
          <Text style={styles.modalMessage}>Tem certeza que deseja excluir este comentário? Esta ação é irreversível.</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setDeleteModalVisible(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleConfirmDelete}>
              <Text style={styles.buttonText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#A366FF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 5,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  postCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4DFFFF',
    marginBottom: 10,
  },
  postContent: {
    fontSize: 16,
    color: '#E5E5E5',
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 15,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#4DFFFF',
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#A366FF',
    paddingTop: 10,
  },
  postStatItem: {
    fontSize: 14,
    color: '#E5E5E5',
  },
  commentsSection: {
    marginHorizontal: 15,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4DFFFF',
    marginBottom: 15,
  },
  commentCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A366FF',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  profilePicture: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#4DFFFF',
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#E5E5E5',
  },
  commentContent: {
    fontSize: 15,
    color: '#E5E5E5',
    marginLeft: 40,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5,
  },
  commentDate: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 5,
    textAlign: 'right',
  },
  emptyCommentsText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#E5E5E5',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#A366FF',
  },
  inputContainer: {
    flex: 1,
    marginRight: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#4DFFFF',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    color: '#E5E5E5',
    fontSize: 16,
    paddingTop: 25,
  },
  placeholder: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  commentButton: {
    backgroundColor: '#F353D5',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F353D5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  commentButtonDisabled: {
    backgroundColor: '#6b2d5f',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0A192F',
    padding: 22,
    borderRadius: 15,
    borderColor: '#4DFFFF',
    borderWidth: 1,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#E5E5E5',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    borderWidth: 1,
    borderColor: '#A366FF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#E5E5E5',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  saveButton: {
    backgroundColor: '#F353D5',
  },
  deleteButton: {
    backgroundColor: '#F353D5',
  },
  buttonText: {
    color: '#E5E5E5',
    fontWeight: 'bold',
  },
  noContentText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#E5E5E5',
    marginHorizontal: 15,
  },
});

export default PostDetailScreen;
