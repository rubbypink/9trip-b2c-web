/**
 * @fileoverview Schema Utilities — Helper functions for converting schema metadata to JSON Schema format.
 * @module schema-utils
 * @version 1.0.0
 */

// ============================================================================
// TYPE MAPPING
// ============================================================================

/**
 * Maps internal field types to JSON Schema types
 * @constant {Object<string, string>}
 */
const TYPE_MAP = {
	string: 'string',
	number: 'number',
	boolean: 'boolean',
	object: 'object',
	array: 'array',
	timestamp: 'string', // Timestamps stored as ISO strings in extraction
	map: 'object', // Firestore maps become objects in JSON Schema
};

/**
 * Map internal type to JSON Schema type
 * @param {string} internalType - Internal field type
 * @returns {string} JSON Schema type
 */
function mapType(internalType) {
	return TYPE_MAP[internalType] || 'string';
}

// ============================================================================
// FIELD TRANSFORMATION
// ============================================================================

/**
 * Transform a single field definition to JSON Schema property
 * @param {Object} fieldDef - Field definition from FIELDS
 * @param {Object} schemaRegistry - Registry of referenced schemas
 * @returns {Object} JSON Schema property definition
 */
function transformField(fieldDef, schemaRegistry = {}) {
	if (!fieldDef || typeof fieldDef !== 'object') {
		return { type: 'string' };
	}

	const { type, description, properties, items } = fieldDef;
	const schemaType = mapType(type);

	// Base property definition
	const schema = {
		type: schemaType,
	};

	// Add description if present
	if (description) {
		schema.description = description;
	}

	// Handle object type with nested properties
	if (schemaType === 'object' && properties && typeof properties === 'object') {
		schema.properties = {};
		for (const [key, propDef] of Object.entries(properties)) {
			schema.properties[key] = transformField(propDef, schemaRegistry);
		}
	}

	// Handle array type with items
	if (schemaType === 'array' && items) {
		// Check if items has a ref to another schema
		if (items.ref && schemaRegistry[items.ref]) {
			schema.items = schemaRegistry[items.ref];
		} else if (items.properties) {
			// Items is an object with properties
			schema.items = transformField(items, schemaRegistry);
		} else {
			// Simple item type
			schema.items = transformField(items, schemaRegistry);
		}
	}

	return schema;
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Transform FIELDS metadata to JSON Schema format for Firecrawl extraction.
 * 
 * @param {Object} fields - FIELDS metadata object with field definitions
 * @param {Object} options - Transformation options
 * @param {string} options.requiredField - Single required field name (Firecrawl convention)
 * @param {Object} options.schemaRegistry - Registry of referenced schemas (e.g., { HOTEL_ROOM_SCHEMA: {...} })
 * @returns {Object} JSON Schema object for Firecrawl extract
 * 
 * @example
 * const schema = fieldsToExtractSchema(HOTEL_FIELDS, {
 *   requiredField: 'name',
 *   schemaRegistry: { HOTEL_ROOM_SCHEMA, HOTEL_REVIEW_SCHEMA }
 * });
 */
export function fieldsToExtractSchema(fields, options = {}) {
	if (!fields || typeof fields !== 'object') {
		throw new Error('fields must be a valid object');
	}

	const { requiredField, schemaRegistry = {} } = options;

	const properties = {};
	for (const [key, fieldDef] of Object.entries(fields)) {
		properties[key] = transformField(fieldDef, schemaRegistry);
	}

	const schema = {
		type: 'object',
		properties,
	};

	// Add required field if specified (Firecrawl convention: single required field)
	if (requiredField && properties[requiredField]) {
		schema.required = [requiredField];
	}

	return schema;
}

/**
 * Transform FIELDS metadata to JSON Schema for list page extraction.
 * Creates a schema that extracts an array of items from a list page.
 * 
 * @param {Object} itemFields - FIELDS metadata for a single list item
 * @param {string} listKey - The key for the array (e.g., 'tours', 'activities', 'hotels')
 * @param {Object} options - Transformation options
 * @param {string[]} options.requiredFields - Required fields for each list item
 * @param {Object} options.schemaRegistry - Registry of referenced schemas
 * @returns {Object} JSON Schema object for list extraction
 * 
 * @example
 * const listSchema = fieldsToListExtractSchema(TOUR_LIST_ITEM_FIELDS, 'tours', {
 *   requiredFields: ['title', 'url']
 * });
 */
export function fieldsToListExtractSchema(itemFields, listKey, options = {}) {
	if (!itemFields || typeof itemFields !== 'object') {
		throw new Error('itemFields must be a valid object');
	}

	if (!listKey || typeof listKey !== 'string') {
		throw new Error('listKey must be a valid string');
	}

	const { requiredFields = [], schemaRegistry = {} } = options;

	const itemProperties = {};
	for (const [key, fieldDef] of Object.entries(itemFields)) {
		itemProperties[key] = transformField(fieldDef, schemaRegistry);
	}

	const itemSchema = {
		type: 'object',
		properties: itemProperties,
	};

	if (requiredFields.length > 0) {
		itemSchema.required = requiredFields;
	}

	return {
		type: 'object',
		properties: {
			[listKey]: {
				type: 'array',
				items: itemSchema,
			},
		},
		required: [listKey],
	};
}

export function createListItemFields(fieldNames, fieldDefinitions = {}) {
	const fields = {};
	for (const name of fieldNames) {
		if (fieldDefinitions[name]) {
			fields[name] = fieldDefinitions[name];
		} else {
			fields[name] = { type: 'string' };
		}
	}
	return fields;
}

// ============================================================================
// ALIAS EXPORTS (for consistency with new naming convention)
// ============================================================================

/**
 * Convert schema metadata to JSON Schema format for Firecrawl Agent
 * @param {Object} schema - Schema metadata object (was FIELDS)
 * @param {Object} options - Transformation options
 * @returns {Object} JSON Schema format
 */
export const schemaToExtractSchema = fieldsToExtractSchema;

/**
 * Create list extraction schema
 * @param {Object} schema - Schema metadata
 * @param {string} itemsPath - Dot notation path to items array
 * @param {Object} options - Transformation options
 * @returns {Object} JSON Schema for list extraction
 */
export const schemaToListExtractSchema = fieldsToListExtractSchema;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

// [DEAD CODE] Default export — never imported as default by any skill
// export default {
// 	fieldsToExtractSchema,
// 	fieldsToListExtractSchema,
// 	createListItemFields,
// 	schemaToExtractSchema,
// 	schemaToListExtractSchema,
// };
