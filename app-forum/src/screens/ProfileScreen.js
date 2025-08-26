// src/screens/ProfileScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Alert, Button, Image, TouchableOpacity, FlatList, ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import background from '../../assets/3348271.jpg'; // Importa a mesma imagem de fundo

const ProfileScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [favoritePosts, setFavoritePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('myPosts');

  useEffect(() => {
    // Adicionar um listener para focar na tela e recarregar os dados
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfileData();
    });
    return unsubscribe; // Limpar o listener
  }, [navigation]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Token de autenticação não encontrado.');
        signOut();
        return;
      }

      const userResponse = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setUser(userResponse.data);

      const myPostsResponse = await api.get('/users/me/posts', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setMyPosts(myPostsResponse.data);

      const favoritePostsResponse = await api.get('/users/me/favorites', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      // CORREÇÃO AQUI: Use favoritePostsResponse.data
      setFavoritePosts(favoritePostsResponse.data); // LINHA CORRIGIDA

    } catch (error) {
      console.error('Erro ao buscar dados do perfil:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível carregar o perfil.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPostItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
      <View style={styles.postCard}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContentPreview}>{item.content.substring(0, 100)}...</Text>
        <View style={styles.postStatsRow}>
          <Text style={styles.postStatItem}>{item.likes_count} Curtidas</Text>
          <Text style={styles.postStatItem}>{item.comments_count} Comentários</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4DFFFF" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Perfil não encontrado.</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={background} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#4DFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { user })} style={styles.editButton}>
            <Ionicons name="settings-outline" size={24} color="#A366FF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {/* Informações do Usuário */}
          <View style={styles.profileInfoCard}>
            {/* Garante que a URL da imagem esteja completa */}
            {user.profile_picture_url ? (
              <Image source={{ uri: `http://localhost:3001${user.profile_picture_url}` }} style={styles.profilePicture} />
            ) : (
              <Ionicons name="person-circle" size={100} color="#4DFFFF" style={styles.profilePicturePlaceholder} />
            )}
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.memberSince}>Membro desde: {new Date(user.created_at).toLocaleDateString('pt-BR')}</Text>
          </View>

          {/* Abas de Navegação */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'myPosts' && styles.activeTab]}
              onPress={() => setActiveTab('myPosts')}
            >
              <Text style={[styles.tabText, activeTab === 'myPosts' && styles.activeTabText]}>Meus Posts ({myPosts.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'favorites' && styles.activeTab]}
              onPress={() => setActiveTab('favorites')}
            >
              <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>Favoritos ({favoritePosts.length})</Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo da Aba Ativa */}
          {activeTab === 'myPosts' ? (
            myPosts.length > 0 ? (
              <FlatList
                data={myPosts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPostItem}
                scrollEnabled={false}
                contentContainerStyle={styles.postListContent}
              />
            ) : (
              <Text style={styles.noContentText}>Você ainda não fez nenhum post.</Text>
            )
          ) : (
            favoritePosts.length > 0 ? (
              <FlatList
                data={favoritePosts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPostItem}
                scrollEnabled={false}
                contentContainerStyle={styles.postListContent}
              />
            ) : (
              <Text style={styles.noContentText}>Você ainda não favoritou nenhum post.</Text>
            )
          )}
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A192F',
  },
  loadingText: {
    marginTop: 10,
    color: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#A366FF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E5E5E5',
  },
  backButton: {
    padding: 5,
  },
  editButton: {
    padding: 5,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  profileInfoCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    padding: 20,
    margin: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#4DFFFF',
  },
  profilePicturePlaceholder: {
    marginBottom: 15,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: '#888',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 15,
    marginTop: 10,
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4DFFFF',
    shadowColor: '#4DFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#F353D5',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E5E5E5',
  },
  activeTabText: {
    color: '#F353D5',
  },
  postListContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4DFFFF',
  },
  postContentPreview: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
  },
  postStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#A366FF',
    paddingTop: 8,
  },
  postStatItem: {
    fontSize: 13,
    color: '#E5E5E5',
  },
  noContentText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#E5E5E5',
    marginHorizontal: 15,
  },
});

export default ProfileScreen;