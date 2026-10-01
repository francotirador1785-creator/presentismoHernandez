import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';

import { supabase } from '../../api/supabase';

export default function PorteriaScreen() {
  const [cursos, setCursos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [selectedCurso, setSelectedCurso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  // carga datos
  const cargarDatos = async () => {
    try {
      setLoading(true);

      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select('*')
        .order('anio')
        .order('division');

      if (cursosError) {
        console.error('Error cargando cursos:', cursosError.message);
        Alert.alert('Error', 'No se pudieron cargar los cursos.');
        return;
      }

      setCursos(cursosData || []);

      if (cursosData && cursosData.length > 0) {
        seleccionarCurso(cursosData[0]);
      }
    } catch (error) {
      console.error('Error general:', error);
      Alert.alert('Error', 'Ocurrió un problema al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // elige curso
  const seleccionarCurso = async (curso) => {
    if (!curso) return;

    setSelectedCurso(curso);

    const { data: alumnosData, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('curso_id', curso.id)
      .order('apellido');

    if (error) {
      console.error('Error cargando alumnos:', error.message);
      Alert.alert('Error', 'No se pudieron cargar los alumnos.');
      return;
    }

    setAlumnos(alumnosData || []);

    await cargarAsistencia(curso.id, alumnosData || []);
  };

  // carga asistencia
  const cargarAsistencia = async (cursoId, alumnosCurso) => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const idsAlumnos = alumnosCurso.map((alumno) => alumno.id);

      if (idsAlumnos.length === 0) {
        setAsistencias({});
        return;
      }

      const { data, error } = await supabase
        .from('asistencias')
        .select('*')
        .eq('fecha', hoy)
        .in('alumno_id', idsAlumnos);

      if (error) {
        console.error('Error cargando asistencia:', error.message);
        return;
      }

      const asistenciaActual = {};

      data?.forEach((registro) => {
        asistenciaActual[registro.alumno_id] =
          registro.estado ||
          (registro.presente ? 'presente' : 'ausente');
      });

      setAsistencias(asistenciaActual);
    } catch (error) {
      console.error('Error cargando asistencia:', error);
    }
  };

  // actualiza
  const actualizarMonitoreo = async () => {
    if (!selectedCurso) return;

    try {
      setActualizando(true);

      const { data: alumnosData, error } = await supabase
        .from('alumnos')
        .select('*')
        .eq('curso_id', selectedCurso.id)
        .order('apellido');

      if (error) throw error;

      setAlumnos(alumnosData || []);

      await cargarAsistencia(selectedCurso.id, alumnosData || []);
    } catch (error) {
      console.error('Error actualizando:', error);
      Alert.alert('Error', 'No se pudo actualizar el monitoreo.');
    } finally {
      setActualizando(false);
    }
  };

  // cierra sesion
  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error cerrando sesión:', error.message);
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  };

  // estadisticas
  const cantidadPresentes = alumnos.filter(
    (alumno) => asistencias[alumno.id] === 'presente'
  ).length;

  const cantidadAusentes = alumnos.filter(
    (alumno) => asistencias[alumno.id] === 'ausente'
  ).length;

  const cantidadTarde = alumnos.filter(
    (alumno) => asistencias[alumno.id] === 'tarde'
  ).length;

  const cantidadRetirados = alumnos.filter(
    (alumno) => asistencias[alumno.id] === 'se_retiro'
  ).length;

  const cantidadSinRegistrar = alumnos.filter(
    (alumno) => asistencias[alumno.id] === undefined
  ).length;

  // estado
  const obtenerTextoEstado = (estado) => {
    switch (estado) {
      case 'presente':
        return '✓ Presente';
      case 'ausente':
        return '✕ Ausente';
      case 'tarde':
        return '🕐 Llegó tarde';
      case 'se_retiro':
        return '↪ Se retiró';
      default:
        return '⚠ Sin registrar';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Cargando...</Text>
        <Text style={styles.loadingText}>
          Preparando el monitoreo de portería
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Presentismo Hernández</Text>
          <Text style={styles.headerSubtitle}>Monitoreo de Portería</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={cerrarSesion}
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={actualizarMonitoreo}
            disabled={actualizando}
          >
            <Text style={styles.refreshText}>
              {actualizando ? 'Actualizando...' : '↻ Actualizar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainLayout}>
        {/* cursos */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Cursos</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {cursos.length === 0 ? (
              <View style={styles.emptySidebar}>
                <Text style={styles.emptySidebarText}>
                  No hay cursos registrados.
                </Text>
              </View>
            ) : (
              cursos.map((curso) => {
                const seleccionado = selectedCurso?.id === curso.id;

                return (
                  <TouchableOpacity
                    key={curso.id}
                    style={[
                      styles.cursoCard,
                      seleccionado
                        ? styles.cursoCardSelected
                        : styles.cursoCardUnselected
                    ]}
                    onPress={() => seleccionarCurso(curso)}
                  >
                    <Text style={styles.cursoTitle}>
                      {curso.anio}º {curso.division}
                    </Text>

                    <Text style={styles.cursoEspecialidad}>
                      {curso.especialidad || 'Sin especialidad'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* contenido */}
        <View style={styles.contentArea}>
          {!selectedCurso ? (
            <View style={styles.noCourse}>
              <Text style={styles.noCourseIcon}>🛡️</Text>

              <Text style={styles.noCourseTitle}>
                Seleccione un curso
              </Text>

              <Text style={styles.noCourseText}>
                Seleccione un curso para comenzar el monitoreo.
              </Text>
            </View>
          ) : (
            <View style={styles.monitoringArea}>
              {/* curso */}
              <View style={styles.courseHeader}>
                <View>
                  <Text style={styles.courseTitle}>
                    {selectedCurso.anio}º {selectedCurso.division}{' '}
                    {selectedCurso.especialidad}
                  </Text>

                  <Text style={styles.courseSubtitle}>
                    Monitoreo de asistencia
                  </Text>
                </View>

                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>
                    {new Date().toLocaleDateString('es-AR')}
                  </Text>
                </View>
              </View>

              {/* aviso */}
              {cantidadRetirados > 0 && (
                <View style={styles.warningBox}>
                  <View style={styles.warningIconContainer}>
                    <Text style={styles.warningIcon}>↪</Text>
                  </View>

                  <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>
                      Alumnos retirados
                    </Text>

                    <Text style={styles.warningText}>
                      Hay {cantidadRetirados} alumno
                      {cantidadRetirados !== 1 ? 's' : ''} registrado
                      {cantidadRetirados !== 1 ? 's' : ''} como retirado
                      {cantidadRetirados !== 1 ? 's' : ''}.
                    </Text>
                  </View>
                </View>
              )}

              {/* estadisticas */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{alumnos.length}</Text>
                  <Text style={styles.statLabel}>Alumnos</Text>
                </View>

                <View style={[styles.statCard, styles.statPresent]}>
                  <Text style={styles.statNumber}>{cantidadPresentes}</Text>
                  <Text style={styles.statLabel}>Presentes</Text>
                </View>

                <View style={[styles.statCard, styles.statAbsent]}>
                  <Text style={styles.statNumber}>{cantidadAusentes}</Text>
                  <Text style={styles.statLabel}>Ausentes</Text>
                </View>

                <View style={[styles.statCard, styles.statLate]}>
                  <Text style={styles.statNumber}>{cantidadTarde}</Text>
                  <Text style={styles.statLabel}>Tarde</Text>
                </View>

                <View style={[styles.statCard, styles.statLeft]}>
                  <Text style={styles.statNumber}>{cantidadRetirados}</Text>
                  <Text style={styles.statLabel}>Retirados</Text>
                </View>

                <View style={[styles.statCard, styles.statPending]}>
                  <Text style={styles.statNumber}>
                    {cantidadSinRegistrar}
                  </Text>
                  <Text style={styles.statLabel}>Sin registrar</Text>
                </View>
              </View>

              {/* lista */}
              <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                  <View>
                    <Text style={styles.listTitle}>
                      Estado de los alumnos
                    </Text>

                    <Text style={styles.listSubtitle}>
                      Información registrada por los profesores
                    </Text>
                  </View>
                </View>

                <ScrollView
                  style={styles.studentsScroll}
                  contentContainerStyle={styles.studentsContent}
                  showsVerticalScrollIndicator={false}
                >
                  {alumnos.length === 0 ? (
                    <View style={styles.emptyStudents}>
                      <Text style={styles.emptyStudentsIcon}>👥</Text>

                      <Text style={styles.emptyStudentsText}>
                        No hay alumnos registrados en este curso.
                      </Text>
                    </View>
                  ) : (
                    alumnos.map((alumno, index) => {
                      const estado = asistencias[alumno.id];

                      return (
                        <View
                          key={alumno.id}
                          style={[
                            styles.studentRow,
                            estado === 'presente' &&
                              styles.studentPresent,
                            estado === 'ausente' &&
                              styles.studentAbsent,
                            estado === 'tarde' &&
                              styles.studentLate,
                            estado === 'se_retiro' &&
                              styles.studentLeft,
                            !estado && styles.studentPending
                          ]}
                        >
                          <View style={styles.studentInfo}>
                            <View style={styles.studentNumber}>
                              <Text style={styles.studentNumberText}>
                                {index + 1}
                              </Text>
                            </View>

                            <View>
                              <Text style={styles.studentName}>
                                {alumno.apellido}, {alumno.nombre}
                              </Text>

                              <Text style={styles.studentDni}>
                                DNI: {alumno.dni || 'Sin registrar'}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              estado === 'presente' &&
                                styles.statusPresent,
                              estado === 'ausente' &&
                                styles.statusAbsent,
                              estado === 'tarde' &&
                                styles.statusLate,
                              estado === 'se_retiro' &&
                                styles.statusLeft,
                              !estado && styles.statusPending
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                estado === 'presente' &&
                                  styles.statusTextLight,
                                estado === 'ausente' &&
                                  styles.statusTextLight,
                                estado === 'tarde' &&
                                  styles.statusTextDark,
                                estado === 'se_retiro' &&
                                  styles.statusTextLight
                              ]}
                            >
                              {obtenerTextoEstado(estado)}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // header
  header: {
    height: 80,
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },

  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold'
  },

  headerSubtitle: {
    color: '#c7d2fe',
    fontSize: 13,
    marginTop: 3
  },

  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 7
  },

  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },

  refreshButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 7
  },

  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },

  // layout
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 15,
    gap: 15
  },

  // cursos
  sidebar: {
    width: 210,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },

  sidebarTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12
  },

  cursoCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },

  cursoCardSelected: {
    backgroundColor: '#eab308'
  },

  cursoCardUnselected: {
    backgroundColor: '#818cf8'
  },

  cursoTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold'
  },

  cursoEspecialidad: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2
  },

  emptySidebar: {
    padding: 10
  },

  emptySidebarText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic'
  },

  // contenido
  contentArea: {
    flex: 1
  },

  monitoringArea: {
    flex: 1
  },

  noCourse: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },

  noCourseIcon: {
    fontSize: 45,
    marginBottom: 12
  },

  noCourseTitle: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#0f172a'
  },

  noCourseText: {
    color: '#64748b',
    marginTop: 7,
    textAlign: 'center'
  },

  // curso
  courseHeader: {
    backgroundColor: '#c7d2fe',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1e1b4b',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },

  courseTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#1e1b4b'
  },

  courseSubtitle: {
    color: '#334155',
    marginTop: 3,
    fontSize: 13
  },

  dateBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8
  },

  dateText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },

  // aviso
  warningBox: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#818cf8',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },

  warningIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },

  warningIcon: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold'
  },

  warningContent: {
    flex: 1
  },

  warningTitle: {
    color: '#3730a3',
    fontWeight: 'bold',
    fontSize: 14
  },

  warningText: {
    color: '#4338ca',
    fontSize: 12,
    marginTop: 2
  },

  // estadisticas
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },

  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },

  statPresent: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4'
  },

  statAbsent: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2'
  },

  statLate: {
    borderColor: '#facc15',
    backgroundColor: '#fffbeb'
  },

  statLeft: {
    borderColor: '#818cf8',
    backgroundColor: '#eef2ff'
  },

  statPending: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb'
  },

  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a'
  },

  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },

  // lista
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 15
  },

  listHeader: {
    marginBottom: 10
  },

  listTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0f172a'
  },

  listSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },

  studentsScroll: {
    flex: 1
  },

  studentsContent: {
    paddingBottom: 10
  },

  // alumno
  studentRow: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  studentPresent: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac'
  },

  studentAbsent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5'
  },

  studentLate: {
    backgroundColor: '#fffbeb',
    borderColor: '#facc15'
  },

  studentLeft: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8'
  },

  studentPending: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1'
  },

  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },

  studentNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },

  studentNumberText: {
    color: '#3730a3',
    fontWeight: 'bold',
    fontSize: 12
  },

  studentName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold'
  },

  studentDni: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2
  },

  // estado
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 7,
    borderWidth: 1,
    minWidth: 125,
    alignItems: 'center'
  },

  statusPresent: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a'
  },

  statusAbsent: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },

  statusLate: {
    backgroundColor: '#eab308',
    borderColor: '#eab308'
  },

  statusLeft: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1'
  },

  statusPending: {
    backgroundColor: '#e2e8f0',
    borderColor: '#cbd5e1'
  },

  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155'
  },

  statusTextLight: {
    color: '#fff'
  },

  statusTextDark: {
    color: '#422006'
  },

  // vacios
  emptyStudents: {
    padding: 30,
    alignItems: 'center'
  },

  emptyStudentsIcon: {
    fontSize: 35,
    marginBottom: 8
  },

  emptyStudentsText: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center'
  },

  // carga
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center'
  },

  loadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e1b4b'
  },

  loadingText: {
    color: '#64748b',
    marginTop: 5
  }
});
