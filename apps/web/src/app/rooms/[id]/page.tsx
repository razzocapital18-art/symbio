import { RealtimeRoom } from "@/components/RealtimeRoom";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Collaboration Room {id}</h1>
      <RealtimeRoom roomId={id} />
    </section>
  );
}
