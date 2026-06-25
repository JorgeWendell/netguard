import { DeviceAccessView } from "../../components/device-access-view";

type PageProps = {
  params: Promise<{ deviceId: string }>;
};

export default async function DeviceAccessPage({ params }: PageProps) {
  const { deviceId } = await params;

  return (
    <div className="p-6">
      <DeviceAccessView deviceId={deviceId} />
    </div>
  );
}
