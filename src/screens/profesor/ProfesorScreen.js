import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  TextInput
} from 'react-native';

import { Calendar } from 'react-native-calendars';

import { supabase } from '../../api/supabase';
import { AuthContext } from '../../context/AuthContext';

export default function ProfesorScreen() {
  const { logout } = useContext(AuthContext);

  /* Datos del profesor */
  const [profesorId, setProfesorId] = useState(null);

  /* Datos de la bdd */
  const [asignaciones, setAsignaciones] = useState([]);
  const [alumnos, setAlumnos] = useState([]);

  /* curso seleccionado */
  const [selectedCurso, setSelectedCurso] = useState(null);

  /* asistencia
   { alumnoId: estado }*/
  const [asistencias, setAsistencias] = useState({});

  // Estado de carga
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Seccion actual
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

      // Obtenemos el usuario actualmente conectado
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'No se pudo identificar al profesor.');
        return;
      }

      setProfesorId(user.id);

      // Buscamos los cursos/materias asignados a este profesor
      const { data: asignacionesData, error: asignacionesError } =
        await supabase
          .from('asignaciones')
          .select(`
            *,
            cursos(id, anio, division, especialidad)
          `)
          .eq('profesor_id', user.id);

      if (asignacionesError) {
        console.error(
          'Error cargando asignaciones:',
          asignacionesError.message
        );

        Alert.alert('Error', 'No se pudieron cargar sus cursos.');
        return;
      }

      setAsignaciones(asignacionesData || []);

      // Cargar eventos de la agenda
      const { data: eventosData, error: eventosError } =
        await supabase
          .from('eventos')
          .select('*')
          .eq('profesor_id', user.id)
          .order('fecha')
          .order('hora');

      if (eventosError) {
        console.error(
          'Error cargando eventos:',
          eventosError.message
        );
      } else {
        setEventos(eventosData || []);
      }

      // Seleccionamos automáticamente el primer curso
      if (asignacionesData && asignacionesData.length > 0) {
        seleccionarCurso(asignacionesData[0].cursos);
      }

    } catch (error) {
      console.error('Error general:', error);

      Alert.alert(
        'Error',
        'Ocurrió un problema al cargar los datos.'
      );

    } finally {
      setLoading(false);
    }
  };

  /* seleccionar curso */

  const seleccionarCurso = async (curso) => {
    if (!curso) return;

    setSelectedCurso(curso);

    // Cargar alumnos pertenecientes al curso
    const { data: alumnosData, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('curso_id', curso.id)
      .order('apellido');

    if (error) {
      console.error(
        'Error cargando alumnos:',
        error.message
      );

      Alert.alert(
        'Error',
        'No se pudieron cargar los alumnos.'
      );

      return;
    }

    setAlumnos(alumnosData || []);

    // Cargar asistencia del día
    await cargarAsistencia(
      curso.id,
      alumnosData || []
    );
  };

  // cargar asistencia del dia

  const cargarAsistencia = async (cursoId, alumnosCurso) => {
    try {
      const hoy = new Date()
        .toISOString()
        .split('T')[0];

      const idsAlumnos = alumnosCurso.map(
        (alumno) => alumno.id
      );

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
        console.error(
          'Error cargando asistencia:',
          error.message
        );

        return;
      }

      const asistenciaActual = {};

      data?.forEach((registro) => {

        // Si existe estado usamos ese.
        // Si es un registro viejo usamos presente/ausente.
        asistenciaActual[registro.alumno_id] =
          registro.estado ||
          (registro.presente
            ? 'presente'
            : 'ausente');
      });

      setAsistencias(asistenciaActual);

    } catch (error) {
      console.error(
        'Error cargando asistencia:',
        error
      );
    }
  };

  // cambiar estado alumno

  const cambiarAsistencia = (
    alumnoId,
    estado
  ) => {

    setAsistencias((prev) => ({
      ...prev,
      [alumnoId]: estado
    }));
  };

  // guardar lista

  const guardarLista = async () => {

    if (!selectedCurso) {
      Alert.alert(
        'Atención',
        'Seleccione un curso primero.'
      );

      return;
    }

    if (alumnos.length === 0) {
      Alert.alert(
        'Atención',
        'Este curso no tiene alumnos registrados.'
      );

      return;
    }

    // Verificamos que todos los alumnos hayan sido marcados
    const faltaMarcar = alumnos.some(
      (alumno) =>
        asistencias[alumno.id] === undefined
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

      const hoy = new Date()
        .toISOString()
        .split('T')[0];

      // Buscamos registros existentes del día
      const idsAlumnos = alumnos.map(
        (alumno) => alumno.id
      );

      const {
        data: registrosExistentes,
        error: consultaError
      } = await supabase
        .from('asistencias')
        .select('*')
        .eq('fecha', hoy)
        .in('alumno_id', idsAlumnos);

      if (consultaError) {
        throw consultaError;
      }

      const registrosMap = {};

      registrosExistentes?.forEach(
        (registro) => {
          registrosMap[registro.alumno_id] =
            registro;
        }
      );

      // Guardamos/actualizamos alumno por alumno
      for (const alumno of alumnos) {

        const estado =
          asistencias[alumno.id];

        // Presente y tarde cuentan como presentes
        const presente =
          estado === 'presente' ||
          estado === 'tarde';

        if (registrosMap[alumno.id]) {

          // Ya existía una asistencia para hoy
          const { error } =
            await supabase
              .from('asistencias')
              .update({
                presente: presente,
                estado: estado
              })
              .eq(
                'id',
                registrosMap[alumno.id].id
              );

          if (error) {
            throw error;
          }

        } else {

          // No existía: creamos el registro
          const { error } =
            await supabase
              .from('asistencias')
              .insert([
                {
                  alumno_id: alumno.id,
                  fecha: hoy,
                  presente: presente,
                  estado: estado
                }
              ]);

          if (error) {
            throw error;
          }
        }
      }

      Alert.alert(
        '¡Lista enviada!',
        `La asistencia de ${alumnos.length} alumnos fue registrada correctamente.`
      );

    } catch (error) {

      console.error(
        'Error guardando asistencia:',
        error
      );

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

      const {
        data,
        error
      } = await supabase
        .from('eventos')
        .select('*')
        .eq('profesor_id', profesorId)
        .order('fecha')
        .order('hora');

      if (error) {

        console.error(
          'Error cargando eventos:',
          error.message
        );

        return;
      }

      setEventos(data || []);

    } catch (error) {

      console.error(
        'Error cargando agenda:',
        error
      );
    }
  };

  // crear evento

  const crearEvento = async () => {

    if (!eventoTitulo.trim()) {

      Alert.alert(
        'Atención',
        'Ingrese un título para el evento.'
      );

      return;
    }

    if (!selectedCurso) {

      Alert.alert(
        'Atención',
        'Seleccione un curso.'
      );

      return;
    }

    try {

      const { error } =
        await supabase
          .from('eventos')
          .insert([
            {
              profesor_id: profesorId,
              curso_id: selectedCurso.id,
              titulo: eventoTitulo.trim(),
              tipo: eventoTipo,
              descripcion:
                eventoDescripcion.trim() || null,
              fecha: fechaSeleccionada,
              hora: eventoHora.trim() || null
            }
          ]);

      if (error) {

        console.error(
          'Error creando evento:',
          error.message
        );

        Alert.alert(
          'Error',
          'No se pudo crear el evento.'
        );

        return;
      }

      Alert.alert(
        '¡Evento creado!',
        'El evento fue agregado a la agenda.'
      );

      setEventoTitulo('');
      setEventoDescripcion('');
      setEventoHora('');
      setEventoTipo('Evaluación');
      setMostrarFormularioEvento(false);

      cargarEventos();

    } catch (error) {

      console.error(
        'Error creando evento:',
        error
      );

      Alert.alert(
        'Error',
        'Ocurrió un problema al crear el evento.'
      );
    }
  };

  // eliminar evento

  const eliminarEvento = async (eventoId) => {

    console.log('Boton eliminar presionado:', eventoId);

    try {

      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventoId);

      if (error) {

        console.error(
          'Error eliminando evento:',
          error
        );

        Alert.alert(
          'Error',
          error.message
        );

        return;
      }

      // Eliminamos el evento de la lista local
      // para que desaparezca inmediatamente
      setEventos((prevEventos) =>
        prevEventos.filter(
          (evento) => evento.id !== eventoId
        )
      );

    } catch (error) {

      console.error(
        'Error eliminando evento:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudo eliminar el evento.'
      );
    }
  };

  // conts

  const cantidadPresentes =
    alumnos.filter(
      (alumno) =>
        asistencias[alumno.id] === 'presente'
    ).length;

  const cantidadAusentes =
    alumnos.filter(
      (alumno) =>
        asistencias[alumno.id] === 'ausente'
    ).length;

  const cantidadTarde =
    alumnos.filter(
      (alumno) =>
        asistencias[alumno.id] === 'tarde'
    ).length;

  const cantidadRetirados =
    alumnos.filter(
      (alumno) =>
        asistencias[alumno.id] === 'se_retiro'
    ).length;

  const cantidadSinMarcar =
    alumnos.filter(
      (alumno) =>
        asistencias[alumno.id] === undefined
    ).length;

  // Eventos del dia seleccionado y curso actual

  const eventosDelDia =
    eventos.filter(
      (evento) =>
        evento.fecha === fechaSeleccionada &&
        evento.curso_id === selectedCurso?.id
    );

  // Marcas del calendario

  const fechasConEventos = {};

  eventos
    .filter(
      (evento) =>
        evento.curso_id === selectedCurso?.id
    )
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

  // pantaalla carga

  if (loading) {

    return (
      <View style={styles.loadingContainer}>

        <Text style={styles.loadingTitle}>
          Cargando...
        </Text>

        <Text style={styles.loadingText}>
          Preparando el panel del profesor
        </Text>

      </View>
    );
  }

  // pantalla principal

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <View>

          <Text style={styles.headerTitle}>
            Presentismo Hernández
          </Text>

          <Text style={styles.headerSubtitle}>
            Panel del Profesor
          </Text>

        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutText}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>

      </View>

      <View style={styles.mainLayout}>

        {/* sidebar cursos */}

        <View style={styles.sidebar}>

          <Text style={styles.sidebarTitle}>
            Mis cursos
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
          >

            {asignaciones.length === 0 ? (

              <View style={styles.emptySidebar}>

                <Text style={styles.emptySidebarText}>
                  No tiene cursos asignados.
                </Text>

              </View>

            ) : (

              asignaciones.map(
                (asignacion) => {

                  const curso =
                    asignacion.cursos;

                  if (!curso) return null;

                  const seleccionado =
                    selectedCurso?.id ===
                    curso.id;

                  return (

                    <TouchableOpacity
                      key={asignacion.id}
                      style={[
                        styles.cursoCard,
                        seleccionado
                          ? styles.cursoCardSelected
                          : styles.cursoCardUnselected
                      ]}
                      onPress={() =>
                        seleccionarCurso(curso)
                      }
                    >

                      <Text
                        style={styles.cursoTitle}
                      >
                        {curso.anio}º {curso.division}
                      </Text>

                      <Text
                        style={
                          styles.cursoEspecialidad
                        }
                      >
                        {curso.especialidad}
                      </Text>

                      <Text
                        style={styles.cursoMateria}
                      >
                        {asignacion.materia}
                      </Text>

                    </TouchableOpacity>
                  );
                }
              )
            )}

          </ScrollView>

        </View>

        {/* contenido principal */}

        <View style={styles.contentArea}>

          {!selectedCurso ? (

            <View style={styles.noCourse}>

              <Text style={styles.noCourseIcon}>
                📋
              </Text>

              <Text style={styles.noCourseTitle}>
                Seleccione un curso
              </Text>

              <Text style={styles.noCourseText}>
                Seleccione uno de sus cursos para comenzar.
              </Text>

            </View>

          ) : (

            <>

              {/* selector de seccion */}

              <View style={styles.sectionSelector}>

                <TouchableOpacity
                  style={[
                    styles.sectionButton,
                    activeSection === 'asistencia' &&
                      styles.sectionButtonSelected
                  ]}
                  onPress={() =>
                    setActiveSection('asistencia')
                  }
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
                    activeSection === 'agenda' &&
                      styles.sectionButtonSelected
                  ]}
                  onPress={() =>
                    setActiveSection('agenda')
                  }
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

              {/* ========================= */}
              {/* ASISTENCIA */}
              {/* ========================= */}

              {activeSection === 'asistencia' && (

                <View style={styles.assistanceArea}>

                  {/* aviso lista */}

                  {cantidadSinMarcar > 0 && (

                    <View style={styles.alertBox}>

                      <View
                        style={
                          styles.alertIconContainer
                        }
                      >
                        <Text style={styles.alertIcon}>
                          🔔
                        </Text>
                      </View>

                      <View style={styles.alertContent}>

                        <Text style={styles.alertTitle}>
                          Lista pendiente
                        </Text>

                        <Text style={styles.alertText}>
                          Recuerde registrar la asistencia del curso antes de enviar la lista.
                        </Text>

                      </View>

                    </View>

                  )}

                  {/* titulo del curso */}

                  <View style={styles.courseHeader}>

                    <View>

                      <Text style={styles.courseTitle}>
                        {selectedCurso.anio}º {selectedCurso.division} {selectedCurso.especialidad}
                      </Text>

                      <Text style={styles.courseSubtitle}>
                        Toma de asistencia
                      </Text>

                    </View>

                    <View style={styles.dateBadge}>

                      <Text style={styles.dateText}>
                        {new Date().toLocaleDateString(
                          'es-AR'
                        )}
                      </Text>

                    </View>

                  </View>

                  {/* stats */}

                  <View style={styles.statsRow}>

                    <View style={styles.statCard}>

                      <Text style={styles.statNumber}>
                        {alumnos.length}
                      </Text>

                      <Text style={styles.statLabel}>
                        Alumnos
                      </Text>

                    </View>

                    <View
                      style={[
                        styles.statCard,
                        styles.statPresent
                      ]}
                    >

                      <Text style={styles.statNumber}>
                        {cantidadPresentes}
                      </Text>

                      <Text style={styles.statLabel}>
                        Presentes
                      </Text>

                    </View>

                    <View
                      style={[
                        styles.statCard,
                        styles.statAbsent
                      ]}
                    >

                      <Text style={styles.statNumber}>
                        {cantidadAusentes}
                      </Text>

                      <Text style={styles.statLabel}>
                        Ausentes
                      </Text>

                    </View>

                    <View
                      style={[
                        styles.statCard,
                        styles.statLate
                      ]}
                    >

                      <Text style={styles.statNumber}>
                        {cantidadTarde}
                      </Text>

                      <Text style={styles.statLabel}>
                        Tarde
                      </Text>

                    </View>

                    <View
                      style={[
                        styles.statCard,
                        styles.statLeft
                      ]}
                    >

                      <Text style={styles.statNumber}>
                        {cantidadRetirados}
                      </Text>

                      <Text style={styles.statLabel}>
                        Retirados
                      </Text>

                    </View>

                    <View
                      style={[
                        styles.statCard,
                        styles.statPending
                      ]}
                    >

                      <Text style={styles.statNumber}>
                        {cantidadSinMarcar}
                      </Text>

                      <Text style={styles.statLabel}>
                        Sin marcar
                      </Text>

                    </View>

                  </View>

                  {/* LISTA */}

                  <View style={styles.listContainer}>

                    <View style={styles.listHeader}>

                      <Text style={styles.listTitle}>
                        Lista de alumnos
                      </Text>

                      <Text style={styles.listSubtitle}>
                        Marque el estado de cada alumno
                      </Text>

                    </View>

                    <ScrollView
                      style={styles.studentsScroll}
                      contentContainerStyle={
                        styles.studentsContent
                      }
                      showsVerticalScrollIndicator={
                        false
                      }
                    >

                      {alumnos.length === 0 ? (

                        <View
                          style={
                            styles.emptyStudents
                          }
                        >

                          <Text
                            style={
                              styles.emptyStudentsText
                            }
                          >
                            No hay alumnos registrados en este curso.
                          </Text>

                        </View>

                      ) : (

                        alumnos.map(
                          (alumno, index) => {

                            const estado =
                              asistencias[
                                alumno.id
                              ];

                            return (

                              <View
                                key={alumno.id}
                                style={[
                                  styles.studentRow,

                                  estado ===
                                    'presente' &&
                                    styles.studentPresent,

                                  estado ===
                                    'ausente' &&
                                    styles.studentAbsent,

                                  estado ===
                                    'tarde' &&
                                    styles.studentLate,

                                  estado ===
                                    'se_retiro' &&
                                    styles.studentLeft
                                ]}
                              >

                                {/* datos del alumnop */}

                                <View
                                  style={
                                    styles.studentInfo
                                  }
                                >

                                  <View
                                    style={
                                      styles.studentNumber
                                    }
                                  >

                                    <Text
                                      style={
                                        styles.studentNumberText
                                      }
                                    >
                                      {index + 1}
                                    </Text>

                                  </View>

                                  <View>

                                    <Text
                                      style={
                                        styles.studentName
                                      }
                                    >
                                      {alumno.apellido},{' '}
                                      {alumno.nombre}
                                    </Text>

                                    <Text
                                      style={
                                        styles.studentDni
                                      }
                                    >
                                      DNI:{' '}
                                      {alumno.dni ||
                                        'Sin registrar'}
                                    </Text>

                                  </View>

                                </View>

                                {/* buttons */}

                                <View
                                  style={
                                    styles.attendanceButtons
                                  }
                                >

                                  <TouchableOpacity
                                    style={[
                                      styles.attendanceButton,
                                      styles.presentButton,
                                      estado ===
                                        'presente' &&
                                        styles.presentButtonSelected
                                    ]}
                                    onPress={() =>
                                      cambiarAsistencia(
                                        alumno.id,
                                        'presente'
                                      )
                                    }
                                  >

                                    <Text
                                      style={[
                                        styles.attendanceButtonText,
                                        estado ===
                                          'presente' &&
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
                                      estado ===
                                        'ausente' &&
                                        styles.absentButtonSelected
                                    ]}
                                    onPress={() =>
                                      cambiarAsistencia(
                                        alumno.id,
                                        'ausente'
                                      )
                                    }
                                  >

                                    <Text
                                      style={[
                                        styles.attendanceButtonText,
                                        estado ===
                                          'ausente' &&
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
                                      estado ===
                                        'tarde' &&
                                        styles.lateButtonSelected
                                    ]}
                                    onPress={() =>
                                      cambiarAsistencia(
                                        alumno.id,
                                        'tarde'
                                      )
                                    }
                                  >

                                    <Text
                                      style={[
                                        styles.attendanceButtonText,
                                        estado ===
                                          'tarde' &&
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
                                      estado ===
                                        'se_retiro' &&
                                        styles.leftButtonSelected
                                    ]}
                                    onPress={() =>
                                      cambiarAsistencia(
                                        alumno.id,
                                        'se_retiro'
                                      )
                                    }
                                  >

                                    <Text
                                      style={[
                                        styles.attendanceButtonText,
                                        estado ===
                                          'se_retiro' &&
                                          styles.selectedButtonText
                                      ]}
                                    >
                                      ↪ Se retiró
                                    </Text>

                                  </TouchableOpacity>

                                </View>

                              </View>
                            );
                          }
                        )
                      )}

                    </ScrollView>

                    {/* boton guardar */}

                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        guardando &&
                          styles.saveButtonDisabled
                      ]}
                      onPress={guardarLista}
                      disabled={guardando}
                    >

                      <Text
                        style={styles.saveButtonText}
                      >
                        {guardando
                          ? 'Guardando lista...'
                          : '✓ Enviar Lista de Asistencia'}
                      </Text>

                    </TouchableOpacity>

                  </View>

                </View>
              )}

              {/* ========================= */}
              {/* AGENDA */}
              {/* ========================= */}

              {activeSection === 'agenda' && (

                <View style={styles.agendaContainer}>

                  <View style={styles.agendaHeader}>

                    <View>

                      <Text
                        style={styles.agendaTitle}
                      >
                        📅 Agenda
                      </Text>

                      <Text
                        style={styles.agendaSubtitle}
                      >
                        Organice evaluaciones, TP y actividades
                      </Text>

                    </View>

                    <TouchableOpacity
                      style={
                        styles.newEventButton
                      }
                      onPress={() =>
                        setMostrarFormularioEvento(
                          !mostrarFormularioEvento
                        )
                      }
                    >

                      <Text
                        style={
                          styles.newEventButtonText
                        }
                      >
                        {mostrarFormularioEvento
                          ? 'Cerrar'
                          : '+ Nuevo evento'}
                      </Text>

                    </TouchableOpacity>

                  </View>

                  {/* formulario */}

                  {mostrarFormularioEvento && (

                    <View style={styles.eventForm}>

                      <Text
                        style={styles.eventFormTitle}
                      >
                        Nuevo evento
                      </Text>

                      <Text
                        style={styles.inputLabel}
                      >
                        Curso
                      </Text>

                      <View
                        style={
                          styles.selectedCourseBox
                        }
                      >

                        <Text
                          style={
                            styles.selectedCourseText
                          }
                        >
                          {selectedCurso.anio}º{' '}
                          {selectedCurso.division}{' '}
                          -{' '}
                          {selectedCurso.especialidad}
                        </Text>

                      </View>

                      <Text
                        style={styles.inputLabel}
                      >
                        Título
                      </Text>

                      <TextInput
                        style={styles.input}
                        placeholder="Ej: Evaluación de matemática"
                        value={eventoTitulo}
                        onChangeText={
                          setEventoTitulo
                        }
                      />

                      <Text
                        style={styles.inputLabel}
                      >
                        Tipo
                      </Text>

                      <View
                        style={styles.eventTypes}
                      >

                        {[
                          'Evaluación',
                          'TP',
                          'Nota',
                          'Otro'
                        ].map((tipo) => (

                          <TouchableOpacity
                            key={tipo}
                            style={[
                              styles.eventTypeButton,
                              eventoTipo ===
                                tipo &&
                                styles.eventTypeButtonSelected
                            ]}
                            onPress={() =>
                              setEventoTipo(
                                tipo
                              )
                            }
                          >

                            <Text
                              style={[
                                styles.eventTypeButtonText,
                                eventoTipo ===
                                  tipo &&
                                  styles.eventTypeButtonTextSelected
                              ]}
                            >
                              {tipo}
                            </Text>

                          </TouchableOpacity>

                        ))}

                      </View>

                      <Text
                        style={styles.inputLabel}
                      >
                        Descripción
                      </Text>

                      <TextInput
                        style={[
                          styles.input,
                          styles.descriptionInput
                        ]}
                        placeholder="Descripción del evento..."
                        value={
                          eventoDescripcion
                        }
                        onChangeText={
                          setEventoDescripcion
                        }
                        multiline
                      />

                      <Text
                        style={styles.inputLabel}
                      >
                        Hora
                      </Text>

                      <TextInput
                        style={styles.input}
                        placeholder="Ej: 10:30"
                        value={eventoHora}
                        onChangeText={
                          setEventoHora
                        }
                      />

                      <View
                        style={styles.formButtons}
                      >

                        <TouchableOpacity
                          style={
                            styles.cancelButton
                          }
                          onPress={() => {
                            setMostrarFormularioEvento(
                              false
                            );
                          }}
                        >

                          <Text
                            style={
                              styles.cancelButtonText
                            }
                          >
                            Cancelar
                          </Text>

                        </TouchableOpacity>

                        <TouchableOpacity
                          style={
                            styles.createEventButton
                          }
                          onPress={crearEvento}
                        >

                          <Text
                            style={
                              styles.createEventButtonText
                            }
                          >
                            Crear evento
                          </Text>

                        </TouchableOpacity>

                      </View>

                    </View>
                  )}

                  {/* calendario */}

                  <View
                    style={styles.calendarContainer}
                  >

                    <Calendar
                      current={fechaSeleccionada}
                      onDayPress={(day) => {
                        setFechaSeleccionada(
                          day.dateString
                        );
                      }}
                      markedDates={
                        fechasConEventos
                      }
                      theme={{
                        todayTextColor:
                          '#4f46e5',
                        arrowColor:
                          '#4f46e5',
                        selectedDayBackgroundColor:
                          '#4f46e5',
                        selectedDayTextColor:
                          '#ffffff',
                        textDayFontWeight:
                          '500',
                        textMonthFontWeight:
                          'bold',
                        textMonthFontSize:
                          18
                      }}
                    />

                  </View>

                  {/* eventos del dia */}

                  <View
                    style={styles.eventsContainer}
                  >

                    <Text
                      style={styles.eventsTitle}
                    >
                      Eventos del{' '}
                      {new Date(
                        fechaSeleccionada +
                          'T00:00:00'
                      ).toLocaleDateString(
                        'es-AR'
                      )}
                    </Text>

                    <ScrollView
                      showsVerticalScrollIndicator={
                        false
                      }
                      style={
                        styles.eventsScroll
                      }
                    >

                      {eventosDelDia.length ===
                      0 ? (

                        <Text
                          style={styles.noEvents}
                        >
                          No hay eventos para este día.
                        </Text>

                      ) : (

                        eventosDelDia.map(
                          (evento) => (

                            <View
                              key={evento.id}
                              style={
                                styles.eventCard
                              }
                            >

                              <View
                                style={
                                  styles.eventTypeBadge
                                }
                              >

                                <Text
                                  style={
                                    styles.eventTypeText
                                  }
                                >
                                  {evento.tipo}
                                </Text>

                              </View>

                              <View
                                style={
                                  styles.eventInfo
                                }
                              >

                                <Text
                                  style={
                                    styles.eventTitle
                                  }
                                >
                                  {evento.titulo}
                                </Text>

                                {evento.hora && (

                                  <Text
                                    style={
                                      styles.eventHour
                                    }
                                  >
                                    🕐{' '}
                                    {evento.hora.substring(
                                      0,
                                      5
                                    )}
                                  </Text>

                                )}

                                {evento.descripcion && (

                                  <Text
                                    style={
                                      styles.eventDescription
                                    }
                                  >
                                    {
                                      evento.descripcion
                                    }
                                  </Text>

                                )}

                              </View>

                              <Pressable
                                style={styles.deleteEventButton}
                                onPress={() => {
                                  console.log(
                                    'CLICK EN BORRAR:',
                                    evento.id
                                  );

                                  eliminarEvento(evento.id);
                                }}
                              >
                                <Text style={styles.deleteEventText}>
                                  🗑
                                </Text>
                              </Pressable>

                            </View>

                          )
                        )
                      )}

                    </ScrollView>

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

// estilos (lpm)

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },

  // header

  header: {
    height: 80,
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
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
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 7
  },

  logoutText: {
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

  // sidebar

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

  cursoMateria: {
    color: '#fff',
    fontSize: 11,
    marginTop: 7,
    fontWeight: 'bold'
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

  assistanceArea: {
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

  // selector

  sectionSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },

  sectionButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },

  sectionButtonSelected: {
    backgroundColor: '#4f46e5'
  },

  sectionButtonText: {
    color: '#334155',
    fontWeight: 'bold'
  },

  sectionButtonTextSelected: {
    color: '#fff'
  },

  // alerts

  alertBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#facc15',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },

  alertIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#facc15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },

  alertIcon: {
    fontSize: 18
  },

  alertContent: {
    flex: 1
  },

  alertTitle: {
    color: '#92400e',
    fontWeight: 'bold',
    fontSize: 14
  },

  alertText: {
    color: '#92400e',
    fontSize: 12,
    marginTop: 2
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

  // botones asistencia

  attendanceButtons: {
    flexDirection: 'row',
    gap: 7
  },

  attendanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
    borderWidth: 1
  },

  presentButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac'
  },

  presentButtonSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a'
  },

  absentButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5'
  },

  absentButtonSelected: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },

  lateButton: {
    backgroundColor: '#fffbeb',
    borderColor: '#facc15'
  },

  lateButtonSelected: {
    backgroundColor: '#eab308',
    borderColor: '#eab308'
  },

  leftButton: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8'
  },

  leftButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1'
  },

  attendanceButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155'
  },

  selectedButtonText: {
    color: '#fff'
  },

  // guardar

  saveButton: {
    backgroundColor: '#2563eb',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },

  saveButtonDisabled: {
    backgroundColor: '#94a3b8'
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },

  // agenda

  agendaContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18
  },

  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },

  agendaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e1b4b'
  },

  agendaSubtitle: {
    color: '#64748b',
    marginTop: 3
  },

  newEventButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8
  },

  newEventButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },

  calendarContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden'
  },

  // formulario evento

  eventForm: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15
  },

  eventFormTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1e1b4b',
    marginBottom: 12
  },

  inputLabel: {
    color: '#334155',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 5
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },

  descriptionInput: {
    height: 80,
    textAlignVertical: 'top'
  },

  selectedCourseBox: {
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#818cf8',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },

  selectedCourseText: {
    color: '#3730a3',
    fontWeight: 'bold'
  },

  eventTypes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },

  eventTypeButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7
  },

  eventTypeButtonSelected: {
    backgroundColor: '#4f46e5'
  },

  eventTypeButtonText: {
    color: '#334155',
    fontWeight: 'bold',
    fontSize: 11
  },

  eventTypeButtonTextSelected: {
    color: '#fff'
  },

  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },

  cancelButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8
  },

  cancelButtonText: {
    color: '#334155',
    fontWeight: 'bold'
  },

  createEventButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8
  },

  createEventButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },

  // eventos

  eventsContainer: {
    marginTop: 15,
    flex: 1
  },

  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10
  },

  eventsScroll: {
    flex: 1
  },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start'
  },

  eventTypeBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    alignSelf: 'flex-start',
    marginRight: 12
  },

  eventTypeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },

  eventInfo: {
    flex: 1
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a'
  },

  eventHour: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },

  eventDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 5
  },

  deleteEventButton: {
  padding: 10,
  marginLeft: 8,
  minWidth: 40,
  minHeight: 40,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
  elevation: 10
  },

  deleteEventText: {
    fontSize: 16
  },

  noEvents: {
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20
  },

  // vacios

  emptyStudents: {
    padding: 30,
    alignItems: 'center'
  },

  emptyStudentsText: {
    color: '#64748b',
    fontStyle: 'italic'
  },

  // cargas

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

