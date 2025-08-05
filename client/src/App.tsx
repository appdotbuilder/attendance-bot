
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users, BookOpen, GraduationCap, MessageSquare, Calendar, BarChart3 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, Student, Teacher, Class, Subject,
  ChatbotMessageInput
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading School Portal...</h1>
          <p className="text-gray-600">Please wait while we set up your dashboard</p>
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
                <p className="text-sm text-gray-600">AI-Powered Attendance Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {!isOnline && (
                <Alert className="py-2 px-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Demo Mode - Backend handlers are stubs
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
                  Student
                </Button>
                <Button
                  variant={currentUser.role === 'teacher' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchUserRole('teacher')}
                >
                  Teacher
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
                    <span>AI Attendance Assistant 🤖</span>
                  </CardTitle>
                  <CardDescription>
                    Chat with me to mark your attendance quickly and easily!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Chat Messages */}
                    <div className="h-64 overflow-y-auto bg-white rounded-lg p-4 space-y-3 border">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>Hi! I'm your attendance assistant. 👋</p>
                          <p className="text-sm">Try saying: "I'm present today" or "Mark me sick"</p>
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
                            <p className="text-sm text-gray-600">AI is thinking... 💭</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Chat Input */}
                    <div className="flex space-x-2">
                      <Input
                        value={chatInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
                        placeholder="Type your message... (e.g., 'I'm present today')"
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
                        Send
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
                    <span>Today's Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date().toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <Badge className="bg-gray-100 text-gray-800 text-lg py-2 px-4">
                        No attendance marked yet
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="font-medium text-green-800">Present</p>
                        <p className="text-green-600">15 days</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <p className="font-medium text-red-800">Absent</p>
                        <p className="text-red-600">2 days</p>
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
              <TabsTrigger value="attendance">View Attendance</TabsTrigger>
              <TabsTrigger value="classes">My Classes</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Class Attendance - Today</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>No attendance records found</p>
                    <p className="text-sm">Backend handlers are currently stubs</p>
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
                        Grade {cls.grade} {cls.section && `- Section ${cls.section}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Students:</span>
                          <span className="font-medium">25</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Present Today:</span>
                          <span className="font-medium text-green-600">22</span>
                        </div>
                        <Button size="sm" className="w-full mt-4">
                          View Details
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
                    <span>Attendance Reports</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Report generation coming soon</p>
                    <p className="text-sm">Will show daily, weekly, and monthly attendance analytics</p>
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
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="manage">Manage Data</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Students</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{students.length}</p>
                    <p className="text-sm text-gray-600">Total enrolled</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                      <span>Teachers</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{teachers.length}</p>
                    <p className="text-sm text-gray-600">Active faculty</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span>Classes</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-purple-600">{classes.length}</p>
                    <p className="text-sm text-gray-600">Total classes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                      <span>Subjects</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-orange-600">{subjects.length}</p>
                    <p className="text-sm text-gray-600">Available subjects</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Backend Connection</span>
                      <Badge variant={isOnline ? "default" : "secondary"}>
                        {isOnline ? "Connected" : "Demo Mode"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>AI Chatbot</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Attendance System</span>
                      <Badge variant="default">Operational</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Add New Student
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Add New Teacher
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Create New Class
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Add New Subject
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>New student enrolled: John Doe</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Attendance marked via chatbot</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>New class created: Grade 10 Science</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Attendance Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Advanced reporting dashboard coming soon</p>
                    <p className="text-sm">Will include daily, weekly, monthly, per-subject, and per-student reports</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This is a demonstration interface. Backend handlers are currently stub implementations.
                        In a production environment, these would connect to a real database and AI service.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Attendance Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Late Threshold (minutes)</label>
                          <Input type="number" defaultValue="15" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Auto-mark Absent After</label>
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
