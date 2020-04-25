/*
 * Copyright (c) 2010-2020 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *   SAP - initial API and implementation
 */
"use strict";

var database = require("db/v4/database");
var globals = require("core/v4/globals");

var DAO = exports.DAO = function(orm, logCtxName, dataSourceName, databaseType){
	if(orm === undefined)
		throw Error('Illegal argument: orm['+ orm + ']');

	this.orm = require("db/v4/orm").get(orm);
	
	var sequences = require("db/v4/sequence");
	this.sequenceName = this.orm.table+'_'+this.orm.getPrimaryKey().name.toUpperCase();
	this.dropIdGenerator = function(){
		return sequences.drop(this.sequenceName, databaseType, dataSourceName);
	};	
	this.generateId = function(){
		return sequences.nextval(this.sequenceName, databaseType, dataSourceName);
	};	
	
	var conn = database.getConnection(databaseType, dataSourceName);
	try{
		this.ormstatements = require('db/v4/ormstatements').create(this.orm, conn);
	} finally {
		conn.close();
	}

	//setup loggerName
	var loggerName = logCtxName;
	if(!loggerName){
		loggerName = 'db.dao';
		if(this.orm.table)
			loggerName = 'db.dao.'+(this.orm.table.toLowerCase());
	}
	this.$log = require('log/v4/logging').getLogger(loggerName);

	var execQuery = require('db/v4/query');
	var execUpdate = require('db/v4/update');
	
	this.execute = function(sqlBuilder, parameterBindings){
		var sql = sqlBuilder.build();
		if(sql === undefined || sql.length<1)
			throw Error("Illegal argument: sql from statement builder is invalid["+sql+"]");
		this.$log.info('Executing SQL Statement: {}', sql);
	 	
	 	var parameters = sqlBuilder.parameters && sqlBuilder.parameters();
	 	var _parameterBindings;
	 	if(parameters && parameters.length>0){
	 		_parameterBindings = [];
		 	for(var i = 0; i< parameters.length; i++){
		 		var val;
		 		if(parameterBindings){
		 			if(Array.isArray(parameterBindings)){
		 				val = parameterBindings[i];
		 			} else {
		 				val = parameterBindings[parameters[i].name];
		 			}
		 		}
	      		if((val=== null || val===undefined) && sql.toLowerCase().startsWith('select')){
		 			continue;
	 			}
		 		var index = i+1;
		 		this.$log.info('Binding to parameter[{}]: {}', index, val);
		 		_parameterBindings.push({
		 			"type": parameters[i].type,
		 			"value": parseValue(parameters[i].type, val)
		 		});
		 	} 
	 	}
	 	
	 	var result;

	 	if(sql.toLowerCase().startsWith('select')){
	 		result = execQuery.execute(sql, _parameterBindings, databaseType, dataSourceName);
	 	} else {
	 		result = execUpdate.execute(sql, _parameterBindings, databaseType, dataSourceName);
	 	} 		
	 	
	 	return result !== null ? result : [];
	};

	function parseValue(type, value) {
		switch (type.toUpperCase()) {
			case 'INTEGER':
				return parseInt(value);
			case 'DOUBLE':
			case 'FLOAT':
				return parseFloat(value);
			case 'BOOLEAN':
				return value ? 'true' : 'false';
			default:
				return value;
		}
	}
};

DAO.prototype.notify = function(event){
	var func = this[event];
	if(!this[event])
		return;
	if(typeof func !== 'function')
		throw Error('Illegal argument. Not a function: ' + func);
	var args = [].slice.call(arguments);
	func.apply(this, args.slice(1));
};

