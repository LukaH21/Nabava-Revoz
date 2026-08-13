"use client";

import { useState } from "react";

type SupplierOption = { id: string; name: string; homologated: boolean };

export default function SupplierPicker({ suppliers }: { suppliers: SupplierOption[] }) {
  const [text, setText] = useState("");
  const match = suppliers.find((s) => s.name === text);

  return (
    <div className="flex-1">
      <label className="block text-sm font-medium text-slate-700 mb-1">Dobavitelj</label>
      <input
        list="suppliers-datalist"
        name="supplierNameFreeText"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Vpiši ali izberi dobavitelja iz baze"
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
      />
      <datalist id="suppliers-datalist">
        {suppliers.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
      <input type="hidden" name="supplierId" value={match?.id || ""} />
      {text && !match && <p className="text-xs text-amber-600 mt-1">Ni v bazi dobaviteljev — obravnavan kot nehomologiran (posredništvo).</p>}
      {match && !match.homologated && <p className="text-xs text-amber-600 mt-1">Nehomologiran dobavitelj — velja posredništvo.</p>}
    </div>
  );
}
