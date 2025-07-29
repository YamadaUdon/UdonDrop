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
    
    // Find first unused default color
    for (const color of DEFAULT_GROUP_COLORS) {
      if (!usedColors.has(color)) {
        return color;
      }
    }
    
    // Generate random color if all defaults are used
    return this.generateRandomColor();
  }

  private generateRandomColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 95%)`;
  }

  getAvailableColors(): string[] {
    const usedColors = new Set(Array.from(this.groups.values()).map(g => g.color));
    return DEFAULT_GROUP_COLORS.filter(color => !usedColors.has(color));
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