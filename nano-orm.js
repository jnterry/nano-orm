////////////////////////////////////////////////////////////////////////////
///                           Part of nano-orm                           ///
////////////////////////////////////////////////////////////////////////////
/// \file nano-orm.js
/// \author Jamie Terry
/// \date 2017/07/27
/// \brief Defines base class for representing Model's which can be both
/// loaded from and persisted to some database
////////////////////////////////////////////////////////////////////////////

"use strict";

let Q = require('q');
let moment = require('moment');

/**
 * Creates a new class for representing a Model which may be loaded from
 * and persisted to the database
 *
 * @param {string} table_name - The name of the table in the database the
 * created Model should wrap
 *
 * @param {Object[]} model_fields - Array of field descriptors. Order must be
 * that of the columns in the database. Each field descriptor may be either a
 * string holding the field's name, or a JSON schema for the type stored by the
 * field. Important properties of the JSON schema are outlined below.
 * @param {string} model_fields[].name - Name of the field. Must be equal to the
 * name of the column in the database
 * @param {bool} [model_fields[].required] - Whether the field is required
 * (IE: cannot be NULL). Defaults to true.
 * @param {string} [model_fields[].type] - Name of the datatype used to
 * represent the field. May be one of:
 * - string
 * - number
 * - boolean
 * - datetime
 *
 * @param {string} [model_fields[].format] -
 *
 * @param {Object} [options] - JSON object representing the additional options for
 * the model.
 * @param {string} [options.id] - Name of the id field, defaults to 'id'
 *
 * @todo :TODO: Is there anything other than id field name to put in options?
 * Should we just have it as a string
 *
 * @return Constructor for the created Model class
 */
