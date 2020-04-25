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
package org.eclipse.dirigible.cms.db.api;

import org.eclipse.dirigible.cms.db.CmsDatabaseRepository;

public class CmisRepositoryFactory {

	public static CmisRepository createCmisRepository(CmsDatabaseRepository repository) {
		return new CmisDatabaseRepository(repository);
	}

}
