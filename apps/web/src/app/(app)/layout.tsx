import { AppShell } from '@/components/layout/app-shell';
import { AiAssistantPageContextProvider } from '@/features/ai/assistant-page-context';
import { GlobalAiAssistant } from '@/features/ai/global-ai-assistant';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AiAssistantPageContextProvider>
      <AppShell>
        {children}
        <GlobalAiAssistant />
      </AppShell>
    </AiAssistantPageContextProvider>
  );
}
