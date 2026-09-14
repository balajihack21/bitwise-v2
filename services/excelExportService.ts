import { Course, CourseInternalAssessment } from '../types';
import { StudentOverview } from './firebase';

const getCalculatedInternalAssessment = (student: StudentOverview, courseId: string, catalogCourse?: Course): CourseInternalAssessment => {
  const existing: Partial<CourseInternalAssessment> = student.internalAssessments?.[courseId] || {};
  const courseModules = catalogCourse?.modules || [];
  const totalLessons = courseModules.reduce((sum, module) => sum + (module.lessons?.length || 0), 0);
  const completedLessons = courseModules.reduce((sum, module) => {
    return sum + module.lessons.filter(lesson => student.completedLessonIds.includes(lesson.id)).length;
  }, 0);
  const totalProblems = courseModules.reduce((sum, module) => sum + module.lessons.filter(lesson => lesson.type === 'problem').length, 0);
  const acceptedSubmissions = (student.submissions || []).filter(sub => sub.courseId === courseId && sub.status === 'ACCEPTED').length;

  const missedModules = courseModules.filter(module => {
    const originalDeadline = module.endDate;
    if (!originalDeadline) return false;
    const hasOverride = !!student.moduleDeadlineOverrides?.[courseId]?.[module.id];
    return new Date(originalDeadline) < new Date() && !hasOverride;
  });
  const deadlinePenaltyPercent = missedModules.length > 0 ? Math.min(10, missedModules.length * 10) : 0;

  const learningScore = totalLessons > 0 ? Math.min(50, Math.round((completedLessons / totalLessons) * 50)) : 0;
  const efficiencyScore = totalProblems > 0 ? Math.min(50, Math.round((acceptedSubmissions / totalProblems) * 50)) : 0;
  const codingTest1Marks = existing.codingTest1Enabled ? (existing.codingTest1Marks || 0) : 0;
  const codingTest2Marks = existing.codingTest2Enabled ? (existing.codingTest2Marks || 0) : 0;
  const rawScore = learningScore + efficiencyScore + codingTest1Marks + codingTest2Marks;
  const totalInternalMarks = Math.max(0, Math.min(100, Math.round(rawScore * (1 - (deadlinePenaltyPercent / 100)))));

  return {
    learningScore,
    efficiencyScore,
    deadlinePenaltyPercent,
    codingTest1Enabled: !!existing.codingTest1Enabled,
    codingTest1Marks: Math.min(25, codingTest1Marks),
    codingTest2Enabled: !!existing.codingTest2Enabled,
    codingTest2Marks: Math.min(25, codingTest2Marks),
    totalInternalMarks
  };
};

/**
 * Escapes XML special characters
 */
