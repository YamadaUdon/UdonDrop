import { FC } from 'react';
import { useTranslation } from '../../node_modules/react-i18next';
import { NodeType } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';
import { isTauri } from '../utils/platform';
import * as Icons from './Icons';
import '../styles/scrollbar.css';

interface NodeTypeConfig {
  type: NodeType;
  label: string;
  description: string;
  category: 'architecture' | 'data' | 'processing' | 'ml' | 'output';
  icon?: React.ReactNode;
}

const nodeTypes: NodeTypeConfig[] = [
  // Data Architecture Nodes
  {
    type: 'data_lake',
    label: 'Data Lake',
    description: 'Raw data storage repository',
    category: 'architecture',
    icon: <Icons.DataLakeIcon size={16} />,
  },
  {
    type: 'data_warehouse',
    label: 'Data Warehouse',
    description: 'Structured data storage',
    category: 'architecture',
    icon: <Icons.DataWarehouseIcon size={16} />,
  },
  {
    type: 'data_mart',
    label: 'Data Mart',
    description: 'Department-specific data subset',
    category: 'architecture',
    icon: <Icons.DataMartIcon size={16} />,
  },
  {
    type: 'bi_tool',
    label: 'BI Tool',
    description: 'Business Intelligence visualization',
    category: 'architecture',
    icon: <Icons.ChartIcon size={16} />,
  },
  // Data Input Nodes
  {
    type: 'csv_input',
    label: 'CSV Input',
    description: 'Load data from CSV file',
    category: 'data',
    icon: <Icons.CsvIcon size={16} />,
  },
  {
    type: 'json_input',
    label: 'JSON Input',
    description: 'Load data from JSON file',
    category: 'data',
    icon: <Icons.JsonIcon size={16} />,
  },
  {
    type: 'parquet_input',
    label: 'Parquet Input',
    description: 'Load data from Parquet file',
    category: 'data',
    icon: <Icons.FileIcon size={16} />,
  },
  {
    type: 'database_input',
    label: 'Database Input',
    description: 'Load data from database',
    category: 'data',
    icon: <Icons.DatabaseIcon size={16} />,
  },
  {
    type: 'api_input',
    label: 'API Input',
    description: 'Load data from API endpoint',
    category: 'data',
    icon: <Icons.ApiIcon size={16} />,
  },
  // Processing Nodes
  {
    type: 'process',
    label: 'Process',
    description: 'General data processing',
    category: 'processing',
    icon: <Icons.ProcessIcon size={16} />,
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'Apply data transformations',
    category: 'processing',
    icon: <Icons.TransformIcon size={16} />,
  },
  {
    type: 'filter',
    label: 'Filter',
    description: 'Filter data based on conditions',
    category: 'processing',
    icon: <Icons.FilterIcon size={16} />,
  },
  {
    type: 'aggregate',
    label: 'Aggregate',
    description: 'Aggregate data (sum, mean, count)',
    category: 'processing',
    icon: <Icons.AggregateIcon size={16} />,
  },
  {
    type: 'join',
    label: 'Join',
    description: 'Join multiple datasets',
    category: 'processing',
    icon: <Icons.JoinIcon size={16} />,
  },
  {
    type: 'split',
    label: 'Split',
    description: 'Split dataset into multiple parts',
    category: 'processing',
    icon: <Icons.SplitIcon size={16} />,
  },
  // ML Nodes
  {
    type: 'model_train',
    label: 'Model Training',
    description: 'Train machine learning model',
    category: 'ml',
    icon: <Icons.ModelIcon size={16} />,
  },
  {
    type: 'model_predict',
    label: 'Model Prediction',
    description: 'Make predictions with trained model',
    category: 'ml',
    icon: <Icons.PredictIcon size={16} />,
  },
  {
    type: 'model_evaluate',
    label: 'Model Evaluation',
    description: 'Evaluate model performance',
    category: 'ml',
    icon: <Icons.EvaluateIcon size={16} />,
  },
  // Output Nodes
  {
    type: 'csv_output',
    label: 'CSV Output',
    description: 'Save data to CSV file',
    category: 'output',
    icon: <Icons.SaveIcon size={16} />,
  },
  {
    type: 'json_output',
    label: 'JSON Output',
    description: 'Save data to JSON file',
    category: 'output',
    icon: <Icons.SaveIcon size={16} />,
  },
  {
    type: 'parquet_output',
    label: 'Parquet Output',
    description: 'Save data to Parquet file',
    category: 'output',
    icon: <Icons.SaveIcon size={16} />,
  },
  {
    type: 'database_output',
    label: 'Database Output',
    description: 'Save data to database',
    category: 'output',
    icon: <Icons.SaveIcon size={16} />,
  },
  {
    type: 'api_output',
    label: 'API Output',
    description: 'Send data to API endpoint',
    category: 'output',
    icon: <Icons.UploadIcon size={16} />,
  },
];

