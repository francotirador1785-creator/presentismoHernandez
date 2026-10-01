import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Platform 
} from 'react-native';
import { supabase } from '../../api/supabase';
import { AuthContext } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function DirectorDashboard() {
  const { logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('admin');

  // Datos globales BDD
  const [cursos, setCursos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [asistenciasDia, setAsistenciasDia] = useState([]);

  // Estado para la pestaña "Cursos"
  const [selectedCurso, setSelectedCurso] = useState(null);

  // Buscadores
  const [searchQuery, setSearchQuery] = useState('');

  // Formularios de Administración
  const [anio, setAnio] = useState('');
  const [division, setDivision] = useState('');
  const [especialidad, setEspecialidad] = useState('');

  const [nombreAlu, setNombreAlu] = useState('');
  const [apellidoAlu, setApellidoAlu] = useState('');
  const [dniAlu, setDniAlu] = useState('');
  const [cursoParaAlumno, setCursoParaAlumno] = useState('');

  const [cursoParaAsignar, setCursoParaAsignar] = useState('');
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [materiaInput, setMateriaInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Cursos
      const { data: cData } = await supabase.from('cursos').select('*').order('anio');
      if (cData) {
        setCursos(cData);
        if (cData.length > 0 && !selectedCurso) setSelectedCurso(cData[0]);
      }

      // 2. Alumnos
      const { data: aData } = await supabase.from('alumnos').select('*, cursos(anio, division, especialidad)').order('apellido');
      if (aData) setAlumnos(aData);

      // 3. Profesores
      const { data: pData } = await supabase.from('usuarios').select('*').eq('rol', 'profesor');
      if (pData) setProfesores(pData);

      // 4. Asignaciones
      const { data: asigData } = await supabase.from('asignaciones').select('*, usuarios(nombre, apellido), cursos(anio, division)');
      if (asigData) setAsignaciones(asigData);

      // 5. Asistencias del día
      const hoy = new Date().toISOString().split('T')[0];
      const { data: asisData } = await supabase.from('asistencias').select('*, alumnos(nombre, apellido, dni)').eq('fecha', hoy);
      if (asisData) setAsistenciasDia(asisData);

    } catch (e) {
      console.error('Error cargando datos:', e.message);
    }
  };

  // --- ACCIONES DE ADMINISTRACIÓN ---
  const handleCrearCurso = async () => {
    if (!anio || !division || !especialidad) {
      return Alert.alert('Atención', 'Por favor complete el año, división y especialidad.');
    }
    const { error } = await supabase.from('cursos').insert([
      { anio: parseInt(anio), division, especialidad: especialidad.toUpperCase() }
    ]);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('¡Éxito!', 'El nuevo curso se ha guardado correctamente.');
      setAnio(''); setDivision(''); setEspecialidad('');
      fetchData();
    }
  };

  const handleEliminarCurso = async (cursoId, cursoNombre) => {
    const ejecutarEliminacion = async () => {
      const { error } = await supabase.from('cursos').delete().eq('id', cursoId);
      
      if (error) {
        console.error('Error de Supabase:', error.message);
        if (Platform.OS === 'web') {
          alert('Error al eliminar: ' + error.message);
        } else {
          Alert.alert('Error al eliminar', error.message);
        }
      } else {
        if (Platform.OS === 'web') {
          alert('El curso fue borrado con éxito.');
        } else {
          Alert.alert('Eliminado', 'El curso fue borrado con éxito.');
        }
        if (selectedCurso?.id === cursoId) setSelectedCurso(null);
        fetchData(); // Recarga la lista de cursos
      }
    };

    // Confirmación según la plataforma
    if (Platform.OS === 'web') {
      const confirmacion = window.confirm(
        `¿Estás seguro de eliminar el curso "${cursoNombre}"?\n\nEsta acción quitará el curso y sus alumnos vinculados.`
      );
      if (confirmacion) await ejecutarEliminacion();
    } else {
      Alert.alert(
        '⚠️ Confirmar Eliminación',
        `¿Estás seguro de eliminar el curso "${cursoNombre}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, Eliminar', style: 'destructive', onPress: ejecutarEliminacion }
        ]
      );
    }
  };

  const handleCrearAlumno = async () => {
    if (!nombreAlu || !apellidoAlu || !dniAlu || !cursoParaAlumno) {
      return Alert.alert('Atención', 'Complete todos los campos del alumno y seleccione su curso.');
    }
    const { error } = await supabase.from('alumnos').insert([
      { nombre: nombreAlu, apellido: apellidoAlu, dni: dniAlu, curso_id: cursoParaAlumno }
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('¡Éxito!', 'Alumno registrado correctamente.');
      setNombreAlu(''); setApellidoAlu(''); setDniAlu('');
      fetchData();
    }
  };

  const handleAsignarProfesor = async () => {
    if (!cursoParaAsignar || !profesorSeleccionado || !materiaInput) {
      return Alert.alert('Atención', 'Seleccione un curso, un docente e ingrese la materia.');
    }
    const { error } = await supabase.from('asignaciones').insert([
      { curso_id: cursoParaAsignar, profesor_id: profesorSeleccionado, materia: materiaInput }
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('¡Éxito!', 'Profesor asignado a la materia.');
      setMateriaInput(''); setProfesorSeleccionado('');
      fetchData();
    }
  };

  const handleEliminarAlumno = async (id) => {
    const { error } = await supabase.from('alumnos').delete().eq('id', id);
    if (!error) fetchData();
  };

  // Filtrados dinámicos
  const alumnosDelCurso = alumnos.filter(a => selectedCurso && a.curso_id === selectedCurso.id);
  const docentesDelCurso = asignaciones.filter(asig => selectedCurso && asig.curso_id === selectedCurso.id);

  const alumnosFiltradosDirectorio = alumnos.filter(a => {
    const q = searchQuery.toLowerCase();
    const nombreCompleto = `${a.nombre} ${a.apellido}`.toLowerCase();
    return nombreCompleto.includes(q) || (a.dni && a.dni.includes(q));
  });

  return (
    <View style={styles.container}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} logout={logout} />

      {/* ---------------- 1. PESTAÑA CURSOS ---------------- */}
      {activeTab === 'cursos' && (
        <View style={styles.mainLayout}>
          <ScrollView style={styles.sidebar}>
            {cursos.map((c) => {
              const cant = alumnos.filter(a => a.curso_id === c.id).length;
              const isSelected = selectedCurso?.id === c.id;
              return (
                <TouchableOpacity 
                  key={c.id} 
                  style={[styles.cursoCardBtn, isSelected ? styles.cursoCardSelected : styles.cursoCardUnselected]}
                  onPress={() => setSelectedCurso(c)}
                >
                  <Text style={styles.cursoCardTitle}>{c.anio} {c.division} {c.especialidad}</Text>
                  <Text style={styles.cursoCardSub}>Cant. Alumnos: {cant}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.contentArea}>
            {selectedCurso ? (
              <View style={styles.panelCurso}>
                <Text style={styles.panelCursoHeader}>{selectedCurso.anio} {selectedCurso.division} {selectedCurso.especialidad}</Text>

                <View style={styles.sectionDocentes}>
                  <Text style={styles.sectionLabel}>Docentes:</Text>
                  <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                    {docentesDelCurso.length === 0 ? (
                      <Text style={{ color: '#fff', fontStyle: 'italic' }}>Sin docentes asignados</Text>
                    ) : (
                      docentesDelCurso.map((d) => (
                        <View key={d.id} style={styles.docenteChip}>
                          <Text style={styles.chipText}>{d.usuarios?.apellido} ({d.materia})</Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>

                <Text style={styles.alumnosTitle}>Alumnos Inscriptos ({alumnosDelCurso.length})</Text>
                <ScrollView contentContainerStyle={styles.alumnosGrid}>
                  {alumnosDelCurso.length === 0 ? (
                    <Text style={{ color: '#64748b', fontStyle: 'italic' }}>No hay alumnos inscriptos en este curso.</Text>
                  ) : (
                    alumnosDelCurso.map((alum) => (
                      <View key={alum.id} style={styles.alumnoCapsula}>
                        <Text style={styles.alumnoCapsulaText}>{alum.nombre} {alum.apellido}</Text>
                        <TouchableOpacity onPress={() => handleEliminarAlumno(alum.id)} style={styles.deleteBadge}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            ) : (
              <Text>Seleccione un curso del menú lateral</Text>
            )}
          </View>
        </View>
      )}

      {/* ---------------- 2. PESTAÑA ALUMNOS ---------------- */}
      {activeTab === 'alumnos' && (
        <View style={styles.paddedTab}>
          <Text style={styles.tabTitle}>Directorio General de Alumnos ({alumnos.length})</Text>
          <TextInput 
            style={styles.searchInput} 
            placeholder="🔍 Buscar alumno por Nombre, Apellido o DNI..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView style={styles.tableContainer}>
            {alumnosFiltradosDirectorio.map((a) => (
              <View key={a.id} style={styles.tableRow}>
                <View>
                  <Text style={styles.rowName}>{a.apellido}, {a.nombre}</Text>
                  <Text style={styles.rowSub}>DNI: {a.dni || 'Sin registrar'}</Text>
                </View>
                <View style={styles.cursoBadge}>
                  <Text style={styles.cursoBadgeText}>
                    {a.cursos ? `${a.cursos.anio}º ${a.cursos.division} (${a.cursos.especialidad})` : 'Sin Curso'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ---------------- 3. PESTAÑA MONITOREO ---------------- */}
      {activeTab === 'monitoreo' && (
        <View style={styles.paddedTab}>
          <Text style={styles.tabTitle}>Monitoreo de Presentismo en Tiempo Real</Text>
          <Text style={styles.tabSub}>Estado de asistencia de los alumnos registrados el día de hoy.</Text>
          
          <ScrollView contentContainerStyle={styles.monitoreoGrid}>
            {alumnos.map((a) => {
              const registro = asistenciasDia.find(asis => asis.alumno_id === a.id);
              const estaPresente = registro ? registro.presente : false;

              return (
                <View key={a.id} style={[styles.monitoreoCard, estaPresente ? styles.cardPresente : styles.cardAusente]}>
                  <Text style={styles.monitoreoName}>{a.nombre} {a.apellido}</Text>
                  <Text style={styles.monitoreoStatus}>{estaPresente ? 'PRESENTE' : 'AUSENTE'}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ---------------- 4. PESTAÑA ADMINISTRACIÓN (MEJORADA) ---------------- */}
      {activeTab === 'admin' && (
        <ScrollView style={styles.paddedTab}>
          <Text style={styles.tabTitle}>Centro de Carga y Configuración</Text>
          <Text style={styles.tabSub}>Gestione los cursos, matrícula de estudiantes y asignaciones de la institución.</Text>

          {/* SECCIÓN A: LISTA Y ELIMINACIÓN DE CURSOS EXISTENTES */}
          <View style={styles.managementSection}>
            <Text style={styles.sectionTitle}>⚙️ Cursos Existentes ({cursos.length})</Text>
            <View style={styles.cursosListGrid}>
              {cursos.length === 0 ? (
                <Text style={{ color: '#64748b', fontStyle: 'italic' }}>No hay cursos creados aún.</Text>
              ) : (
                cursos.map((c) => {
                  const cantAlumnos = alumnos.filter(a => a.curso_id === c.id).length;
                  const nombreCurso = `${c.anio}º ${c.division} ${c.especialidad}`;
                  return (
                    <View key={c.id} style={styles.cursoManageCard}>
                      <View>
                        <Text style={styles.cursoManageTitle}>{nombreCurso}</Text>
                        <Text style={styles.cursoManageSub}>{cantAlumnos} alumnos inscriptos</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteCourseBtn} 
                        onPress={() => handleEliminarCurso(c.id, nombreCurso)}
                      >
                        <Text style={styles.deleteCourseText}>🗑️ Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* SECCIÓN B: FORMULARIOS DE CARGA DE DATOS */}
          <View style={styles.formRow}>
            {/* Formulario 1: Crear Curso */}
            <View style={styles.cardForm}>
              <Text style={styles.formTitle}>📚 Crear Nuevo Curso</Text>
              <Text style={styles.inputLabel}>Año lectivo:</Text>
              <TextInput style={styles.input} placeholder="Ej: 1, 2, 7" value={anio} onChangeText={setAnio} keyboardType="numeric" />
              
              <Text style={styles.inputLabel}>División:</Text>
              <TextInput style={styles.input} placeholder="Ej: 1ª, A, B" value={division} onChangeText={setDivision} />
              
              <Text style={styles.inputLabel}>Especialidad / Orientación:</Text>
              <TextInput style={styles.input} placeholder="Ej: BASICO, PROG, ADO" value={especialidad} onChangeText={setEspecialidad} />
              
              <TouchableOpacity style={styles.btnSavePrimary} onPress={handleCrearCurso}>
                <Text style={styles.btnSaveText}>+ Crear Curso</Text>
              </TouchableOpacity>
            </View>

            {/* Formulario 2: Registrar Alumno */}
            <View style={styles.cardForm}>
              <Text style={styles.formTitle}>👨‍🎓 Registrar Alumno</Text>
              <Text style={styles.inputLabel}>Nombre:</Text>
              <TextInput style={styles.input} placeholder="Nombre del alumno" value={nombreAlu} onChangeText={setNombreAlu} />
              
              <Text style={styles.inputLabel}>Apellido:</Text>
              <TextInput style={styles.input} placeholder="Apellido del alumno" value={apellidoAlu} onChangeText={setApellidoAlu} />
              
              <Text style={styles.inputLabel}>DNI:</Text>
              <TextInput style={styles.input} placeholder="Número de DNI" value={dniAlu} onChangeText={setDniAlu} keyboardType="numeric" />
              
              <Text style={styles.inputLabel}>Asignar a Curso Destino:</Text>
              <ScrollView horizontal style={{ marginBottom: 12 }} showsHorizontalScrollIndicator={false}>
                {cursos.map((c) => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.chipSelect, cursoParaAlumno === c.id && styles.chipSelected]}
                    onPress={() => setCursoParaAlumno(c.id)}
                  >
                    <Text style={{ color: cursoParaAlumno === c.id ? '#fff' : '#1e293b', fontWeight: 'bold' }}>
                      {c.anio}º {c.division}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.btnSaveSuccess} onPress={handleCrearAlumno}>
                <Text style={styles.btnSaveText}>+ Guardar Alumno</Text>
              </TouchableOpacity>
            </View>

            {/* Formulario 3: Asignar Profesor */}
            <View style={styles.cardForm}>
              <Text style={styles.formTitle}>👨‍🏫 Asignar Docente a Curso</Text>
              
              <Text style={styles.inputLabel}>Seleccionar Curso:</Text>
              <ScrollView horizontal style={{ marginBottom: 10 }} showsHorizontalScrollIndicator={false}>
                {cursos.map((c) => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.chipSelect, cursoParaAsignar === c.id && styles.chipSelected]}
                    onPress={() => setCursoParaAsignar(c.id)}
                  >
                    <Text style={{ color: cursoParaAsignar === c.id ? '#fff' : '#1e293b', fontWeight: 'bold' }}>
                      {c.anio}º {c.division}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Nombre de la Materia:</Text>
              <TextInput style={styles.input} placeholder="Ej: Matemática, Programación" value={materiaInput} onChangeText={setMateriaInput} />

              <Text style={styles.inputLabel}>Seleccionar Docente:</Text>
              <ScrollView horizontal style={{ marginBottom: 12 }} showsHorizontalScrollIndicator={false}>
                {profesores.length === 0 ? (
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>No hay docentes registrados</Text>
                ) : (
                  profesores.map((p) => (
                    <TouchableOpacity 
                      key={p.id} 
                      style={[styles.chipSelect, profesorSeleccionado === p.id && styles.chipSelected]}
                      onPress={() => setProfesorSeleccionado(p.id)}
                    >
                      <Text style={{ color: profesorSeleccionado === p.id ? '#fff' : '#1e293b', fontWeight: 'bold' }}>
                        {p.apellido}, {p.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <TouchableOpacity style={styles.btnSaveInfo} onPress={handleAsignarProfesor}>
                <Text style={styles.btnSaveText}>+ Asignar Docente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  mainLayout: { flex: 1, flexDirection: 'row', padding: 15, gap: 15 },
  sidebar: { width: 180 },
  cursoCardBtn: { borderRadius: 10, padding: 12, marginBottom: 10, alignItems: 'center' },
  cursoCardSelected: { backgroundColor: '#eab308' },
  cursoCardUnselected: { backgroundColor: '#818cf8' },
  cursoCardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cursoCardSub: { color: '#fff', fontSize: 11, marginTop: 2 },
  
  contentArea: { flex: 1 },
  panelCurso: { flex: 1, backgroundColor: '#c7d2fe', borderRadius: 16, borderWidth: 2, borderColor: '#1e1b4b', padding: 15 },
  panelCursoHeader: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 15 },
  
  sectionDocentes: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#1e1b4b' },
  docenteChip: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  alumnosTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  alumnosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  alumnoCapsula: { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  alumnoCapsulaText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  deleteBadge: { backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  paddedTab: { flex: 1, padding: 20 },
  tabTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  tabSub: { color: '#64748b', marginBottom: 15, fontSize: 13 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 15 },
  tableContainer: { backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b' },
  cursoBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  cursoBadgeText: { color: '#0369a1', fontWeight: 'bold', fontSize: 12 },

  monitoreoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  monitoreoCard: { padding: 14, borderRadius: 10, width: 180, alignItems: 'center' },
  cardPresente: { backgroundColor: '#16a34a' },
  cardAusente: { backgroundColor: '#dc2626' },
  monitoreoName: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  monitoreoStatus: { color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '600' },

  // --- ESTILOS DE ADMINISTRACIÓN ---
  managementSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  cursosListGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cursoManageCard: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 260 },
  cursoManageTitle: { fontWeight: 'bold', color: '#0f172a', fontSize: 14 },
  cursoManageSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
  deleteCourseBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#fca5a5' },
  deleteCourseText: { color: '#dc2626', fontWeight: 'bold', fontSize: 11 },

  formRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  cardForm: { flex: 1, minWidth: 280, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#0f172a' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, backgroundColor: '#f8fafc', fontSize: 13 },
  
  btnSavePrimary: { backgroundColor: '#2563eb', padding: 11, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnSaveSuccess: { backgroundColor: '#16a34a', padding: 11, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnSaveInfo: { backgroundColor: '#0284c7', padding: 11, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  chipSelect: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, marginRight: 8, backgroundColor: '#f1f5f9' },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' }
});