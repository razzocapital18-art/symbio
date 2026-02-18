import { ProfileEditor } from "@/components/ProfileEditor";

export default function ProfilePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Profile Studio</h1>
      <p className="text-slate-600">Manage skills, portfolio, and public operator profile settings.</p>
      <ProfileEditor />
    </section>
  );
}
