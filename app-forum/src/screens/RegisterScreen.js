// src/screens/RegisterScreen.js

import React, { useState, useRef, useContext } from 'react';
import { Animated, View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ImageBackground } from 'react-native';
import api from '../services/api';
import background from '../../assets/3312580.jpg';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const usernameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const usernameAnim = useRef(new Animated.Value(0)).current;
  const emailAnim = useRef(new Animated.Value(0)).current;
  const passwordAnim = useRef(new Animated.Value(0)).current;

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

  const handleRegister = async () => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      Alert.alert('Sucesso', 'Usuário cadastrado com sucesso! Faça login para continuar.');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Erro no cadastro:', error.response?.data || error.message);
      Alert.alert('Erro no Cadastro', error.response?.data?.message || 'Ocorreu um erro ao tentar cadastrar.');
    }
  };

  const placeholderStyle = (animValue) => ({
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
      outputRange: ['#E9D8E1', '#88C9FA'],
    }),
  });

  return (
    <ImageBackground source={background} style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>Crie sua conta</Text>

        <TouchableOpacity 
          style={styles.inputContainer}
          onPress={() => usernameInputRef.current?.focus()}
        >
          <Animated.Text style={[styles.placeholder, placeholderStyle(usernameAnim)]}>
            Nome de Usuário
          </Animated.Text>
          <TextInput
            ref={usernameInputRef}
            style={styles.input}
            onFocus={() => animatePlaceholderUp(usernameAnim)}
            onBlur={() => animatePlaceholderDown(usernameAnim, username)}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.inputContainer}
          onPress={() => emailInputRef.current?.focus()}
        >
          <Animated.Text style={[styles.placeholder, placeholderStyle(emailAnim)]}>
            E-mail
          </Animated.Text>
          <TextInput
            ref={emailInputRef}
            style={styles.input}
            onFocus={() => animatePlaceholderUp(emailAnim)}
            onBlur={() => animatePlaceholderDown(emailAnim, email)}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.inputContainer}
          onPress={() => passwordInputRef.current?.focus()}
        >
          <Animated.Text style={[styles.placeholder, placeholderStyle(passwordAnim)]}>
            Senha
          </Animated.Text>
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            onFocus={() => animatePlaceholderUp(passwordAnim)}
            onBlur={() => animatePlaceholderDown(passwordAnim, password)}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>CADASTRAR</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginText}>Já tem uma conta? Faça login</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  inputContainer: {
    width: 300,
    marginBottom: 15,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#88C9FA',
    borderRadius: 8,
    backgroundColor: 'rgba(43, 24, 163, 0.5)',
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    position: 'absolute',
    left: 15,
  },
  button: {
    width: 300,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F353D5',
    marginTop: 10,
    shadowColor: '#F353D5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginText: {
    marginTop: 20,
    color: '#F353D5',
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;