const escapeXml = (unsafe: any): string => {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Triggers a file download in the browser
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads a multi-sheet Microsoft Excel Spreadsheet (.xls / XML)
 * Compatible with Excel, Google Sheets, LibreOffice, and Numbers
 */
export const exportStudentsToExcel = (
  students: StudentOverview[],
  catalogCourses: Course[],
  filename: string = `Bitwise_Student_Progress_${new Date().toISOString().split('T')[0]}.xls`
) => {
  const dateStr = new Date().toLocaleString();

  // 1. Build XML Spreadsheet Workbook
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Bitwise LMS - Student Progress Report</Title>
  <Author>Bitwise Academy Admin</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0284C7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369A1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369A1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369A1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0369A1"/>
   </Borders>
  </Style>
  <Style ss:ID="SubHeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#334155" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeGreen">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#15803D"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeBlue">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#0369A1"/>
   <Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeAmber">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#B45309"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
`;

  // ==========================================
  // WORKSHEET 1: Student Overview & Master Summary
  // ==========================================
  xml += `
 <Worksheet ss:Name="Student Overview">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="160"/>
   <Column ss:Width="200"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="90"/>
   <Column ss:Width="120"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="180"/>
   <Column ss:Width="130"/>
   
   <!-- Title Row -->
   <Row ss:Height="30">
    <Cell ss:MergeAcross="14" ss:StyleID="TitleStyle">
     <Data ss:Type="String">Bitwise Learning Academy - Student Progress Master Report</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="14" ss:StyleID="SubtitleStyle">
     <Data ss:Type="String">Generated on: ${dateStr} | Total Registered Students: ${students.length}</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"/>

   <!-- Table Headers -->
   <Row ss:Height="25">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Student Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Email Address</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Role</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Total XP</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Streak (Days)</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Completed Lessons</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Enrolled Courses Count</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Active Courses</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Submissions Count</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tab Switches</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Focus Losses</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Exit Attempts</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Internal Marks</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Learning Score</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Efficiency Score</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Deadline Penalty</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Coding Test 1</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Coding Test 2</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Proctoring Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Proctoring Notes / Review</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Last Active Date</Data></Cell>
   </Row>
`;

  students.forEach(s => {
    const enrolledCourses = s.enrolledCourses || [];
    const activeCourses = enrolledCourses.filter(c => c.completedLessons > 0);
    const activeCourseTitles = activeCourses.length > 0 
      ? activeCourses.map(c => `${c.courseTitle} (${c.completedLessons}/${c.totalLessons})`).join(', ')
      : 'None yet';
    const internalSummary = enrolledCourses.reduce((acc, cp) => {
      const course = catalogCourses.find(item => item.id === cp.courseId);
      const assessment = getCalculatedInternalAssessment(s, cp.courseId, course);
      acc.total += assessment.totalInternalMarks;
      acc.count += 1;
      acc.learning += assessment.learningScore;
      acc.efficiency += assessment.efficiencyScore;
      acc.penalty += assessment.deadlinePenaltyPercent;
      acc.ct1 += assessment.codingTest1Marks;
      acc.ct2 += assessment.codingTest2Marks;
      return acc;
    }, { total: 0, count: 0, learning: 0, efficiency: 0, penalty: 0, ct1: 0, ct2: 0 });
    const avgTotal = internalSummary.count > 0 ? Math.round(internalSummary.total / internalSummary.count) : 0;

    const proctorStyle = s.proctorStatus === 'FLAGGED' ? 'BadgeAmber' : s.proctorStatus === 'WARNING' ? 'BadgeAmber' : s.proctorStatus === 'EXCUSED' ? 'BadgeBlue' : 'BadgeGreen';
    const proctorReviewInfo = s.proctorNotes || (s.proctorReviewedAt ? `Reviewed ${s.proctorReviewedAt} by ${s.proctorReviewedBy || 'Admin'}` : 'Normal');

    xml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.displayName)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.email)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(s.role)}</Data></Cell>
    <Cell ss:StyleID="BadgeAmber"><Data ss:Type="Number">${s.xp || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.streakDays || 1}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.completedLessonsCount || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${enrolledCourses.length}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(activeCourseTitles)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.submissionsCount || s.submissions?.length || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.tabSwitchCount || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.focusLossCount || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${s.testExitAttempts || 0}</Data></Cell>
    <Cell ss:StyleID="BadgeBlue"><Data ss:Type="Number">${avgTotal}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${internalSummary.learning || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${internalSummary.efficiency || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${internalSummary.penalty || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${internalSummary.ct1 || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${internalSummary.ct2 || 0}</Data></Cell>
    <Cell ss:StyleID="${proctorStyle}"><Data ss:Type="String">${escapeXml(s.proctorStatus || 'CLEAN')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(proctorReviewInfo)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(s.lastActive || 'Recent')}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
`;

  // ==========================================
  // WORKSHEET 2: Per-Course Detailed Breakdown
  // ==========================================
  xml += `
 <Worksheet ss:Name="Course Progress Breakdown">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="160"/>
   <Column ss:Width="200"/>
   <Column ss:Width="240"/>
   <Column ss:Width="90"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>

   <!-- Title Row -->
   <Row ss:Height="28">
    <Cell ss:MergeAcross="9" ss:StyleID="TitleStyle">
     <Data ss:Type="String">Detailed Course Enrollment & Lesson Completion Status</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="9" ss:StyleID="SubtitleStyle">
     <Data ss:Type="String">Complete breakdown showing how many lessons completed out of total lessons for each course.</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"/>

   <!-- Table Headers -->
   <Row ss:Height="25">
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Student Name</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Student Email</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Course Title</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Level</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Completed Lessons</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Total Lessons</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Progress %</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Challenges Solved</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Total Challenges</Data></Cell>
    <Cell ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Course Status</Data></Cell>
   </Row>
`;

  students.forEach(s => {
    const enrolled = s.enrolledCourses || [];
    enrolled.forEach(cp => {
      const status = cp.isCompleted
        ? 'Completed (100%)'
        : cp.completedLessons > 0
        ? `In Progress (${cp.progressPercentage}%)`
        : 'Not Started (0%)';

      const styleId = cp.isCompleted ? 'BadgeGreen' : cp.completedLessons > 0 ? 'BadgeBlue' : 'DataCellCenter';

      xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.displayName)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.email)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(cp.courseTitle)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(cp.level || 'Intermediate')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${cp.completedLessons}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${cp.totalLessons}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${cp.progressPercentage}%</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${cp.problemsSolved}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${cp.totalProblems}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(status)}</Data></Cell>
   </Row>`;
    });
  });

  xml += `
  </Table>
 </Worksheet>
`;

  // ==========================================
  // WORKSHEET 3: Internal Assessment Summary
  // ==========================================
  xml += `
 <Worksheet ss:Name="Internal Assessment Summary">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="160"/>
   <Column ss:Width="200"/>
   <Column ss:Width="220"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>

   <Row ss:Height="28">
    <Cell ss:MergeAcross="10" ss:StyleID="TitleStyle">
     <Data ss:Type="String">Student Internal Marks by Course</Data>
    </Cell>
   </Row>
   <Row ss:Height="25">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Student Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Email</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Course</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Learning (50)</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Efficiency (50)</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Deadline Penalty</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Coding Test 1</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Coding Test 2</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Total Internal Marks</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Override Applied</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Course Status</Data></Cell>
   </Row>
`;

  students.forEach(s => {
    const enrolled = s.enrolledCourses || [];
    enrolled.forEach(cp => {
      const course = catalogCourses.find(item => item.id === cp.courseId);
      const assessment = getCalculatedInternalAssessment(s, cp.courseId, course);
      const hasManualOverride = Object.keys(s.moduleDeadlineOverrides?.[cp.courseId] || {}).length > 0;
      const status = assessment.deadlinePenaltyPercent > 0 && !hasManualOverride ? 'Deadline Crossed' : (hasManualOverride ? 'Extended' : 'On Track');
      xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.displayName)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.email)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(cp.courseTitle)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${assessment.learningScore}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${assessment.efficiencyScore}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${assessment.deadlinePenaltyPercent}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${assessment.codingTest1Enabled ? `${assessment.codingTest1Marks}/25` : 'Off'}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${assessment.codingTest2Enabled ? `${assessment.codingTest2Marks}/25` : 'Off'}</Data></Cell>
    <Cell ss:StyleID="BadgeBlue"><Data ss:Type="Number">${assessment.totalInternalMarks}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${hasManualOverride ? 'Yes' : 'No'}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(status)}</Data></Cell>
   </Row>`;
    });
  });

  xml += `
  </Table>
 </Worksheet>
`;

  // ==========================================
  // WORKSHEET 4: Submissions & Judge0 Results Log
  // ==========================================
  xml += `
 <Worksheet ss:Name="Submissions Log">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="120"/>
   <Column ss:Width="160"/>
   <Column ss:Width="180"/>
   <Column ss:Width="200"/>
   <Column ss:Width="180"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="140"/>

   <Row ss:Height="25">
    <Cell ss:MergeAcross="10" ss:StyleID="TitleStyle">
     <Data ss:Type="String">Judge0 Code Submissions & Test Results Log (With Proctoring Audit)</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="25">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Submission ID</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Student Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Student Email</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Problem Title</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Course Title</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Language</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tests Passed</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Execution Time</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tab Switches in Test</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Timestamp</Data></Cell>
   </Row>
`;

  let subCount = 0;
  students.forEach(s => {
    (s.submissions || []).forEach(sub => {
      subCount++;
      const statusStyle = sub.status === 'ACCEPTED' ? 'BadgeGreen' : 'BadgeAmber';
      const switchStyle = (sub.tabSwitchesDuringTest || 0) > 0 ? 'BadgeAmber' : 'DataCellCenter';

      xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(sub.id)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.displayName)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(s.email)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sub.problemTitle)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sub.courseTitle || 'Comprehensive DSA')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(sub.language.toUpperCase())}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${escapeXml(sub.status)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${sub.passedTests}/${sub.totalTests}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(sub.executionTime || '0.04s')}</Data></Cell>
    <Cell ss:StyleID="${switchStyle}"><Data ss:Type="Number">${sub.tabSwitchesDuringTest || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(sub.timestamp)}</Data></Cell>
   </Row>`;
    });
  });

  if (subCount === 0) {
    xml += `
   <Row ss:Height="25">
    <Cell ss:MergeAcross="10" ss:StyleID="DataCellCenter">
     <Data ss:Type="String">No submissions recorded yet.</Data>
    </Cell>
   </Row>`;
  }

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  downloadFile(xml, filename, 'application/vnd.ms-excel');
};

/**
 * Generates and downloads a clean CSV file
 */
export const exportStudentsToCsv = (
  students: StudentOverview[],
  catalogCourses: Course[],
  filename: string = `Bitwise_Students_Export_${new Date().toISOString().split('T')[0]}.csv`
) => {
  const headers = [
    'Student Name',
    'Email Address',
    'Role',
    'Total XP',
    'Streak (Days)',
    'Completed Lessons',
    'Enrolled Courses Count',
    'Course Details (Title: Completed/Total - %)',
    'Submissions Count',
    'Tab Switches',
    'Focus Losses',
    'Exit Attempts',
    'Internal Total',
    'Learning Score',
    'Efficiency Score',
    'Deadline Penalty',
    'Coding Test 1 Marks',
    'Coding Test 2 Marks',
    'Proctoring Status',
    'Proctoring Review / Notes',
    'Last Active'
  ];

  const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

  const rows = students.map(s => {
    const enrolled = s.enrolledCourses || [];
    const courseDetails = enrolled
      .map(c => `${c.courseTitle}: ${c.completedLessons}/${c.totalLessons} (${c.progressPercentage}%)`)
      .join(' | ');
    const internalSummary = enrolled.reduce((acc, cp) => {
      const course = catalogCourses.find(item => item.id === cp.courseId);
      const assessment = getCalculatedInternalAssessment(s, cp.courseId, course);
      acc.total += assessment.totalInternalMarks;
      acc.learning += assessment.learningScore;
      acc.efficiency += assessment.efficiencyScore;
      acc.penalty += assessment.deadlinePenaltyPercent;
      acc.ct1 += assessment.codingTest1Marks;
      acc.ct2 += assessment.codingTest2Marks;
      return acc;
    }, { total: 0, learning: 0, efficiency: 0, penalty: 0, ct1: 0, ct2: 0 });

    const proctorReviewInfo = s.proctorNotes || (s.proctorReviewedAt ? `Reviewed ${s.proctorReviewedAt} by ${s.proctorReviewedBy || 'Admin'}` : 'Normal');

    return [
      escapeCsv(s.displayName),
      escapeCsv(s.email),
      escapeCsv(s.role),
      s.xp || 0,
      s.streakDays || 1,
      s.completedLessonsCount || 0,
      enrolled.length,
      escapeCsv(courseDetails),
      s.submissionsCount || s.submissions?.length || 0,
      s.tabSwitchCount || 0,
      s.focusLossCount || 0,
      s.testExitAttempts || 0,
      internalSummary.total,
      internalSummary.learning,
      internalSummary.efficiency,
      internalSummary.penalty,
      internalSummary.ct1,
      internalSummary.ct2,
      escapeCsv(s.proctorStatus || 'CLEAN'),
      escapeCsv(proctorReviewInfo),
      escapeCsv(s.lastActive || 'Recent')
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};
