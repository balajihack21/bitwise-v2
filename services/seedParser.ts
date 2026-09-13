/**
 * Client-side parser for seeding student CSV / TSV files.
 * Expected headers (case-insensitive): name, reg_no, email, dob, section, dept
 */
export interface SeedStudentRow {
  name: string;
  regNo: string;
  email: string;
  dob: string;
  section: string;
  dept: string;
  year?: string;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[_\s]+/g, '').replace(/-/g, '');
}

export function parseSeedFile(text: string): { rows: SeedStudentRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: SeedStudentRow[] = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { rows, errors: ['File is empty'] };

  // Detect delimiter: prioritize tab, then check for multi-space aligned columns
  const first = lines[0];
  const delimiter = first.includes('\t') ? '\t' : (first.includes(',') ? ',' : (first.match(/\s{2,}/) ? /\s{2,}/ : ','));

  const headers = first.split(delimiter instanceof RegExp ? delimiter : delimiter).map(s => normalizeHeader(s));

  const nameIdx = headers.findIndex(h => h === 'name' || h === 'displayname' || h === 'studentname' || h === 'student');
  const regIdx = headers.findIndex(h => h === 'regno' || h === 'reg_no' || h === 'registernumber' || h === 'registrationno' || h === 'register' || h === 'reg');
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'mail' || h === 'e-mail');
  const dobIdx = headers.findIndex(h => h === 'dob' || h === 'dateofbirth' || h === 'birthdate' || h === 'dateofbirth' || h === 'birth');
  const sectionIdx = headers.findIndex(h => h === 'section' || h === 'sectionname' || h === 'group');
  const deptIdx = headers.findIndex(h => h === 'dept' || h === 'department' || h === 'deptname' || h === 'branch');
  const yearIdx = headers.findIndex(h => h === 'year' || h === 'batch' || h === 'yearofadmission' || h === 'studyear');

  if (nameIdx === -1) errors.push('Missing "name" column');
  if (regIdx === -1) errors.push('Missing "reg_no" column');
  if (emailIdx === -1) errors.push('Missing "email" column');

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter instanceof RegExp ? delimiter : delimiter);
    const cols = rawCols.map(c => c.trim());
    const name = nameIdx >= 0 ? (cols[nameIdx] || '').trim() : '';
    const regNo = regIdx >= 0 ? (cols[regIdx] || '').trim() : '';
    const email = emailIdx >= 0 ? (cols[emailIdx] || '').trim() : '';
    const dob = dobIdx >= 0 ? (cols[dobIdx] || '').trim() : '';
    const section = sectionIdx >= 0 ? (cols[sectionIdx] || '').trim() : '';
    const dept = deptIdx >= 0 ? (cols[deptIdx] || '').trim() : '';
    const year = yearIdx >= 0 ? (cols[yearIdx] || '').trim() : '';

    if (!name && !email && !regNo) continue; // skip blank line
    if (!name) errors.push(`Row ${i}: missing name`);
    if (!regNo) errors.push(`Row ${i}: missing reg_no`);
    if (!email) errors.push(`Row ${i}: missing email`);

    rows.push({ name, regNo, email, dob, section, dept, year });
  }
  return { rows, errors };
}