//Prepare a JSON object for insert into DB
DAO.prototype.createSQLEntity = function(entity) {
	var persistentItem = {};
	var mandatories = this.orm.getMandatoryProperties();
	for(var i=0; i<mandatories.length; i++){
		if(mandatories[i].dbValue){
			persistentItem[mandatories[i].name] = mandatories[i].dbValue.apply(this, [entity[mandatories[i].name], entity]);
		} else {
			persistentItem[mandatories[i].name] = entity[mandatories[i].name];
		}
	}
	var optionals = this.orm.getOptionalProperties();
	for(var i=0; i<optionals.length; i++){
		if(optionals[i].dbValue !== undefined){
			persistentItem[optionals[i].name] = optionals[i].dbValue.apply(this, [entity[optionals[i].name], entity]);
		} else {
			persistentItem[optionals[i].name] = entity[optionals[i].name] === undefined ? null : entity[optionals[i].name];
		} 
	}
	var msgIdSegment = persistentItem[this.orm.getPrimaryKey().name]?"["+persistentItem[this.orm.getPrimaryKey().name]+"]":"";
	this.$log.info("Transformation to {} DB JSON object finished", (this.orm.table + msgIdSegment));
	return persistentItem;
};

//create entity as JSON object from ResultSet current Row
DAO.prototype.createEntity = function(resultSetEntry, entityPropertyNames) {
    var entity = {};
    var properties = this.orm.properties;
    if(entityPropertyNames && entityPropertyNames.length>0){
    	properties = properties.filter(function(prop){
    		return entityPropertyNames.indexOf(prop.name)>-1;
    	});
    }
    for(var i=0; i<properties.length; i++){
    	var prop = properties[i];
    	entity[prop.name] = resultSetEntry[prop.column];
    	if(prop.value){
    		entity[prop.name] = prop.value(entity[prop.name]);
    	}
    }
    Object.keys(entity).forEach(function(propertyName){
      if(entity[propertyName] === null)
        entity[propertyName] = undefined;
    });

	var entitySegment = "";
	if(entity[this.orm.getPrimaryKey().name]){
		entitySegment= "["+entity[this.orm.getPrimaryKey().name]+"]";
	}
    this.$log.info("Transformation from {} DB JSON object finished", (this.orm.table+entitySegment));
    return entity;
};

DAO.prototype.validateEntity = function(entity, skip){
	if(entity === undefined || entity === null){
		throw new Error('Illegal argument: entity is ' + entity);
	}
	if(skip){
		if(skip.constructor !== Array){
			skip = [skip];
		}
		for(var j=0; j<skip.length; j++){
			skip[j];
		}
	}
	var mandatories = this.orm.getMandatoryProperties();
	for(var i = 0; i< mandatories.length; i++){
		var propName = mandatories[i].name;
		if((skip && skip.indexOf(propName)>-1) || mandatories[i].type.toUpperCase() === 'BOOLEAN')
			continue;
		var propValue = entity[propName];
		if(propValue === undefined || propValue === null){
			throw new Error('Illegal ' + propName + ' attribute value in '+this.orm.table+' entity: ' + propValue);
		}
	}
};

