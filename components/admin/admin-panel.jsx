'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, UserPlus, Shield, Users, Check, X } from 'lucide-react'
import { createUser, updateUser, deactivateUser, activateUser, setBUPermission } from '@/app/(app)/actions/users'

export default function AdminPanel({ users, businessUnits, permissions }) {
  const [tab, setTab] = useState('users')
  const router = useRouter()

  return (
    <div style={{fontFamily:'"DM Sans", sans-serif'}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft size={20}/>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900" style={{fontFamily:'"Playfair Display", serif'}}>
                Administration
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Gestion des utilisateurs et permissions</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab('users')}
          >
            <Users size={16}/> Utilisateurs
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'permissions' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab('permissions')}
          >
            <Shield size={16}/> Permissions
          </button>
        </div>

        {tab === 'users' && (
          <UserManagement users={users} onRefresh={() => router.refresh()} />
        )}
        {tab === 'permissions' && (
          <PermissionMatrix users={users} businessUnits={businessUnits} permissions={permissions} onRefresh={() => router.refresh()} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================
function UserManagement({ users, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'viewer' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createUser(form.email, form.password, form.fullName, form.role)
      setForm({ fullName: '', email: '', password: '', role: 'viewer' })
      setShowForm(false)
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUser(userId, { role })
      onRefresh()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleToggleActive = async (userId, isActive) => {
    try {
      if (isActive) {
        await deactivateUser(userId)
      } else {
        await activateUser(userId)
      }
      onRefresh()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Utilisateurs ({users.length})</h2>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0A1628 100%)' }}
          onClick={() => setShowForm(!showForm)}
        >
          <UserPlus size={16}/> Ajouter un utilisateur
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouvel utilisateur</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom complet</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setForm({...form, fullName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe temporaire</label>
              <input
                type="text"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rôle</label>
              <select
                value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="viewer">Lecteur</option>
                <option value="editor">Éditeur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer le compte'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Annuler
              </button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Nom</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Rôle</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Statut</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="py-3 px-4 font-medium text-gray-900">{user.full_name}</td>
                <td className="py-3 px-4 text-gray-600">{user.email}</td>
                <td className="py-3 px-4">
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    <option value="viewer">Lecteur</option>
                    <option value="editor">Éditeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    className={`text-xs px-3 py-1 rounded-lg border ${user.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                  >
                    {user.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// PERMISSION MATRIX
// ============================================================================
function PermissionMatrix({ users, businessUnits, permissions, onRefresh }) {
  const [saving, setSaving] = useState(null)

  // Build permission lookup: { `${userId}_${buId}`: 'read' | 'write' }
  const permMap = {}
  permissions.forEach(p => {
    permMap[`${p.user_id}_${p.business_unit_id}`] = p.access_level
  })

  const getPermission = (userId, buId) => permMap[`${userId}_${buId}`] || 'none'

  const handleChange = async (userId, buId, value) => {
    const key = `${userId}_${buId}`
    setSaving(key)
    try {
      await setBUPermission(userId, buId, value)
      onRefresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(null)
    }
  }

  // Only show non-admin users (admins have full access)
  const nonAdminUsers = users.filter(u => u.role !== 'admin')

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Matrice des Permissions</h2>
        <p className="text-xs text-gray-500 mt-1">
          Les administrateurs ont un accès complet à toutes les BUs. Seuls les éditeurs et lecteurs sont configurables ci-dessous.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[200px]">
                Utilisateur
              </th>
              {businessUnits.map(bu => (
                <th key={bu.id} className="text-center py-3 px-2 font-medium text-gray-600 min-w-[130px]">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{background: bu.color}}/>
                    <span className="text-xs">{bu.name.length > 15 ? bu.name.substring(0, 15) + '...' : bu.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonAdminUsers.length === 0 && (
              <tr>
                <td colSpan={businessUnits.length + 1} className="py-8 text-center text-gray-400 text-sm">
                  Aucun utilisateur non-admin. Créez d'abord des comptes éditeur ou lecteur.
                </td>
              </tr>
            )}
            {nonAdminUsers.map((user, i) => (
              <tr key={user.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="py-3 px-4 sticky left-0 bg-inherit">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.role === 'editor' ? 'Éditeur' : 'Lecteur'}</p>
                  </div>
                </td>
                {businessUnits.map(bu => {
                  const key = `${user.id}_${bu.id}`
                  const current = getPermission(user.id, bu.id)
                  return (
                    <td key={bu.id} className="py-3 px-2 text-center">
                      <select
                        value={current}
                        onChange={e => handleChange(user.id, bu.id, e.target.value)}
                        disabled={saving === key}
                        className={`text-xs border rounded px-2 py-1 w-full max-w-[120px] ${
                          current === 'write' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                          current === 'read' ? 'border-green-300 bg-green-50 text-green-700' :
                          'border-gray-200 bg-white text-gray-500'
                        } ${saving === key ? 'opacity-50' : ''}`}
                      >
                        <option value="none">Aucun accès</option>
                        <option value="read">Lecture</option>
                        <option value="write">Lecture + Écriture</option>
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
