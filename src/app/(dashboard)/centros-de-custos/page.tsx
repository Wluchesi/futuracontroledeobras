'use client';

import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Search, CheckCircle, XCircle, Edit3 } from 'lucide-react';

export default function CentrosDeCustosPage() {
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', code: '', name: '', category: 'Geral', description: '', isActive: true });

  const fetchCostCenters = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cost-centers');
      if (res.ok) {
        const data = await res.json();
        setCostCenters(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const filtered = costCenters.filter(
    (cc) => cc.code.toLowerCase().includes(search.toLowerCase()) || cc.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/cost-centers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        fetchCostCenters();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <FolderKanban className="w-6 h-6 text-emerald-600 mr-2.5" />
            Centros de Custos (26 Categorias Padronizadas)
          </h1>
          <p className="text-xs text-slate-500 mt-1">Estrutura orçamentária padronizada para classificação de despesas</p>
        </div>
        <button
          onClick={() => {
            const nextCode = String(costCenters.length + 1).padStart(2, '0');
            setFormData({ id: '', code: nextCode, name: '', category: 'Geral', description: '', isActive: true });
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Centro de Custo</span>
        </button>
      </div>

      <div className="glass-card p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código ou nome do centro de custo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Nome do Centro de Custo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.map((cc) => (
                <tr key={cc.id} className="table-row-hover">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{cc.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{cc.name}</td>
                  <td className="py-3 px-4 text-slate-500">{cc.category || 'Geral'}</td>
                  <td className="py-3 px-4">
                    {cc.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        <XCircle className="w-3 h-3 mr-1" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setFormData({
                          id: cc.id,
                          code: cc.code,
                          name: cc.name,
                          category: cc.category || 'Geral',
                          description: cc.description || '',
                          isActive: cc.isActive,
                        });
                        setShowModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{formData.id ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-sm"
                />
                <label htmlFor="isActive" className="font-semibold text-slate-700 cursor-pointer">
                  Centro de Custo Ativo
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
