
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Users, BookOpen, GraduationCap, MessageSquare, Calendar, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, Student, Teacher, Class, Subject,
  ChatbotMessageInput, CreateUserInput, CreateStudentInput, CreateTeacherInput,
  CreateClassInput, CreateSubjectInput
} from '../../server/src/schema';

// Sample data for demonstration - this will be replaced with real backend data
const DEMO_USERS: User[] = [
  { id: 1, email: 'john.doe@school.edu', name: 'John Doe', role: 'student', created_at: new Date(), updated_at: new Date() },
  { id: 2, email: 'jane.smith@school.edu', name: 'Jane Smith', role: 'teacher', created_at: new Date(), updated_at: new Date() },
  { id: 3, email: 'admin@school.edu', name: 'School Admin', role: 'admin', created_at: new Date(), updated_at: new Date() }
];

const DEMO_STUDENTS: Student[] = [
  { id: 1, user_id: 1, student_id: 'STU001', class_id: 1, created_at: new Date(), updated_at: new Date() }
];

const DEMO_CLASSES: Class[] = [
  { id: 1, name: 'Grade 10 Science', grade: '10', section: 'A', created_at: new Date(), updated_at: new Date() },
  { id: 2, name: 'Grade 11 Math', grade: '11', section: 'B', created_at: new Date(), updated_at: new Date() }
];

