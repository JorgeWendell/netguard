import { LocationForm } from "./components/location-form";
import { LocationsTable } from "./components/locations-table";

export default function LocaisPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Locais
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Cadastre e gerencie os locais vinculados às empresas
          </p>
        </div>
        <LocationForm />
      </div>
      <LocationsTable />
    </div>
  );
}
