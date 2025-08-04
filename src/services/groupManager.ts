import { NodeGroup } from '../types';

const DEFAULT_GROUP_COLORS = [
  '#E3F2FD', // Light Blue
  '#E8F5E8', // Light Green
  '#FFF3E0', // Light Orange
  '#F3E5F5', // Light Purple
  '#E0F2F1', // Light Teal
  '#FFF8E1', // Light Yellow
  '#FFEBEE', // Light Pink
  '#F1F8E9', // Light Lime
  '#FCE4EC', // Light Pink 2
  '#E8EAF6', // Light Indigo
  '#F3E5F5', // Light Purple 2
  '#E0F7FA', // Light Cyan
  '#F9FBE7', // Light Lime 2
  '#FFF3E0', // Light Orange 2
  '#EFEBE9', // Light Brown
  '#FAFAFA', // Light Grey
  '#E1F5FE', // Light Blue 2
  '#F1F8E9', // Light Green 2
  '#FDF2E9', // Light Peach
  '#FAE5D3', // Light Beige
];

// Extended color palette for more variety
const EXTENDED_COLOR_PALETTE = [
  // Pastels
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
  '#E6B3FF', '#FFB3F5', '#B3FFFF', '#FFE4B3', '#D4B3FF',
  // Soft colors
  '#FFC1CC', '#FFE5CC', '#FFFACD', '#C1FFC1', '#C1E5FF',
  '#E1C1FF', '#FFC1F5', '#C1FFFF', '#FFE1C1', '#D1C1FF',
  // Light vibrant
  '#FF9999', '#FFCC99', '#FFFF99', '#99FF99', '#99CCFF',
  '#CC99FF', '#FF99CC', '#99FFFF', '#FFCC99', '#CC99FF',
];

