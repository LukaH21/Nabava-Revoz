import { createProject } from "@/app/actions";

export default function NewProjectPage() {
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
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          Ustvari projekt
        </button>
      </form>
    </div>
  );
}
