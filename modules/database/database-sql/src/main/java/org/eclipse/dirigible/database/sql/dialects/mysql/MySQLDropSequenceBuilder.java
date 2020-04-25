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
package org.eclipse.dirigible.database.sql.dialects.mysql;

import org.eclipse.dirigible.database.sql.ISqlDialect;
import org.eclipse.dirigible.database.sql.builders.sequence.DropSequenceBuilder;

/**
 * The MySQL Drop Sequence Builder.
 */
public class MySQLDropSequenceBuilder extends DropSequenceBuilder {

	/**
	 * Instantiates a new MySQL drop sequence builder.
	 *
	 * @param dialect
	 *            the dialect
	 * @param sequence
	 *            the sequence
	 */
	public MySQLDropSequenceBuilder(ISqlDialect dialect, String sequence) {
		super(dialect, sequence);
	}

	/*
	 * (non-Javadoc)
	 * @see org.eclipse.dirigible.database.sql.builders.sequence.DropSequenceBuilder#generate()
	 */
	@Override
	public String generate() {
		throw new IllegalStateException("MySQL does not support Sequences");
	}

}
