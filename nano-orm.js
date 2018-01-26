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

function _attachQueryFunctions(ModelClass){
	///////////////////////////////
	// Load query
	let stmt_load = "SELECT " + ModelClass.getIdFieldName() + ",";
	for(let f of ModelClass.getFieldNames()){ stmt_load += f + ","; }
	stmt_load = stmt_load.slice(0,-1);
	stmt_load += " FROM " + ModelClass.getTableName() + " WHERE " + ModelClass.getIdFieldName() + "=?;";
	//console.info("  Made load stmt: " + stmt_load);
	ModelClass._queries.load = stmt_load;

	ModelClass.load = function(dbh, id){
		return dbh
			.query(ModelClass._queries.load, [id])
			.then((res) => {
				if(res.rows.length !== 1){
					throw ("Failed to load " + id + " from " + ModelClass.getTableName()
					       + " since result contained " + res.rows.length + " entries");
				}
				return ModelClass.createFromRow(res.rows[0]);
			});
	};

	///////////////////////////////
	// Find query
	var stmt_find = "SELECT " + ModelClass.getIdFieldName() + ",";
	for(let f of ModelClass.getFieldNames()){ stmt_find += f + ","; }
	stmt_find = stmt_find.slice(0,-1);
	stmt_find += " FROM " + ModelClass.getTableName() + " WHERE ";
	//console.info("  Made find stmt: " + stmt_find);
	ModelClass._queries.find_prefix = stmt_find;

	ModelClass.find = function(dbh, where_clause, params){
		//:TODO: escape the where clause?
		var query = ModelClass._queries.find_prefix + where_clause;
		return dbh
			.query(query, params)
			.then((res) => {
				var ops = [];
				for(let i = 0; i < res.rows.length; ++i){
					// :TODO:COMP: createFromRows function?
					ops.push(ModelClass.createFromRow(res.rows[i]));
				}
				return dbh.then(() => Q.all(ops));
			});
	};

	///////////////////////////////
	// Update query
	// :TODO: have option for an auto-update modified_at field
	var stmt_update = "UPDATE " + ModelClass.getTableName() + " SET ";
	for(let f of ModelClass.getFieldNames()){
		stmt_update += f + "=?,";
	}
	stmt_update = stmt_update.slice(0, -1);
	stmt_update += " WHERE " + ModelClass.getIdFieldName() + "=?;";
	//console.info("  Made update stmt: " + stmt_update);
	ModelClass._queries.update = stmt_update;

	///////////////////////////////
	// Insert query
	// :TODO: have option for an auto-update created_at field
	var stmt_insert = "INSERT INTO " + ModelClass.getTableName() + "(";
	for(let f of ModelClass.getFieldNames()){ stmt_insert += f + ","; }
	stmt_insert = stmt_insert.slice(0,-1);
	stmt_insert += ") VALUES (";
			for(let f in ModelClass.getFieldNames()){ stmt_insert += "?,"; }
	stmt_insert = stmt_insert.slice(0,-1);
	stmt_insert += ");";
	//console.info("  Made insert stmt: " + stmt_insert);
	ModelClass._queries.insert = stmt_insert;

	ModelClass._instance_prototype.save = function(dbh){
		// Do nothing if the instance is not _dirty
		if(!this._dirty){ return Q(this); }

		// Generate parameters for the save operation
		let params = ModelClass
		    .getFieldNames()
		    .map((f) => {
			    return this._fields[f];
		    });

		////////////////////////////////////////////
		// Perform the save operation, get a promise of the result
		let promise;
		if(this.id === 0){
			//then this instance has never been saved before, insert new record
			promise = dbh
				.query(ModelClass._queries.insert, params)
				.then((res) => {
					this.id = res.lastInsertId;
					return this;
				});
		} else {
			//updaing existing entry requires a WHERE id = ? as well
			params.push(this.id);
			promise = dbh.query(ModelClass._queries.update, params);
		}

		promise = promise.then((res) => {
			this._dirty = false;
			return this;
		});

		return promise;
	};

	///////////////////////////////
	// Delete query
	ModelClass._queries.delete = "DELETE FROM " + ModelClass.getTableName() +
		" WHERE " + ModelClass.getIdFieldName() + "=?;";

	//console.info("  Made delete statement: " + ModelClass._queries.delete);

	ModelClass.delete = function(dbh, id){
		return dbh.query(ModelClass._queries.delete, [id]);
	};

	ModelClass._instance_prototype.delete = function(dbh){
		// If not yet saved in database, do nothing
		if(this.id === 0){ return Q(); }

		return dbh
			.query(ModelClass._queries.delete, this.id)
			.then((instance) => {
				instance.id = 0;
				return instance;
			});
	};
}

