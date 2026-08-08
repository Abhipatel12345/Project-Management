'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Building2,
  Building,
  AlertTriangle,
  User,
  Package,
  Hash,
  Wallet,
  Check,
  Plus,
  Trash2,
  Bot,
  X,
  Send,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface LineItem {
  id: string;
  itemGroup: string;
  item: string;
  description: string;
  qty: number;
  uom: string;
  partName: string;
}

export default function DashboardPage() {
  // Interactive Line Items state
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      itemGroup: 'Auto Parts',
      item: 'Brake Pad Set',
      description: 'Brake Pad Set [Shortfall from Material Request MAT-MR-2026-00066]',
      qty: 10,
      uom: 'Nos',
      partName: '—',
    },
  ]);

  // AI Assistant Chat Widget State
  const [botOpen, setBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your Netlink PDM & Sourcing AI Assistant. I can help verify line item codes, match suppliers, or calculate budget tolerances for MAT-MR-2026-00066.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const addLineItem = () => {
    const newItem: LineItem = {
      id: String(Date.now()),
      itemGroup: 'Auto Parts',
      item: 'Brake Disc Rotor',
      description: 'Front Ventilated Brake Rotor [Auto Parts Grade A]',
      qty: 5,
      uom: 'Nos',
      partName: '—',
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return; // keep at least 1
    setLineItems(lineItems.filter((i) => i.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalQty = lineItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setBotMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      setBotMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Verified 10 units of Brake Pad Set under Auto Parts. ERPNext stock checks indicate high inventory availability at Netlink Central Warehouse.`,
        },
      ]);
    }, 800);
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* 1. Back to RFQs Link */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-sky-600 transition"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
          <span>Back to RFQs</span>
        </Link>
      </div>

      {/* 2. Created From Material Request Summary Card Banner */}
      <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="text-[11px] font-extrabold tracking-wider uppercase text-sky-800">
          CREATED FROM MATERIAL REQUEST
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>MATERIAL REQUEST</span>
            </div>
            <div className="text-sm font-bold text-slate-900">MAT-MR-2026-00066</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>DEPARTMENT</span>
            </div>
            <div className="text-sm font-bold text-slate-900">Production</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              <span>COMPANY</span>
            </div>
            <div className="text-sm font-bold text-slate-900">Netlink</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
              <span>PRIORITY</span>
            </div>
            <div className="text-sm font-bold text-slate-900">High</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>PROCUREMENT OWNER</span>
            </div>
            <div className="text-sm font-bold text-slate-900">Procurement Manager</div>
          </div>
        </div>
      </div>

      {/* 3. Stat Metric Pill Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>MATERIAL REQUEST</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 truncate">MAT-MR-2026-00066</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <span>TOTAL ITEMS</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900">{lineItems.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <span>TOTAL QUANTITY</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900">{totalQty}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-slate-400" />
            <span>BUDGET STATUS</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900">Check on RFQ page</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
            <span>PRIORITY</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900">High</div>
        </div>
      </div>

      {/* 4. Process Pipeline Stepper Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-semibold">
          {/* Step 1: Completed */}
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-6 w-6 rounded-full border-2 border-sky-400 text-sky-600 flex items-center justify-center font-bold">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <span>RFQ Details</span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300" />

          {/* Step 2: Active */}
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <div className="h-6 w-6 rounded-full bg-[#0088FF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              2
            </div>
            <span>Add Items</span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300" />

          {/* Step 3 */}
          <div className="flex items-center gap-2 text-slate-400">
            <div className="h-6 w-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center font-medium text-xs">
              3
            </div>
            <span>Select Suppliers</span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300" />

          {/* Step 4 */}
          <div className="flex items-center gap-2 text-slate-400">
            <div className="h-6 w-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center font-medium text-xs">
              4
            </div>
            <span>Review & Submit</span>
          </div>
        </div>
      </div>

      {/* 5. Requested Line Items Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6">
        {/* Banner Info Box inside Card */}
        <div className="rounded-xl bg-[#F0F7FF] border border-sky-100 p-4 flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Package className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">Requested Line Items</h3>
            <p className="text-xs text-slate-500">
              Select an Item Group first, then choose items from your inventory master. Description and UOM are filled automatically.
            </p>
          </div>
        </div>

        {/* Dynamic Line Items Table */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-48">ITEM GROUP *</th>
                <th className="py-3 px-3 w-52">ITEM *</th>
                <th className="py-3 px-3">DESCRIPTION</th>
                <th className="py-3 px-3 w-24">QTY *</th>
                <th className="py-3 px-3 w-20">UOM</th>
                <th className="py-3 px-3 w-32">PART NAME</th>
                <th className="py-3 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {lineItems.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition group">
                  {/* # */}
                  <td className="py-3 px-3 font-semibold text-slate-400 text-center">
                    <span className="inline-block px-2 py-1 bg-slate-100 rounded-md text-[11px] font-bold text-slate-600">
                      {idx + 1}
                    </span>
                  </td>

                  {/* ITEM GROUP */}
                  <td className="py-3 px-3">
                    <select
                      value={row.itemGroup}
                      onChange={(e) => updateLineItem(row.id, 'itemGroup', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                    >
                      <option value="Auto Parts">Auto Parts</option>
                      <option value="Engine Systems">Engine Systems</option>
                      <option value="Transmission">Transmission</option>
                      <option value="Electrical & Sensors">Electrical & Sensors</option>
                      <option value="Raw Materials">Raw Materials</option>
                    </select>
                  </td>

                  {/* ITEM */}
                  <td className="py-3 px-3">
                    <select
                      value={row.item}
                      onChange={(e) => updateLineItem(row.id, 'item', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                    >
                      <option value="Brake Pad Set">Brake Pad Set</option>
                      <option value="Brake Disc Rotor">Brake Disc Rotor</option>
                      <option value="Oil Filter Assembly">Oil Filter Assembly</option>
                      <option value="Spark Plug Heavy Duty">Spark Plug Heavy Duty</option>
                      <option value="Alloy Wheel Rim 18">Alloy Wheel Rim 18"</option>
                    </select>
                  </td>

                  {/* DESCRIPTION */}
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateLineItem(row.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                    />
                  </td>

                  {/* QTY */}
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      min="1"
                      value={row.qty}
                      onChange={(e) => updateLineItem(row.id, 'qty', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-center focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                    />
                  </td>

                  {/* UOM */}
                  <td className="py-3 px-3">
                    <div className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-600 text-center">
                      {row.uom}
                    </div>
                  </td>

                  {/* PART NAME */}
                  <td className="py-3 px-3">
                    <div className="w-full px-3 py-2 text-xs text-slate-400 text-center font-mono">
                      {row.partName}
                    </div>
                  </td>

                  {/* Action Remove */}
                  <td className="py-3 px-3 text-center">
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(row.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove line item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <button
            onClick={addLineItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-sky-600 border border-dashed border-sky-300 rounded-xl hover:bg-sky-50 transition shadow-2xs self-start"
          >
            <Plus className="h-4 w-4" />
            <span>Add Line Item</span>
          </button>

          <div className="text-[11px] text-slate-500">
            <strong>{lineItems.length} line</strong> · Item codes are stored automatically
          </div>
        </div>
      </div>

      {/* 6. Floating AI Bot Assistant Button & Modal */}
      <div className="fixed bottom-6 right-6 z-50">
        {!botOpen ? (
          <button
            onClick={() => setBotOpen(true)}
            className="relative h-14 w-14 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform group"
            title="Netlink AI Procurement Assistant"
          >
            <Bot className="h-7 w-7" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </button>
        ) : (
          <div className="w-80 sm:w-96 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col font-sans text-slate-800 animate-in slide-in-from-bottom-5 duration-200">
            {/* Bot Header */}
            <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-extrabold tracking-wide uppercase">Netlink AI Assistant</div>
                  <div className="text-[10px] text-sky-200 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-300" /> Connected to ERPNext Engine
                  </div>
                </div>
              </div>
              <button
                onClick={() => setBotOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="p-4 h-64 overflow-y-auto space-y-3 bg-slate-50/60 custom-scrollbar text-xs">
              {botMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed',
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white ml-auto rounded-br-xs font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 mr-auto rounded-bl-xs shadow-2xs'
                  )}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Chat Form */}
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder="Ask about part codes, RFQ status..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