const DEMO_SUBJECTS: Subject[] = [
  { id: 1, name: 'Mathematics', code: 'MATH101', description: 'Basic Mathematics', created_at: new Date(), updated_at: new Date() },
  { id: 2, name: 'Science', code: 'SCI101', description: 'General Science', created_at: new Date(), updated_at: new Date() }
];

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    message: string;
    sender: 'user' | 'bot';
    timestamp: Date;
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // Form states
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [showAddTeacherForm, setShowAddTeacherForm] = useState(false);
  const [showAddClassForm, setShowAddClassForm] = useState(false);
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);
  const [formMessage, setFormMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Student form data
  const [studentFormData, setStudentFormData] = useState<{
    name: string;
    email: string;
    student_id: string;
    class_id: string;
  }>({
    name: '',
    email: '',
    student_id: '',
    class_id: ''
  });

  // Teacher form data
  const [teacherFormData, setTeacherFormData] = useState<{
    name: string;
    email: string;
    employee_id: string;
  }>({
    name: '',
    email: '',
    employee_id: ''
  });

  // Class form data
  const [classFormData, setClassFormData] = useState<CreateClassInput>({
    name: '',
    grade: '',
    section: null
  });

  // Subject form data
  const [subjectFormData, setSubjectFormData] = useState<CreateSubjectInput>({
    name: '',
    code: '',
    description: null
  });

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      // Try to load real data from backend
      const [studentsResult, teachersResult, classesResult, subjectsResult] = await Promise.allSettled([
        trpc.getStudents.query(),
        trpc.getTeachers.query(),
        trpc.getClasses.query(),
        trpc.getSubjects.query()
      ]);

      // Use real data if available, otherwise use demo data
      setStudents(studentsResult.status === 'fulfilled' && studentsResult.value.length > 0 
        ? studentsResult.value 
        : DEMO_STUDENTS);
      
      setTeachers(teachersResult.status === 'fulfilled' && teachersResult.value.length > 0 
        ? teachersResult.value 
        : []);
      
      setClasses(classesResult.status === 'fulfilled' && classesResult.value.length > 0 
        ? classesResult.value 
        : DEMO_CLASSES);
      
      setSubjects(subjectsResult.status === 'fulfilled' && subjectsResult.value.length > 0 
        ? subjectsResult.value 
        : DEMO_SUBJECTS);

      // Set demo current user for demonstration
      setCurrentUser(DEMO_USERS[0]); // Default to student view
      setIsOnline(true);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Fall back to demo data
      setStudents(DEMO_STUDENTS);
      setClasses(DEMO_CLASSES);
      setSubjects(DEMO_SUBJECTS);
      setCurrentUser(DEMO_USERS[0]);
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Chatbot message handling
  const handleChatMessage = async (message: string) => {
    if (!currentUser || !message.trim()) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      message: message.trim(),
      sender: 'user' as const,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessingChat(true);

    try {
      const chatInput: ChatbotMessageInput = {
        student_id: currentUser.id,
        message: message.trim(),
        session_id: `session_${currentUser.id}_${Date.now()}`
      };

      const response = await trpc.processChatbotMessage.mutate(chatInput);
      
      const botMessage = {
        id: `bot_${Date.now()}`,
        message: response.message,
        sender: 'bot' as const,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, botMessage]);

      if (response.attendance_marked) {
        // Refresh attendance data if attendance was marked
        loadAttendanceData();
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Provide a fallback response
      const botMessage = {
        id: `bot_${Date.now()}`,
        message: "I understand you want to mark attendance. Please tell me: Are you Present, Sick, Late, or do you have Permitted Leave? (Note: Backend handler is currently a stub)",
        sender: 'bot' as const,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMessage]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  const loadAttendanceData = useCallback(async () => {
    try {
      const today = new Date();
      await trpc.getAttendanceByDate.query({
        date: today,
        class_id: currentUser?.role === 'student' ? DEMO_STUDENTS[0]?.class_id : undefined
      });
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  }, [currentUser]);

  const switchUserRole = (role: 'student' | 'teacher' | 'admin') => {
    const user = DEMO_USERS.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
      // Clear chat when switching users
      setChatMessages([]);
    }
  };

  // Form handlers
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingStudent(true);
    setFormMessage(null);

    try {
      // Validate form
      if (!studentFormData.name || !studentFormData.email || !studentFormData.student_id || !studentFormData.class_id) {
        throw new Error('Semua field harus diisi');
      }

      // Create user first
      const userInput: CreateUserInput = {
        name: studentFormData.name,
        email: studentFormData.email,
        role: 'student'
      };

      const newUser = await trpc.createUser.mutate(userInput);

      // Create student record
      const studentInput: CreateStudentInput = {
        user_id: newUser.id,
        student_id: studentFormData.student_id,
        class_id: parseInt(studentFormData.class_id)
      };

      const newStudent = await trpc.createStudent.mutate(studentInput);

      // Update local state
      setStudents((prev: Student[]) => [...prev, newStudent]);

      // Reset form
      setStudentFormData({
        name: '',
        email: '',
        student_id: '',
        class_id: ''
      });

      setFormMessage({
        type: 'success',
        text: `Siswa ${studentFormData.name} berhasil ditambahkan!`
      });

      setShowAddStudentForm(false);
    } catch (error) {
      console.error('Failed to create student:', error);
      setFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Gagal menambahkan siswa'
      });
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTeacher(true);
    setFormMessage(null);

    try {
      // Validate form
      if (!teacherFormData.name || !teacherFormData.email || !teacherFormData.employee_id) {
        throw new Error('Semua field harus diisi');
      }

      // Create user first
      const userInput: CreateUserInput = {
        name: teacherFormData.name,
        email: teacherFormData.email,
        role: 'teacher'
      };

      const newUser = await trpc.createUser.mutate(userInput);

      // Create teacher record
      const teacherInput: CreateTeacherInput = {
        user_id: newUser.id,
        employee_id: teacherFormData.employee_id
      };

      const newTeacher = await trpc.createTeacher.mutate(teacherInput);

      // Update local state
      setTeachers((prev: Teacher[]) => [...prev, newTeacher]);

      // Reset form
      setTeacherFormData({
        name: '',
        email: '',
        employee_id: ''
      });

      setFormMessage({
        type: 'success',
        text: `Guru ${teacherFormData.name} berhasil ditambahkan!`
      });

      setShowAddTeacherForm(false);
    } catch (error) {
      console.error('Failed to create teacher:', error);
      setFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Gagal menambahkan guru'
      });
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  // Class form handler
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingClass(true);
    setFormMessage(null);

    try {
      // Validate form
      if (!classFormData.name || !classFormData.grade) {
        throw new Error('Nama kelas dan tingkat harus diisi');
      }

      const newClass = await trpc.createClass.mutate(classFormData);

      // Update local state
      setClasses((prev: Class[]) => [...prev, newClass]);

      // Reset form
      setClassFormData({
        name: '',
        grade: '',
        section: null
      });

      setFormMessage({
        type: 'success',
        text: `Kelas ${classFormData.name} berhasil dibuat!`
      });

      setShowAddClassForm(false);
    } catch (error) {
      console.error('Failed to create class:', error);
      setFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Gagal membuat kelas'
      });
    } finally {
      setIsSubmittingClass(false);
    }
  };

  // Subject form handler
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSubject(true);
    setFormMessage(null);

    try {
      // Validate form
      if (!subjectFormData.name || !subjectFormData.code) {
        throw new Error('Nama mata pelajaran dan kode harus diisi');
      }

      const newSubject = await trpc.createSubject.mutate(subjectFormData);

      // Update local state
      setSubjects((prev: Subject[]) => [...prev, newSubject]);

      // Reset form
      setSubjectFormData({
        name: '',
        code: '',
        description: null
      });

      setFormMessage({
        type: 'success',
        text: `Mata pelajaran ${subjectFormData.name} berhasil ditambahkan!`
      });

      setShowAddSubjectForm(false);
    } catch (error) {
      console.error('Failed to create subject:', error);
      setFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Gagal menambahkan mata pelajaran'
      });
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  const resetForms = () => {
    setShowAddStudentForm(false);
    setShowAddTeacherForm(false);
    setShowAddClassForm(false);
    setShowAddSubjectForm(false);
    setFormMessage(null);
    setStudentFormData({
      name: '',
      email: '',
      student_id: '',
      class_id: ''
    });
    setTeacherFormData({
      name: '',
      email: '',
      employee_id: ''
    });
    setClassFormData({
      name: '',
      grade: '',
      section: null
    });
    setSubjectFormData({
      name: '',
      code: '',
      description: null
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Memuat Portal Sekolah...</h1>
          <p className="text-gray-600">Mohon tunggu sementara kami menyiapkan dashboard Anda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-indigo-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SmartAttend 🎓</h1>
                <p className="text-sm text-gray-600">Manajemen Absensi Berbasis AI</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {!isOnline && (
                <Alert className="py-2 px-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Mode Demo - Handler backend masih dalam pengembangan
                  </AlertDescription>
                </Alert>
              )}
              
              {/* User Role Switcher */}
              <div className="flex space-x-2">
                <Button
                  variant={currentUser.role === 'student' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchUserRole('student')}
                >
                  Siswa
                </Button>
                <Button
                  variant={currentUser.role === 'teacher' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchUserRole('teacher')}
                >
                  Guru
                </Button>
                <Button
                  variant={currentUser.role === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchUserRole('admin')}
                >
                  Admin
                </Button>
              </div>
              
              <div className="text-right">
                <p className="font-medium text-gray-900">{currentUser.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Dashboard */}
        {currentUser.role === 'student' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* AI Chatbot */}
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <span>Asisten Absensi AI 🤖</span>
                  </CardTitle>
                  <CardDescription>
                    Chat dengan saya untuk mencatat absensi dengan cepat dan mudah!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Chat Messages */}
                    <div className="h-64 overflow-y-auto bg-white rounded-lg p-4 space-y-3 border">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>Halo! Saya asisten absensi Anda. 👋</p>
                          <p className="text-sm">Coba katakan: "Saya hadir hari ini" atau "Tandai saya sakit"</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                msg.sender === 'user'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs mt-1 opacity-70">
                                {msg.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      {isProcessingChat && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">AI sedang berpikir... 💭</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Chat Input */}
                    <div className="flex space-x-2">
                      <Input
                        value={chatInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
                        placeholder="Ketik pesan Anda... (contoh: 'Saya hadir hari ini')"
                        onKeyPress={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter' && !isProcessingChat) {
                            handleChatMessage(chatInput);
                          }
                        }}
                        disabled={isProcessingChat}
                      />
                      <Button
                        onClick={() => handleChatMessage(chatInput)}
                        disabled={!chatInput.trim() || isProcessingChat}
                      >
                        Kirim
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span>Status Hari Ini</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date().toLocaleDateString('id-ID', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <Badge className="bg-gray-100 text-gray-800 text-lg py-2 px-4">
                        Belum absen hari ini
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="font-medium text-green-800">Hadir</p>
                        <p className="text-green-600">15 hari</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <p className="font-medium text-red-800">Tidak Hadir</p>
                        <p className="text-red-600">2 hari</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Teacher Dashboard */}
        {currentUser.role === 'teacher' && (
          <Tabs defaultValue="attendance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attendance">Lihat Absensi</TabsTrigger>
              <TabsTrigger value="classes">Kelas Saya</TabsTrigger>
              <TabsTrigger value="reports">Laporan</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Absensi Kelas - Hari Ini</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Tidak ada catatan absensi ditemukan</p>
                    <p className="text-sm">Handler backend masih dalam pengembangan</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="classes" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls: Class) => (
                  <Card key={cls.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{cls.name}</CardTitle>
                      <CardDescription>
                        Kelas {cls.grade} {cls.section && `- Bagian ${cls.section}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Siswa:</span>
                          <span className="font-medium">25</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Hadir Hari Ini:</span>
                          <span className="font-medium text-green-600">22</span>
                        </div>
                        <Button size="sm" className="w-full mt-4">
                          Lihat Detail
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <span>Laporan Absensi</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Pembuatan laporan segera hadir</p>
                    <p className="text-sm">Akan menampilkan analitik absensi harian, mingguan, dan bulanan</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Admin Dashboard */}
        {currentUser.role === 'admin' && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="manage">Kelola Data</TabsTrigger>
              <TabsTrigger value="reports">Laporan</TabsTrigger>
              <TabsTrigger value="settings">Pengaturan</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Siswa</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{students.length}</p>
                    <p className="text-sm text-gray-600">Total terdaftar</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                      <span>Guru</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{teachers.length}</p>
                    <p className="text-sm text-gray-600">Tenaga pengajar aktif</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span>Kelas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-purple-600">{classes.length}</p>
                    <p className="text-sm text-gray-600">Total kelas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                      <span>Mata Pelajaran</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-orange-600">{subjects.length}</p>
                    <p className="text-sm text-gray-600">Mata pelajaran tersedia</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Status Sistem</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Koneksi Backend</span>
                      <Badge variant={isOnline ? "default" : "secondary"}>
                        {isOnline ? "Terhubung" : "Mode Demo"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Chatbot AI</span>
                      <Badge variant="default">Aktif</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sistem Absensi</span>
                      <Badge variant="default">Beroperasi</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              {/* Form Messages */}
              {formMessage && (
                <Alert className={formMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {formMessage.type === 'success' ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <XCircle className="h-4 w-4 text-red-600" />
                  }
                  <AlertDescription className={formMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {formMessage.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Aksi Cepat</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => {
                        resetForms();
                        setShowAddStudentForm(true);
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Tambah Siswa Baru
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => {
                        resetForms();
                        setShowAddTeacherForm(true);
                      }}
                    >
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Tambah Guru Baru
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => {
                        resetForms();
                        setShowAddClassForm(true);
                      }}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Buat Kelas Baru
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => {
                        resetForms();
                        setShowAddSubjectForm(true);
                      }}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Tambah Mata Pelajaran
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Aktivitas Terbaru</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Siswa baru terdaftar: John Doe</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Absensi dicatat via chatbot</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Kelas baru dibuat: Kelas 10 IPA</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Add Student Form */}
              {showAddStudentForm && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Tambah Siswa Baru</span>
                    </CardTitle>
                    <CardDescription>
                      Isi formulir di bawah untuk menambahkan siswa baru ke sistem
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddStudent} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Nama Lengkap *</label>
                          <Input
                            value={studentFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setStudentFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Masukkan nama lengkap siswa"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Email *</label>
                          <Input
                            type="email"
                            value={studentFormData.email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setStudentFormData((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="siswa@sekolah.edu"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">NIS (Nomor Induk Siswa) *</label>
                          <Input
                            value={studentFormData.student_id}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setStudentFormData((prev) => ({ ...prev, student_id: e.target.value }))
                            }
                            placeholder="Contoh: STU001"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Kelas *</label>
                          <Select
                            value={studentFormData.class_id}
                            onValueChange={(value: string) =>
                              setStudentFormData((prev) => ({ ...prev, class_id: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kelas" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map((cls: Class) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name} - Kelas {cls.grade} {cls.section}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button type="submit" disabled={isSubmittingStudent}>
                          {isSubmittingStudent ? 'Menyimpan...' : 'Tambah Siswa'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetForms}
                          disabled={isSubmittingStudent}
                        >
                          Batal
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Add Teacher Form */}
              {showAddTeacherForm && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                      <span>Tambah Guru Baru</span>
                    </CardTitle>
                    <CardDescription>
                      Isi formulir di bawah untuk menambahkan guru baru ke sistem
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddTeacher} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Nama Lengkap *</label>
                          <Input
                            value={teacherFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setTeacherFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Masukkan nama lengkap guru"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Email *</label>
                          <Input
                            type="email"
                            value={teacherFormData.email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setTeacherFormData((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="guru@sekolah.edu"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-2 block">NIP (Nomor Induk Pegawai) *</label>
                          <Input
                            value={teacherFormData.employee_id}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setTeacherFormData((prev) => ({ ...prev, employee_id: e.target.value }))
                            }
                            placeholder="Contoh: TEA001"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button type="submit" disabled={isSubmittingTeacher}>
                          {isSubmittingTeacher ? 'Menyimpan...' : 'Tambah Guru'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetForms}
                          disabled={isSubmittingTeacher}
                        >
                          Batal
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Add Class Form */}
              {showAddClassForm && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span>Buat Kelas Baru</span>
                    </CardTitle>
                    <CardDescription>
                      Isi formulir di bawah untuk membuat kelas baru
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddClass} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Nama Kelas *</label>
                          <Input
                            value={classFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setClassFormData((prev: CreateClassInput) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Contoh: Kelas 10 IPA"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Tingkat *</label>
                          <Input
                            value={classFormData.grade}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setClassFormData((prev: CreateClassInput) => ({ ...prev, grade: e.target.value }))
                            }
                            placeholder="Contoh: 10, 11, 12"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-2 block">Bagian (opsional)</label>
                          <Input
                            value={classFormData.section || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setClassFormData((prev: CreateClassInput) => ({
                                ...prev,
                                section: e.target.value || null
                              }))
                            }
                            placeholder="Contoh: A, B, C (kosongkan jika tidak ada)"
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button type="submit" disabled={isSubmittingClass}>
                          {isSubmittingClass ? 'Membuat...' : 'Buat Kelas'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetForms}
                          disabled={isSubmittingClass}
                        >
                          Batal
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Add Subject Form */}
              {showAddSubjectForm && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                      <span>Tambah Mata Pelajaran Baru</span>
                    </CardTitle>
                    <CardDescription>
                      Isi formulir di bawah untuk menambahkan mata pelajaran baru
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddSubject} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Nama Mata Pelajaran *</label>
                          <Input
                            value={subjectFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setSubjectFormData((prev: CreateSubjectInput) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Contoh: Matematika, Fisika"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Kode Mata Pelajaran *</label>
                          <Input
                            value={subjectFormData.code}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setSubjectFormData((prev: CreateSubjectInput) => ({ ...prev, code: e.target.value }))
                            }
                            placeholder="Contoh: MATH101, PHYS101"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-2 block">Deskripsi (opsional)</label>
                          <Input
                            value={subjectFormData.description || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setSubjectFormData((prev: CreateSubjectInput) => ({
                                ...prev,
                                description: e.target.value || null
                              }))
                            }
                            placeholder="Deskripsi singkat mata pelajaran"
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button type="submit" disabled={isSubmittingSubject}>
                          {isSubmittingSubject ? 'Menyimpan...' : 'Tambah Mata Pelajaran'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetForms}
                          disabled={isSubmittingSubject}
                        >
                          Batal
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Analitik Absensi</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Dashboard laporan lanjutan segera hadir</p>
                    <p className="text-sm">Akan mencakup laporan harian, mingguan, bulanan, per mata pelajaran, dan per siswa</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Konfigurasi Sistem</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Ini adalah antarmuka demonstrasi. Handler backend saat ini merupakan implementasi stub.
                        Dalam lingkungan produksi, ini akan terhubung ke database dan layanan AI yang sebenarnya.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Pengaturan Absensi</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Batas Terlambat (menit)</label>
                          <Input type="number" defaultValue="15" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Auto-tandai Tidak Hadir Setelah</label>
                          <Input type="time" defaultValue="09:30" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default App;