//////////////////////////////////////////////////////////////////////////////
/// \brief Creates a new Model
/// \param table_name   The name of the database table this model wraps
/// \param model_fields List of strings representing the fields of the model
/// \param options JSON object representing additional options for the model
///        - id_field -> Name of the id field, defaults to 'id'
//////////////////////////////////////////////////////////////////////////////
function defineModel(table_name, model_fields, options){
	//console.info("Creating Model for table: '" + table_name + "'");

	/////////////////////////////////////////////////
	// Check and preprocess parameters to this function
	if(model_fields == null || model_fields.length === 0){
		throw "No model_fields specified for table: '" + table_name + "'";
	}

	for(let i = 0; i < model_fields.length; ++i){
		for(let j = i+1; j < model_fields.length; ++j){
			if(model_fields[i] === model_fields[j]){
				throw "Duplicate field name '" + model_fields[i] +
					"' in model for table: " + table_name;
			}
		}
	}

	let id_field_name = "id";
	if(options && options.id_field){ id_field_name = options.id_field; }

	/////////////////////////////////////////////////
	// Define proxy used to access instances and make fields looks like
	// standard object properties
	let instance_proxy = {
		get: function(target, name){
			return target._fields[name] !== undefined ?
				target._fields[name] : target[name];
		},

		set: function(target, name, value){
			if(target._fields[name] !== undefined){
				target._fields[name] = value;
				target.markAsDirty();
				return true;
			} else {
				target[name] = value;
				return true;
			}
		}
	};

	/////////////////////////////////////////////////
	// Define basic properties of the Model
	let Model = {
		_queries       : {}, // cache of sql statements

		getTableName   : () => { return table_name;    },
		getFieldNames  : () => { return model_fields;  },
		getIdFieldName : () => { return id_field_name; },

		create : function(field_values){
			let model = Object.create(Model._instance_prototype);

			// Define fields of the model
			model._fields = {};
			model._dirty  = true;

			// Ensure all fields have placeholder value
			model._fields.id = 0; // 0 indicates not saved in db
			for(let f of model_fields){
				model._fields[f] = null;
			}

			// Initialize values of the fields
			if(field_values !== undefined){
				for(let f in field_values){
					if(model._fields[f] === undefined){
						throw "Attempted to specify value for non-existent field: " + f;
					}
					model._fields[f] = field_values[f];
				}
			}

			return new Proxy(model, instance_proxy);
		},

		/////////////////////////////////////////////////////////////////////
		/// \brief Creates an instance of this model from a row loaded from the
		/// database are returned by db-connection-promise.query
		/////////////////////////////////////////////////////////////////////
		createFromRow : function(row){
			let model = Model.create();

			if(row[Model.getIdFieldName()] === undefined){
				throw new Error("Cannot construct instance of " + Model.getTableName() +
				                " since row is missing id field '" + Model.getIdFieldName() + "'");
			}
			model._fields.id = row[Model.getIdFieldName()];

			for(let f of Model.getFieldNames()){
				if(row[f] === undefined){
					throw new Error("Cannot construct instance of " + Model.getTableName() +
					                " since row is missing data field: " + f);
				}
				model._fields[f] = row[f];
			}
			model._dirty = false;
			return model;
		},

		/////////////////////////////////////////////////////////////////////
		/// \brief Creates an instance of the model from a list of rows
		/// as returned by database .query
		/// \return Promise which will evaluate to an array of instances of this Model
		/////////////////////////////////////////////////////////////////////
		createFromRows : function(rows) {
			if(rows.rowCount != null && rows.rows != null && rows.fields != null){
				// This this is the result directly from the database
				rows = rows.rows;
			}

			let result = [];
			for(let i = 0; i < rows.length; ++i) {
				result[i] = this.createFromRow(dbh, rows[i]);
			}
			return result;
		},

		_instance_prototype : {
			isDirty     : function() { return this._dirty; },
			markAsDirty : function() { this._dirty = true; },

			getModel    : function() { return Model;       },
		}
	};

	_attachQueryFunctions(Model);

	return Model;
}

module.exports = {
	defineModel           : defineModel,
};
