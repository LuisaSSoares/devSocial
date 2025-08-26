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

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const { signOut } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
  const animatePlaceholderDown = (animValue, value) => {
    if (!value) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  useEffect(() => {
    fetchPostAndComments();
  }, [postId]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      const postResponse = await api.get(`/posts/${postId}`);
      setPost(postResponse.data);

      const commentsResponse = await api.get(`/comments/${postId}`);
      setComments(commentsResponse.data);

    } catch (error) {
      console.error('Erro ao buscar detalhes do post/comentários:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do post.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentContent.trim()) {
      Alert.alert('Aviso', 'O comentário não pode ser vazio.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro de Autenticação', 'Você precisa estar logado para comentar.');
        signOut();
        return;
      }

      await api.post(`/comments/${postId}`, { content: newCommentContent }, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      setNewCommentContent('');
      // Recarrega os comentários para exibir o novo
      fetchPostAndComments();

    } catch (error) {
      console.error('Erro ao adicionar comentário:', error.response?.data || error.message);
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar o comentário.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Renderiza um único item de comentário
  const renderComment = ({ item: comment }) => (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        {comment.profile_picture_url ? (
          <Image
            source={{ uri: `http://localhost:3001${comment.profile_picture_url}` }}
            style={styles.commentProfilePicture}
          />
        ) : (
          <View style={[styles.commentProfilePicture, styles.commentProfilePicturePlaceholder]}>
            <Ionicons name="person" size={24} color="#A366FF" />
          </View>
        )}
        <Text style={styles.commentUsername}>{comment.username}</Text>
        <Text style={styles.commentTimestamp}>{new Date(comment.created_at).toLocaleString()}</Text>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
    </View>
  );

  const getAnimatedPlaceholderStyle = (animValue) => ({
    top: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 5],
    }),
    fontSize: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E5E5', '#A366FF'],
    }),
  });

  if (loading) {
    return (
      <ImageBackground source={background} style={styles.background}>
        <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#A366FF" />
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (!post) {
    return (
      <ImageBackground source={background} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#A366FF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Post não encontrado.</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={background} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        {/* Cabeçalho da página, igual ao das outras telas */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#A366FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes do Post</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          ListHeaderComponent={() => (
            <>
              {/* Card do Post Principal */}
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  {post.profile_picture_url ? (
                    <Image
                      source={{ uri: `http://localhost:3001${post.profile_picture_url}` }}
                      style={styles.profilePicture}
                    />
                  ) : (
                    <View style={[styles.profilePicture, styles.profilePicturePlaceholder]}>
                      <Ionicons name="person" size={24} color="#A366FF" />
                    </View>
                  )}
                  <Text style={styles.postUsername}>{post.username}</Text>
                  <Text style={styles.postTimestamp}>{new Date(post.created_at).toLocaleString()}</Text>
                </View>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postContent}>{post.content}</Text>
                {post.image_url && (
                  <Image source={{ uri: `http://localhost:3001${post.image_url}` }} style={styles.postImage} />
                )}
              </View>
              <Text style={styles.commentsTitle}>Comentários</Text>
            </>
          )}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.commentListContent}
          // Componente para exibir quando a lista de comentários estiver vazia
          ListEmptyComponent={() => (
            <View style={styles.emptyCommentsContainer}>
              <Ionicons name="chatbubbles-outline" size={50} color="#A366FF" />
              <Text style={styles.emptyCommentsText}>
                Ainda não há comentários. Seja o primeiro a comentar!
              </Text>
            </View>
          )}
        />

        {/* Área de Comentário */}
        <View style={styles.addCommentContainer}>
          <View style={styles.inputContainer}>
            <Animated.Text style={[styles.placeholder, getAnimatedPlaceholderStyle(newCommentAnim)]}>
              Adicionar um Comentário...
            </Animated.Text>
            <TextInput
              style={styles.input}
              value={newCommentContent}
              onChangeText={setNewCommentContent}
              onFocus={() => animatePlaceholderUp(newCommentAnim)}
              onBlur={() => animatePlaceholderDown(newCommentAnim, newCommentContent)}
              multiline={true}
            />
          </View>
          <TouchableOpacity
            style={isSubmittingComment ? styles.commentButtonDisabled : styles.commentButton}
            onPress={handleAddComment}
            disabled={isSubmittingComment}
          >
            {isSubmittingComment ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#4DFFFF',
    shadowColor: '#4DFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E5E5E5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#E5E5E5',
    fontSize: 18,
    textAlign: 'center',
  },
  commentListContent: {
    paddingBottom: 15,
  },
  postCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    marginHorizontal: 15,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#4DFFFF',
  },
  profilePicturePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(77, 255, 255, 0.2)',
  },
  postUsername: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#E5E5E5',
    flex: 1,
  },
  postTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4DFFFF',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E5E5E5',
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#A366FF',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A366FF',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  commentCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    padding: 15,
    borderRadius: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4DFFFF',
    shadowColor: '#4DFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentProfilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#4DFFFF',
  },
  commentProfilePicturePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(77, 255, 255, 0.2)',
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#E5E5E5',
    flex: 1,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  commentContent: {
    fontSize: 14,
    color: '#E5E5E5',
    marginTop: 5,
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
    backgroundColor: '#F353D5',
    opacity: 0.6,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 15,
    backgroundColor: 'rgba(10, 25, 47, 0.8)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#A366FF',
  },
  emptyCommentsText: {
    color: '#E5E5E5',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  }
});

export default PostDetailScreen;
