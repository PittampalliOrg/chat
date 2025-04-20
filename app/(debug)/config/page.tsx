import ConfigViewer from "@/components/config-viewer";

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="font-bold text-xl mb-4">Live Dapr Config</h1>
      <ConfigViewer />
    </main>
  );
}