DAO.prototype.insert = function(_entity){

	var entities = _entity;
	if(_entity.constructor !== Array){
		entities = [_entity];
	}

	this.$log.info('Inserting {} {}', this.orm.table, (entities.length===1?'entity':'entities'));
	
	for(var i=0; i<entities.length; i++) {
	
		var entity = entities[i];

		this.validateEntity(entity, [this.orm.getPrimaryKey().name]);
	
		//check for unique constraint violations
		var uniques = this.orm.getUniqueProperties();
		for(var _i = 0; _i< uniques.length; _i++){
			var prop = uniques[_i];
			var st = this.ormstatements.dialect
						.select(prop.column)
						.from(this.orm.table)
						.where(prop.column+'=?', [prop]);
			var params = {};
			params[prop.name] = entity[prop.name];
			var rs = this.execute(st, params);
			if(rs.length>0)
				throw Error('Unique constraint violation for ' + prop.name + '['+entity[prop.name]+']');
		}
	
	    var dbEntity = this.createSQLEntity(entity);
	
	    var ids = [];
	    try {
	        var parametericStatement = this.ormstatements.insert.apply(this.ormstatements);

	        var id = this.generateId();
	        dbEntity[this.orm.getPrimaryKey().name] = id;

			var updatedRecordCount = this.execute(parametericStatement, dbEntity);

			this.notify('afterInsert', dbEntity);
			this.notify('beforeInsertAssociationSets', dbEntity);
			if(updatedRecordCount > 0 && this.orm.associations && Object.keys(this.orm.associations).length){
				//Insert dependencies if any are provided inline with this entity
				this.$log.info('Inserting association sets for {}[{}]', this.orm.table, dbEntity[this.orm.getPrimaryKey().name]);
				for(var idx in Object.keys(this.orm.associations)){
					var association = this.orm.associations[idx];
					var associationName = association['name'];
					if([this.orm.ASSOCIATION_TYPES['MANY-TO-MANY'], this.orm.ASSOCIATION_TYPES['MANY-TO-ONE']].indexOf(association.type)<0){
						if(entity[associationName] && entity[associationName].length>0){
							var associationDaoFactoryFunc = association.targetDao || this;
							if(associationDaoFactoryFunc.constructor !== Function)
								throw Error('Invalid ORM: Association ' + associationName + ' dao property is expected to be function. Instead, it is: ' + (typeof associationDaoFactoryFunc))
							var associationDAO = associationDaoFactoryFunc.apply(this);
							this.notify('beforeInsertAssociationSet', entity[associationName], entity);
							this.$log.info('Inserting {} inline entities into association set {}', entity[associationName].length, associationName);
							for(var j=0; j<entity[associationName].length; j++){
				        		var associatedEntity = entity[associationName][j];
				        		var associatedEntityJoinKey = association.joinKey;
				        		var key = association.key || this.orm.getPrimaryKey().name;
				        		associatedEntity[associatedEntityJoinKey] = entity[key];
				        		this.notify('beforeInsertAssociationSetEntity', entity[associationName], dbEntity);
				        		
								associationDAO.insert.apply(associationDAO, [associatedEntity]);
								
				    		}
				    		this.$log.info('Inserting {} inline entities into association set {} finsihed', entity[associationName].length, associationName);
				    		this.notify('afterInsertAssociationSet', entity[associationName], dbEntity);
						}				
					}
				}		
			}

			if(updatedRecordCount>0){
      			ids.push(dbEntity[this.orm.getPrimaryKey().name]);				
				this.$log.info('{}[] entity inserted', this.orm.table, dbEntity[this.orm.getPrimaryKey().name]);
			} else {
				this.$log.info('No changes incurred in {}', this.orm.table);
			}


	    } catch(e) {
	    	this.$log.error("Inserting {} {} failed", e, this.orm.table, (entities.length===1?'entity':'entities'));
	    	this.$log.info('Rolling back changes after failed {}[{}] insert. ', this.orm.table, dbEntity[this.orm.getPrimaryKey().name]);
			if(dbEntity[this.orm.getPrimaryKey().name]){
				try{
					this.remove(dbEntity[this.orm.getPrimaryKey().name]);
				} catch(err) {
					this.$log.error('Could not rollback changes after failed {}[{}}] insert. ', err, this.orm.table, dbEntity[this.orm.getPrimaryKey().name]);
				}
			}
			throw e;
	    }
    }
    
    if(_entity.constructor!== Array)
    	return ids[0];
	else
		return ids;
};

// update entity from a JSON object. Returns the id of the updated entity.
DAO.prototype.update = function(entity) {

	this.$log.info('Updating {}[{}] entity', this.orm.table, entity!==undefined?entity[this.orm.getPrimaryKey().name]:entity);

	if(entity === undefined || entity === null){
		throw new Error('Illegal argument: entity is ' + entity);
	}	
	
	var ignoredProperties = this.orm.getMandatoryProperties()
							.filter(function(property){
								return property.allowedOps && property.allowedOps.indexOf('update')<0;
							})
							.map(function(property){
								return property.name;
							});
	this.validateEntity(entity, ignoredProperties);
    
    var parametericStatement = this.ormstatements.update.apply(this.ormstatements, [entity]);

	var dbEntity = this.createSQLEntity(entity);

    try {
     	this.notify('beforeUpdateEntity', dbEntity);
    	var updatedRecordsCount = this.execute(parametericStatement, dbEntity);
    	if(updatedRecordsCount > 0)
        	this.$log.info('{}[{}] entity updated', this.orm.table, dbEntity[this.orm.getPrimaryKey().name]);
        else
            this.$log.info('No changes incurred in {}', this.orm.table);
        
        return this;
        
    } catch(e) {
    	this.$log.error('Updating {}[{}] failed', e, this.orm.table, entity!==undefined?entity[this.orm.getPrimaryKey().name]:entity);
		throw e;
    } 
};

