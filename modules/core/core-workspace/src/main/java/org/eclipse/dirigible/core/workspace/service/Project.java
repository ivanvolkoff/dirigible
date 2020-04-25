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
package org.eclipse.dirigible.core.workspace.service;

import org.eclipse.dirigible.core.workspace.api.IProject;
import org.eclipse.dirigible.repository.api.ICollection;

/**
 * The Workspace's Project.
 */
public class Project extends Folder implements IProject {

	/**
	 * Instantiates a new project.
	 *
	 * @param projectCollection
	 *            the project collection
	 */
	public Project(ICollection projectCollection) {
		super(projectCollection);
	}

}
