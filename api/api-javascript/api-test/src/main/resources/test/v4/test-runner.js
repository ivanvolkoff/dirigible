/*
 * Copyright (c) 2010-2019 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   SAP - initial API and implementation
 */
var response = require("http/response");
var request = require("http/request");
var URI = require("test/lib/URI");

var findInAcceptHeader = function(httpReqHeaderAccept, mime){
	return httpReqHeaderAccept.filter(function(entry){
		return entry.split(';')[0].trim() === mime;
	})[0] !== undefined;
};

var endResponse = function(){
	response.flush();
	response.close();
};	

exports.run = function(settings) {

	if(!settings.execute || (typeof settings.execute !== 'function')){
		throw Error('[Test runner]  Invallid configuration: missing execute function');
	}
	
	if(settings.serviceReporter) {

		var httpReqHeaderAccept = request.getHeader("Accept").replace(/\\/g,'').split(',');		
		response.setContentType("application/json; charset=UTF-8");
		response.setCharacterEncoding("UTF-8");
		
		if(findInAcceptHeader(httpReqHeaderAccept, 'text/html')){
			console.info('[Test Runner] Handling request for HTML test run results');
			
			var requestUrl = URI(request.getRequestURL()).normalizePath().path();
			console.info('[Test Runner] redirecting to /services/v3/web/test/v3/ui/tests_dashboard.html with URL query string rewrite to url='+requestUrl);
			response.addHeader('Location', '/services/v3/web/test/v3/ui/tests_dashboard.html?url='+requestUrl);
			response.setStatus(response.FOUND);
			
		} else if (findInAcceptHeader(httpReqHeaderAccept, 'application/xml') || findInAcceptHeader(httpReqHeaderAccept, 'text/xml') || findInAcceptHeader(httpReqHeaderAccept, '*/xml')){
			console.info('[Test Runner] Handling request for JSON test run results');

			settings.serviceReporter.forMedia("xml");	
			settings.execute();
			
		} else if (findInAcceptHeader(httpReqHeaderAccept, 'application/json') || findInAcceptHeader(httpReqHeaderAccept, 'text/json') || findInAcceptHeader(httpReqHeaderAccept, '*/json') || findInAcceptHeader(httpReqHeaderAccept, '*/*')){
			console.info('[Test Runner] Handling request for JSON test run results');

			settings.serviceReporter.forMedia("json");	
			settings.execute();
		} else {
			// send BadRequest
		}

		endResponse();
	} else {
		settings.execute();
	}
};
