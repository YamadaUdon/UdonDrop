import { FC } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// Data Input Icons
export const CsvIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 13H8.01M12 13H12.01M16 13H16.01M8 17H8.01M12 17H12.01M16 17H16.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const JsonIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3H7C5.9 3 5 3.9 5 5V7M16 3H17C18.1 3 19 3.9 19 5V7M8 21H7C5.9 21 5 20.1 5 19V17M16 21H17C18.1 21 19 20.1 19 19V17" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 8L12 10L10 12M14 12L12 14L14 16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DatabaseIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="5" rx="9" ry="3" stroke={color} strokeWidth="2"/>
    <path d="M21 12C21 13.66 16.97 15 12 15C7.03 15 3 13.66 3 12" stroke={color} strokeWidth="2"/>
    <path d="M3 5V19C3 20.66 7.03 22 12 22C16.97 22 21 20.66 21 19V5" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ApiIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <path d="M12 2C12 2 16 6 16 12C16 18 12 22 12 22" stroke={color} strokeWidth="2"/>
    <path d="M12 2C12 2 8 6 8 12C8 18 12 22 12 22" stroke={color} strokeWidth="2"/>
    <path d="M2 12H22" stroke={color} strokeWidth="2"/>
  </svg>
);

export const FileIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Processing Icons
export const ProcessIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L12 6M12 18L12 22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12L6 12M18 12L22 12M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2"/>
  </svg>
);

export const TransformIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V8M12 8L15 5M12 8L9 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 22V16M12 16L9 19M12 16L15 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
  </svg>
);

export const FilterIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const AggregateIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="2"/>
    <rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="2"/>
    <path d="M10 6.5H14M6.5 10V14M10 17.5H14M17.5 10V14" stroke={color} strokeWidth="2"/>
  </svg>
);

export const JoinIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="12" r="5" stroke={color} strokeWidth="2"/>
    <circle cx="17" cy="12" r="5" stroke={color} strokeWidth="2"/>
    <path d="M12 7V17" stroke={color} strokeWidth="2"/>
  </svg>
);

export const SplitIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L21 8L16 13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 3L3 8L8 13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 8H13C11.9 8 11 8.9 11 10V21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 8H11C12.1 8 13 8.9 13 10V21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ML Icons
export const ModelIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 16V8C21 7.45 20.78 6.93 20.41 6.54L14.41 0.54C14.04 0.15 13.53 0 13 0H6C4.9 0 4 0.9 4 2V16C4 17.1 4.9 18 6 18H8V22L12 18L16 22V18H18C19.1 18 20 17.1 20 16Z" stroke={color} strokeWidth="2"/>
    <path d="M9 7H15M9 11H15M9 15H12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PredictIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 12H18L15 21L9 3L6 12H2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const EvaluateIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12L3 21H7L7 12H3Z" stroke={color} strokeWidth="2"/>
    <path d="M10 8V21H14V8H10Z" stroke={color} strokeWidth="2"/>
    <path d="M17 5V21H21V5H17Z" stroke={color} strokeWidth="2"/>
  </svg>
);

// Output Icons
export const SaveIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16L21 8V19C21 20.1 20.1 21 19 21Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 21V13H7V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 3V8H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const UploadIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 8L12 3L7 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Utility Icons
export const CloseIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DeleteIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H5H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const TimeIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <path d="M12 6V12L16 14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ClockIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <path d="M12 6V12H16.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const PlayIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5V19L19 12L8 5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const StopIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="12" height="12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SettingsIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
    <path d="M19.4 15C19.2 15.3 19.2 15.6 19.4 15.9L20.4 17.5C20.6 17.8 20.6 18.2 20.4 18.5L19.4 20.1C19.2 20.4 18.8 20.5 18.5 20.4L16.9 19.9C16.6 19.8 16.3 19.8 16 20L15.2 21.6C15.1 21.9 14.7 22 14.4 22H12.6C12.3 22 11.9 21.9 11.8 21.6L11 20C10.7 19.8 10.4 19.8 10.1 19.9L8.5 20.4C8.2 20.5 7.8 20.4 7.6 20.1L6.6 18.5C6.4 18.2 6.4 17.8 6.6 17.5L7.6 15.9C7.8 15.6 7.8 15.3 7.6 15L6.6 13.4C6.4 13.1 6.4 12.7 6.6 12.4L7.6 10.8C7.8 10.5 8.2 10.4 8.5 10.5L10.1 11C10.4 11.1 10.7 11.1 11 10.9L11.8 9.3C11.9 9 12.3 8.9 12.6 8.9H14.4C14.7 8.9 15.1 9 15.2 9.3L16 10.9C16.3 11.1 16.6 11.1 16.9 11L18.5 10.5C18.8 10.4 19.2 10.5 19.4 10.8L20.4 12.4C20.6 12.7 20.6 13.1 20.4 13.4L19.4 15Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DownloadIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 10L12 15L17 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Data Architecture Icons
export const DataLakeIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke={color} strokeWidth="2"/>
    <path d="M2 12H22" stroke={color} strokeWidth="2"/>
    <path d="M12 2C9.24 2 7 6.48 7 12C7 17.52 9.24 22 12 22C14.76 22 17 17.52 17 12C17 6.48 14.76 2 12 2Z" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill={color}/>
  </svg>
);

export const DataWarehouseIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
    <path d="M3 9H21" stroke={color} strokeWidth="2"/>
    <path d="M3 15H21" stroke={color} strokeWidth="2"/>
    <path d="M9 3V21" stroke={color} strokeWidth="2"/>
    <path d="M15 3V21" stroke={color} strokeWidth="2"/>
  </svg>
);

export const DataMartIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="12" height="12" rx="2" stroke={color} strokeWidth="2"/>
    <path d="M6 10H18" stroke={color} strokeWidth="2"/>
    <path d="M10 6V18" stroke={color} strokeWidth="2"/>
    <path d="M14 6V18" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ChartIcon: FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V21H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 16L12 11L15 14L20 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="7" cy="16" r="1" fill={color}/>
    <circle cx="12" cy="11" r="1" fill={color}/>
    <circle cx="15" cy="14" r="1" fill={color}/>
    <circle cx="20" cy="9" r="1" fill={color}/>
  </svg>
);