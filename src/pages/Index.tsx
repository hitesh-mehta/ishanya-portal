
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import CenterList from '@/components/centers/CenterList';
import { Center, Program, fetchCenters } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PendingReviews from '@/components/admin/PendingReviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Users, GraduationCap, ClipboardList } from 'lucide-react';
import ProgramList from '@/components/programs/ProgramList';
import TableListWrapper from '@/components/tables/TableListWrapper';
import FilteredTableView from '@/components/tables/FilteredTableView';
import AnnouncementBoard from '@/components/announcements/AnnouncementBoard';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import StudentFormHandler from '@/components/admin/StudentFormHandler';
import StudentForm from '@/components/admin/StudentForm';
import ActivitiesSection from '@/components/admin/ActivitiesSection';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import EmployeeForm from '@/components/hr/EmployeeForm';

const Index = () => {
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalEducators: 0,
    totalEmployees: 0
  });
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  useEffect(() => {
    const loadCenters = async () => {
      try {
        const centersData = await fetchCenters();
        if (centersData) {
          setCenters(centersData);
        }
      } catch (error) {
        console.error('Error fetching centers:', error);
        toast.error('Failed to load centers');
      } finally {
        setLoading(false);
      }
    };

    loadCenters();
    fetchStats();
    
    const studentsChannel = supabase
      .channel('students-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'students'
      }, () => {
        fetchStats();
      })
      .subscribe();
      
    const educatorsChannel = supabase
      .channel('educators-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'educators'
      }, () => {
        fetchStats();
      })
      .subscribe();
      
    const employeesChannel = supabase
      .channel('employees-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employees'
      }, () => {
        fetchStats();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(educatorsChannel);
      supabase.removeChannel(employeesChannel);
    };
  }, []);
  
  const fetchStats = async () => {
    try {
      const { count: studentCount, error: studentError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      const { count: educatorCount, error: educatorError } = await supabase
        .from('educators')
        .select('*', { count: 'exact', head: true });
      
      const { count: employeeCount, error: employeeError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });
      
      if (studentError || educatorError || employeeError) {
        console.error('Error fetching counts:', studentError || educatorError || employeeError);
        return;
      }
      
      setStats({
        totalStudents: studentCount || 0,
        totalEducators: educatorCount || 0,
        totalEmployees: employeeCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSelectCenter = (center: Center) => {
    setSelectedCenter(center);
    setSelectedProgram(null);
    setSelectedTable(null);
    setShowAnalytics(false);
  };

  const handleSelectProgram = (program: Program) => {
    setSelectedProgram(program);
    setSelectedTable(null);
    setShowAnalytics(false);
  };

  const handleSelectTable = (table: any) => {
    setSelectedTable(table);
    setShowAnalytics(false);
  };

  const handleBack = () => {
    if (selectedTable) {
      setSelectedTable(null);
    } else if (selectedProgram) {
      setSelectedProgram(null);
    } else if (selectedCenter) {
      setSelectedCenter(null);
      setShowAnalytics(true);
    }
  };
  
  const handleAddStudent = async (data: any) => {
    try {
      const { error } = await supabase
        .from('students')
        .insert([data]);
        
      if (error) {
        throw error;
      }
      
      toast.success('Student added successfully');
      fetchStats();
      return Promise.resolve();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
      return Promise.reject(error);
    }
  };
  
  const handleAddEmployee = async (data: any) => {
    try {
      const { error } = await supabase
        .from('employees')
        .insert([data]);
        
      if (error) {
        throw error;
      }
      
      toast.success('Employee added successfully');
      fetchStats();
      return Promise.resolve();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Failed to add employee');
      return Promise.reject(error);
    }
  };

  const renderContent = () => {
    if (selectedTable && selectedProgram) {
      return (
        <div>
          <div className="flex justify-end mb-4">
            {selectedTable.name === 'students' && (
              <Button 
                onClick={() => setShowStudentForm(true)}
                className="bg-ishanya-green hover:bg-ishanya-green/80 text-white"
              >
                Add Student
              </Button>
            )}
            {selectedTable.name === 'employees' && (
              <Button 
                onClick={() => setShowEmployeeForm(true)}
                className="bg-ishanya-purple hover:bg-ishanya-purple/80 text-white"
              >
                Add Employee
              </Button>
            )}
          </div>
          <FilteredTableView table={selectedTable} />
        </div>
      );
    }
    
    if (selectedProgram) {
      return (
        <TableListWrapper 
          program={selectedProgram} 
          onSelectTable={handleSelectTable} 
          selectedTable={selectedTable}
        />
      );
    }
    
    if (selectedCenter) {
      return <ProgramList center={selectedCenter} onSelectProgram={handleSelectProgram} />;
    }
    
    return (
      <>
        <div className="flex justify-between mb-4">
          <Button
            variant="outline"
            className="bg-white border-ishanya-green text-ishanya-green hover:bg-ishanya-green/10"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? "Hide Analytics" : "Show Analytics"}
          </Button>
          
          <Button
            variant="default"
            className="bg-ishanya-green hover:bg-ishanya-green/80 text-white"
            onClick={() => navigate("/admin/student-performance")}
          >
            View Student Performance
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-ishanya-green">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-ishanya-green" />
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ishanya-green">{stats.totalStudents}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-ishanya-yellow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-ishanya-yellow" />
                Total Educators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ishanya-yellow">{stats.totalEducators}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-500" />
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-500">{stats.totalEmployees}</p>
            </CardContent>
          </Card>
        </div>
        
        {showAnalytics && <AnalyticsDashboard />}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PendingReviews />
          <ActivitiesSection />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <CenterList onSelectCenter={handleSelectCenter} />
          </div>
          
          <div>
            <AnnouncementBoard />
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <Layout
        title="Loading..."
        subtitle="Please wait while we fetch the centers"
      >
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={selectedTable ? selectedTable.display_name || selectedTable.name : 
           selectedProgram ? selectedProgram.name : 
           selectedCenter ? selectedCenter.name : 
           "Admin Dashboard"}
      subtitle={selectedTable ? "Manage data" : 
              selectedProgram ? "Select a table" : 
              selectedCenter ? "Select a program" : 
              "Manage centers and programs"}
      showBackButton={!!selectedCenter}
      onBack={handleBack}
    >
      {renderContent()}
      
      {/* Student Form Handler */}
      <StudentFormHandler
        isOpen={showStudentForm}
        onClose={() => setShowStudentForm(false)}
        onSubmit={handleAddStudent}
        centerId={selectedCenter?.center_id}
        programId={selectedProgram?.program_id}
      >
        {(handleSubmit) => (
          <StudentForm
            onSubmit={handleSubmit}
            lastStudentId={null}
            centerId={selectedCenter?.center_id}
            programId={selectedProgram?.program_id}
          />
        )}
      </StudentFormHandler>
      
      {/* Employee Form Handler */}
      <StudentFormHandler
        isOpen={showEmployeeForm}
        onClose={() => setShowEmployeeForm(false)}
        onSubmit={handleAddEmployee}
        centerId={selectedCenter?.center_id}
        programId={selectedProgram?.program_id}
        formType="employee"
        title="Add Employee Record"
      >
        {(handleSubmit) => (
          <EmployeeForm
            onSubmit={handleSubmit}
            centerId={selectedCenter?.center_id}
            programId={selectedProgram?.program_id}
          />
        )}
      </StudentFormHandler>
    </Layout>
  );
};

export default Index;
