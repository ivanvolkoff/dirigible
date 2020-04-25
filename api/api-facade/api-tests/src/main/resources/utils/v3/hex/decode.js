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
var hex = require('utils/v3/hex');

var input = '414243';
var result = hex.decode(input);

console.log('decoded: ' + result);

(result[0] === 65 &&
result[1] === 66 &&
result[2] === 67)