// delete entity by id, or array of ids, or delete all (if not argument is provided).
DAO.prototype.remove = function() {

	var ids = [];
	if(arguments.length===0){
		ids = this.list({
			"$select": [this.orm.getPrimaryKey().name]
		}).map(function(ent){
			return ent[this.orm.getPrimaryKey().name];
		}.bind(this));
	} else {
		if(arguments[0].constructor !== Array){
			ids = [arguments[0]];
		} else {
			ids = arguments[0];
		}
	}

	this.$log.info('Deleting '+this.orm.table+((ids!==undefined && ids.length===1)?'['+ids[0]+'] entity': ids.length+' entities'));
	
	for(var i=0; i<ids.length; i++) {
	
		var id = ids[i];
       	//prevent implicit type convertion
       	if(this.orm.getPrimaryKey().type.toUpperCase() !== 'VARCHAR')
       		id = parseInt(id, 10);
       		
		if(ids.length>1)
			this.$log.info('Deleting {}[{}] entity', this.orm.table, id);
	
		if(id === undefined || id === null){
			throw new Error('Illegal argument for id parameter:' + id);
		}
	
	    try {
	    
	    	this.notify('beforeRemoveEntity', id);
	    	
			//first we attempt to remove depndents if any
			if(this.orm.associations){
				//Remove associated dependencies
				for(var idx in Object.keys(this.orm.associations)){
					var association = this.orm.associations[idx];
					var associationName = association['name'];
					if([this.orm.ASSOCIATION_TYPES['MANY-TO-MANY'], this.orm.ASSOCIATION_TYPES['MANY-TO-ONE']].indexOf(association.type)<0){
						this.$log.info("Inspecting {}[{}}] entity's dependency '{}' for entities to delete.", this.orm.table, id, associationName);
						var associationDAO = association.targetDao ? association.targetDao() : this;
						var settings = {};
						var joinId = id;
						//check if we are joining on field, other than pk
						if(association.key!==undefined){
							var ctxEntity = this.find(id);
							joinId = ctxEntity[association.key];
						}
						settings[association.joinKey] = joinId;
						var associatedEntities;
						//associatedEntities = this.expand(associationName, id);
						associatedEntities = associationDAO.list(settings);
						if(associatedEntities && associatedEntities.length > 0){
							this.$log.info("Deleting {}[{}] entity's {} dependent {}", this.orm.table, id, associatedEntities.length, associationName);
							this.notify('beforeRemoveAssociationSet', associatedEntities, id);
							for(var j=0; j<associatedEntities.length; j++){
								var associatedEntity = associatedEntities[j];
								this.notify('beforeRemoveAssociationSetEntity', associatedEntity, associatedEntities, id);
								
								associationDAO.remove.apply(associationDAO, [associatedEntity[associationDAO.orm.getPrimaryKey().name]]);
								
							}
							this.$log.info("{}[{}] entity's {} dependent {} {} deleted.", this.orm.table, id, associatedEntities.length, associationName, associatedEntities.length>1?'entities':'entity');
						}					
					}
				} 
	        }
	    	//Delete by primary key value
	    	var parametericStatement = this.ormstatements["delete"].apply(this.ormstatements, [this.orm.getPrimaryKey().name]);
			var params = {};
	       	params[this.orm.getPrimaryKey().name] = id;
	       	
			var updatedRecordsCount = this.execute(parametericStatement, params);
			
			if(updatedRecordsCount>0)
	   			this.$log.info('{}[{}] entity deleted', this.orm.table,  id);
	   		else
	   			this.$log.info('No changes incurred in {}', this.orm.table);

	    } catch(e) {
			this.$log.error('Deleting {}[{}] entity failed', e, this.orm.table, id);
			throw e;
	    }
	    
    }
    
};

