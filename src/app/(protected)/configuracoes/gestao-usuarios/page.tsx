import { UserForm } from "./components/user-form";
import { UsersTable } from "./components/users-table";

export default function GestaoUsuariosPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestão de Usuários
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Cadastre e gerencie os usuários da organização
          </p>
        </div>
        <UserForm />
      </div>
      <UsersTable />
    </div>
  );
}
