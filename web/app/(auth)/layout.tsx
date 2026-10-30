export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="xw-auth-bg min-h-screen flex items-center justify-center px-4">
      {children}
    </div>
  );
}
