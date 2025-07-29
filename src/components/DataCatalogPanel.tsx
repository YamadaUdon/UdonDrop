import { FC, useState, useEffect } from 'react';
import { DataCatalogEntry } from '../types';
import { dataCatalog } from '../services/dataCatalog';
import { TrashIcon } from './UIIcons';

interface DataCatalogPanelProps {
  onDatasetSelect?: (dataset: DataCatalogEntry) => void;
  selectedDataset?: DataCatalogEntry;
}

const DataCatalogPanel: FC<DataCatalogPanelProps> = ({ 
  onDatasetSelect,
  selectedDataset 
}) => {
  const [entries, setEntries] = useState<DataCatalogEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DataCatalogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<DataCatalogEntry>>({});

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchTerm, selectedType]);

  const loadCatalog = () => {
    // Generate sample data if empty
    if (dataCatalog.getAllEntries().length === 0) {
      dataCatalog.generateSampleEntries();
    }
    setEntries(dataCatalog.getAllEntries());
  };

  const filterEntries = () => {
    let filtered = entries;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(entry => entry.type === selectedType);
    }
    
    setFilteredEntries(filtered);
  };

  const addEntry = () => {
    if (!newEntry.id || !newEntry.name || !newEntry.type) {
      alert('Please fill in all required fields');
      return;
    }
    
    const entry: DataCatalogEntry = {
      id: newEntry.id!,
      name: newEntry.name!,
      type: newEntry.type!,
      filepath: newEntry.filepath,
      connection: newEntry.connection,
      schema: newEntry.schema,
      metadata: newEntry.metadata,
    };
    
    const validation = dataCatalog.validateEntry(entry);
    if (!validation.valid) {
      alert('Validation failed: ' + validation.errors.join(', '));
      return;
    }
    
    dataCatalog.addEntry(entry);
    loadCatalog();
    setShowAddForm(false);
    setNewEntry({});
  };

  const deleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      dataCatalog.removeEntry(id);
      loadCatalog();
    }
  };

  const getTypeIcon = (type: DataCatalogEntry['type']) => {
    const icons = {
      csv: 'CSV',
      json: 'JSON',
      parquet: 'PQ',
      database: 'DB',
      api: 'API',
      memory: 'MEM',
    };
    return icons[type] || 'FILE';
  };

  const getTypeColor = (type: DataCatalogEntry['type']) => {
    const colors = {
      csv: '#4caf50',
      json: '#2196f3',
      parquet: '#ff9800',
      database: '#9c27b0',
      api: '#00bcd4',
      memory: '#607d8b',
    };
    return colors[type] || '#9e9e9e';
  };

  const panelStyle = {
    backgroundColor: '#f5f5f5',
    padding: '16px',
    borderRadius: '8px',
    maxHeight: '400px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  };

  const searchStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '200px',
  };

  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginLeft: '8px',
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#2196f3',
    color: 'white',
  };

  const entryStyle = {
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const selectedEntryStyle = {
    ...entryStyle,
    borderColor: '#2196f3',
    backgroundColor: '#f3f8ff',
  };

  const formStyle = {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px',
    border: '1px solid #e0e0e0',
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '8px',
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0 }}>Data Catalog</h3>
        <button
          style={buttonStyle}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Dataset'}
        </button>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <div style={formStyle}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Add New Dataset</h4>
          <input
            style={inputStyle}
            placeholder="Dataset ID"
            value={newEntry.id || ''}
            onChange={(e) => setNewEntry(prev => ({ ...prev, id: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Dataset Name"
            value={newEntry.name || ''}
            onChange={(e) => setNewEntry(prev => ({ ...prev, name: e.target.value }))}
          />
          <select
            style={inputStyle}
            value={newEntry.type || ''}
            onChange={(e) => setNewEntry(prev => ({ ...prev, type: e.target.value as DataCatalogEntry['type'] }))}
          >
            <option value="">Select Type</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="parquet">Parquet</option>
            <option value="database">Database</option>
            <option value="api">API</option>
            <option value="memory">Memory</option>
          </select>
          <input
            style={inputStyle}
            placeholder="File Path or Connection String"
            value={newEntry.filepath || newEntry.connection || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (newEntry.type === 'database' || newEntry.type === 'api') {
                setNewEntry(prev => ({ ...prev, connection: value }));
              } else {
                setNewEntry(prev => ({ ...prev, filepath: value }));
              }
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={buttonStyle} onClick={addEntry}>
              Add
            </button>
            <button
              style={{ ...buttonStyle, backgroundColor: '#f44336' }}
              onClick={() => {
                setShowAddForm(false);
                setNewEntry({});
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
        <input
          style={searchStyle}
          placeholder="Search datasets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          style={selectStyle}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="parquet">Parquet</option>
          <option value="database">Database</option>
          <option value="api">API</option>
          <option value="memory">Memory</option>
        </select>
      </div>

      {/* Dataset List */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', fontSize: '14px', padding: '32px' }}>
            No datasets found
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              style={selectedDataset?.id === entry.id ? selectedEntryStyle : entryStyle}
              onClick={() => onDatasetSelect?.(entry)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{getTypeIcon(entry.type)}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{entry.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{entry.id}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    backgroundColor: getTypeColor(entry.type),
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}>
                    {entry.type.toUpperCase()}
                  </span>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f44336',
                      cursor: 'pointer',
                      fontSize: '16px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEntry(entry.id);
                    }}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
              
              {entry.metadata?.description && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {entry.metadata.description}
                </div>
              )}
              
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                {entry.filepath && `Path: ${entry.filepath}`}
                {entry.connection && `Connection: ${entry.connection}`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DataCatalogPanel;