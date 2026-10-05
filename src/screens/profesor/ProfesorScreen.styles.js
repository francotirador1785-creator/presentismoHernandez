import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e1b4b',
    marginBottom: 8
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b'
  },
  header: {
    height: 70,
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  headerSubtitle: {
    color: '#c7d2fe',
    fontSize: 12
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 15,
    gap: 15
  },
  sidebar: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12
  },
  emptySidebar: {
    padding: 10,
    alignItems: 'center'
  },
  emptySidebarText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center'
  },
  cursoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  cursoCardSelected: {
    backgroundColor: '#4f46e5'
  },
  cursoCardUnselected: {
    backgroundColor: '#f1f5f9'
  },
  cursoTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#0f172a'
  },
  cursoEspecialidad: {
    fontSize: 12,
    color: '#475569'
  },
  cursoMateria: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  contentArea: {
    flex: 1
  },
  noCourse: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20
  },
  noCourseIcon: {
    fontSize: 40,
    marginBottom: 10
  },
  noCourseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  noCourseText: {
    color: '#64748b',
    marginTop: 4
  },
  sectionSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15
  },
  sectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e2e8f0'
  },
  sectionButtonSelected: {
    backgroundColor: '#4f46e5'
  },
  sectionButtonText: {
    fontWeight: 'bold',
    color: '#475569',
    fontSize: 13
  },
  sectionButtonTextSelected: {
    color: '#ffffff'
  },
  assistanceArea: {
    flex: 1
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10
  },
  alertIconContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertIcon: {
    fontSize: 18
  },
  alertContent: {
    flex: 1
  },
  alertTitle: {
    fontWeight: 'bold',
    color: '#b45309',
    fontSize: 13
  },
  alertText: {
    fontSize: 12,
    color: '#d97706'
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  courseSubtitle: {
    fontSize: 12,
    color: '#64748b'
  },
  dateBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  dateText: {
    color: '#3730a3',
    fontWeight: 'bold',
    fontSize: 12
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  statPresent: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statAbsent: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statLate: { backgroundColor: '#fefce8', borderColor: '#fef08a' },
  statLeft: { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' },
  statPending: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  listHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  listTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  listSubtitle: {
    fontSize: 11,
    color: '#64748b'
  },
  studentsScroll: {
    flex: 1
  },
  studentsContent: {
    gap: 8
  },
  emptyStudents: {
    padding: 20,
    alignItems: 'center'
  },
  emptyStudentsText: {
    color: '#64748b',
    fontSize: 13
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  studentPresent: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  studentAbsent: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  studentLate: { backgroundColor: '#fefce8', borderColor: '#fde047' },
  studentLeft: { backgroundColor: '#faf5ff', borderColor: '#d8b4fe' },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  studentNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  studentNumberText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155'
  },
  studentName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  studentDni: {
    fontSize: 11,
    color: '#64748b'
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 4
  },
  attendanceButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e2e8f0'
  },
  attendanceButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  selectedButtonText: {
    color: '#ffffff'
  },
  presentButton: {},
  presentButtonSelected: { backgroundColor: '#16a34a' },
  absentButton: {},
  absentButtonSelected: { backgroundColor: '#dc2626' },
  lateButton: {},
  lateButtonSelected: { backgroundColor: '#ca8a04' },
  leftButton: {},
  leftButtonSelected: { backgroundColor: '#9333ea' },
  submitContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'flex-end'
  },
  submitButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  agendaArea: {
    flex: 1,
    gap: 10
  },
  agendaLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 12
  },
  calendarContainer: {
    width: 320,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  eventsContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  eventsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  addEventButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  addEventButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  eventsScroll: {
    flex: 1
  },
  emptyEvents: {
    padding: 20,
    alignItems: 'center'
  },
  emptyEventsText: {
    color: '#64748b',
    fontSize: 12
  },
  eventCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#0f172a'
  },
  eventTypeBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  eventTypeText: {
    fontSize: 10,
    color: '#3730a3',
    fontWeight: '600'
  },
  eventDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4
  },
  eventTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4
  },
  deleteEventBtn: {
    marginTop: 6,
    alignSelf: 'flex-end'
  },
  deleteEventText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: 'bold'
  },
  formCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8
  },
  formTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a'
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 6
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#e2e8f0'
  },
  typeBtnSelected: {
    backgroundColor: '#4f46e5'
  },
  typeBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  typeBtnTextSelected: {
    color: '#ffffff'
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#cbd5e1'
  },
  cancelBtnText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: 'bold'
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#16a34a'
  },
  saveBtnText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold'
  }
});