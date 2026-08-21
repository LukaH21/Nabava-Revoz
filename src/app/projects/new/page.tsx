import { createProject } from "@/app/actions";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { asc } from "drizzle-orm";

export default async function NewProjectPage() {
  const allSuppliers = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).orderBy(asc(suppliers.name));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Nov projekt (analiza ponudb)</h1>
      <form action={createProject} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Naziv projekta *</label>
          <input
            name="name"
            required
            placeholder='npr. 2026_S52_0269 - S16- DODATNE POKRITE SKLADIŠČNE POVRŠINE'
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Indoc / oznaka</label>
          <input name="indocCode" placeholder="2026_S52_0269" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Opis</label>
          <textarea name="description" rows={3} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ocenjena vrednost (€)</label>
          <input name="estimatedValue" type="number" step="0.01" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rok oddaje ponudb (krog 1)</label>
          <input type="date" name="submissionDeadline" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="text-sm font-medium text-slate-700">Tehnični kontakt</div>
          <input name="technicalContactName" placeholder="Ime in priimek" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <input name="technicalContactPhone" placeholder="Telefon" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <input name="technicalContactEmail" placeholder="E-naslov" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="text-sm font-medium text-slate-700">Panel dobaviteljev (koga bomo povpraševali)</div>
          <p className="text-xs text-slate-400">Izberi enega ali več — kasneje jih lahko še dodaš na strani projekta.</p>
          <select multiple size={8} name="panelSupplierIds" className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm">
            {allSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          Ustvari projekt
        </button>
      </form>
    </div>
  );
}
