"use client";

import { useState } from "react";
import { confirmPanel, updateProjectContact } from "@/app/actions";

type Props = {
  projectId: string;
  projectName: string;
  panelConfirmed: boolean;
  initialName: string;
  initialPhone: string;
  initialEmail: string;
  panelEmpty: boolean;
};

function buildEmail(opts: { projectName: string; contactName: string; contactPhone: string; contactEmail: string; deadline: string }) {
  const { projectName, contactName, contactPhone, contactEmail, deadline } = opts;
  return `Pozdravljeni,
Pozivamo vas, da nam izdelate ter posredujete ponudbo za ${projectName}.
Ponudba naj bo izdelana v skladu s priloženimi tehnično prevzemnimi pogoji.
Za vsa morebitna dodatna tehnična vprašanja in oglede pokličite: ${contactName}${contactPhone ? `, ${contactPhone}` : ""}.
(Za ogled v proizvodnji morate obvezno imeti odsevni jopič ter zaščitne čevlje)
Tehnični del ponudbe (BREZ CEN) pošljite na e-naslove: ${contactEmail};
luka.hrovat@renault.si
Celotno ponudbo s cenami pošljite na e-naslov: luka.hrovat@renault.si
Vaše ponudbe pričakujemo najkasneje do ${deadline || "[določi rok]"}.

Vse cene so v eur, DDV ni zajet v ceni
Pariteta: DAP Revoz Novo mesto
Obračun del: Obračun po sistemu »ključ v roke«
Plačilni pogoji: 60 dni po izstavitvi računa oziroma potrditvi dokumenta FSR
Izvedba del: Po dogovoru / terminskem planu
Ponudbo mi posredujte kot odgovor na to sporočilo
Pri oddaji ponudbe je potrebno navesti podizvajalce.
Prosimo vas, če nam lahko pisno potrdite prejem tega povpraševanja.`;
}

export default function PanelConfirm({ projectId, projectName, panelConfirmed, initialName, initialPhone, initialEmail, panelEmpty }: Props) {
  const [open, setOpen] = useState(false);
  const [contactName, setContactName] = useState(initialName);
  const [contactPhone, setContactPhone] = useState(initialPhone);
  const [contactEmail, setContactEmail] = useState(initialEmail);
  const [deadline, setDeadline] = useState("");
  const [emailText, setEmailText] = useState("");

  async function generate() {
    await updateProjectContact(projectId, {
      technicalContactName: contactName || null,
      technicalContactPhone: contactPhone || null,
      technicalContactEmail: contactEmail || null,
    });
    if (!panelConfirmed) await confirmPanel(projectId);
    setEmailText(buildEmail({ projectName, contactName, contactPhone, contactEmail, deadline }));
  }

  if (panelEmpty) {
    return <p className="text-xs text-slate-400">Najprej določi panel dobaviteljev, nato lahko potrdiš povpraševanje.</p>;
  }

  return (
    <div className="space-y-3">
      {!open && (
        <button onClick={() => setOpen(true)} className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700">
          {panelConfirmed ? "Ponovno generiraj email povpraševanja" : "Potrdi panel in pripravi email povpraševanja"}
        </button>
      )}
      {open && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-sm">
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ime in priimek tehničnega kontakta" className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Telefon tehničnega kontakta" className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="E-naslov tehničnega kontakta" className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
          <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Rok za oddajo ponudb (npr. 28.8.2026 do 12:00)" className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button onClick={generate} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-blue-700">
              Generiraj email
            </button>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-md text-xs border border-slate-300">
              Zapri
            </button>
          </div>
          {emailText && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <textarea readOnly value={emailText} rows={14} className="w-full border border-slate-200 rounded-md px-2 py-2 text-xs font-mono" />
              <button onClick={() => navigator.clipboard.writeText(emailText)} className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs hover:bg-slate-900">
                Kopiraj besedilo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
