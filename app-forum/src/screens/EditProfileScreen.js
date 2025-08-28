// src/screens/EditProfileScreen.js

import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  ScrollView, ActivityIndicator, Image, TouchableOpacity,
  Platform, ImageBackground, Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Modal from 'react-native-modal';

import background from '../../assets/3348271.jpg';

const { width } = Dimensions.get('window');

const EditProfileScreen = ({ route, navigation }) => {
  const { user: initialUser } = route.params;
  const { signOut } = useContext(AuthContext);

  const [username, setUsername] = useState(initialUser.username);
  const [email, setEmail] = useState(initialUser.email);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState(initialUser.profile_picture_url);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);

  // Animação dos placeholders
  const usernameAnim = useRef(new Animated.Value(username ? 1 : 0)).current;
  const emailAnim = useRef(new Animated.Value(email ? 1 : 0)).current;
  const oldPasswordAnim = useRef(new Animated.Value(oldPassword ? 1 : 0)).current;
  const newPasswordAnim = useRef(new Animated.Value(newPassword ? 1 : 0)).current;
  const confirmNewPasswordAnim = useRef(new Animated.Value(confirmNewPassword ? 1 : 0)).current;

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

  // Garante que a permissão de galeria seja solicitada
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Negada', 'Desculpe, precisamos de permissões de galeria para isso funcionar!');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
      setProfilePictureUrl(result.assets[0].uri);
    }
  };

  // NOVA FUNÇÃO: Lidar com a exclusão da foto de perfil
  const handleDeleteProfilePicture = async () => {
    setDeleteModalVisible(false); // Fecha o modal imediatamente
    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      await api.put('/users/me/profile-picture', {}, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      setProfilePictureUrl(null);
      setSelectedImageUri(null);
      Alert.alert('Sucesso', 'Foto de perfil excluída com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao excluir a foto de perfil:', error.response ? error.response.data : error.message);
      Alert.alert('Erro', 'Ocorreu um erro ao excluir a foto de perfil. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSubmitting(true);
    const updatedData = {};
    let finalProfilePictureUrl = profilePictureUrl;
  
    // 1. Lógica para UPLOAD da imagem (se houver)
    if (selectedImageUri) {
      try {
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('profilePicture', blob, `profile-${Date.now()}.jpg`);
  
        const userToken = await AsyncStorage.getItem('userToken');
        const uploadResponse = await api.post('/upload/profile-picture', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${userToken}`,
          },
        });
  
        if (uploadResponse.data && uploadResponse.data.imageUrl) {
          finalProfilePictureUrl = uploadResponse.data.imageUrl;
        } else {
          Alert.alert('Erro no Upload', 'Ocorreu um erro ao fazer upload da imagem. Por favor, tente novamente.');
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error.response ? error.response.data : error.message);
        Alert.alert('Erro no Upload', 'Ocorreu um erro ao fazer upload da imagem. Verifique sua conexão ou se está logado.');
        setIsSubmitting(false);
        return;
      }
    }
  
    // 2. Lógica para ATUALIZAR DADOS do perfil (incluindo senhas)
    if (username !== initialUser.username) {
      updatedData.username = username;
    }
    if (email !== initialUser.email) {
      updatedData.email = email;
    }
    if (finalProfilePictureUrl !== initialUser.profile_picture_url) {
      updatedData.profile_picture_url = finalProfilePictureUrl;
    }
  
    // Lógica para alterar a senha
    if (oldPassword || newPassword || confirmNewPassword) {
      if (!oldPassword || !newPassword || !confirmNewPassword) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos de senha para alterá-la.');
        setIsSubmitting(false);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        Alert.alert('Erro', 'A nova senha e a confirmação de senha não coincidem.');
        setIsSubmitting(false);
        return;
      }
      updatedData.old_password = oldPassword;
      updatedData.new_password = newPassword;
    }
  
    if (Object.keys(updatedData).length === 0) {
      Alert.alert('Nenhuma alteração', 'Nenhum dado do perfil foi alterado.');
      setIsSubmitting(false);
      return;
    }
  
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const response = await api.put('/users/me', updatedData, {
        headers: {
            'Authorization': `Bearer ${userToken}`,
        },
      });
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      
      const newUserData = { ...initialUser, ...updatedData };
      await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error.response ? error.response.data : error.message);
      Alert.alert('Erro', 'Erro ao atualizar o perfil. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <ImageBackground source={background} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#A366FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.formContainer}>
            {/* Contêiner de foto de perfil e texto */}
            <TouchableOpacity style={styles.profilePictureContainer} onPress={pickImage}>
              {selectedImageUri || profilePictureUrl ? (
                <Image
                  source={{ uri: selectedImageUri || `http://localhost:3001${profilePictureUrl}` }}
                  style={styles.profilePicture}
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Ionicons name="person" size={80} color="#666" />
                </View>
              )}
              <Text style={styles.changePhotoText}>Alterar Foto de Perfil</Text>
            </TouchableOpacity>

            {/* BOTÃO DE EXCLUSÃO CONDICIONAL */}
            {(profilePictureUrl || selectedImageUri) && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteModalVisible(true)}>
                <Text style={styles.deleteButtonText}>Excluir Foto de Perfil</Text>
              </TouchableOpacity>
            )}

            {/* Input de Nome de Usuário com Placeholder Animado */}
            <View style={styles.inputContainer}>
              <Animated.Text style={[styles.placeholder, getAnimatedPlaceholderStyle(usernameAnim)]}>
                Nome de Usuário
              </Animated.Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                onFocus={() => animatePlaceholderUp(usernameAnim)}
                onBlur={() => animatePlaceholderDown(usernameAnim, username)}
                autoCapitalize="none"
              />
            </View>
            
            {/* Input de E-mail com Placeholder Animado */}
            <View style={styles.inputContainer}>
              <Animated.Text style={[styles.placeholder, getAnimatedPlaceholderStyle(emailAnim)]}>
                E-mail
              </Animated.Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onFocus={() => animatePlaceholderUp(emailAnim)}
                onBlur={() => animatePlaceholderDown(emailAnim, email)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.passwordSection}>
              <Text style={styles.sectionTitle}>Alterar Senha</Text>
              
              {/* Input de Senha Antiga com Placeholder Animado */}
              <View style={styles.inputContainer}>
                <Animated.Text style={[styles.placeholder, getAnimatedPlaceholderStyle(oldPasswordAnim)]}>
                  Senha Antiga
                </Animated.Text>
                <TextInput
                  style={styles.input}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  onFocus={() => animatePlaceholderUp(oldPasswordAnim)}
                  onBlur={() => animatePlaceholderDown(oldPasswordAnim, oldPassword)}
                  secureTextEntry
                />
              </View>

              {/* Input de Nova Senha com Placeholder Animado */}
              <View style={styles.inputContainer}>
                <Animated.Text style={[styles.placeholder, getAnimatedPlaceholderStyle(newPasswordAnim)]}>
                  Nova Senha
                </Animated.Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => animatePlaceholderUp(newPasswordAnim)}
                  onBlur={() => animatePlaceholderDown(newPasswordAnim, newPassword)}
                  secureTextEntry
                />
              </View>

              {/* Input de Confirmar Nova Senha com Placeholder Animado */}
              <View style={styles.inputContainer}>
                <Animated.Text style={[styles.placeholder, getAnimatedPlaceholderStyle(confirmNewPasswordAnim)]}>
                  Confirmar Nova Senha
                </Animated.Text>
                <TextInput
                  style={styles.input}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  onFocus={() => animatePlaceholderUp(confirmNewPasswordAnim)}
                  onBlur={() => animatePlaceholderDown(confirmNewPasswordAnim, confirmNewPassword)}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={isSubmitting ? styles.submitButtonDisabled : styles.submitButton}
              onPress={handleUpdateProfile}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal de confirmação de exclusão */}
        <Modal
          isVisible={isDeleteModalVisible}
          onBackdropPress={() => setDeleteModalVisible(false)}
          animationIn="fadeIn"
          animationOut="fadeOut"
          style={styles.modal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
            <Text style={styles.modalMessage}>Tem certeza de que deseja excluir sua foto de perfil? Esta ação não pode ser desfeita.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteAction]}
                onPress={handleDeleteProfilePicture}
              >
                <Text style={styles.modalButtonText}>Apagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  scrollViewContent: {
    padding: 20,
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#A366FF',
    shadowColor: '#A366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#4DFFFF',
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(77, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    marginTop: 10,
    color: '#4DFFFF',
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 10,
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'rgba(243, 83, 213, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F353D5',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F353D5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 15,
    width: '100%',
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
  passwordSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#A366FF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A366FF',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#F353D5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#F353D5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
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
  // NOVOS ESTILOS DO MODAL
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
    width: width * 0.8,
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
  modalButtons: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  deleteAction: {
    backgroundColor: '#F353D5',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;