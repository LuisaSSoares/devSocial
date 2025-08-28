// src/screens/HomeScreen.js

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert,
  FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image,
  ImageBackground, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import background from '../../assets/3348271.jpg';
import { useIsFocused } from '@react-navigation/native';

const HomeScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLikes, setUserLikes] = useState({});
  const [userFavorites, setUserFavorites] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('Carregando...');
  const [currentProfilePicture, setCurrentProfilePicture] = useState(null);
  const [newPostImageUri, setNewPostImageUri] = useState(null);
  const isFocused = useIsFocused();


  // Referências e valores de animação para os inputs
  const searchInputRef = useRef(null);
  const newPostTitleRef = useRef(null);
  const newPostContentRef = useRef(null);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const newPostTitleAnim = useRef(new Animated.Value(0)).current;
  const newPostContentAnim = useRef(new Animated.Value(0)).current;

  // Funções de animação
  const animatePlaceholderUp = (animValue) => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animatePlaceholderDown = (animValue, value) => {
    if (!value) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const createPlaceholderStyle = (animValue) => ({
    top: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
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

  const createPostContentPlaceholderStyle = (animValue) => ({
    top: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
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

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setCurrentUserId(userData.id);
          setCurrentUsername(`Olá, ${userData.username}`);
          setCurrentProfilePicture(userData.profile_picture_url);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário do AsyncStorage:', error);
      }
    };
    loadUserData();
    fetchPosts();

    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Desculpe, precisamos de permissões de galeria para isso funcionar!');
      }
    })();
  }, [searchTerm, currentUserId]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const response = await api.get(`/posts?q=${searchTerm}`);

      let initialUserLikes = {};
      let initialUserFavorites = {};
      if (currentUserId) {
        try {
          const likesResponse = await api.get(`/users/${currentUserId}/likes`, {
            headers: { Authorization: `Bearer ${await AsyncStorage.getItem('userToken')}` }
          });
          likesResponse.data.forEach(like => {
            initialUserLikes[like.post_id] = true;
          });
        } catch (likesError) {
          console.error('Erro ao buscar likes do usuário para inicialização:', likesError.response?.data || likesError.message);
        }
      }
      // Favoritos (persistência local; não precisa de rota no back)
      try {
        const saved = await AsyncStorage.getItem(`userFavorites_${currentUserId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            initialUserFavorites = parsed;
          }
        }
      } catch (favLoadError) {
        console.error('Erro ao carregar favoritos locais:', favLoadError);
      }

      setUserLikes(initialUserLikes);
      setUserFavorites(initialUserFavorites);
      setPosts(response.data);
    } catch (error) {
      console.error('Erro ao buscar posts:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível carregar os posts.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const pickPostImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPostImageUri(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Erro', 'Título e conteúdo do post não podem ser vazios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro de Autenticação', 'Você precisa estar logado para criar um post.');
        signOut();
        return;
      }

      let imageUrlToSave = null;
      if (newPostImageUri) {
        const formData = new FormData();
        const filename = newPostImageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";
 
        if (Platform.OS === "web") {
          const response = await fetch(newPostImageUri);
          const blob = await response.blob();
          formData.append("postImage", blob, filename);
        } else {
          const postImageFile = {
            uri: newPostImageUri,
            name: filename,
            type: type,
          };
          formData.append("postImage", postImageFile);
        }
 
        try {
          const uploadResponse = await api.post(
            "/upload/post-image",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${userToken}`,
              },
            }
          );
          imageUrlToSave = uploadResponse.data.imageUrl;
        } catch (uploadError) {
          console.error(
            "Erro ao fazer upload da imagem do post:",
            JSON.stringify(uploadError.response?.data) || uploadError.message
          );
          Alert.alert(
            "Erro de Upload",
            "Não foi possível fazer upload da imagem do post."
          );
          setIsSubmitting(false);
          return;
        }
      }

      await api.post(
        '/posts',
        { title: newPostTitle, content: newPostContent, image_url: imageUrlToSave },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      Alert.alert('Sucesso', 'Post criado com sucesso!');
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImageUri(null);
      fetchPosts();
    } catch (error) {
      console.error('Erro ao criar post:', error.response?.data || error.message);
      Alert.alert('Erro ao Criar Post', error.response?.data?.message || 'Ocorreu um erro ao criar o post.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Você precisa estar logado para curtir posts.');
        signOut();
        return;
      }
      const response = await api.post(
        `/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const liked = response.data.liked;
      setUserLikes(prevLikes => ({
        ...prevLikes,
        [postId]: liked,
      }));

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes_count: liked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1) }
            : post
        )
      );

    } catch (error) {
      console.error('Erro ao curtir/descurtir:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível processar o like.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    }
  };

const handleToggleFavorite = async (postId) => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      Alert.alert('Erro', 'Você precisa estar logado para favoritar posts.');
      signOut();
      return;
    }

    const response = await api.post(
      `/posts/${postId}/favorite`,
      {},
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    const favorited = !!response.data?.favorited;

    setUserFavorites(prev => {
      const updated = { ...prev, [postId]: favorited };
      if (currentUserId) {
        AsyncStorage.setItem(`userFavorites_${currentUserId}`, JSON.stringify(updated)).catch(() => {});
      }
      return updated;
    });
  } catch (error) {
    console.error('Erro ao favoritar/desfavoritar:', error.response?.data || error.message);
    Alert.alert('Erro', error.response?.data?.message || 'Não foi possível processar o favorito.');
    if (error.response?.status === 401 || error.response?.status === 403) {
      signOut?.();
    }
  }
};

  const handleLogout = async () => {
    try {
      await signOut(); 
      console.log('Logout bem-sucedido. Redirecionando...');
      // Isso substituirá a tela atual, impedindo que o usuário volte com o botão 'Voltar' do celular.
      navigation.replace('Auth');

    } catch (error) {
      console.error('Erro durante o processo de logout:', error);
      Alert.alert("Erro", "Não foi possível sair no momento.");
    }
  };

  const renderPostItem = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        {item.profile_picture_url ? (
          <Image source={{ uri: `http://localhost:3001${item.profile_picture_url}` }} style={styles.profilePicture} />
        ) : (
          <Ionicons name="person-circle" size={40} color="#ccc" style={styles.profilePicturePlaceholder} />
        )}
        <Text style={styles.postUsername}>{item.username}</Text>
      </View>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.image_url && <Image source={{ uri: `http://localhost:3001${item.image_url}` }} style={styles.postImage} />}
      <View style={styles.postFooter}>
        <TouchableOpacity style={styles.interactionButton} onPress={() => handleToggleLike(item.id)}>
          <Ionicons
            name={userLikes[item.id] ? 'heart' : 'heart-outline'}
            size={24}
            color={userLikes[item.id] ? 'red' : '#666'}
          />
          <Text style={styles.interactionText}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.interactionText}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => handleToggleFavorite(item.id)}>
          <Ionicons name={userFavorites[item.id] ? 'bookmark' : 'bookmark-outline'} size={24} color={userFavorites[item.id] ? '#A366FF' : '#666'}  />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ImageBackground source={background} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainContentLarge}>
          <View style={styles.profileContainer}>
            <View style={styles.profileContent}>
              {currentProfilePicture ? (
                <Image source={{ uri: `http://localhost:3001${currentProfilePicture}` }} style={styles.profilePictureLarge} />
              ) : (
                <Ionicons name="person-circle" size={80} color="#4DFFFF" style={styles.profilePictureLarge} />
              )}
            </View>
            <Text style={styles.profileUsername}>{currentUsername}</Text>
            <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.profileButtonText}>Ver Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Sair</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.forumContent}>
            <View style={styles.searchContainer}>
              <TouchableOpacity
                style={styles.searchInputWrapper}
                onPress={() => searchInputRef.current?.focus()}
              >
                <Animated.Text style={[styles.placeholder, createPlaceholderStyle(searchAnim)]}>
                  Pesquisar posts por título ou conteúdo...
                </Animated.Text>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  onFocus={() => animatePlaceholderUp(searchAnim)}
                  onBlur={() => animatePlaceholderDown(searchAnim, searchTerm)}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  onSubmitEditing={fetchPosts}
                  placeholderTextColor="transparent"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={fetchPosts} style={styles.searchButton}>
                <Ionicons name="search" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.createPostContainer}>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => newPostTitleRef.current?.focus()}
              >
                <Animated.Text style={[styles.placeholder, createPlaceholderStyle(newPostTitleAnim)]}>
                  Título do seu post
                </Animated.Text>
                <TextInput
                  ref={newPostTitleRef}
                  style={styles.input}
                  onFocus={() => animatePlaceholderUp(newPostTitleAnim)}
                  onBlur={() => animatePlaceholderDown(newPostTitleAnim, newPostTitle)}
                  value={newPostTitle}
                  onChangeText={setNewPostTitle}
                  placeholderTextColor="transparent"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => newPostContentRef.current?.focus()}
              >
                <Animated.Text style={[styles.placeholder, createPostContentPlaceholderStyle(newPostContentAnim)]}>
                  O que você quer compartilhar?
                </Animated.Text>
                <TextInput
                  ref={newPostContentRef}
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  onFocus={() => animatePlaceholderUp(newPostContentAnim)}
                  onBlur={() => animatePlaceholderDown(newPostContentAnim, newPostContent)}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  multiline
                  placeholderTextColor="transparent"
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={pickPostImage} style={styles.imagePickerButton}>
                <Ionicons name="image-outline" size={24} color="#0A192F" />
                <Text style={styles.imagePickerButtonText}>Adicionar Imagem</Text>
              </TouchableOpacity>
              {newPostImageUri && (
                <Image source={{ uri: newPostImageUri }} style={styles.previewImage} />
              )}
              <TouchableOpacity
                style={isSubmitting ? styles.submitButtonDisabled : styles.submitButton}
                onPress={handleCreatePost}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>{isSubmitting ? "Publicando..." : "Criar Post"}</Text>
              </TouchableOpacity>
            </View>

            {loadingPosts ? (
              <ActivityIndicator size="large" color="#4DFFFF" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPostItem}
                contentContainerStyle={styles.postList}
                ListEmptyComponent={<Text style={styles.noPostsText}>Nenhum post encontrado. Tente ajustar sua pesquisa ou seja o primeiro a postar!</Text>}
              />
            )}
          </View>
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

  mainContentLarge: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'flex-start',
  },
  profileContainer: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  profileContent: {
    alignItems: 'center',
    marginBottom: 15,
  },

  profileUsername: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileButton: {
    backgroundColor: '#F353D5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#F353D5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#A366FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forumContent: {
    flex: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4DFFFF',
    shadowColor: '#4DFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    padding: 15,
    fontSize: 16,
    color: '#E5E5E5',
    borderRadius: 15,
    borderStartEndRadius: 0,
    borderBottomRightRadius: 0,
  },
  searchButton: {
    backgroundColor: '#A366FF',
    padding: 15,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  createPostContainer: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    padding: 20,
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#4DFFFF',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    color: '#E5E5E5',
    fontSize: 16,
  },
  placeholder: {
    position: 'absolute',
    left: 20,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4DFFFF',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  imagePickerButtonText: {
    marginLeft: 10,
    color: '#0A192F',
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  submitButton: {
    backgroundColor: '#F353D5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#F353D5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#F353D5',
    opacity: 0.6,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postList: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
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
    marginRight: 10,
  },
  postUsername: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#E5E5E5',
  },
  postTitle: {
    fontSize: 18,
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
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#A366FF',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  interactionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#E5E5E5',
  },
  noPostsText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;