export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-dark-900 text-white">{children}</div>;
}
