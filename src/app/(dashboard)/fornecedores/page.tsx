'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit3, MessageSquare, Trash2 } from 'lucide-react';

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    corporateName: '',
    tradeName: '',
    taxId: '',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: 'Passos',
    state: 'MG',
    supplierType: 'MATERIAL',
    notes: '',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        setSuppliers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.corporateName.toLowerCase().includes(search.toLowerCase()) ||
      (s.tradeName && s.tradeName.toLowerCase().includes(search.toLowerCase())) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !typeFilter || s.supplierType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/suppliers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        fetchSuppliers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) return;
    try {
      const res = await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchSuppliers();
      } else {
        alert(data.error || 'Erro ao excluir fornecedor.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Users className="w-6 h-6 text-emerald-600 mr-2.5" />
            Cadastro de Fornecedores
          </h1>
          <p className="text-xs text-slate-500 mt-1">Gerencie parceiros, empreiteiros e fornecedores de materiais da obra</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              id: '',
              corporateName: '',
              tradeName: '',
              taxId: '',
              contactPerson: '',
              phone: '',
              whatsapp: '',
              email: '',
              address: '',
              city: 'Passos',
              state: 'MG',
              supplierType: 'MATERIAL',
              notes: '',
            });
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Fornecedor</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3 border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia ou contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden font-semibold"
        >
          <option value="">Todos os Tipos</option>
          <option value="MATERIAL">Materiais de Construção</option>
          <option value="MAO_DE_OBRA">Mão de Obra / Empreiteiros</option>
          <option value="SERVICO">Serviços / Projetos</option>
          <option value="EQUIPAMENTO">Locação de Equipamentos</option>
          <option value="FRETE">Fretes e Transportes</option>
        </select>
      </div>

      {/* Grid de Fornecedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {supplier.supplierType}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1.5">{supplier.tradeName || supplier.corporateName}</h3>
                  {supplier.tradeName && <p className="text-xs text-slate-400">{supplier.corporateName}</p>}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setFormData({
                        id: supplier.id,
                        corporateName: supplier.corporateName,
                        tradeName: supplier.tradeName || '',
                        taxId: supplier.taxId || '',
                        contactPerson: supplier.contactPerson || '',
                        phone: supplier.phone || '',
                        whatsapp: supplier.whatsapp || supplier.phone || '',
                        email: supplier.email || '',
                        address: supplier.address || '',
                        city: supplier.city || 'Passos',
                        state: supplier.state || 'MG',
                        supplierType: supplier.supplierType || 'MATERIAL',
                        notes: supplier.notes || '',
                      });
                      setShowModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Editar Fornecedor"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id, supplier.tradeName || supplier.corporateName)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition"
                    title="Excluir Fornecedor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {supplier.contactPerson && (
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-700">Contato:</span>
                    <span>{supplier.contactPerson}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center space-x-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {(supplier.city || supplier.state) && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {supplier.city} - {supplier.state}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {supplier.whatsapp && (
              <a
                href={`https://wa.me/55${supplier.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition border border-emerald-200"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Conversar no WhatsApp</span>
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Modal Formulário Fornecedor */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {formData.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Razão Social</label>
                  <input
                    type="text"
                    required
                    value={formData.corporateName}
                    onChange={(e) => setFormData({ ...formData, corporateName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Tipo de Fornecedor</label>
                  <select
                    value={formData.supplierType}
                    onChange={(e) => setFormData({ ...formData, supplierType: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                  >
                    <option value="MATERIAL">Materiais de Construção</option>
                    <option value="MAO_DE_OBRA">Mão de Obra / Empreiteiro</option>
                    <option value="SERVICO">Serviço / Projetos</option>
                    <option value="EQUIPAMENTO">Locação de Equipamentos</option>
                    <option value="FRETE">Frete e Transportes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Pessoa de Contato</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                    placeholder="(35) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Cidade / Estado</label>
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="col-span-2 p-2.5 border rounded-xl"
                    />
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="p-2.5 border rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer">
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