DAO.prototype.expand = function(expansionPath, context){
	this.$log.info('Expanding for association path {} and context entity {}', expansionPath, (typeof arguments[1] !== 'object' ? 'id ': '') + JSON.stringify(arguments[1]));
	if(!expansionPath || !expansionPath.length){
		throw new Error('Illegal argument: expansionPath['+expansionPath+']');
	}
	if(!context){
		throw new Error('Illegal argument: context['+context+']');
	}
	var associationName = expansionPath.splice?expansionPath.splice(0,1)[0]:expansionPath;
	var association = this.orm.getAssociation(associationName);
	if(!associationName || !association)
		throw new Error('Illegal argument: Unknown association for this DAO [' + associationName + ']');
	var joinKey = association.joinKey;
		
	var contextEntity;
	if(context[this.orm.getPrimaryKey().name] !== undefined){
		contextEntity = context;
	} else {
		contextEntity = this.find(context);
	}

	if(!contextEntity){
		throw Error('No record found for context entity ['+context+']');
	}

	var associationTargetDAO = association.targetDao? association.targetDao.apply(this) : this;
	if(!associationTargetDAO)
		throw Error('No target association DAO instance available for association '+associationName);

	var expansion;
	var associationEntities= [];

	if(association.type===this.orm.ASSOCIATION_TYPES['ONE-TO-ONE'] || association.type===this.orm.ASSOCIATION_TYPES['MANY-TO-ONE']){
		var joinId = contextEntity[joinKey];
		this.$log.info('Expanding association type {} on {}[{}]', association.type, joinKey, joinId);
		if(!association.key || association.key === associationTargetDAO.orm.getPrimaryKey().name)
			expansion = associationTargetDAO.find.apply(associationTargetDAO, [joinId]);
		else {
			var listSettings = {};
			listSettings["$filter"] = association.key;
			listSettings[association.key] = joinId;
			expansion = associationTargetDAO.list.apply(associationTargetDAO, [listSettings])[0];
		}
		
		if(expansionPath.length>0){
			this.expand(expansionPath, expansion);
		}
	} else if(association.type===this.orm.ASSOCIATION_TYPES['ONE-TO-MANY']){
		var settings = {};
		if(association.defaults)
			settings = association.defaults;
		var key = association.key || this.orm.getPrimaryKey().name;
		var joinId = contextEntity[key];
		this.$log.info('Expanding association type {} on {}[{}]', association.type, joinKey, joinId);
		settings[joinKey] = joinId;
		associationEntities = associationEntities.concat(associationTargetDAO.list.apply(associationTargetDAO, [settings]));
		
		if(expansionPath.length>0){
			for(var i=0; i<associationEntities.length; i++){
				this.expand(expansionPath, associationEntities[i]);	
			}
		} else {
			expansion = associationEntities;
		}
	} else if(association.type===this.orm.ASSOCIATION_TYPES['MANY-TO-MANY']){
		var joinDAO = association.joinDao();
		if(!joinDAO)
			throw Error('No join DAO instance available for association ' + associationName);
		if(!joinDAO.listJoins)
			throw Error('No listJoins function in join DAO instance available for association '+associationName);
		var settings = {};
		var key = association.key || this.orm.getPrimaryKey().name;
		var joinId = contextEntity[key];
		settings[association.joinKey] = joinId;
		associationEntities = associationEntities.concat(joinDAO.listJoins.apply(joinDAO, [settings, {"sourceDao": this, "joinDao":joinDAO, "targetDao":associationTargetDAO}]));
		if(expansionPath.length>0){
			for(var i=0; i<associationEntities.length; i++){
				this.expand(expansionPath, associationEntities[i]);	
			}
		} else {
			expansion = associationEntities;
		}
	}
	return expansion;
};

