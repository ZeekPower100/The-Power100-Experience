import SimpleLayout from '../simple-layout';

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <SimpleLayout title="Partner Portal Test">
      {children}
    </SimpleLayout>
  );
}