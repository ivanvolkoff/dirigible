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
var java = require('core/v3/java');

exports.list = function() {
	var tasks = java.call('org.eclipse.dirigible.api.v3.bpm.BpmFacade', 'getTasks', []);
	return JSON.parse(processId);
};

exports.getTaskVariables = function(taskId) {
	var variables = java.call('org.eclipse.dirigible.api.v3.bpm.BpmFacade', 'getTaskVariables', [taskId]);
	return JSON.parse(variables);
};

exports.setTaskVariables = function(taskId, variables) {
	java.call('org.eclipse.dirigible.api.v3.bpm.BpmFacade', 'setTaskVariables', [taskId, JSON.stringify(variables)]);
};

exports.completeTask = function(taskId, variables) {
	java.call('org.eclipse.dirigible.api.v3.bpm.BpmFacade', 'completeTask', [taskId, JSON.stringify(variables)]);
};

