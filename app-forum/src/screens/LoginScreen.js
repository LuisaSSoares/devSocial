import React, { useState, useContext, useRef } from 'react';
import { Animated, View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ImageBackground } from 'react-native';
import api from '../services/api';
import AuthContext from '../context/AuthContext';

import background from '../../assets/3312580.jpg';

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useContext(AuthContext);

  // Crie as referências para os TextInputs
  const identifierInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Crie os valores de animação para o placeholder
  const identifierAnim = useRef(new Animated.Value(0)).current;
  const passwordAnim = useRef(new Animated.Value(0)).current;

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

  const handleLogin = async () => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      Alert.alert('Sucesso', 'Login realizado com sucesso!');
      await signIn(response.data.token, response.data.user);
    } catch (error) {
      console.error('Erro no login:', error.response?.data || error.message);
      Alert.alert('Erro no Login', error.response?.data?.message || 'Ocorreu um erro ao tentar fazer login.');
    }
  };

  // Mapeie os valores de animação para as propriedades de estilo
  const identifierPlaceholderStyle = {
    top: identifierAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    }),
    fontSize: identifierAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: identifierAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E9D8E1', '#88C9FA'],
    }),
  };

  const passwordPlaceholderStyle = {
    top: passwordAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    }),
    fontSize: passwordAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: passwordAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E9D8E1', '#88C9FA'],
    }),
  };

  return (
    <ImageBackground source={background} style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>Bem-vindo!</Text>

        {/* 5. TextInput para Usuário */}
        <TouchableOpacity 
          style={styles.inputContainer} 
          onPress={() => identifierInputRef.current?.focus()}
        >
          <Animated.Text style={[styles.placeholder, identifierPlaceholderStyle]}>
            Usuário ou E-mail
          </Animated.Text>
          <TextInput
            ref={identifierInputRef}
            style={styles.input}
            onFocus={() => animatePlaceholderUp(identifierAnim)}
            onBlur={() => animatePlaceholderDown(identifierAnim, identifier)}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />
        </TouchableOpacity>

        {/* 6. TextInput para Senha */}
        <TouchableOpacity 
          style={styles.inputContainer}
          onPress={() => passwordInputRef.current?.focus()}
        >
          <Animated.Text style={[styles.placeholder, passwordPlaceholderStyle]}>
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

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          
          <Text style={styles.buttonText}>ENTRAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>Não tem uma conta? Cadastre-se</Text>
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
  buttonPressed: {
    transform: [{ scale: 0.95 }], 
    backgroundColor: '#C530A2', 
    shadowOpacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerText: {
    marginTop: 20,
    color: '#F353D5',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;