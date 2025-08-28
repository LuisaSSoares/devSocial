// src/screens/EditPostScreen.js

import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Alert,
  TouchableOpacity, Image, ScrollView, ActivityIndicator,
  ImageBackground, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import background from '../../assets/3348271.jpg';
import * as ImagePicker from 'expo-image-picker';

const EditPostScreen = ({ navigation, route }) => {
  const { post } = route.params; // Recebe o post do ProfileScreen
  const { signOut } = useContext(AuthContext);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  // Garante que a URL seja completa para a renderização da imagem
  const [imageUri, setImageUri] = useState(post.image_url ? `http://localhost:3001${post.image_url}` : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageChanging, setIsImageChanging] = useState(false);

  useEffect(() => {
    (async () => {
      // Solicita permissão da galeria de fotos
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Desculpe, precisamos de permissão para acessar a galeria de fotos.');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    setIsImageChanging(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
    setIsImageChanging(false);
  };

  const handleUpdatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Erro', 'Título e conteúdo não podem ser vazios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro de Autenticação', 'Você precisa estar logado.');
        signOut();
        return;
      }

      let imageUrlToSave = post.image_url; // Mantém a imagem existente por padrão

      // Se o usuário selecionou uma nova imagem
      if (imageUri && imageUri !== `http://localhost:3001${post.image_url}`) {
        const formData = new FormData();
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";

        if (Platform.OS === "web") {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          formData.append("postImage", blob, filename);
        } else {
          const postImageFile = {
            uri: imageUri,
            name: filename,
            type: type,
          };
          formData.append("postImage", postImageFile);
        }

        try {
          const uploadResponse = await api.post(
            "/upload/post-image",
            formData, {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${userToken}`,
              },
            }
          );
          imageUrlToSave = uploadResponse.data.imageUrl;
        } catch (uploadError) {
          console.error("Erro ao fazer upload da nova imagem:", uploadError.response?.data || uploadError.message);
          Alert.alert("Erro de Upload", "Não foi possível fazer upload da nova imagem.");
          setIsSubmitting(false);
          return;
        }
      }

      // Envia os dados atualizados para o backend usando PUT
      const response = await api.put(`/posts/${post.id}`, {
        title,
        content,
        image_url: imageUrlToSave,
      }, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.status === 200) {
        Alert.alert('Sucesso', 'Post atualizado com sucesso!');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erro ao editar post:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível atualizar o post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ImageBackground source={background} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#4DFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Editar Post</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Container principal que agrupa os elementos editáveis */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Digite o título do post"
              placeholderTextColor="#999"
            />
            <Text style={styles.label}>Conteúdo</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              value={content}
              onChangeText={setContent}
              placeholder="O que você está pensando?"
              placeholderTextColor="#999"
              multiline
            />

            <Text style={styles.label}>Imagem</Text>
            <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
              <Ionicons name="image" size={24} color="#A366FF" />
              <Text style={styles.imagePickerText}>{imageUri ? "Mudar Imagem" : "Adicionar Imagem"}</Text>
            </TouchableOpacity>
            {isImageChanging && <ActivityIndicator size="small" color="#4DFFFF" style={{ marginTop: 10 }} />}
            {imageUri && (
              <Image source={{ uri: imageUri }} style={[styles.postImagePreview, styles.imageBorder]} />
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpdatePost}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#E5E5E5" />
              ) : (
                <Text style={styles.submitButtonText}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>
          </View>
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
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 5,
  },
  // Estilo do contêiner do perfil replicado para o formulário de edição
  formCard: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4DFFFF',
    shadowColor: '#4DFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    marginTop: 15, 
    shadowRadius: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    borderWidth: 1,
    borderColor: '#A366FF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#E5E5E5',
  },
  contentInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    borderWidth: 1,
    borderColor: '#A366FF',
    borderRadius: 10,
    padding: 15,
    marginTop: 5,
  },
  imagePickerText: {
    color: '#A366FF',
    marginLeft: 10,
    fontSize: 16,
  },
  postImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 15,
    resizeMode: 'cover',
  },

  imageBorder: {
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  submitButton: {
    backgroundColor: '#F353D5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#E5E5E5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#555',
  },
});

export default EditPostScreen;
