import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function Navbar({ activeTab, setActiveTab, logout }) {
  const tabs = [
    { key: 'cursos', label: 'Cursos' },
    { key: 'alumnos', label: 'Alumnos' },
    { key: 'monitoreo', label: 'Monitoreo' },
    { key: 'admin', label: 'Administración' },
  ];

  return (
    <View style={styles.navbar}>
      <Text style={styles.brandTitle}>EEST N°7 - Panel Director</Text>
      <View style={styles.navTabs}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.navTabText, activeTab === tab.key && styles.navTabActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Salir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: { height: 65, backgroundColor: '#0f2a4a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  brandTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  navTabs: { flexDirection: 'row', gap: 20 },
  navTabText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
  navTabActive: { color: '#38bdf8', borderBottomWidth: 2, borderBottomColor: '#38bdf8' },
  logoutBtn: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});