/* 
	Reads a single entity by id, parsed into JSON object. 
	If requested as expanded the returned entity will comprise associated (dependent) entities too. Expand can be a string tha tis a valid association name defined in this dao orm or
	an array of such names.
*/
DAO.prototype.find = function(id, expand, select) {
	if(typeof arguments[0] === 'object'){
		id = arguments[0].id;
		expand = arguments[0].$expand || arguments[0].expand;
		select = arguments[0].$select || arguments[0].select;
	}

	this.$log.info('Finding {}[{}] entity with list parameters expand[{}], select[{}]', this.orm.table, id, expand, select);

	if(id === undefined || id === null){
		throw new Error('Illegal argument for id parameter:' + id);
	}

    try {
        var entity;
        if(select!==undefined){
			if(select.constructor !== Array){
				if(select.constructor === String){
					select= select.split(',').map(function(sel){
						if(sel.constructor !== String)
							throw Error('Illegal argument: select array components are expected ot be strings but found ' + (typeof sel));
						return sel.trim();
					});
				} else {
					throw Error('Illegal argument: select is expected to be string or array of strings but was ' + (typeof select));
				}
			}
		}
		//ensure that joinkeys for required expands are available and not filtered by select
		if(select!==undefined && expand!==undefined){
			select.push(this.orm.getPrimaryKey().name);
			//TODO: checks
			/*for(var i in expand){
				var association = this.orm.associations[expand[i]];
				if(association && select.indexOf(association.joinKey)<1){ 
					select.push(association.joinKey);
				}
			}*/
		}
		var findQbParams = {
			select: select
		};		
        var parametericStatement = this.ormstatements.find.apply(this.ormstatements, [findQbParams]);
       	var params = {};

       	//prevent implicit type convertion
       	if(this.orm.getPrimaryKey().type.toUpperCase() !== 'VARCHAR')
       		id = parseInt(id, 10);
       	
       	params[this.orm.getPrimaryKey().name] = id;
       	var resultSet = this.execute(parametericStatement, params);
 
        if (resultSet[0]) {
        	entity = this.createEntity(resultSet[0], select);
			if(entity){
            	this.$log.info('{}[{}] entity found', this.orm.table, id);
            	this.notify('afterFound', entity);
				if(expand!==undefined){
					if(expand.constructor !== Array){
						if(expand.constructor === String){
							expand = String(expand);
							expand =  expand.split(',').map(function(exp){
								if(exp.constructor !== String)
									throw Error('Illegal argument: expand array components are expected ot be strings but found ' + (typeof exp));
								return exp.trim();
							});
						} else {
							throw Error('Illegal argument: expand is expected to be string or array of strings but was ' + (typeof expand));
						}
					}
					var associationNames = this.orm.getAssociationNames();
					for(var idx in associationNames){
						var associationName = associationNames[idx];
						if(expand.indexOf(associationName)>-1){
							entity[associationName] = this.expand([associationName], entity);
						}
					}
				}		
        	} else {
	        	this.$log.info('{}[{}] entity not found', this.orm.table, id);
        	}
        } 
        return entity;
    } catch(e) {
        this.$log.error("Finding {}[{}] entitiy failed.", e, this.orm.table, id);
		throw e;
    }
};

DAO.prototype.count = function() {

	this.$log.info('Counting '+this.orm.table+' entities');

    var count = 0;
    try {
    	var parametericStatement = this.ormstatements.count.apply(this.ormstatements);
		var rs = this.execute(parametericStatement);
        if (rs.length>0) {
        	//expectaion is that there is a single object in the result set with a single porperty
        	var key  = Object.keys(rs[0])[0];
            count = parseInt(rs[0][key], 10);
        }
    } catch(e) {
    	this.$log.error('Counting {} entities failed', e, this.orm.table); 
		e.errContext = parametericStatement.toString();
		throw e;
    }
    
    this.$log.info('{} {} entities counted', String(count), this.orm.table);

    return count;
};

/*
 * list parameters:
 * - $expand
 * - $filter
 * - $select
 * - $sort
 * - $order 
 * - $limit
 * - $offset
 */
