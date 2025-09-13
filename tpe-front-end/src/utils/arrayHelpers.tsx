/**
 * Array Rendering Helper Utilities
 * Prevents React array rendering errors
 */

import React from 'react';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from './jsonHelpers';

/**
 * Safely ensure data is an array
 * Handles: null, undefined, single items, arrays
 */
export function ensureArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  if (data === null || data === undefined) return [];
  return [data]; // Wrap single items in array
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray(data: any): boolean {
  return Array.isArray(data) && data.length > 0;
}

/**
 * Safe array rendering with fallback
 * Use this for consistent array rendering pattern
 */
export function safeRenderArray<T = any>(
  data: any,
  renderFn: (item: T, index: number) => React.ReactNode,
  emptyState: React.ReactNode = 'No items'
): React.ReactNode {
  const items = ensureArray<T>(data);
  
  if (items.length === 0) {
    return emptyState;
  }
  
  return items.map(renderFn);
}

/**
 * Extract and render array field from an object
 */
export function renderArrayField(
  data: any,
  fieldName: string,
  renderFn: (item: any, index: number) => React.ReactNode,
  emptyState: React.ReactNode = null
): React.ReactNode {
  const fieldValue = data?.[fieldName];
  const items = ensureArray(fieldValue);
  
  if (items.length === 0) {
    return emptyState;
  }
  
  return items.map(renderFn);
}

/**
 * Safe key generator for list items
 * Tries multiple common ID fields before falling back to index
 */
export function getItemKey(item: any, index: number, prefix: string = 'item'): string | number {
  // Try common ID fields
  if (item?.id !== undefined) return item.id;
  if (item?.key !== undefined) return item.key;
  if (item?._id !== undefined) return item._id;
  if (item?.uuid !== undefined) return item.uuid;
  
  // For primitive values
  if (typeof item === 'string' || typeof item === 'number') {
    return `${prefix}-${item}-${index}`;
  }
  
  // Last resort: use index with prefix
  return `${prefix}-${index}`;
}

/**
 * Render a list with automatic safety checks
 * Complete solution for safe list rendering
 */
interface SafeListProps<T> {
  data: any;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
  keyPrefix?: string;
  loading?: boolean;
  loadingState?: React.ReactNode;
}

export function SafeList<T = any>({
  data,
  renderItem,
  emptyState = <div>No items to display</div>,
  className = '',
  keyPrefix = 'item',
  loading = false,
  loadingState = <div>Loading...</div>
}: SafeListProps<T>): JSX.Element {
  // Handle loading state
  if (loading) {
    return <>{loadingState}</>;
  }
  
  // Ensure data is array
  const items = ensureArray<T>(data);
  
  // Handle empty state
  if (items.length === 0) {
    return <>{emptyState}</>;
  }
  
  // Render items
  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={getItemKey(item, index, keyPrefix)}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Render badges/chips for array fields
 * Common pattern for focus areas, tags, etc.
 */
export function renderBadgeArray(
  items: any,
  badgeClassName: string = 'badge',
  emptyText: string = 'None'
): React.ReactNode {
  const safeItems = ensureArray(items);
  
  if (safeItems.length === 0) {
    return <span className="text-gray-500">{emptyText}</span>;
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {safeItems.map((item, index) => (
        <span key={getItemKey(item, index, 'badge')} className={badgeClassName}>
          {typeof item === 'object' ? item.name || item.label || 'Unknown' : item}
        </span>
      ))}
    </div>
  );
}

/**
 * Safely access nested array in object
 */
export function getNestedArray(obj: any, path: string, defaultValue: any[] = []): any[] {
  if (!obj) return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current?.[key] === undefined) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return ensureArray(current);
}

/**
 * Common pattern for contractor/partner JSON fields
 */
export function renderJsonArrayField(
  field: any,
  renderFn?: (item: any, index: number) => React.ReactNode,
  emptyState: React.ReactNode = 'None'
): React.ReactNode {
  // Parse if it's a JSON string
  let items = field;
  if (typeof field === 'string') {
    try {
      items = safeJsonParse(field);
    } catch {
      items = [];
    }
  }
  
  // Ensure it's an array
  items = ensureArray(items);
  
  if (items.length === 0) {
    return emptyState;
  }
  
  // Use custom render function or default
  if (renderFn) {
    return items.map(renderFn);
  }
  
  // Default rendering
  return items.map((item, index) => (
    <span key={getItemKey(item, index)} className="mr-2">
      {typeof item === 'object' ? safeJsonStringify(item) : item}
    </span>
  ));
}

/**
 * Type guard to check if value is renderable
 */
export function isRenderableValue(value: any): boolean {
  // Primitives are renderable
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  
  // Null/undefined are renderable (React ignores them)
  if (value === null || value === undefined) {
    return true;
  }
  
  // React elements are renderable
  if (React.isValidElement(value)) {
    return true;
  }
  
  // Arrays and objects are NOT directly renderable
  return false;
}

/**
 * Make any value safe to render
 */
export function makeRenderable(value: any): React.ReactNode {
  // Already safe
  if (isRenderableValue(value)) {
    return value;
  }
  
  // Arrays need mapping
  if (Array.isArray(value)) {
    return value.map((item, index) => (
      <div key={getItemKey(item, index)}>
        {makeRenderable(item)}
      </div>
    ));
  }
  
  // Objects need property access
  if (typeof value === 'object' && value !== null) {
    // Try common display properties
    if (value.name) return value.name;
    if (value.title) return value.title;
    if (value.label) return value.label;
    if (value.value) return value.value;
    
    // Last resort: stringify
    return safeJsonStringify(value);
  }
  
  return null;
}