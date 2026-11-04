import { Navigate, Outlet, Link, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { DashboardHomePage } from './DashboardHomePage';
import { ChatPage } from './ChatPage';
import { AISummaryPage } from './AISummaryPage';
import { LiteratureReviewPage } from './LiteratureReviewPage';
import { ComparisonPage } from './ComparisonPage';
import { QuizPage } from './QuizPage';
import { GeneratePDFPage } from './GeneratePDFPage';
import { ConvertToPPTPage } from './ConvertToPPTPage';
import { SettingsPage } from './SettingsPage';
import { ProfilePage } from './ProfilePage';
import { LibraryPage } from './LibraryPage';

export function DashboardPage() {
  return (
    <MainLayout>
      <Routes>
        <Route path="" element={<DashboardHomePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="ai-summary" element={<AISummaryPage />} />
        <Route path="literature-review" element={<LiteratureReviewPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="comparison" element={<ComparisonPage />} />
        <Route path="convert-ppt" element={<ConvertToPPTPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="generate-pdf" element={<GeneratePDFPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </MainLayout>
  );
}
