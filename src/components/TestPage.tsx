import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AttendancePlanService } from '../generated';
import type { AttendancePlan } from '../generated/models/AttendancePlanModel';
import { RefreshCw, Database, Pencil, Trash2, X } from 'lucide-react';

interface TestPageProps {
  isInitialized?: boolean;
}

export default function TestPage({ isInitialized = false }: TestPageProps) {
  const { t } = useLanguage();
  
  // AttendancePlan records state
  const [records, setRecords] = useState<AttendancePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<AttendancePlan | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AttendancePlan>>({});
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation state
  const [deletingRecord, setDeletingRecord] = useState<AttendancePlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Define columns to display (matches SharePoint list headers)
  const displayColumns: { key: keyof AttendancePlan; label: string }[] = [
    { key: 'ID', label: 'ID' },
    { key: 'Title', label: 'Title' },
    { key: 'field_0', label: 'Date' },
    { key: 'field_2', label: 'Name' },
    { key: 'field_3', label: 'Role' },
    { key: 'field_4', label: 'Indirect/Direct' },
    { key: 'field_5', label: 'Work Status' },
    { key: 'field_6', label: 'Shift Team' },
    { key: 'field_7', label: 'Shift Type' },
    { key: 'field_8', label: 'Working Hours' },
    { key: 'field_9', label: 'Check-In Time' },
    { key: 'field_10', label: 'Check-Out Time' },
    { key: 'field_11', label: 'Notes' },
    { key: 'Modified', label: 'Modified' },
    { key: 'Created', label: 'Created' },
  ];

  // Fetch all records using the typed service
  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AttendancePlanService.getAll();
      console.log('AttendancePlan getAll result:', result);
      if (result.data) {
        setRecords(result.data);
        console.log('Loaded records:', result.data.length);
      } else {
        setRecords([]);
        if (!result.success) {
          console.error('API error:', result.error);
          setError(`Failed to load records: ${result.error?.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error loading records:', err);
      setError('Failed to load records. Check permissions.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when initialized
  useEffect(() => {
    if (!isInitialized) return;
    loadRecords();
  }, [isInitialized]);

  // Format cell value for display
  const formatValue = (value: unknown, key?: string): string => {
    if (value === null || value === undefined) return '—';
    
    // Format date fields
    if (key === 'field_0' || key === 'Modified' || key === 'Created') {
      const date = new Date(value as string);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }
    
    if (typeof value === 'object') {
      // Handle Author/Editor objects
      if ('DisplayName' in (value as object)) {
        return (value as { DisplayName: string }).DisplayName;
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Handle Edit button click
  const handleEdit = (record: AttendancePlan) => {
    setEditingRecord(record);
    setEditFormData({
      Title: record.Title,
      field_0: record.field_0,
      field_2: record.field_2,
      field_3: record.field_3,
      field_4: record.field_4,
      field_5: record.field_5,
      field_6: record.field_6,
      field_7: record.field_7,
      field_8: record.field_8,
      field_9: record.field_9,
      field_10: record.field_10,
      field_11: record.field_11,
    });
  };

  // Handle Save edit
  const handleSaveEdit = async () => {
    if (!editingRecord?.ID) return;
    
    setSaving(true);
    try {
      const updatePayload = {
        Title: editFormData.Title,
        field_0: editFormData.field_0,
        field_2: editFormData.field_2,
        field_3: editFormData.field_3,
        field_4: editFormData.field_4,
        field_5: editFormData.field_5,
        field_6: editFormData.field_6,
        field_7: editFormData.field_7,
        field_8: editFormData.field_8,
        field_9: editFormData.field_9,
        field_10: editFormData.field_10,
        field_11: editFormData.field_11,
      } as Partial<Omit<AttendancePlan, 'ID'>>;
      
      const result = await AttendancePlanService.update(String(editingRecord.ID), updatePayload);
      console.log('Update result:', result);
      
      if (result.success) {
        setEditingRecord(null);
        loadRecords(); // Refresh the list
      } else {
        setError(`Failed to update: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating record:', err);
      setError('Failed to update record.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete button click
  const handleDelete = (record: AttendancePlan) => {
    setDeletingRecord(record);
  };

  // Handle Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingRecord?.ID) return;
    
    setDeleting(true);
    try {
      await AttendancePlanService.delete(String(deletingRecord.ID));
      console.log('Record deleted:', deletingRecord.ID);
      setDeletingRecord(null);
      loadRecords(); // Refresh the list
    } catch (err) {
      console.error('Error deleting record:', err);
      setError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  // Editable fields for the form (matches SharePoint list headers)
  const editableFields: { key: keyof AttendancePlan; label: string; type: 'text' | 'number' }[] = [
    { key: 'Title', label: 'Title', type: 'text' },
    { key: 'field_0', label: 'Date', type: 'text' },
    { key: 'field_2', label: 'Name', type: 'text' },
    { key: 'field_3', label: 'Role', type: 'text' },
    { key: 'field_4', label: 'Indirect/Direct', type: 'text' },
    { key: 'field_5', label: 'Work Status', type: 'text' },
    { key: 'field_6', label: 'Shift Team', type: 'text' },
    { key: 'field_7', label: 'Shift Type', type: 'text' },
    { key: 'field_8', label: 'Working Hours', type: 'number' },
    { key: 'field_9', label: 'Check-In Time', type: 'text' },
    { key: 'field_10', label: 'Check-Out Time', type: 'text' },
    { key: 'field_11', label: 'Notes', type: 'text' },
  ];

  return (
    <div className='container' style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', height: '100%', minHeight: 0, overflow: 'auto' }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
          {t('test.title') || 'SharePoint List Test'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          AttendancePlan List Data
        </p>
      </div>

      {/* ===== ATTENDANCEPLAN SECTION ===== */}
      <div className='card' style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div 
          style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border-color)', 
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} />
            <span style={{ fontWeight: 600 }}>AttendancePlan</span>
            {records.length > 0 && (
              <span style={{ 
                background: 'var(--accent-blue)', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px' 
              }}>
                {records.length} items
              </span>
            )}
          </div>
          <button
            onClick={loadRecords}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Loading */}
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p>Loading AttendancePlan data...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ padding: '16px', margin: '16px', background: '#fef2f2', borderRadius: '8px', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* Table */}
          {!loading && !error && records.length > 0 && (
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0 }}>
                    <th 
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        fontWeight: 600,
                        borderBottom: '2px solid var(--border-color)',
                        whiteSpace: 'nowrap',
                        background: '#f5f5f5',
                        width: '100px'
                      }}
                    >
                      Actions
                    </th>
                    {displayColumns.map((col) => (
                      <th 
                        key={String(col.key)} 
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          fontWeight: 600,
                          borderBottom: '2px solid var(--border-color)',
                          whiteSpace: 'nowrap',
                          background: '#f5f5f5'
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, idx) => (
                    <tr 
                      key={record.ID || idx}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: idx % 2 === 0 ? 'white' : '#fafafa'
                      }}
                    >
                      {/* Actions column */}
                      <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEdit(record)}
                            style={{
                              padding: '6px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            style={{
                              padding: '6px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      {displayColumns.map((col) => {
                        const displayValue = formatValue(record[col.key], col.key as string);
                        return (
                          <td 
                            key={String(col.key)} 
                            style={{ 
                              padding: '10px 16px',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={displayValue}
                          >
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && records.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
              <Database size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p>No items in this list</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editingRecord && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setEditingRecord(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Edit Record (ID: {editingRecord.ID})
              </h2>
              <button
                onClick={() => setEditingRecord(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {editableFields.map((field) => (
                <div key={String(field.key)}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={editFormData[field.key] as string | number || ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                    })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingRecord(null)}
                style={{
                  padding: '10px 20px',
                  background: '#f5f5f5',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deletingRecord && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setDeletingRecord(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: '#fef2f2', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Trash2 size={20} color="#ef4444" />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Delete Record
              </h2>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to delete this record (ID: {deletingRecord.ID})? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeletingRecord(null)}
                style={{
                  padding: '10px 20px',
                  background: '#f5f5f5',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