DAO.prototype.list = function(settings) {
	
	settings = settings || {};
	
	var expand = settings.$expand || settings.expand;
	if(expand!==undefined){
		if(expand.constructor !== Array){
			if(expand.constructor === String){
				if(expand.indexOf(',')>-1){
					settings.$expand =  expand.split(',').map(function(exp){
						if(exp.constructor !== String)
							throw Error('Illegal argument: expand array components are expected ot be strings but found ' + (typeof exp));
						return exp.trim();
					});	
				} else {
					settings.$expand = [expand];
				}
			} else {
				throw Error('Illegal argument: expand is expected to be string or array of strings but was ' + (typeof expand));
			}
		}
	}
	
	var select = settings.$select || settings.select; 
	if(select!==undefined){
		if(select.constructor !== Array){
			if(select.constructor === String){
				if(select.indexOf(',')>-1){
					settings.$select =  select.split(',').map(function(exp){
						if(exp.constructor !== String)
							throw Error('Illegal argument: select array components are expected ot be strings but found ' + (typeof exp));
						return exp.trim();
					});	
				} else {
					settings.$select = [select];
				}
			} else {
				throw Error('Illegal argument: select is expected to be string or array of strings but was ' + (typeof expand));
			}
		}
	}
	

	var listArgs = [];
	for(var key in settings){
		listArgs.push(' ' + key + '[' + settings[key] + ']');
	}
	
	this.$log.info('Listing {} entity collection with list operators: {}', this.orm.table, listArgs.join(','));
	
	if(settings.$select!==undefined && expand!==undefined){
		settings.$select.push(this.orm.getPrimaryKey().name);
	}

    //simplistic filtering of (only) string properties with like
	if(settings.$filter){
		if(settings.$filter.indexOf(',')>-1){
			settings.$filter = settings.$filter.split(',');			
		} else {
			settings.$filter = [settings.$filter];
		}
		settings.$filter = settings.$filter.filter(function(filterField){
			var prop = this.ormstatements.orm.getProperty(filterField);
			if(prop===undefined || prop.type.toUpperCase()!=='VARCHAR' || settings[prop.name]===undefined)
				return false;
			settings[prop.name] = '%' + settings[prop.name] + '%';
			return true;
		}.bind(this));
	}

	var parametericStatement = this.ormstatements.list.apply(this.ormstatements, [settings]);

	//cleanup filtering value expressions if any and convert to Number
	for(var key in settings){
		var s = settings[key];
		if(String(s).startsWith('>') || String(s).startsWith('<'))//TODO: improve
			settings[key] = s.substring(1,s.length).trim();
		var p = this.orm.getProperty(key)
		if(p && p.type!=='VARCHAR' && !isNaN(s)){
			settings[key] = +s;
		}
	}
  
  try {
    var entities = []; 
	
	var resultSet = this.execute(parametericStatement, settings);

    resultSet.forEach(function(rsEntry){
      var entity = this.createEntity(rsEntry, settings.$select);
      if(expand){
        var associationNames = this.orm.getAssociationNames();
		for(var idx = 0; idx < associationNames.length; idx++){
			var associationName = associationNames[idx];
			if(expand.indexOf(associationName)>-1){
				entity[associationName] = this.expand([associationName], entity);
			}
		}
      }
      this.notify('afterFound', entity, settings);
      entities.push(entity);
	}.bind(this));
	
    this.$log.info('{} {} entities found', entities.length, this.orm.table);
        
    return entities;
  } catch(e) {
  	this.$log.error("Listing {} entities failed.", e, this.orm.table);
	throw e;
  } 
};

DAO.prototype.existsTable = function() {
	this.$log.info('Check exists table ' + this.orm.table);
    try {
    	var parametericStatement = this.ormstatements.count.apply(this.ormstatements);
		var rs = this.execute(parametericStatement);
		return rs.length > 0;
    } catch(e) {
    	return false;
    }
};

DAO.prototype.createTable = function() {
	this.$log.info('Creating table {}', this.orm.table);
	var parametericStatement = this.ormstatements.createTable.apply(this.ormstatements);
    try {
    	this.execute(parametericStatement);
        this.$log.info('{} table created', this.orm.table);
        return this;
    } catch(e) {
    	this.$log.error("Create table {} failed", e, this.orm.table);
		throw e;
    } 
};

