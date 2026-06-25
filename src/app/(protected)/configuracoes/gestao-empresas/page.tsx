import { CompanyForm } from "./components/company-form";
import { CompaniesTable } from "./components/companies-table";

export default function GestaoEmpresasPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestão de Empresas
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Cadastre e gerencie as empresas do sistema
          </p>
        </div>
        <CompanyForm />
      </div>
      <CompaniesTable />
    </div>
  );
}
