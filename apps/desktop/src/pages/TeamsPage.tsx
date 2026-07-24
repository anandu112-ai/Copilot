import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { FolderKanban, Plus, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TeamInput, TeamRecord } from '../types'
import { usePermissions } from '../hooks/usePermissions'

const emptyTeam = { name: '', description: '', leader_id: '', member_ids: [] as string[], client_ids: [] as string[] }

export default function TeamsPage() {
  const { can } = usePermissions()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState(emptyTeam)
  const [isCreating, setIsCreating] = useState(false)

  const load = async () => {
    try {
      const [teamRows, userRows, clientRows] = await Promise.all([
        window.electronAPI.db.getTeams(), window.electronAPI.db.getUsers(), window.electronAPI.db.getClients(),
      ])
      setTeams(teamRows)
      setUsers(userRows)
      setClients(clientRows)
    } catch {
      toast.error('Unable to load team data.')
    }
  }

  useEffect(() => { load() }, [])

  const toggleSelection = (field: 'member_ids' | 'client_ids', id: string) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id) ? current[field].filter((value) => value !== id) : [...current[field], id],
    }))
  }

  const createTeam = async (event: FormEvent) => {
    event.preventDefault()
    if (!can('teams:manage')) return toast.error('You do not have permission to manage teams.')
    if (!form.name.trim()) return toast.error('A team name is required.')
    const team: TeamInput = { id: `team-${Date.now()}`, ...form, permissions: '[]', status: 'active' }
    await window.electronAPI.db.saveTeam(team)
    toast.success('Team created.')
    setForm(emptyTeam)
    setIsCreating(false)
    load()
  }

  const deleteTeam = async (team: TeamRecord) => {
    if (!can('teams:manage')) return toast.error('You do not have permission to manage teams.')
    if (!confirm(`Remove ${team.name}?`)) return
    await window.electronAPI.db.deleteTeam(team.id)
    toast.success('Team removed.')
    load()
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-brand-500">Organization</p>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Teams</h1>
          <p className="mt-1 text-sm text-surface-500">Group specialists, assign clients, and define accountable leaders.</p>
        </div>
        {can('teams:manage') && <button onClick={() => setIsCreating(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"><Plus size={17} /> Create team</button>}
      </header>

      <section aria-label="Teams" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => {
          const leader = users.find((user) => user.id === team.leader_id)
          return <article key={team.id} className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-start justify-between gap-3"><div className="rounded-lg bg-brand-500/10 p-2.5 text-brand-600 dark:text-brand-400"><UsersRound size={20} /></div>{can('teams:manage') && <button onClick={() => deleteTeam(team)} className="rounded-md p-1.5 text-surface-400 hover:bg-red-500/10 hover:text-red-500" aria-label={`Remove ${team.name}`}><Trash2 size={16} /></button>}</div>
            <h2 className="mt-4 font-semibold text-surface-900 dark:text-white">{team.name}</h2>
            <p className="mt-1 min-h-10 text-sm text-surface-500">{team.description || 'No description provided.'}</p>
            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-surface-100 pt-4 text-xs dark:border-surface-800"><div><dt className="text-surface-500">Leader</dt><dd className="mt-1 truncate font-medium text-surface-800 dark:text-surface-200">{leader?.name || 'Unassigned'}</dd></div><div><dt className="text-surface-500">Members</dt><dd className="mt-1 font-semibold text-surface-800 dark:text-surface-200">{team.member_count}</dd></div><div><dt className="text-surface-500">Clients</dt><dd className="mt-1 font-semibold text-surface-800 dark:text-surface-200">{team.client_count}</dd></div></dl>
          </article>
        })}
        {!teams.length && <div className="col-span-full rounded-xl border border-dashed border-surface-300 p-10 text-center dark:border-surface-700"><FolderKanban className="mx-auto text-surface-400" size={28} /><p className="mt-3 font-medium text-surface-800 dark:text-surface-200">No teams yet</p><p className="mt-1 text-sm text-surface-500">Create a team to organize your people and client work.</p></div>}
      </section>

      {isCreating && <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="create-team-title"><form onSubmit={createTeam} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-surface-900"><div className="flex items-center justify-between"><div><h2 id="create-team-title" className="text-lg font-semibold text-surface-900 dark:text-white">Create a team</h2><p className="mt-1 text-sm text-surface-500">Team membership is saved locally and available offline.</p></div><button type="button" onClick={() => setIsCreating(false)} className="rounded-md p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label="Close"><X size={18} /></button></div><div className="mt-6 grid gap-4"><label className="text-sm font-medium text-surface-700 dark:text-surface-300">Team name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-surface-300 bg-transparent px-3 py-2 text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:text-white" /></label><label className="text-sm font-medium text-surface-700 dark:text-surface-300">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-lg border border-surface-300 bg-transparent px-3 py-2 text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:text-white" /></label><label className="text-sm font-medium text-surface-700 dark:text-surface-300">Team leader<select value={form.leader_id} onChange={(event) => setForm({ ...form, leader_id: event.target.value })} className="mt-1.5 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-white"><option value="">Select a leader</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</select></label><SelectionGroup title="Members" icon={<UsersRound size={16} />} entries={users.map((user) => ({ id: user.id, label: user.name, detail: user.role }))} selected={form.member_ids} onToggle={(id) => toggleSelection('member_ids', id)} /><SelectionGroup title="Assigned clients" icon={<ShieldCheck size={16} />} entries={clients.map((client) => ({ id: client.id, label: client.clientName, detail: client.clientType || 'Client' }))} selected={form.client_ids} onToggle={(id) => toggleSelection('client_ids', id)} /></div><footer className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsCreating(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800">Cancel</button><button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Create team</button></footer></form></div>}
    </main>
  )
}

function SelectionGroup({ title, icon, entries, selected, onToggle }: { title: string; icon: ReactNode; entries: { id: string; label: string; detail: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return <fieldset><legend className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300">{icon}{title}</legend><div className="mt-2 grid max-h-36 gap-2 overflow-y-auto rounded-lg border border-surface-200 p-3 dark:border-surface-700">{entries.length ? entries.map((entry) => <label key={entry.id} className="flex cursor-pointer items-center gap-2 text-sm text-surface-700 dark:text-surface-300"><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => onToggle(entry.id)} className="accent-brand-600" /><span>{entry.label}</span><span className="text-xs text-surface-500">{entry.detail}</span></label>) : <p className="text-sm text-surface-500">No records available.</p>}</div></fieldset>
}
