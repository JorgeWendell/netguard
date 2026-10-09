import { DvrForm } from "./components/dvr-form";
import { DvrsTable } from "./components/dvrs-table";

export default function GestaoDvrsPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestão de DVRs
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Cadastre e gerencie DVRs Intelbras vinculados aos locais
          </p>
        </div>
        <DvrForm />
      </div>
      <DvrsTable />
    </div>
  );
}