function defineModel(table_name, model_fields, options){
	//console.info("Creating Model for table: '" + table_name + "'");

	/////////////////////////////////////////////////
	// Check and pre-process parameters to this function
	if(model_fields == null || model_fields.length === 0){
		throw "No model_fields specified for table: '" + table_name + "'";
	}

	model_fields = _convertToDetailedFieldDescriptors(model_fields);

	for(let i = 0; i < model_fields.length; ++i){
		for(let j = i+1; j < model_fields.length; ++j){
			if(model_fields[i].name === model_fields[j].name){
				throw "Duplicate field name '" + model_fields[i].name +
					"' in model for table: " + table_name;
			}
		}
	}

	let id_field_name = "id";
	if(options && options.id_field){ id_field_name = options.id_field; }

	let field_mappers = _generateMappingFunctions(model_fields);

	/**
	 * Creates a new instance of the Model with specified values for fields.
	 * This function will NEVER affect the database itself.
	 *
	 * @constructor
	 *
	 * @param {Object} [field_values] JSON object with values to use for the
	 * fields of the created model instance. Any field's whose value is not
	 * specified will be set to null. Attempting to set a field which does not
	 * exist will result in an exception.
	 */
	let Model = function(field_values){
		// Define fields of the model
		this._fields = {};
		this._dirty  = true;

		// Ensure all fields have placeholder value
		this._fields.id = 0; // 0 indicates not saved in db
		for(let f of model_fields){
			this._fields[f.name] = null;
		}

		// Initialize values of the fields
		if(field_values !== undefined){
			for(let f in field_values){
				if(this._fields[f] === undefined){
					throw "Attempted to specify value for non-existent field: " + f;
				}
				if(typeof field_values[f] === 'string'){
					this._fields[f] = field_mappers[f].fromDb(field_values[f]);
				} else {
					this._fields[f] = field_values[f];
				}
			}
		}

		// Define this.id field as a proxy for the internal this._fields.id field
		// This can be 'got' only (IE: no set).
		// It is set automatically when the instance is saved to the database
		// and can't be modified else we may insert new instances/overwrite other
		// instances when calling .save()
		Object.defineProperty(this, 'id', {
			configurable : false,
			enumerable   : true,
			get          : function() {
				return this._fields.id;
			},
		});

		// And define the rest of the field accessors,
		// also proxies for the internal this._fields.xxx
		for(let field of model_fields) {
			Object.defineProperty(this, field.name, {
				configurable : false,
				enumerable   : true,

				get: function(){ return this._fields[field.name]; },
				set: function(value){
					this._fields[field.name] = value;
					this.markAsDirty();
				}
			});
		}
	};

	Model._mappers = field_mappers;

	Model._queries = {}; // cache of sql statements

	/**
	 * Retrieves the name of the table this Model wraps
	 * @return {string} Name of wrapped table
	 */
	Model.getTableName   = (function(){ return table_name;                      });

	/**
	 * @note This does not include the name of the id field
	 * @see {@link Model.getIdFieldName}
	 *
	 * @return {string[]} Array of field names in this model
	 */
	Model.getFieldNames  = (function(){ return model_fields.map((f) => f.name); });

	/**
	 * Retrieves the name of the id field for this model
	 *
	 * @note instance.id can always be used to access the value of the id - this
	 * function is useful only if writing plain SQL queries that require the id
	 * field name
	 *
	 * @return {string} Name of id field
	 */
	Model.getIdFieldName = (function(){ return id_field_name;                   });

	/**
	 * Converts a Model to an object that which should be converted to JSON
	 * to represent the Model's data. This will include the values of the
	 * Model's fields only, with no associated meta data (eg: the name of
	 * table which stores Model
	 *
	 * @return {object}
	 */
	Model.prototype.toJSON = function(){ return this._fields; };

	/**
	 * Creates a new instance of the Model and persists it to the database
	 *
	 * @param dbh {DbConnectionPromise} -  database handle which which to save
	 * the Model to the database
	 * @param field_values {object} - Object containing values for the fields
	 * of the created instance
	 *
	 * @return {Promise} Promise which will either resolve to the created
	 * instance after it has been saved (and thus assigned an id if the id
	 * column is AUTO_INCREMENT) or be rejected if an error occurs while saving
	 */
	Model.create = function(dbh, field_values){
		let result = new Model(field_values);
		return result.save(dbh);
	};

	/**
	 * Creates a new instance of Model from a row of data retrieved from the
	 * database
	 *
	 * @note In general users of nano-orm should prefer methods such as find()
	 * or load(), however this may be used to create an instance if you need to
	 * use custom SQL queries to load a Model instance
	 *
	 * @param row {object} - Row of data returned from the database
	 *
	 * @return {Model} The created instance
	 */
	Model.createFromRow = function(row){
		let model = new Model();

		// Check id is availible and set
		if(row[Model.getIdFieldName()] === undefined){
			throw new Error("Cannot construct instance of " + Model.getTableName() +
			                " since row is missing id field '" + Model.getIdFieldName() + "'");
		}
		model._fields.id = row[Model.getIdFieldName()];

		// Fill in values of other fields
		for(let f of Model.getFieldNames()){
			if(row[f] === undefined){
				throw new Error("Cannot construct instance of " + Model.getTableName() +
				                " since row is missing data field: " + f);
			}
			model._fields[f] = Model._mappers[f].fromDb(row[f]);
		}

		// Ensure model is not marked as dirty
		model._dirty = false;

		return model;
	};

	/**
	 * Creates an array of Model instances from an array of rows returned from the
	 * database
	 *
	 * @param rows {Object[]} - Array of rows returned from the database
	 *
	 * @return {Model[]} Array of created instances. Will be in the same order as
	 * the rows parameter
	 */
	Model.createFromRows = function(rows) {
		if(rows.rowCount != null && rows.rows != null && rows.fields != null){
			// This this is the result directly from the database
			rows = rows.rows;
		}

		let result = [];
		for(let i = 0; i < rows.length; ++i) {
			result[i] = this.createFromRow(rows[i]);
		}
		return result;
	};

	/**
	 * Determines if the Model instance is different to the corresponding entry
	 * in the database, or has not yet been persisted to the database
	 *
	 * An instance will automatically be marked as dirty whenever any field
	 * value is modified. Additionally a new instance will be dirty as it will
	 * not yet have been persisted to the database
	 *
	 * @return {boolean}
	 */
	Model.prototype.isDirty = function() { return this._dirty; };

	/**
	 * Marks the model instance as dirty - IE: differs from the corresponding
	 * entry in the database.
	 *
	 * @note It is uncommon to need to call this method - modifying any field
	 * values will automatically set the Model instance as dirty
	 */
	Model.prototype.markAsDirty = function() { this._dirty = true; };

	/**
	 * Retrieves the Model class an Model instance is created from. Typically
	 * only required to call static methods of the Model if given an instance
	 *
	 * @return {Model}
	 */
	Model.prototype.getModel = function() { return Model; };

	///////////////////////////////
	// Load query
	let stmt_load = "SELECT " + Model.getIdFieldName() + ",";
	for(let f of Model.getFieldNames()){ stmt_load += f + ","; }
	stmt_load = stmt_load.slice(0,-1);
	stmt_load += " FROM " + Model.getTableName() + " WHERE " + Model.getIdFieldName() + "=?;";
	//console.info("  Made load stmt: " + stmt_load);
	Model._queries.load = stmt_load;

	/**
	 * Loads a specific instance of the Model from the database
	 * @param dbh {DbConnectionPromise} - Database handle with which to load the
	 * instance
	 * @param id - The id of the instance to load - should be unique
	 * @return {Promise} - Promise which will either resolve to the loaded Model
	 * instance, or will be rejected if an error occurred during loading
	 */
	Model.load = function(dbh, id){
		return dbh
			.query(Model._queries.load, [id])
			.then((res) => {
				if(res.rows.length !== 1){
					throw ("Failed to load " + id + " from " + Model.getTableName()
					       + " since result contained " + res.rows.length + " entries");
				}
				return Model.createFromRow(res.rows[0]);
			});
	};

	///////////////////////////////
	// Find query
	var stmt_find = "SELECT " + Model.getIdFieldName() + ",";
	for(let f of Model.getFieldNames()){ stmt_find += f + ","; }
	stmt_find = stmt_find.slice(0,-1);
	stmt_find += " FROM " + Model.getTableName() + " WHERE ";
	//console.info("  Made find stmt: " + stmt_find);
	Model._queries.find_prefix = stmt_find;

	/**
	 * Finds a set of Model instances in the database according to some
	 * criteria
	 *
	 * @param dbh {DbConnectionPromise} - Database handle with which to search
	 * the database and load the found instances
	 * @param where_clause {string} - SQL snippet which will be used as the WHERE
	 * clause when loading
	 * @param params [array] - Array of values to use for the bound parameters
	 * in the where clause
	 */
	Model.find = function(dbh, where_clause, params){
		var query = Model._queries.find_prefix + where_clause;
		return dbh
			.query(query, params)
			.then(Model.createFromRows.bind(Model));
	};

	///////////////////////////////
	// Update query
	// :TODO: have option for an auto-update modified_at field
	var stmt_update = "UPDATE " + Model.getTableName() + " SET ";
	for(let f of Model.getFieldNames()){
		stmt_update += f + "=?,";
	}
	stmt_update = stmt_update.slice(0, -1);
	stmt_update += " WHERE " + Model.getIdFieldName() + "=?;";
	//console.info("  Made update stmt: " + stmt_update);
	Model._queries.update = stmt_update;

	///////////////////////////////
	// Insert query
	// :TODO: have option for an auto-update created_at field
	var stmt_insert = "INSERT INTO " + Model.getTableName() + "(";
	for(let f of Model.getFieldNames()){ stmt_insert += f + ","; }
	stmt_insert = stmt_insert.slice(0,-1);
	stmt_insert += ") VALUES (";
			for(let f in Model.getFieldNames()){ stmt_insert += "?,"; }
	stmt_insert = stmt_insert.slice(0,-1);
	stmt_insert += ");";
	//console.info("  Made insert stmt: " + stmt_insert);
	Model._queries.insert = stmt_insert;

	/**
	 * Saves the instance to the database. If the instance already exists (IE: id
	 * is not 0) then will update the existing row. Otherwise will insert a new
	 * row - after which the id field will be filled in (assuming the id field
	 * in the database is AUTO_INCREMENT
	 *
	 * @param dbh {DbConnectionPromise} - Handle to the database
	 *
	 * @return {Promise} Promise which will either resolve to the instance after
	 * is saved, or will be rejected if an error occurs while updating the
	 * base. This method will only modify the id field (if the instance has not
	 * yet been saved) and the isDirty state.
	 * @todo :TODO: implement auto-updated modified_at etc fields -> this will
	 * also modify that field
	 */
	Model.prototype.save = function(dbh){
		// Do nothing if the instance is not _dirty
		if(!this._dirty){ return Q(this); }

		// Generate parameters for the save operation
		let params = Model
		    .getFieldNames()
		    .map((f) => {
			    return Model._mappers[f].toDb(this._fields[f]);
		    });

		////////////////////////////////////////////
		// Perform the save operation, get a promise of the result
		let promise;
		if(this.id === 0){
			//then this instance has never been saved before, insert new record
			promise = dbh
				.query(Model._queries.insert, params)
				.then((res) => {
					this._fields.id = res.lastInsertId;
					return this;
				});
		} else {
			//updaing existing entry requires a WHERE id = ? as well
			params.push(this.id);
			promise = dbh.query(Model._queries.update, params);
		}

		promise = promise.then((res) => {
			this._dirty = false;
			return this;
		});

		return promise;
	};

	///////////////////////////////
	// Delete query
	Model._queries.delete = "DELETE FROM " + Model.getTableName() +
		" WHERE " + Model.getIdFieldName() + "=?;";

	//console.info("  Made delete statement: " + Model._queries.delete);

	/**
	 * Deletes an instance from the database by id
	 *
	 * @param dbh {DbConnectionPromise} - Handle to the database
	 * @param id - The id of the instance to delete
	 *
	 * @note Due to the underlying database implementation there is no way to
	 * test if this operation succeeded - IE: if there does not exist an instance
	 * with the specified row this method will act as a no-op
	 */
	Model.delete = function(dbh, id){
		return dbh.query(Model._queries.delete, [id]);
	};

	Model.prototype.delete = function(dbh){
		// If not yet saved in database, do nothing
		if(this.id === 0){ return Q(this); }

		return dbh
			.query(Model._queries.delete, this.id)
			.then((instance) => {
				this._fields.id = 0;
				this._dirty     = true;
				return this;
			});
	};

	_attachJsonSchema    (Model, model_fields);

	return Model;
}

