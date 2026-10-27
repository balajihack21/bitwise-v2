import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { fetchStudentIssueReports, IssueReport, submitIssueReport } from '../services/firebase';

interface StudentIssueReportsProps {
  user: User;
}

const StudentIssueReports: React.FC<StudentIssueReportsProps> = ({ user }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Bug');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const loadReports = useCallback(async () => {
    if (!user.uid) {
      setError('Your account is missing an ID. Sign out and sign in again before reporting an issue.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setReports(await fetchStudentIssueReports(user.uid));
    } catch (loadError) {
      console.error('Failed to load student issue reports:', loadError);
      setError('Could not load your issue reports. Check your connection and Firestore permissions, then retry.');
    } finally {
      setIsLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!screenshot) {
      setError('Attach a screenshot before submitting your issue.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await submitIssueReport(user, title, description, category, screenshot);
      setTitle('');
      setDescription('');
      setScreenshot(null);
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';
      setSuccess('Your issue was submitted. You can follow its status below.');
      await loadReports();
    } catch (submitError) {
      console.error('Failed to submit student issue report:', submitError);
      setError(submitError instanceof Error
        ? submitError.message
        : 'Could not submit your issue. Check your connection and Firestore permissions, then try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusStyles: Record<IssueReport['status'], string> = {
    OPEN: 'bg-amber-100 text-amber-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    CLOSED: 'bg-emerald-100 text-emerald-800'
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Report an Issue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tell us what went wrong in the application. Your report will be visible to the support administrator.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Issue type
            <select
              value={category}
              onChange={event => setCategory(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
            >
              <option>Bug</option>
              <option>Progress or sync</option>
              <option>Course or lesson</option>
              <option>Login or account</option>
              <option>Other</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Short title
            <input
              required
              maxLength={120}
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="For example: Lesson progress did not save"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          What happened?
          <textarea
            required
            maxLength={4000}
            rows={5}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Describe the steps you took and what you expected to happen. Do not include passwords or sensitive information."
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Screenshot <span className="text-rose-600">* required</span>
          <input
            ref={screenshotInputRef}
            id="issue-screenshot"
            type="file"
            required
            accept="image/png,image/jpeg,image/webp"
            onChange={event => {
              const file = event.target.files?.[0] || null;
              if (file && file.size > 5 * 1024 * 1024) {
                setScreenshot(null);
                setError('The screenshot must be 5 MB or smaller.');
                event.target.value = '';
                return;
              }
              if (file && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                setScreenshot(null);
                setError('Attach a PNG, JPEG, or WebP screenshot.');
                event.target.value = '';
                return;
              }
              setError(null);
              setScreenshot(file);
            }}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            PNG, JPEG, or WebP; maximum 5 MB. Please hide passwords and other sensitive information.
          </span>
          {screenshot && <span className="mt-1 block text-xs font-semibold text-emerald-700">Attached: {screenshot.name}</span>}
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Your account name and email are attached so the admin can follow up.
          </p>
          <button
            type="submit"
            disabled={isSubmitting || !user.uid || !screenshot}
            className="rounded-lg bg-bitwise-600 px-4 py-2 text-sm font-bold text-white hover:bg-bitwise-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Submit issue'}
          </button>
        </div>
      </form>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your issue reports</h2>
          <button type="button" onClick={() => void loadReports()} disabled={isLoading} className="text-sm font-semibold text-bitwise-700 disabled:opacity-50">
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {isLoading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your reports…</p>
        ) : reports.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">You haven’t submitted any issues yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{report.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.category} · Submitted {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[report.status] || statusStyles.OPEN}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{report.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentIssueReports;
