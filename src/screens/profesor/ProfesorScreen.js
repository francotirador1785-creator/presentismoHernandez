import React, { useState, useEffect, useContext } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput
} from 'react-native';

import { Calendar } from 'react-native-calendars';
import { supabase } from '../../api/supabase';
import { AuthContext } from '../../context/AuthContext';
import styles from './ProfesorScreen.styles';

export default function ProfesorScreen() {
  const { logout } = useContext(AuthContext);

  /* Datos del profesor */
  const [profesorId, setProfesorId] = useState(null);

  /* Datos de la bdd */
  const [asignaciones, setAsignaciones] = useState([]);
  const [alumnos, setAlumnos] = useState([]);

  /* curso seleccionado */
  const [selectedCurso, setSelectedCurso] = useState(null);

  /* asistencia { alumnoId: estado } */
  const [asistencias, setAsistencias] = useState({});

  // Estado de carga
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Sección actual
  const [activeSection, setActiveSection] = useState('asistencia');

  // Agenda
  const [eventos, setEventos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [mostrarFormularioEvento, setMostrarFormularioEvento] = useState(false);

  const [eventoTitulo, setEventoTitulo] = useState('');
  const [eventoTipo, setEventoTipo] = useState('Evaluación');
  const [eventoDescripcion, setEventoDescripcion] = useState('');
  const [eventoHora, setEventoHora] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  /* cargar profesor, cursos y alumnos */
  const cargarDatos = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'No se pudo identificar al profesor.');
        return;
      }

      setProfesorId(user.id);

      const { data: asignacionesData, error: asignacionesError } =
        await supabase
          .from('asignaciones')
          .select(`
            *,
            cursos(id, anio, division, especialidad)
          `)
          .eq('profesor_id', user.id);

      if (asignacionesError) {
        console.error('Error cargando asignaciones:', asignacionesError.message);
        Alert.alert('Error', 'No se pudieron cargar sus cursos.');
        return;
      }

      setAsignaciones(asignacionesData || []);

      const { data: eventosData, error: eventosError } =
        await supabase
          .from('eventos')
          .select('*')
          .eq('profesor_id', user.id)
          .order('fecha')
          .order('hora');

      if (eventosError) {
        console.error('Error cargando eventos:', eventosError.message);
      } else {
        setEventos(eventosData || []);
      }

      if (asignacionesData && asignacionesData.length > 0) {
        seleccionarCurso(asignacionesData[0].cursos);
      }
    } catch (error) {
      console.error('Error general:', error);
      Alert.alert('Error', 'Ocurrió un problema al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  /* seleccionar curso */
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

  // cargar asistencia del día
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
          registro.estado || (registro.presente ? 'presente' : 'ausente');
      });

      setAsistencias(asistenciaActual);
    } catch (error) {
      console.error('Error cargando asistencia:', error);
    }
  };

  // cambiar estado alumno
  const cambiarAsistencia = (alumnoId, estado) => {
    setAsistencias((prev) => ({
      ...prev,
      [alumnoId]: estado
    }));
  };

  // guardar lista
  const guardarLista = async () => {
    if (!selectedCurso) {
      Alert.alert('Atención', 'Seleccione un curso primero.');
      return;
    }

    if (alumnos.length === 0) {
      Alert.alert('Atención', 'Este curso no tiene alumnos registrados.');
      return;
    }

    const faltaMarcar = alumnos.some(
      (alumno) => asistencias[alumno.id] === undefined
    );

    if (faltaMarcar) {
      Alert.alert(
        'Lista incompleta',
        'Debe marcar presente, ausente, tarde o se retiró a todos los alumnos antes de enviar la lista.'
      );
      return;
    }

    try {
      setGuardando(true);

      const hoy = new Date().toISOString().split('T')[0];
      const idsAlumnos = alumnos.map((alumno) => alumno.id);

      const { data: registrosExistentes, error: consultaError } =
        await supabase
          .from('asistencias')
          .select('*')
          .eq('fecha', hoy)
          .in('alumno_id', idsAlumnos);

      if (consultaError) throw consultaError;

      const registrosMap = {};
      registrosExistentes?.forEach((registro) => {
        registrosMap[registro.alumno_id] = registro;
      });

      for (const alumno of alumnos) {
        const estado = asistencias[alumno.id];
        const presente = estado === 'presente' || estado === 'tarde';

        if (registrosMap[alumno.id]) {
          const { error } = await supabase
            .from('asistencias')
            .update({ presente, estado })
            .eq('id', registrosMap[alumno.id].id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('asistencias')
            .insert([
              {
                alumno_id: alumno.id,
                fecha: hoy,
                presente,
                estado
              }
            ]);

          if (error) throw error;
        }
      }

      Alert.alert(
        '¡Lista enviada!',
        `La asistencia de ${alumnos.length} alumnos fue registrada correctamente.`
      );
    } catch (error) {
      console.error('Error guardando asistencia:', error);
      Alert.alert(
        'Error',
        'No se pudo guardar la lista. Revise la conexión con la base de datos.'
      );
    } finally {
      setGuardando(false);
    }
  };

  // cargar eventos
  const cargarEventos = async () => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('profesor_id', profesorId)
        .order('fecha')
        .order('hora');

      if (error) {
        console.error('Error cargando eventos:', error.message);
        return;
      }

      setEventos(data || []);
    } catch (error) {
      console.error('Error cargando agenda:', error);
    }
  };

  // crear evento
  const crearEvento = async () => {
    if (!eventoTitulo.trim()) {
      Alert.alert('Atención', 'Ingrese un título para el evento.');
      return;
    }

    if (!selectedCurso) {
      Alert.alert('Atención', 'Seleccione un curso.');
      return;
    }

    try {
      const { error } = await supabase.from('eventos').insert([
        {
          profesor_id: profesorId,
          curso_id: selectedCurso.id,
          titulo: eventoTitulo.trim(),
          tipo: eventoTipo,
          descripcion: eventoDescripcion.trim() || null,
          fecha: fechaSeleccionada,
          hora: eventoHora.trim() || null
        }
      ]);

      if (error) {
        console.error('Error creando evento:', error.message);
        Alert.alert('Error', 'No se pudo crear el evento.');
        return;
      }

      Alert.alert('¡Evento creado!', 'El evento fue agregado a la agenda.');

      setEventoTitulo('');
      setEventoDescripcion('');
      setEventoHora('');
      setEventoTipo('Evaluación');
      setMostrarFormularioEvento(false);

      cargarEventos();
    } catch (error) {
      console.error('Error creando evento:', error);
      Alert.alert('Error', 'Ocurrió un problema al crear el evento.');
    }
  };

  // eliminar evento
  const eliminarEvento = async (eventoId) => {
    try {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventoId);

      if (error) {
        console.error('Error eliminando evento:', error);
        Alert.alert('Error', error.message);
        return;
      }

      setEventos((prevEventos) =>
        prevEventos.filter((evento) => evento.id !== eventoId)
      );
    } catch (error) {
      console.error('Error eliminando evento:', error);
      Alert.alert('Error', 'No se pudo eliminar el evento.');
    }
  };

  // Contadores para stats
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

  const cantidadSinMarcar = alumnos.filter(
    (alumno) => asistencias[alumno.id] === undefined
  ).length;

  // Eventos del día seleccionado y curso actual
  const eventosDelDia = eventos.filter(
    (evento) =>
      evento.fecha === fechaSeleccionada &&
      evento.curso_id === selectedCurso?.id
  );

  // Marcas del calendario
  const fechasConEventos = {};
  eventos
    .filter((evento) => evento.curso_id === selectedCurso?.id)
    .forEach((evento) => {
      fechasConEventos[evento.fecha] = {
        marked: true,
        dotColor: '#4f46e5'
      };
    });

  fechasConEventos[fechaSeleccionada] = {
    ...(fechasConEventos[fechaSeleccionada] || {}),
    selected: true,
    selectedColor: '#4f46e5'
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Cargando...</Text>
        <Text style={styles.loadingText}>Preparando el panel del profesor</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Presentismo Hernández</Text>
          <Text style={styles.headerSubtitle}>Panel del Profesor</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainLayout}>
        {/* SIDEBAR CURSOS */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Mis cursos</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {asignaciones.length === 0 ? (
              <View style={styles.emptySidebar}>
                <Text style={styles.emptySidebarText}>
                  No tiene cursos asignados.
                </Text>
              </View>
            ) : (
              asignaciones.map((asignacion) => {
                const curso = asignacion.cursos;
                if (!curso) return null;

                const seleccionado = selectedCurso?.id === curso.id;

                return (
                  <TouchableOpacity
                    key={asignacion.id}
                    style={[
                      styles.cursoCard,
                      seleccionado
                        ? styles.cursoCardSelected
                        : styles.cursoCardUnselected
                    ]}
                    onPress={() => seleccionarCurso(curso)}
                  >
                    <Text
                      style={[
                        styles.cursoTitle,
                        seleccionado && { color: '#ffffff' }
                      ]}
                    >
                      {curso.anio}º {curso.division}
                    </Text>
                    <Text
                      style={[
                        styles.cursoEspecialidad,
                        seleccionado && { color: '#e0e7ff' }
                      ]}
                    >
                      {curso.especialidad}
                    </Text>
                    <Text
                      style={[
                        styles.cursoMateria,
                        seleccionado && { color: '#c7d2fe' }
                      ]}
                    >
                      {asignacion.materia}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* CONTENIDO PRINCIPAL */}
        <View style={styles.contentArea}>
          {!selectedCurso ? (
            <View style={styles.noCourse}>
              <Text style={styles.noCourseIcon}>📋</Text>
              <Text style={styles.noCourseTitle}>Seleccione un curso</Text>
              <Text style={styles.noCourseText}>
                Seleccione uno de sus cursos para comenzar.
              </Text>
            </View>
          ) : (
            <>
              {/* SELECTOR DE SECCIÓN */}
              <View style={styles.sectionSelector}>
                <TouchableOpacity
                  style={[
                    styles.sectionButton,
                    activeSection === 'asistencia' &&
                      styles.sectionButtonSelected
                  ]}
                  onPress={() => setActiveSection('asistencia')}
                >
                  <Text
                    style={[
                      styles.sectionButtonText,
                      activeSection === 'asistencia' &&
                        styles.sectionButtonTextSelected
                    ]}
                  >
                    📋 Asistencia
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sectionButton,
                    activeSection === 'agenda' && styles.sectionButtonSelected
                  ]}
                  onPress={() => setActiveSection('agenda')}
                >
                  <Text
                    style={[
                      styles.sectionButtonText,
                      activeSection === 'agenda' &&
                        styles.sectionButtonTextSelected
                    ]}
                  >
                    📅 Agenda
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SECCIÓN ASISTENCIA */}
              {activeSection === 'asistencia' && (
                <View style={styles.assistanceArea}>
                  {cantidadSinMarcar > 0 && (
                    <View style={styles.alertBox}>
                      <View style={styles.alertIconContainer}>
                        <Text style={styles.alertIcon}>🔔</Text>
                      </View>
                      <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>Lista pendiente</Text>
                        <Text style={styles.alertText}>
                          Recuerde registrar la asistencia del curso antes de
                          enviar la lista.
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.courseHeader}>
                    <View>
                      <Text style={styles.courseTitle}>
                        {selectedCurso.anio}º {selectedCurso.division}{' '}
                        {selectedCurso.especialidad}
                      </Text>
                      <Text style={styles.courseSubtitle}>
                        Toma de asistencia
                      </Text>
                    </View>

                    <View style={styles.dateBadge}>
                      <Text style={styles.dateText}>
                        {new Date().toLocaleDateString('es-AR')}
                      </Text>
                    </View>
                  </View>

                  {/* ESTADÍSTICAS */}
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>{alumnos.length}</Text>
                      <Text style={styles.statLabel}>Alumnos</Text>
                    </View>
                    <View style={[styles.statCard, styles.statPresent]}>
                      <Text style={styles.statNumber}>
                        {cantidadPresentes}
                      </Text>
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
                      <Text style={styles.statNumber}>
                        {cantidadRetirados}
                      </Text>
                      <Text style={styles.statLabel}>Retirados</Text>
                    </View>
                    <View style={[styles.statCard, styles.statPending]}>
                      <Text style={styles.statNumber}>
                        {cantidadSinMarcar}
                      </Text>
                      <Text style={styles.statLabel}>Sin marcar</Text>
                    </View>
                  </View>

                  {/* LISTA DE ALUMNOS */}
                  <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                      <Text style={styles.listTitle}>Lista de alumnos</Text>
                      <Text style={styles.listSubtitle}>
                        Marque el estado de cada alumno
                      </Text>
                    </View>

                    <ScrollView
                      style={styles.studentsScroll}
                      contentContainerStyle={styles.studentsContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {alumnos.length === 0 ? (
                        <View style={styles.emptyStudents}>
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
                                estado === 'presente' && styles.studentPresent,
                                estado === 'ausente' && styles.studentAbsent,
                                estado === 'tarde' && styles.studentLate,
                                estado === 'se_retiro' && styles.studentLeft
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

                              <View style={styles.attendanceButtons}>
                                <TouchableOpacity
                                  style={[
                                    styles.attendanceButton,
                                    styles.presentButton,
                                    estado === 'presente' &&
                                      styles.presentButtonSelected
                                  ]}
                                  onPress={() =>
                                    cambiarAsistencia(alumno.id, 'presente')
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.attendanceButtonText,
                                      estado === 'presente' &&
                                        styles.selectedButtonText
                                    ]}
                                  >
                                    ✓ Presente
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.attendanceButton,
                                    styles.absentButton,
                                    estado === 'ausente' &&
                                      styles.absentButtonSelected
                                  ]}
                                  onPress={() =>
                                    cambiarAsistencia(alumno.id, 'ausente')
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.attendanceButtonText,
                                      estado === 'ausente' &&
                                        styles.selectedButtonText
                                    ]}
                                  >
                                    ✕ Ausente
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.attendanceButton,
                                    styles.lateButton,
                                    estado === 'tarde' &&
                                      styles.lateButtonSelected
                                  ]}
                                  onPress={() =>
                                    cambiarAsistencia(alumno.id, 'tarde')
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.attendanceButtonText,
                                      estado === 'tarde' &&
                                        styles.selectedButtonText
                                    ]}
                                  >
                                    🕐 Tarde
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.attendanceButton,
                                    styles.leftButton,
                                    estado === 'se_retiro' &&
                                      styles.leftButtonSelected
                                  ]}
                                  onPress={() =>
                                    cambiarAsistencia(alumno.id, 'se_retiro')
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.attendanceButtonText,
                                      estado === 'se_retiro' &&
                                        styles.selectedButtonText
                                    ]}
                                  >
                                    🚪 Se retiró
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </ScrollView>

                    <View style={styles.submitContainer}>
                      <TouchableOpacity
                        style={[
                          styles.submitButton,
                          guardando && styles.submitButtonDisabled
                        ]}
                        onPress={guardarLista}
                        disabled={guardando}
                      >
                        <Text style={styles.submitButtonText}>
                          {guardando ? 'Guardando...' : '💾 Guardar y Enviar Lista'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* SECCIÓN AGENDA */}
              {activeSection === 'agenda' && (
                <View style={styles.agendaArea}>
                  <View style={styles.agendaLayout}>
                    {/* CALENDARIO */}
                    <View style={styles.calendarContainer}>
                      <Calendar
                        onDayPress={(day) =>
                          setFechaSeleccionada(day.dateString)
                        }
                        markedDates={fechasConEventos}
                        theme={{
                          todayTextColor: '#4f46e5',
                          selectedDayBackgroundColor: '#4f46e5',
                          arrowColor: '#4f46e5'
                        }}
                      />
                    </View>

                    {/* EVENTOS Y FORMULARIO */}
                    <View style={styles.eventsContainer}>
                      <View style={styles.eventsHeader}>
                        <Text style={styles.eventsTitle}>
                          Eventos del {fechaSeleccionada}
                        </Text>
                        <TouchableOpacity
                          style={styles.addEventButton}
                          onPress={() =>
                            setMostrarFormularioEvento(
                              !mostrarFormularioEvento
                            )
                          }
                        >
                          <Text style={styles.addEventButtonText}>
                            {mostrarFormularioEvento
                              ? '✕ Cancelar'
                              : '+ Nuevo Evento'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {mostrarFormularioEvento && (
                        <View style={styles.formCard}>
                          <Text style={styles.formTitle}>
                            Agregar Evento / Tarea
                          </Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Título (ej: Examen de Matemática)"
                            placeholderTextColor="#94a3b8"
                            value={eventoTitulo}
                            onChangeText={setEventoTitulo}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="Descripción u observaciones"
                            placeholderTextColor="#94a3b8"
                            value={eventoDescripcion}
                            onChangeText={setEventoDescripcion}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="Hora (ej: 10:30 HS)"
                            placeholderTextColor="#94a3b8"
                            value={eventoHora}
                            onChangeText={setEventoHora}
                          />

                          <View style={styles.typeButtons}>
                            {['Evaluación', 'Entrega', 'Aviso'].map((tipo) => (
                              <TouchableOpacity
                                key={tipo}
                                style={[
                                  styles.typeBtn,
                                  eventoTipo === tipo && styles.typeBtnSelected
                                ]}
                                onPress={() => setEventoTipo(tipo)}
                              >
                                <Text
                                  style={[
                                    styles.typeBtnText,
                                    eventoTipo === tipo &&
                                      styles.typeBtnTextSelected
                                  ]}
                                >
                                  {tipo}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <View style={styles.formActions}>
                            <TouchableOpacity
                              style={styles.cancelBtn}
                              onPress={() => setMostrarFormularioEvento(false)}
                            >
                              <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.saveBtn}
                              onPress={crearEvento}
                            >
                              <Text style={styles.saveBtnText}>Guardar Evento</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      <ScrollView style={styles.eventsScroll}>
                        {eventosDelDia.length === 0 ? (
                          <View style={styles.emptyEvents}>
                            <Text style={styles.emptyEventsText}>
                              No hay eventos programados para este día.
                            </Text>
                          </View>
                        ) : (
                          eventosDelDia.map((evento) => (
                            <View key={evento.id} style={styles.eventCard}>
                              <View style={styles.eventHeader}>
                                <Text style={styles.eventTitle}>
                                  {evento.titulo}
                                </Text>
                                <View style={styles.eventTypeBadge}>
                                  <Text style={styles.eventTypeText}>
                                    {evento.tipo}
                                  </Text>
                                </View>
                              </View>

                              {evento.descripcion ? (
                                <Text style={styles.eventDesc}>
                                  {evento.descripcion}
                                </Text>
                              ) : null}

                              {evento.hora ? (
                                <Text style={styles.eventTime}>
                                  🕒 {evento.hora}
                                </Text>
                              ) : null}

                              <TouchableOpacity
                                style={styles.deleteEventBtn}
                                onPress={() => eliminarEvento(evento.id)}
                              >
                                <Text style={styles.deleteEventText}>
                                  🗑 Eliminar
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}