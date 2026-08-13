import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form action={login} className="bg-white border border-slate-200 rounded-lg p-8 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Nabava · Revoz</h1>
          <p className="text-sm text-slate-500 mt-1">Vnesi geslo za dostop.</p>
        </div>
        {error && <p className="text-sm text-red-600">Napačno geslo.</p>}
        <input type="hidden" name="next" value={next || "/"} />
        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Geslo"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
        />
        <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          Prijava
        </button>
      </form>
    </div>
  );
}
