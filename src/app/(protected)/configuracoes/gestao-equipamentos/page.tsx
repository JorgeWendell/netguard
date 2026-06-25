import { DeviceForm } from "./components/device-form";
import { DevicesTable } from "./components/devices-table";

export default function GestaoEquipamentosPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestão de Equipamentos
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Cadastre e gerencie roteadores MikroTik vinculados aos locais
          </p>
        </div>
        <DeviceForm />
      </div>
      <DevicesTable />
    </div>
  );
}
