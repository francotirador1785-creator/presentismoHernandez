import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

// Importaremos las pantallas en los siguientes pasos
import LoginScreen from '../screens/auth/LoginScreen';
import DirectorDashboard from '../screens/director/DirectorDashboard';
import ProfesorScreen from '../screens/profesor/ProfesorScreen';
import MonitoreoScreen from '../screens/monitoreo/MonitoreoScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, userRole, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : userRole === 'director' ? (
          <Stack.Screen name="Director" component={DirectorDashboard} />
        ) : userRole === 'profesor' ? (
          <Stack.Screen name="Profesor" component={ProfesorScreen} />
        ) : (
          <Stack.Screen name="Monitoreo" component={MonitoreoScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

