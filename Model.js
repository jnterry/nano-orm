//////////////////////////////////////////////////////////////////////////////
/// \file Model.js
/// \author Jamie Terry
/// \date 2017/7/27
/// \brief Defines base class for representing Model's which can be both
/// loaded from and persisted to some database
//////////////////////////////////////////////////////////////////////////////

"use strict";

let Q = require('q');

//////////////////////////////////////////////////////////////////////////////
/// \brief Creates a new Model
/// \param table_name   The name of the database table this model wraps
/// \param model_fields List of strings representing the fields of the model
/// \param options JSON object representing additional options for the model
///        - id_field -> Name of the id field, defaults to 'id'
//////////////////////////////////////////////////////////////////////////////

function createModel(table_name, model_fields, options){
	console.log("Creating Model for table: '" + table_name + "'");

	if(model_fields.length === 0){
		throw "No model_fields specified";
	}

	for(let i = 0; i < model_fields.length; ++i){
		for(let j = i+1; j < model_fields.length; ++j){
			if(model_fields[i] === model_fields[j]){
				throw "Duplicate field name '" + model_fields[i] + "'";
			}
		}
	}

	let id_field_name = "id";
	if(options && options.id_field){ id_field_name = options.id_field; }

	class ModelClass {
		constructor(field_values){
			this._fields = {};
			for(let f of model_fields){
				this._fields[f] = null;
			}
			this._fields[id_field_name] = 0; // 0 indicates no corrosponding entry in the db
			if(field_values != undefined){
				this.setFields(field_values);
			}
			this._dirty = true;
		}

		static getTableName()  { return this._table;       }
		static getFieldNames() { return this._field_names; }
		static getIdFieldName(){ return this._id_field;    }

		// :TODO:COMP: support multiple row? createFromRows function?
		static createFromRow(db, row){
			let model = new ModelClass();
			model.setId(row[id_field_name]);
			for(var i = 0; i < model_fields.length; ++i){
				var f = model_fields[i];
				model._fields[f] = row[f];
			}
			model._dirty = false;
			return model;
		}

		static load(db, id){
			return db.executeP(ModelClass._queries.load, [id])
				.then((res) => {
					if(res.length !== 1){
						throw ("Failed to load " + id + " from " + table
							   + " since result contained " + res.length + " entries");
					}
					return ModelClass.createFromRow(db, res[0]);
				});
		}

		static find(db, where_clause, params){
			//:TODO: escape the where clause?
			var query = ModelClass._queries.find_prefix + where_clause;
			return db.executeP(query, params)
				.then((res) => {
					var ops = [];
					for(let i = 0; i < res.length; ++i){
						// :TODO:COMP: createFromRows function?
						ops.push(ModelClass.createFromRow(db, res[i]));
					}
					return Q.all(ops);
				});
		}


		setFields(vals, db){
			return Q.Promise((resolve, reject) => {
				for(let key in vals){
					if(this._fields[key] === undefined){
						console.error("Attempted to set non-existing field: " + key + " in " + table);
						reject("Can't set field '" + key + "' since it does not appear in table: "
							   + table);
						return;
					}
					this._fields[key] = vals[key];
				}
				this._markAsDirty();

				if(db != undefined && db){
					resolve(this.save(db));
				} else {
					resolve(this);
				}
			});
		}


		save(db){
			if(!this._dirty){
				// Nothing to do, skip saving
				return Q(this);
			}

			////////////////////////////////////////////
			// Generate parameters for the save operation
			let self = this;
			let params = model_fields.map((x) => {
				return this._fields[x];
			});

			////////////////////////////////////////////
			// Perform the save operation, get a promise of the result
			let promise;
			if(this.getId() === 0){
				//then this instance has never been saved before, insert new record
				promise =  db.executeP(ModelClass._queries.insert, params)
					.then((res) => {
						self.setId(res.insertId);
						return self;
					});
			} else {
				//then we're updating an existing row
				if(fields.length == 0){
					//then this model has no data fields, dont do anything
					promise = Q.Promise((resolve) => { resolve(me); });
				} else {
					//updaing existing entry requires a WHERE id = ? as well
					params.push(me.getId());
					promise = db.executeP(me._queries.update, params);
				}
			}

			promise = promise.then((res) => {
				self._dirty = false;
				return self;
			});

			return promise;
		};

		getId(    ){ return this._fields[id_field_name]; }
		setId(id  ){ this._fields[id_field_name] = id;   }
		getField(f){ return this._fields[f];             }

		touch(){
			this._dirty = true;
			return this.save();
		}
	};

	ModelClass._id_field    = id_field_name;
	ModelClass._table       = table_name;
	ModelClass._field_names = ModelClass._field_names;
	ModelClass._queries     = {};

	///////////////////////////////
	// Update query
	// :TODO: have option for an auto-update modified_at field
	var stmt_update = "UPDATE " + table_name + " SET ";
	for(let f of model_fields){
		stmt_update += f + "=?,";
	}
	stmt_update = stmt_update.slice(0, -1);
	stmt_update += " WHERE " + id_field_name + "=?;";
	console.info("  Made update stmt: " + stmt_update);
	ModelClass._queries.update = stmt_update;

	///////////////////////////////
	// Insert query
	// :TODO: have option for an auto-update created_at field
	var stmt_insert = "INSERT INTO " + table_name + "(";
	for(let f of model_fields){ stmt_insert += f + ","; }
	stmt_insert = stmt_insert.slice(0,-1);
	stmt_insert += ") VALUES (";
	for(let f in model_fields){ stmt_insert += "?,"; }
	stmt_insert = stmt_insert.slice(0,-1);
	stmt_insert += ");";
	console.info("  Made insert stmt: " + stmt_insert);
	ModelClass._queries.insert = stmt_insert;

	///////////////////////////////
	// Load query
	// :TODO: don't bother loading the ID?
	var stmt_load = "SELECT " + id_field_name + ",";
	for(let f of model_fields){ stmt_load += f + ","; }
	stmt_load = stmt_load.slice(0,-1);
	stmt_load += " FROM " + table_name + " WHERE " + id_field_name + "=?;";
	console.info("  Made load stmt: " + stmt_load);
	ModelClass._queries.load = stmt_load;

	///////////////////////////////
	// Find query
	var stmt_find = "SELECT " + id_field_name + ",";
	for(let f of model_fields){ stmt_find += f + ","; }
	stmt_find = stmt_find.slice(0,-1);
	stmt_find += " FROM " + table_name + " WHERE ";
	console.info("  Made find stmt: " + stmt_find);
	ModelClass._queries.find_prefix = stmt_find;

	return ModelClass;
}

module.exports = {
	create : createModel,
};