module.exports = {
	defineModel           : defineModel,
};

////////////////////////////////////////////////////////////////////////////////
// Helper functions below
////////////////////////////////////////////////////////////////////////////////

function _convertToDetailedFieldDescriptors(model_fields){
	return model_fields.map((field) => {
		if(typeof field === 'string'){
			return {
				name     : field,
				required : true,
			};
		} else {
			if(field.name == null || typeof field.name != 'string' || field.name.length == 0){
				throw "Field descriptor object MUST have a name property";
			}
			if(field.required === undefined){
				field.required = true;
			}
			return field;
		}
	});
};

function _attachJsonSchema(Model, model_fields){
	let schema = {
		name       : Model.getTableName(),
		properties : {},
		required   : [],
	};

	for(let field of model_fields){
		schema.properties[field.name] = JSON.parse(JSON.stringify(field));

		if(field.required){
			schema.required.push(field.name);
		}

		delete schema.properties[field.name].name;
		delete schema.properties[field.name].required;
	}

	Model.schema           = schema;
	Model.prototype.schema = schema;
};

function _generateMappingFunctions(model_fields){
	let result = {};
	for(let field of model_fields){
		if(field.type === 'datetime'){
			result[field.name] = _mapperDate;
		} else {
			result[field.name] = _mapperNoop;
		}
	}
	return result;
}

let _mapperNoop = {
	fromDb(x){ return x; },
	toDb  (x){ return x; },
};
let _mapperDate = {
	fromDb(date_str) { return moment(date_str); },
	toDb  (date    ) { return date.format("YYYY-MM-DD HH:mm:ss.SSSSSS"); },
};