DAO.prototype.dropTable = function(dropIdSequence) {
	this.$log.info('Dropping table {}.', this.orm.table);
	var parametericStatement = this.ormstatements.dropTable.apply(this.ormstatements);
    try {
    	this.execute(parametericStatement);
        this.$log.info('Table {} dropped.', this.orm.table);
    } catch(e) {
    	this.$log.error("Dropping table {} failed.", e, this.orm.table);
		throw e;
    } 
    
    if(dropIdSequence){
	    this.$log.info('Dropping table {} sequence {}.', this.orm.table, this.sequenceName);
	   	try{
	   	   	this.dropIdGenerator();	
	    	this.$log.info('Table {} sequence {} dropped.', this.orm.table, this.sequenceName);   	   	
	   	} catch(e) {
	    	this.$log.error("Dropping table {} sequence {} failed.", e, this.orm.table, this.sequenceName);
			throw e;
	    }    	
    }

    return this;
};


//var toCamelCase = function(str){
//	return str.toLowerCase().replace(/(?:_| |\b)(\w)/g, function(str, p1, offset) {
//		return offset===0 ? p1 : p1.toUpperCase();
//	});
//};

//var fromTableDef = exports.ormFromTable = function(tableDef){
//	var orm = {};
//	orm["table"] = tableDef["name"];
//	if(tableDef["columns"]){
//		orm["properties"] = tableDef["columns"].map(function(columnDef, idx, arr){
//			var property = {
//				"name": toCamelCase(columnDef["name"]),
//				"column": columnDef["name"],
//				"type": columnDef["type"],
//				"size": columnDef["length"] !== undefined && columnDef["length"] !=="0"? parseInt(columnDef["length"], 10) : undefined,
//				"id": columnDef["primaryKey"]==='true',
//				"required": columnDef["nullable"] !== 'true'
//			};
//			if(tableDef.constraints && tableDef.constraints.uniqueIndices && tableDef.constraints.uniqueIndices.columns && tableDef.constraints.uniqueIndices.columns.indexOf(columnDef['name'])>-1){
//				property["unique"] = true;
//			}
//			return property;
//		});
//	}
//	return orm;
//};

/**
 * oDefinition can be table definition or standard orm definition object. Or it can be a valid path to
 * a .table file, or any other text file contianing a standard dao orm definition.
 */
exports.create = exports.dao = function(oDefinition, logCtxName, dataSourceName, databaseType){
	var orm;
//	if(typeof oDefinition === 'string'){
//		var files = require('io/v4/files');
//		if(files.isReadable(oDefinition)){
//			var defText = files.readText(oDefinition);
//			try{
//				oDefinition = JSON.parse(defText);
//			} catch (parseError){
//				var logger = require('log/logging').getLogger("db.dao");
//				logger.error("Invalid JSON in {}", parseError, oDefinition);
//				throw parseError;
//			}
//		} else {
//			throw Error('Cannot get dao definition from ' + oDefinition + '. Check path and read permissions.');
//		}
//	} 
//
//	if(oDefinition["name"] && oDefinition["type"] && ["TABLE","VIEW"].indexOf(oDefinition["type"])>-1){
//		orm = fromTableDef(oDefinition);
//	} else {
		orm = oDefinition;
		
		var productName = globals.get(databaseType + "_" + dataSourceName);
		if (!productName) {
			productName = database.getProductName(databaseType, dataSourceName);
			globals.set(databaseType + "_" + dataSourceName, productName);
		}
		
		if (productName === "PostgreSQL") {
			orm["properties"].map(function(property) {
				property.column = property.column.toLowerCase();
			});	
		}
//	}
	return new DAO(orm, logCtxName, dataSourceName, databaseType);
};

//TODO: ability to defien easily associations on daos created from .table definitions. 

//TODO: factory function for generating a set of related DAOs from an ER underlying model defined in .table models. 
