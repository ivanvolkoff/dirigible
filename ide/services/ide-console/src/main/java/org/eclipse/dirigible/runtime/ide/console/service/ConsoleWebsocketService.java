/**
 * Copyright (c) 2010-2019 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   SAP - initial API and implementation
 */
package org.eclipse.dirigible.runtime.ide.console.service;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.inject.Singleton;
import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.eclipse.dirigible.commons.api.helpers.GsonHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The Console Websocket Service.
 */
@Singleton
@ServerEndpoint("/websockets/v4/ide/console")
public class ConsoleWebsocketService {

	private static final Logger logger = LoggerFactory.getLogger(ConsoleWebsocketService.class);

	private static Map<String, Session> OPEN_SESSIONS = new ConcurrentHashMap<String, Session>();

	/**
	 * On open callback.
	 *
	 * @param session
	 *            the session
	 */
	@OnOpen
	public void onOpen(Session session) {
		OPEN_SESSIONS.put(session.getId(), session);
		logger.debug("[ws:console] onOpen: " + session.getId());
	}

	/**
	 * On message callback.
	 *
	 * @param message
	 *            the message
	 * @param session
	 *            the session
	 */
	@OnMessage
	public void onMessage(String message, Session session) {
		logger.trace("[ws:console] onMessage: " + message);
	}

	/**
	 * On error callback.
	 *
	 * @param session
	 *            the session
	 * @param throwable
	 *            the throwable
	 */
	@OnError
	public void onError(Session session, Throwable throwable) {
		logger.error(String.format("[ws:console] Session %s error %s", session.getId(), throwable.getMessage()));
		logger.error("[ws:console] " + throwable.getMessage(), throwable);
	}

	/**
	 * On close callback.
	 *
	 * @param session
	 *            the session
	 * @param closeReason
	 *            the close reason
	 */
	@OnClose
	public void onClose(Session session, CloseReason closeReason) {
		logger.debug(String.format("[ws:console] Session %s closed because of %s", session.getId(), closeReason));
		OPEN_SESSIONS.remove(session.getId());
	}

	/**
	 * Distribute message to all the listeners.
	 *
	 * @param record
	 *            the record
	 */
	public static void distribute(ConsoleLogRecord record) {
		for (Session session : OPEN_SESSIONS.values()) {
			synchronized (session) {
				try {
					if (session.isOpen()) {
						session.getBasicRemote().sendText(GsonHelper.GSON.toJson(record));
					}
				} catch (IOException e) {
					System.err.println(e.getMessage());
				}
			}
		}
	}

}
