import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/db";
import AuthGate from "@/components/AuthGate";
import NotebookApp from "@/components/NotebookApp";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return <AuthGate />;

  const workspace = await getWorkspace(user.id);
  return (
    <NotebookApp
      initialUser={{ id: user.id, name: user.name, email: user.email, onboardingCompletedAt: user.onboardingCompletedAt }}
      initialWorkspace={workspace}
    />
  );
}
