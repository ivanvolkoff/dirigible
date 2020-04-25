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
package org.eclipse.dirigible.commons.api.module;

import com.google.inject.AbstractModule;

/**
 * The AbstractDirigibleModule is the parent of the Dirigible's Guice Modules.
 */
public abstract class AbstractDirigibleModule extends AbstractModule {

	/**
	 * Gets the name.
	 *
	 * @return the name
	 */
	public abstract String getName();

}
