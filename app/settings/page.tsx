import type { Metadata } from 'next';
import { Settings } from '@/components/settings/settings';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Your persona, company basics, appearance and reminders, and an export of your workspace.',
};

export default function SettingsPage() {
  return <Settings />;
}
