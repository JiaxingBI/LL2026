import { useState } from 'react';
import { Plus, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { Adjustment } from '../types';

interface AdjustmentTableProps {
  adjustments: Adjustment[];
  setAdjustments: (adjustments: Adjustment[]) => void;
}

export default function AdjustmentTable({ adjustments, setAdjustments }: AdjustmentTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const updateAdjustment = (id: string, field: keyof Adjustment, value: string) => {
    setAdjustments(
      adjustments.map((adj) => (adj.id === id ? { ...adj, [field]: value } : adj))
    );
  };

  const addAdjustment = () => {
    const newAdjustment: Adjustment = {
      id: Date.now().toString(),
      name: '',
      type: 'Leave',
      duration: '',
      date: new Date().toISOString().split('T')[0],
      shift: 'D',
      notes: '',
      role: '',
      shiftTeam: '',
      hours: 0,
      reason: 'Leave',
      employeeId: '',
      comments: ''
    };
    setAdjustments([...adjustments, newAdjustment]);
  };

  const removeAdjustment = (id: string) => {
    setAdjustments(adjustments.filter((adj) => adj.id !== id));
  };

  return (
    <div className="card">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', border: 'none', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}
      >
        <div className="flex items-center gap-2">
          <h2 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Adjustment Log</h2>
          <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{adjustments.length}</span>
        </div>
        {isExpanded ? <ChevronUp size={16} color="#666" /> : <ChevronDown size={16} color="#666" />}
      </button>
      
      {isExpanded && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Notes</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adj) => (
                <tr key={adj.id}>
                  <td>
                    <input 
                      type="text" 
                      value={adj.name}
                      onChange={(e) => updateAdjustment(adj.id, 'name', e.target.value)}
                      placeholder="Name"
                      style={{ width: '100%', border: 'none', background: 'transparent' }}
                    />
                  </td>
                  <td>
                    <select 
                      value={adj.type}
                      onChange={(e) => updateAdjustment(adj.id, 'type', e.target.value)}
                      style={{ border: 'none', background: 'transparent' }}
                    >
                      <option value="Leave">Leave</option>
                      <option value="Overtime">Overtime</option>
                      <option value="Transfer">Transfer</option>
                    </select>
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={adj.duration}
                      onChange={(e) => updateAdjustment(adj.id, 'duration', e.target.value)}
                      placeholder="e.g. 2h"
                      style={{ width: '100%', border: 'none', background: 'transparent' }}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Calendar size={12} color="#999" />
                      <input 
                        type="date" 
                        value={adj.date}
                        onChange={(e) => updateAdjustment(adj.id, 'date', e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontFamily: 'inherit' }}
                      />
                    </div>
                  </td>
                  <td>
                    <select 
                      value={adj.shift}
                      onChange={(e) => updateAdjustment(adj.id, 'shift', e.target.value)}
                      style={{ border: 'none', background: 'transparent' }}
                    >
                      <option value="D">Day</option>
                      <option value="N">Night</option>
                    </select>
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={adj.notes}
                      onChange={(e) => updateAdjustment(adj.id, 'notes', e.target.value)}
                      placeholder="Add notes..."
                      style={{ width: '100%', border: 'none', background: 'transparent' }}
                    />
                  </td>
                  <td>
                    <button 
                      onClick={() => removeAdjustment(adj.id)}
                      className="btn btn-ghost"
                      style={{ padding: '4px', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px', background: '#fafafa', borderTop: '1px solid var(--border-color)' }}>
            <button onClick={addAdjustment} className="btn btn-ghost" style={{ fontSize: '13px' }}>
              <Plus size={16} />
              Add Adjustment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}