const Sidebar: FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const theme = getTheme(isDark);
  
  const onDragStart = (event: React.DragEvent, nodeType: NodeType, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = [
    { key: 'architecture', label: t('sidebar.categories.dataArchitecture'), color: '#1a73e8' },
    { key: 'data', label: t('sidebar.categories.input'), color: theme.colors.nodeInput },
    { key: 'processing', label: t('sidebar.categories.processing'), color: theme.colors.nodeProcess },
    { key: 'ml', label: t('sidebar.categories.mlAI'), color: theme.colors.nodeML },
    { key: 'output', label: t('sidebar.categories.output'), color: theme.colors.nodeOutput },
  ];

  const sidebarStyle = {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    width: '280px',
    height: isTauri() ? 'calc(100vh - 32px)' : '100vh',
    borderRight: `1px solid ${theme.colors.border}`,
    overflowY: 'auto' as const,
    position: 'fixed' as const,
    top: isTauri() ? '32px' : '0',
    left: 0,
    zIndex: 99996,
    boxShadow: `2px 0 4px ${theme.colors.shadowLight}`,
  };

  const titleStyle = {
    marginBottom: theme.spacing.md,
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
  };

  const categoryStyle = {
    marginBottom: theme.spacing.md,
  };

  const categoryTitleStyle = {
    fontWeight: theme.typography.fontWeight.semiBold,
    fontSize: theme.typography.fontSize.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    borderBottom: `2px solid ${theme.colors.border}`,
    paddingBottom: theme.spacing.xs,
  };

  const nodeItemStyle = {
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    cursor: 'grab',
    transition: theme.transitions.fast,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const nodeLabelStyle = {
    fontWeight: theme.typography.fontWeight.semiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  };

  const nodeDescStyle = {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: '1.3',
  };

  const iconStyle = {
    minWidth: '20px',
    display: 'flex',
    alignItems: 'center',
    color: theme.colors.accent,
  };

  const renderNodesByCategory = (category: string) => {
    return nodeTypes
      .filter(node => node.category === category)
      .map((node) => (
        <div
          key={node.type}
          style={nodeItemStyle}
          onDragStart={(event) => onDragStart(event, node.type, t(`nodes.${node.type}`))}
          draggable
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
            e.currentTarget.style.borderColor = theme.colors.borderHover;
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 2px 8px ${theme.colors.shadowMedium}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.background;
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={iconStyle}>{node.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={nodeLabelStyle}>{t(`nodes.${node.type}`)}</div>
            <div style={nodeDescStyle}>{node.description}</div>
          </div>
        </div>
      ));
  };

  return (
    <aside style={sidebarStyle} className={`custom-scrollbar ${isDark ? 'scrollbar-dark' : 'scrollbar-light'}`}>
      <div style={titleStyle}>{t('sidebar.title')}</div>
      {categories.map((category) => (
        <div key={category.key} style={categoryStyle}>
          <div style={{
            ...categoryTitleStyle,
            borderBottomColor: category.color,
          }}>
            {category.label}
          </div>
          {renderNodesByCategory(category.key)}
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;