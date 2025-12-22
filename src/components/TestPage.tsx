import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Jia_shiftsService } from '../generated';
import type { Jia_shifts } from '../generated/models/Jia_shiftsModel';
import { RefreshCw, Clock, Search, ChevronUp, ChevronDown, ChevronsUpDown, Palette, FileText, UserCheck } from 'lucide-react';

interface TestPageProps {
  isInitialized?: boolean;
}

// Column definition for grid
interface GridColumn {
  key: keyof Jia_shifts;
  label: string;
  width?: string;
  sortable?: boolean;
}

// Sort configuration
type SortDirection = 'asc' | 'desc' | null;
interface SortConfig {
  key: keyof Jia_shifts | null;
  direction: SortDirection;
}

export default function TestPage({ isInitialized = false }: TestPageProps) {
  const { t } = useLanguage();
  
  // Shifts state
  const [shifts, setShifts] = useState<Jia_shifts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  
  // Selected rows state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Define columns for the grid
  const gridColumns: GridColumn[] = [
    { key: 'jia_shiftname', label: 'Shift Name', width: '200px', sortable: true },
    { key: 'jia_description', label: 'Description', width: '300px', sortable: true },
    { key: 'jia_colorcode', label: 'Color Code', width: '120px', sortable: true },
    { key: 'statecodename', label: 'Status', width: '100px', sortable: true },
    { key: 'createdbyname', label: 'Created By', width: '150px', sortable: true },
    { key: 'createdon', label: 'Created On', width: '150px', sortable: true },
    { key: 'modifiedon', label: 'Modified On', width: '150px', sortable: true },
  ];

  // Fetch shifts using Jia_shifts service
  const loadShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await Jia_shiftsService.getAll();
      console.log('Jia_shifts getAll result:', result);
      if (result.data) {
        setShifts(result.data);
        console.log('Loaded shifts:', result.data.length);
      } else {
        setShifts([]);
        if (!result.success) {
          console.error('API error:', result.error);
          setError(`Failed to load shifts: ${result.error?.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error loading shifts:', err);
      setError('Failed to load shifts. Check permissions.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when initialized
  useEffect(() => {
    if (!isInitialized) return;
    loadShifts();
  }, [isInitialized]);

  // Handle search (client-side filtering)
  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle sort
  const handleSort = (key: keyof Jia_shifts) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  // Filtered and sorted shifts
  const filteredAndSortedShifts = useMemo(() => {
    let result = shifts;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.jia_shiftname?.toLowerCase().includes(term) ||
        s.jia_description?.toLowerCase().includes(term) ||
        s.jia_colorcode?.toLowerCase().includes(term)
      );
    }
    
    // Sort
    if (sortConfig.key && sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key!] ?? '';
        const bVal = b[sortConfig.key!] ?? '';
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
    }
    
    return result;
  }, [shifts, searchTerm, sortConfig]);

  // Handle row selection
  const handleRowSelect = (shiftId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(shiftId)) {
      newSelected.delete(shiftId);
    } else {
      newSelected.add(shiftId);
    }
    setSelectedRows(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === filteredAndSortedShifts.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedShifts.map(s => s.jia_shiftid)));
    }
  };

  // Format cell value for display
  const formatValue = (value: unknown, key?: string): string => {
    if (value === null || value === undefined) return '—';
    
    // Format date fields
    if (key === 'createdon' || key === 'modifiedon') {
      const date = new Date(value as string);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Get sort icon
  const getSortIcon = (key: keyof Jia_shifts) => {
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} style={{ opacity: 0.4 }} />;
    if (sortConfig.direction === 'asc') return <ChevronUp size={14} />;
    if (sortConfig.direction === 'desc') return <ChevronDown size={14} />;
    return <ChevronsUpDown size={14} style={{ opacity: 0.4 }} />;
  };

  // ===== SUMMARY CALCULATIONS =====
  const summaryStats = useMemo(() => {
    const selectedShiftsList = filteredAndSortedShifts.filter(s => selectedRows.has(s.jia_shiftid));
    
    // Count active vs inactive
    const activeCount = filteredAndSortedShifts.filter(s => s.statecodename === 'Active').length;
    const inactiveCount = filteredAndSortedShifts.filter(s => s.statecodename === 'Inactive').length;
    
    // Unique color codes
    const colorCodes = filteredAndSortedShifts.map(s => s.jia_colorcode).filter(Boolean) as string[];
    const uniqueColors = [...new Set(colorCodes)];
    
    // Selected shifts' names
    const selectedNames = selectedShiftsList.map(s => s.jia_shiftname).filter(Boolean);
    
    return {
      totalShifts: filteredAndSortedShifts.length,
      selectedCount: selectedRows.size,
      selectedShifts: selectedShiftsList,
      selectedNames,
      activeCount,
      inactiveCount,
      uniqueColors,
    };
  }, [filteredAndSortedShifts, selectedRows]);

  return (
    <div className='container' style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', height: '100%', minHeight: 0, overflow: 'auto' }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
          {t('test.title') || 'Shift Management'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          View and manage shift configurations
        </p>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      {filteredAndSortedShifts.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          flexShrink: 0
        }}>
          {/* Total Shifts Card */}
          <div className="card" style={{ 
            padding: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>
                {summaryStats.totalShifts}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>Total Shifts</div>
            </div>
          </div>

          {/* Selected Shifts Card */}
          <div className="card" style={{ 
            padding: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            background: summaryStats.selectedCount > 0 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
              : '#f5f5f5',
            color: summaryStats.selectedCount > 0 ? 'white' : 'var(--text-primary)'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: summaryStats.selectedCount > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <UserCheck size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>
                {summaryStats.selectedCount}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>Selected</div>
            </div>
            {summaryStats.selectedCount > 0 && (
              <div style={{ fontSize: '12px', textAlign: 'right', opacity: 0.9 }}>
                {((summaryStats.selectedCount / summaryStats.totalShifts) * 100).toFixed(0)}%
              </div>
            )}
          </div>

          {/* Active Shifts Card */}
          <div className="card" style={{ 
            padding: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: 'white'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <FileText size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>
                {summaryStats.activeCount}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>Active</div>
            </div>
          </div>

          {/* Color Codes Card */}
          <div className="card" style={{ 
            padding: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            color: 'white'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Palette size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>
                {summaryStats.uniqueColors.length}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>Color Codes</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SELECTED SHIFTS DETAIL CARD ===== */}
      {summaryStats.selectedCount > 0 && (
        <div className="card" style={{ padding: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <UserCheck size={18} color="#10b981" />
            <span style={{ fontWeight: 600 }}>Selection Summary</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Selected Names */}
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Selected Shifts
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                {summaryStats.selectedNames.slice(0, 5).join(', ')}
                {summaryStats.selectedCount > 5 && ` +${summaryStats.selectedCount - 5} more`}
              </div>
            </div>
            
            {/* Color Preview */}
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Colors
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {summaryStats.selectedShifts.slice(0, 5).map(s => (
                  <div 
                    key={s.jia_shiftid}
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '4px', 
                      background: s.jia_colorcode || '#ccc',
                      border: '2px solid white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                    title={`${s.jia_shiftname}: ${s.jia_colorcode}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SHIFTS GRID ===== */}
      <div className='card' style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header with search */}
        <div 
          style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border-color)', 
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} />
            <span style={{ fontWeight: 600 }}>Shifts</span>
            {shifts.length > 0 && (
              <span style={{ 
                background: 'var(--accent-blue)', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px' 
              }}>
                {shifts.length} shifts
              </span>
            )}
            {selectedRows.size > 0 && (
              <span style={{ 
                background: '#10b981', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px' 
              }}>
                {selectedRows.size} selected
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search shifts..."
                style={{
                  padding: '8px 12px 8px 36px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  width: '200px'
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <Search size={16} />
              Filter
            </button>
            <button
              onClick={loadShifts}
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
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Loading */}
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p>Loading shifts...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ padding: '16px', margin: '16px', background: '#fef2f2', borderRadius: '8px', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* Grid Table */}
          {!loading && !error && filteredAndSortedShifts.length > 0 && (
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)', position: 'sticky', top: 0, zIndex: 10 }}>
                    {/* Select all checkbox */}
                    <th 
                      style={{ 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 600,
                        borderBottom: '2px solid var(--border-color)',
                        background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)',
                        width: '50px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredAndSortedShifts.length && filteredAndSortedShifts.length > 0}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    {gridColumns.map((col) => (
                      <th 
                        key={String(col.key)} 
                        onClick={() => col.sortable && handleSort(col.key)}
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          fontWeight: 600,
                          borderBottom: '2px solid var(--border-color)',
                          whiteSpace: 'nowrap',
                          background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)',
                          width: col.width,
                          cursor: col.sortable ? 'pointer' : 'default',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {col.label}
                          {col.sortable && getSortIcon(col.key)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedShifts.map((shift, idx) => {
                    const isSelected = selectedRows.has(shift.jia_shiftid);
                    return (
                      <tr 
                        key={shift.jia_shiftid || idx}
                        onClick={() => handleRowSelect(shift.jia_shiftid)}
                        style={{ 
                          borderBottom: '1px solid var(--border-color)',
                          background: isSelected 
                            ? 'rgba(59, 130, 246, 0.1)' 
                            : idx % 2 === 0 ? 'white' : '#fafafa',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa';
                        }}
                      >
                        {/* Row checkbox */}
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleRowSelect(shift.jia_shiftid)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        {gridColumns.map((col) => {
                          const displayValue = formatValue(shift[col.key], String(col.key));
                          return (
                            <td 
                              key={String(col.key)} 
                              style={{ 
                                padding: '10px 16px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={displayValue}
                            >
                              {col.key === 'jia_colorcode' && shift.jia_colorcode ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div 
                                    style={{ 
                                      width: '20px', 
                                      height: '20px', 
                                      borderRadius: '4px', 
                                      background: shift.jia_colorcode,
                                      border: '1px solid rgba(0,0,0,0.1)'
                                    }} 
                                  />
                                  <span>{shift.jia_colorcode}</span>
                                </div>
                              ) : col.key === 'statecodename' ? (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: displayValue === 'Active' ? '#dcfce7' : '#fee2e2',
                                  color: displayValue === 'Active' ? '#16a34a' : '#dc2626'
                                }}>
                                  {displayValue}
                                </span>
                              ) : displayValue}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAndSortedShifts.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '60px 40px' }}>
              <Clock size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>No shifts found</p>
              <p style={{ fontSize: '14px' }}>
                {searchTerm ? 'Try a different search term' : 'Create a new shift to get started'}
              </p>
            </div>
          )}
        </div>

        {/* Footer with stats */}
        {!loading && filteredAndSortedShifts.length > 0 && (
          <div 
            style={{ 
              padding: '12px 16px', 
              borderTop: '1px solid var(--border-color)', 
              background: '#fafafa',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>
              Showing {filteredAndSortedShifts.length} shift{filteredAndSortedShifts.length !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
            </span>
            {sortConfig.key && (
              <span>
                Sorted by {gridColumns.find(c => c.key === sortConfig.key)?.label} ({sortConfig.direction})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
