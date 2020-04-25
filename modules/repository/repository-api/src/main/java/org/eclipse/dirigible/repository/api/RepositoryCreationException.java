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
package org.eclipse.dirigible.repository.api;

/**
 * The Class RepositoryCreationException.
 */
public class RepositoryCreationException extends RepositoryException {

	private static final long serialVersionUID = -163847774919514248L;

	/**
	 * Instantiates a new repository creation exception.
	 */
	public RepositoryCreationException() {
		super();
	}

	/**
	 * Instantiates a new repository creation exception.
	 *
	 * @param message
	 *            the message
	 * @param cause
	 *            the cause
	 */
	public RepositoryCreationException(String message, Throwable cause) {
		super(message, cause);
	}

	/**
	 * Instantiates a new repository creation exception.
	 *
	 * @param message
	 *            the message
	 */
	public RepositoryCreationException(String message) {
		super(message);
	}

	/**
	 * Instantiates a new repository creation exception.
	 *
	 * @param cause
	 *            the cause
	 */
	public RepositoryCreationException(Throwable cause) {
		super(cause);
	}

}
