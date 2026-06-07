import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Protected } from './components/Protected';
import { useAuth } from './auth/AuthContext';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { CoachDashboard } from './pages/CoachDashboard';
import { Students } from './pages/Students';
import { Attendance } from './pages/Attendance';
import { AttendanceHistory } from './pages/AttendanceHistory';
import { Classes } from './pages/Classes';
import { Payments } from './pages/Payments';
import { Uniforms } from './pages/Uniforms';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { StudentCards } from './pages/StudentCards';
import { ZaloConnect } from './pages/ZaloConnect';
import { Reports } from './pages/Reports';
import { CoachClasses } from './pages/CoachClasses';
import { Schedules } from './pages/Schedules';
import { ParentPortal } from './pages/ParentPortal';
import { Parents } from './pages/Parents';
import { CoachPayroll } from './pages/CoachPayroll';
import { BiometricAttendance } from './pages/BiometricAttendance';

function DashboardEntry() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'PARENT') return <ParentPortal />;
  return <CoachDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<DashboardEntry />} />
        <Route path="parent-portal" element={<Protected roles={['PARENT']}><ParentPortal /></Protected>} />
        <Route path="classes" element={<Protected roles={['ADMIN', 'COACH']}><Classes /></Protected>} />
        <Route path="schedules" element={<Protected roles={['ADMIN', 'COACH']}><Schedules /></Protected>} />
        <Route path="students" element={<Protected roles={['ADMIN', 'COACH']}><Students /></Protected>} />
        <Route path="student-cards" element={<Protected roles={['ADMIN', 'COACH']}><StudentCards /></Protected>} />
        <Route path="attendance" element={<Protected roles={['ADMIN', 'COACH']}><Attendance /></Protected>} />
        <Route path="biometric-attendance" element={<Protected roles={['ADMIN', 'COACH']}><BiometricAttendance /></Protected>} />
        <Route path="attendance-history" element={<Protected roles={['ADMIN']}><AttendanceHistory /></Protected>} />
        <Route path="coach-payroll" element={<Protected roles={['ADMIN', 'COACH']}><CoachPayroll /></Protected>} />
        <Route path="coach-classes" element={<Protected roles={['ADMIN', 'COACH']}><CoachClasses /></Protected>} />
        <Route path="payments" element={<Protected roles={['ADMIN', 'COACH']}><Payments /></Protected>} />
        <Route path="reports" element={<Protected roles={['ADMIN']}><Reports /></Protected>} />
        <Route path="uniforms" element={<Protected roles={['ADMIN', 'COACH']}><Uniforms /></Protected>} />
        <Route path="parents" element={<Protected roles={['ADMIN']}><Parents /></Protected>} />
        <Route path="users" element={<Protected roles={['ADMIN']}><Users /></Protected>} />
        <Route path="zalo" element={<Protected roles={['ADMIN']}><ZaloConnect /></Protected>} />
        <Route path="settings" element={<Protected roles={['ADMIN']}><Settings /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