export class GroupManager {
  private groups: Map<string, NodeGroup> = new Map();
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    this.loadGroups();
  }

  // Event system
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: (data: any) => void): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }
    
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    const eventData = data !== undefined ? data : this.getAllGroups();
    handlers.forEach(handler => {
      try {
        handler(eventData);
      } catch (error) {
        console.error(`Error in group manager event handler:`, error);
      }
    });
  }

  // Group CRUD operations
  createGroup(name: string, description?: string, color?: string): NodeGroup {
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const group: NodeGroup = {
      id,
      name: name.trim(),
      description: description?.trim(),
      color: color || this.getNextAvailableColor(),
      createdAt: now,
      updatedAt: now,
    };

    this.groups.set(id, group);
    this.saveGroups();
    this.emit('groups:changed');
    
    return group;
  }

  // Restore group with existing ID (for import functionality)
  restoreGroup(groupData: NodeGroup): NodeGroup {
    const group: NodeGroup = {
      ...groupData,
      createdAt: groupData.createdAt instanceof Date ? groupData.createdAt : new Date(groupData.createdAt),
      updatedAt: groupData.updatedAt instanceof Date ? groupData.updatedAt : new Date(groupData.updatedAt),
    };

    this.groups.set(group.id, group);
    this.saveGroups();
    this.emit('groups:changed');
    
    return group;
  }

  updateGroup(id: string, updates: Partial<Omit<NodeGroup, 'id' | 'createdAt'>>): boolean {
    const group = this.groups.get(id);
    if (!group) return false;

    const updatedGroup: NodeGroup = {
      ...group,
      ...updates,
      updatedAt: new Date(),
    };

    this.groups.set(id, updatedGroup);
    this.saveGroups();
    this.emit('groups:changed');
    
    return true;
  }

  deleteGroup(id: string): boolean {
    if (!this.groups.has(id)) return false;
    
    this.groups.delete(id);
    this.saveGroups();
    this.emit('groups:changed');
    this.emit('group:deleted', id);
    
    return true;
  }

  getGroup(id: string): NodeGroup | undefined {
    return this.groups.get(id);
  }

  getAllGroups(): NodeGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }

  // Group color management
  private getNextAvailableColor(): string {
    const usedColors = new Set(Array.from(this.groups.values()).map(g => g.color));
    
    // First try default colors
    for (const color of DEFAULT_GROUP_COLORS) {
      if (!usedColors.has(color)) {
        return color;
      }
    }
    
    // Then try extended palette
    for (const color of EXTENDED_COLOR_PALETTE) {
      if (!usedColors.has(color)) {
        return color;
      }
    }
    
    // Generate smart random color if all predefined colors are used
    return this.generateSmartRandomColor();
  }

  private generateRandomColor(): string {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 50 + Math.random() * 30; // 50-80%
    const lightness = 85 + Math.random() * 10; // 85-95%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  private generateSmartRandomColor(): string {
    const usedColors = new Set(Array.from(this.groups.values()).map(g => g.color));
    let attempts = 0;
    const maxAttempts = 50;
    
    // Try to generate a color that's visually distinct from existing ones
    while (attempts < maxAttempts) {
      const color = this.generateRandomColor();
      
      // Check if this color is sufficiently different from existing ones
      if (!usedColors.has(color) && this.isColorDistinct(color, usedColors)) {
        return color;
      }
      attempts++;
    }
    
    // Fallback: just generate a random color
    return this.generateRandomColor();
  }

  private isColorDistinct(newColor: string, existingColors: Set<string>): boolean {
    // Simple check - in a real implementation, you might want to use color distance calculations
    const newHue = this.extractHueFromHSL(newColor);
    if (newHue === null) return true;
    
    for (const existingColor of existingColors) {
      const existingHue = this.extractHueFromHSL(existingColor);
      if (existingHue !== null && Math.abs(newHue - existingHue) < 30) {
        return false; // Too similar
      }
    }
    return true;
  }

  private extractHueFromHSL(color: string): number | null {
    const hslMatch = color.match(/hsl\((\d+),/);
    return hslMatch ? parseInt(hslMatch[1], 10) : null;
  }

  generateRandomColorPalette(count: number = 10): string[] {
    const colors: string[] = [];
    const usedColors = new Set<string>();
    
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let color: string;
      
      do {
        color = this.generateRandomColor();
        attempts++;
      } while (usedColors.has(color) && attempts < 20);
      
      colors.push(color);
      usedColors.add(color);
    }
    
    return colors;
  }

  getAvailableColors(): string[] {
    const usedColors = new Set(Array.from(this.groups.values()).map(g => g.color));
    
    // Combine default and extended colors
    const allPredefinedColors = [...DEFAULT_GROUP_COLORS, ...EXTENDED_COLOR_PALETTE];
    const availableColors = allPredefinedColors.filter(color => !usedColors.has(color));
    
    // Add some random colors if needed
    if (availableColors.length < 5) {
      const randomColors = this.generateRandomColorPalette(10);
      availableColors.push(...randomColors.filter(color => !usedColors.has(color)));
    }
    
    return availableColors;
  }

  getAllAvailableColors(): string[] {
    // Return all predefined colors plus some random ones
    const allColors = [...DEFAULT_GROUP_COLORS, ...EXTENDED_COLOR_PALETTE];
    const randomColors = this.generateRandomColorPalette(20);
    return [...allColors, ...randomColors];
  }

  // Persistence
  private saveGroups(): void {
    try {
      const groupsData = Array.from(this.groups.entries()).map(([id, group]) => ({
        id,
        ...group,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      }));
      
      localStorage.setItem('dataflow_groups', JSON.stringify(groupsData));
    } catch (error) {
      console.error('Failed to save groups to localStorage:', error);
    }
  }

  private loadGroups(): void {
    try {
      const stored = localStorage.getItem('dataflow_groups');
      if (!stored) return;
      
      const groupsData = JSON.parse(stored);
      if (!Array.isArray(groupsData)) return;
      
      groupsData.forEach(groupData => {
        if (groupData.id && groupData.name) {
          const group: NodeGroup = {
            ...groupData,
            createdAt: new Date(groupData.createdAt),
            updatedAt: new Date(groupData.updatedAt),
          };
          this.groups.set(group.id, group);
        }
      });
    } catch (error) {
      console.error('Failed to load groups from localStorage:', error);
    }
  }

  // Utility methods
  getGroupsStats(): {
    totalGroups: number;
    recentGroups: number;
    colorUsage: Record<string, number>;
  } {
    const groups = this.getAllGroups();
    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - 7); // Last 7 days
    
    const colorUsage: Record<string, number> = {};
    groups.forEach(group => {
      colorUsage[group.color] = (colorUsage[group.color] || 0) + 1;
    });
    
    return {
      totalGroups: groups.length,
      recentGroups: groups.filter(g => g.createdAt > recentThreshold).length,
      colorUsage,
    };
  }

  // Node group utilities
  getNodeGroupIds(nodeData: any): string[] {
    // Support both old single groupId and new multiple groupIds
    if (nodeData.groupIds && Array.isArray(nodeData.groupIds)) {
      return nodeData.groupIds;
    }
    if (nodeData.groupId) {
      return [nodeData.groupId];
    }
    return [];
  }

  getNodeGroups(nodeData: any): NodeGroup[] {
    const groupIds = this.getNodeGroupIds(nodeData);
    return groupIds.map(id => this.getGroup(id)).filter(Boolean) as NodeGroup[];
  }

  isNodeInGroup(nodeData: any, groupId: string): boolean {
    return this.getNodeGroupIds(nodeData).includes(groupId);
  }

  // Validation
  isGroupNameUnique(name: string, excludeId?: string): boolean {
    const trimmedName = name.trim().toLowerCase();
    return !Array.from(this.groups.values()).some(group => 
      group.id !== excludeId && group.name.toLowerCase() === trimmedName
    );
  }

  validateGroupName(name: string): { valid: boolean; error?: string } {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return { valid: false, error: 'Group name is required' };
    }
    
    if (trimmedName.length < 2) {
      return { valid: false, error: 'Group name must be at least 2 characters' };
    }
    
    if (trimmedName.length > 50) {
      return { valid: false, error: 'Group name must be less than 50 characters' };
    }
    
    if (!this.isGroupNameUnique(trimmedName)) {
      return { valid: false, error: 'Group name already exists' };
    }
    
    return { valid: true };
  }
}

// Singleton instance
export const groupManager = new GroupManager();