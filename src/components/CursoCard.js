import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function CursoCard({ curso, cantidadAlumnos, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{curso.anio}º {curso.division} {curso.especialidad}</Text>
      <Text style={styles.subtitle}>Cant. Alumnos: {cantidadAlumnos}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#8b93cb', borderRadius: 8, padding: 12, width: 130, height: 80, justifyContent: 'center', alignItems: 'center', margin: 6 },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  subtitle: { color: '#e0e7ff', fontSize: 11, marginTop: 4 }
});