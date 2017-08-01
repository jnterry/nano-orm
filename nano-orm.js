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
	console.info("  Made load stmt: " + stmt_load);
	ModelClass._queries.load = stmt_load;

	ModelClass.load = function(db, id){
		return db.query(ModelClass._queries.load, [id])
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
	console.info("  Made find stmt: " + stmt_find);
	ModelClass._queries.find_prefix = stmt_find;

	ModelClass.find = function(db, where_clause, params){
		//:TODO: escape the where clause?
		var query = ModelClass._queries.find_prefix + where_clause;
		return db.query(query, params)
			.then((res) => {
				var ops = [];
				for(let i = 0; i < res.rows.length; ++i){
					// :TODO:COMP: createFromRows function?
					ops.push(ModelClass.createFromRow(db, res.rows[i]));
				}
				return Q.all(ops);
			});
	}

	///////////////////////////////
	// Update query
	// :TODO: have option for an auto-update modified_at field
	var stmt_update = "UPDATE " + ModelClass.getTableName() + " SET ";
	for(let f of ModelClass.getFieldNames()){
		stmt_update += f + "=?,";
	}
	stmt_update = stmt_update.slice(0, -1);
	stmt_update += " WHERE " + ModelClass.getIdFieldName() + "=?;";
	console.info("  Made update stmt: " + stmt_update);
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
	console.info("  Made insert stmt: " + stmt_insert);
	ModelClass._queries.insert = stmt_insert;

	ModelClass._instance_prototype.save = function(db){
		// Do nothing if the instance is not _dirty
		if(!this._dirty){ return Q(this); }

		// Generate parameters for the save operation
		let params = ModelClass.getFieldNames().map((f) => {
			return this._fields[f];
		});

		////////////////////////////////////////////
		// Perform the save operation, get a promise of the result
		let promise;
		if(this.getId() === 0){
			//then this instance has never been saved before, insert new record
			promise = db.query(ModelClass._queries.insert, params)
				.then((res) => {
					this.setId(res.lastInsertId);
					return this;
				});
		} else {
			//updaing existing entry requires a WHERE id = ? as well
			params.push(this.getId());
			promise = db.query(ModelClass._queries.update, params);
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
	ModelClass._instance_prototype.delete = function(db){
		// If not yet saved in database, do nothing
		if(this.getId() === 0){ return Q(); }
		return db.query(ModelClass._queries.delete, this.getId());
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
	console.info("Creating Model for table: '" + table_name + "'");

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

		create : (field_values) => {
			let model = Object.create(Model._instance_prototype);

			// Define fields of the model
			model._fields = {};
			model._dirty  = true;

			// Ensure all fields have placeholder value
			model._fields[id_field_name] = 0; // 0 indicates not saved in db
			for(let f of model_fields){
				model._fields[f] = null;
			}

			// Initialize values of the fields
			if(field_values != undefined){
				for(let f in field_values){
					if(model._fields[f] === undefined){
						throw "Attempted to specify value for non-existent field: " + f;
					}
					model._fields[f] = field_values[f];
				}
			}

			return new Proxy(model, instance_proxy);
		},

		createFromRow : (row) => {
			let model = Model.create();

			model._fields[Model.getIdFieldName()] = row[Model.getIdFieldName()];

			for(let f of Model.getFieldNames()){
				model._fields[f] = row[f];
			}

			model._dirty = false;
			return model;
		},

		_instance_prototype : {
			isDirty     : function()  { return this._dirty;                 },
			markAsDirty : function()  { this._dirty = true;                 },

			getModel    : function()  { return Model;                       },

			getId       : function()  { return this._fields[id_field_name]; },
			setId       : function(id){ this._fields[id_field_name] = id;   },
		}
	};

	_attachQueryFunctions(Model);

	return Model;
}

module.exports = {
	defineModel           : defineModel,
};