import { FC, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { sqlParser } from '../services/sqlParser';
import { SearchIcon, RocketIcon, TrashIcon, CheckIcon, PenIcon, ClockIcon, XIcon } from './UIIcons';

interface SQLGeneratorPanelProps {
  onGenerate: (nodes: Node[], edges: Edge[]) => void;
  onClose: () => void;
}

const SQLGeneratorPanel: FC<SQLGeneratorPanelProps> = ({ onGenerate, onClose }) => {
  const [sqlQuery, setSqlQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);

  const handlePreview = () => {
    if (!sqlQuery.trim()) {
      alert('Please enter a SQL query');
      return;
    }

    try {
      const parsedQuery = sqlParser.parseSQL(sqlQuery);
      const { nodes, edges } = sqlParser.generateNodesAndEdges(parsedQuery);
      setPreviewData({ nodes, edges });
    } catch (error) {
      alert('Error parsing SQL query. Please check your syntax.');
      console.error('SQL Parse Error:', error);
    }
  };

  const handleGenerate = () => {
    if (!previewData) {
      alert('Please preview the query first');
      return;
    }

    setIsGenerating(true);
    
    // Simulate generation process
    setTimeout(() => {
      onGenerate(previewData.nodes, previewData.edges);
      setIsGenerating(false);
      onClose();
    }, 500);
  };

  const handleClear = () => {
    setSqlQuery('');
    setPreviewData(null);
  };

  const sampleQueries = [
    {
      name: 'Simple Join',
      query: `SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
ORDER BY o.total DESC`
    },
    {
      name: 'Complex Query with CTE',
      query: `WITH sales_summary AS (
  SELECT 
    product_id,
    SUM(quantity) as total_qty,
    SUM(amount) as total_amount
  FROM sales
  WHERE date >= '2024-01-01'
  GROUP BY product_id
)
SELECT 
  p.name,
  ss.total_qty,
  ss.total_amount
FROM products p
JOIN sales_summary ss ON p.id = ss.product_id
ORDER BY ss.total_amount DESC`
    },
    {
      name: 'Data Warehouse Query',
      query: `SELECT 
  d.year,
  d.month,
  p.category,
  SUM(f.sales_amount) as total_sales,
  AVG(f.profit_margin) as avg_margin
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product p ON f.product_key = p.product_key
JOIN dim_customer c ON f.customer_key = c.customer_key
WHERE d.year = 2024
GROUP BY d.year, d.month, p.category
ORDER BY total_sales DESC`
    }
  ];

  const panelStyle = {
    position: 'fixed' as const,
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: 99993,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f0f0f0',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  };

  const closeButtonStyle = {
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#666',
  };

  const contentStyle = {
    display: 'flex',
    flexGrow: 1,
    gap: '20px',
    overflow: 'hidden',
  };

  const leftPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  };

  const rightPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  };

  const textareaStyle = {
    width: '100%',
    height: '300px',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    resize: 'vertical' as const,
    marginBottom: '15px',
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginRight: '10px',
    marginBottom: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
  };

  const sampleButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    fontSize: '12px',
    padding: '6px 12px',
  };

  const previewStyle = {
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    flexGrow: 1,
    overflow: 'auto',
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 99992,
      }} onClick={onClose} />
      
      <div style={panelStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>SQL Query Generator</h2>
          <button style={closeButtonStyle} onClick={onClose}>
            <XIcon size={14} /> Close
          </button>
        </div>
        
        <div style={contentStyle}>
          <div style={leftPanelStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>SQL Query Input</h3>
            
            <textarea
              style={textareaStyle}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
            />
            
            <div style={{ marginBottom: '15px' }}>
              <button style={buttonStyle} onClick={handlePreview}>
                <SearchIcon size={14} /> Preview
              </button>
              <button style={buttonStyle} onClick={handleGenerate} disabled={!previewData || isGenerating}>
                {isGenerating ? (<><ClockIcon size={14} /> Generating...</>) : (<><RocketIcon size={14} /> Generate Nodes</>)}
              </button>
              <button style={secondaryButtonStyle} onClick={handleClear}>
                <TrashIcon size={14} /> Clear
              </button>
            </div>
            
            <div>
              <h4 style={{ marginBottom: '10px' }}>Sample Queries:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {sampleQueries.map((sample, index) => (
                  <button
                    key={index}
                    style={sampleButtonStyle}
                    onClick={() => setSqlQuery(sample.query)}
                    title={sample.query}
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div style={rightPanelStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Preview</h3>
            
            <div style={previewStyle}>
              {previewData ? (
                <div>
                  <h4 style={{ color: '#28a745', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckIcon size={16} color="#28a745" /> Query Parsed Successfully!
                  </h4>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Nodes to be created:</strong> {previewData.nodes.length}
                    <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                      {previewData.nodes.map((node, index) => (
                        <li key={index} style={{ marginBottom: '3px' }}>
                          <strong>{node.data.label}</strong> 
                          <span style={{ color: '#666', fontSize: '12px' }}>
                            ({node.type})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <strong>Edges to be created:</strong> {previewData.edges.length}
                    <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                      {previewData.edges.map((edge, index) => {
                        const sourceNode = previewData.nodes.find(n => n.id === edge.source);
                        const targetNode = previewData.nodes.find(n => n.id === edge.target);
                        return (
                          <li key={index} style={{ marginBottom: '3px' }}>
                            {sourceNode?.data.label} → {targetNode?.data.label}
                            <span style={{ color: '#666', fontSize: '12px' }}>
                              ({edge.data?.label || 'connection'})
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  padding: '40px',
                  fontSize: '16px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <PenIcon size={20} color="#666" />
                    <div>Enter a SQL query and click "Preview" to see the generated nodes and edges.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SQLGeneratorPanel;