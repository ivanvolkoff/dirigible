/**
 * Copyright (c) 2010-2020 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *   SAP - initial API and implementation
 */
package org.eclipse.dirigible.core.generation.api;

import java.io.IOException;
import java.util.Map;

public interface IGenerationEngine {
	
	public static final String ACTION_COPY = "copy";
	
	public static final String ACTION_GENERATE = "generate";
	
	public static final String GENERATION_ENGINE_DEFAULT = "mustache";
	
	public String getName();
	
	public byte[] generate(Map<String, Object> parameters, String location, byte[] input) throws IOException;
	
	public byte[] generate(Map<String, Object> parameters, String location, byte[] input, String sm, String em) throws IOException;

}
