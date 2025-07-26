import qs from "qs";

export interface QuerySerializers {
  brackets: (query: Record<string, unknown>) => string;
  indices: (query: Record<string, unknown>) => string;
  comma: (query: Record<string, unknown>) => string;
  native: (query: Record<string, unknown>) => string;
}

export const querySerializers: QuerySerializers = {
  brackets: (query: Record<string, unknown>) => {
    return qs.stringify(query, { arrayFormat: 'brackets' });
  },

  indices: (query: Record<string, unknown>) => {
    return qs.stringify(query, { arrayFormat: 'indices' });
  },

  comma: (query: Record<string, unknown>) => {
    return qs.stringify(query, { arrayFormat: 'comma' });
  },

  native: (query: Record<string, unknown>) => {
    // Use URLSearchParams for native browser format
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item !== undefined && item !== null) {
            params.append(key, String(item));
          }
        });
      } else if (typeof value === 'object') {
        // For objects, stringify them as JSON
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }
};