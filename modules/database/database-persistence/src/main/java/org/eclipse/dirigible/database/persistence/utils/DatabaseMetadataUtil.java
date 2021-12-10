/*
 * Copyright (c) 2021 SAP SE or an SAP affiliate company and Eclipse Dirigible contributors
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Eclipse Dirigible contributors
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.dirigible.database.persistence.utils;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.eclipse.dirigible.commons.config.Configuration;
import org.eclipse.dirigible.commons.config.StaticObjects;
import org.eclipse.dirigible.database.persistence.model.PersistenceTableColumnModel;
import org.eclipse.dirigible.database.persistence.model.PersistenceTableModel;
import org.eclipse.dirigible.database.persistence.model.PersistenceTableRelationModel;
import org.eclipse.dirigible.database.sql.ISqlKeywords;

import com.google.common.base.CaseFormat;


public class DatabaseMetadataUtil {

	public static final String DIRIGIBLE_DATABASE_NAMES_CASE_SENSITIVE = "DIRIGIBLE_DATABASE_NAMES_CASE_SENSITIVE";

    private static final boolean IS_CASE_SENSETIVE = Boolean.parseBoolean(Configuration.get(DIRIGIBLE_DATABASE_NAMES_CASE_SENSITIVE));

    private DataSource dataSource = (DataSource) StaticObjects.get(StaticObjects.DATASOURCE);

    public static final String JDBC_COLUMN_PROPERTY = "COLUMN_NAME";
    public static final String JDBC_COLUMN_TYPE = "TYPE_NAME";
    public static final String JDBC_FK_TABLE_NAME_PROPERTY = "FKTABLE_NAME";
    public static final String JDBC_FK_NAME_PROPERTY = "FK_NAME";
    public static final String JDBC_PK_NAME_PROPERTY = "PK_NAME";
    public static final String JDBC_PK_TABLE_NAME_PROPERTY = "PKTABLE_NAME";
    public static final String JDBC_FK_COLUMN_NAME_PROPERTY = "FKCOLUMN_NAME";
    public static final String JDBC_PK_COLUMN_NAME_PROPERTY = "PKCOLUMN_NAME";
    public static final Map<String, String> sqlToOdataEdmColumnTypes = new HashMap<>();

    public PersistenceTableModel getTableMetadata(String tableName) throws SQLException {
        return getTableMetadata(tableName, null);
    }

    public PersistenceTableModel getTableMetadata(String tableName, String schemaName) throws SQLException {
        PersistenceTableModel tableMetadata = new PersistenceTableModel(tableName, new ArrayList<>(), new ArrayList<>());
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData databaseMetadata = connection.getMetaData();
            addFields(databaseMetadata, connection, tableMetadata, schemaName);
            addPrimaryKeys(databaseMetadata, connection, tableMetadata, schemaName);
            addForeignKeys(databaseMetadata, connection, tableMetadata, schemaName);
            addTableType(databaseMetadata, connection, tableMetadata, schemaName);
            tableMetadata.setSchemaName(schemaName);
        } catch (SQLException e) {
            throw e;
        }

        return tableMetadata;
    }

    public static void addForeignKeys(DatabaseMetaData databaseMetadata, Connection connection, PersistenceTableModel tableMetadata, String schema) throws SQLException {
        ResultSet foreignKeys = databaseMetadata.getImportedKeys(connection.getCatalog(), schema, normalizeTableName(tableMetadata.getTableName()));
        if (!foreignKeys.isBeforeFirst() && !IS_CASE_SENSETIVE) {
            // Fallback for PostgreSQL
            foreignKeys = databaseMetadata.getImportedKeys(connection.getCatalog(), schema, normalizeTableName(tableMetadata.getTableName().toLowerCase()));
        }
        while (foreignKeys.next()) {
            PersistenceTableRelationModel relationMetadata = new PersistenceTableRelationModel(foreignKeys.getString(JDBC_FK_TABLE_NAME_PROPERTY),
                    foreignKeys.getString(JDBC_PK_TABLE_NAME_PROPERTY),
                    foreignKeys.getString(JDBC_FK_COLUMN_NAME_PROPERTY),
                    foreignKeys.getString(JDBC_PK_COLUMN_NAME_PROPERTY),
                    foreignKeys.getString(JDBC_FK_NAME_PROPERTY),
                    foreignKeys.getString(JDBC_PK_NAME_PROPERTY)
            );
            tableMetadata.getRelations().add(relationMetadata);
        }
    }

    public static void addPrimaryKeys(DatabaseMetaData databaseMetadata, Connection connection, PersistenceTableModel tableMetadata, String schema) throws SQLException {
        ResultSet primaryKeys = databaseMetadata.getPrimaryKeys(connection.getCatalog(), schema, normalizeTableName(tableMetadata.getTableName()));
        if (!primaryKeys.isBeforeFirst() && !IS_CASE_SENSETIVE) {
            // Fallback for PostgreSQL
            primaryKeys = databaseMetadata.getPrimaryKeys(connection.getCatalog(), schema, normalizeTableName(tableMetadata.getTableName().toLowerCase()));
        }
        while (primaryKeys.next()) {
            setColumnPrimaryKey(primaryKeys.getString(JDBC_COLUMN_PROPERTY), tableMetadata);
        }
    }

    public static void setColumnPrimaryKey(String columnName, PersistenceTableModel tableModel) {
        tableModel.getColumns().forEach(column -> {
            if (column.getName().equals(columnName)) {
                column.setPrimaryKey(true);
            }
        });
    }

    public static void addFields(DatabaseMetaData databaseMetadata, Connection connection, PersistenceTableModel tableMetadata, String schemaPattern) throws SQLException {
        ResultSet columns = databaseMetadata.getColumns(connection.getCatalog(), schemaPattern, normalizeTableName(tableMetadata.getTableName()), null);
        if (!columns.isBeforeFirst() && !IS_CASE_SENSETIVE) {
            // Fallback for PostgreSQL
            columns = databaseMetadata.getColumns(connection.getCatalog(), schemaPattern, normalizeTableName(tableMetadata.getTableName().toLowerCase()), null);
        }
        while (columns.next()) {
            tableMetadata.getColumns().add(
                    new PersistenceTableColumnModel(
                            columns.getString(JDBC_COLUMN_PROPERTY),
                            columns.getString(JDBC_COLUMN_TYPE),
                            false));
        }
    }

    public static String addCorrectFormatting(String columnName) {
        return CaseFormat.UPPER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL, columnName);
    }

    public static String normalizeTableName(String table) {
        if (table != null && table.startsWith("\"") && table.endsWith("\"")) {
            table = table.substring(1, table.length() - 1);
        }
        return table;
    }

    public static void addTableType(DatabaseMetaData databaseMetadata, Connection connection, PersistenceTableModel tableMetadata, String schemaPattern) throws SQLException {
        ResultSet tables = databaseMetadata.getTables(connection.getCatalog(), schemaPattern, normalizeTableName(tableMetadata.getTableName()), null);
        if (!tables.isBeforeFirst() && !IS_CASE_SENSETIVE) {
            // Fallback for PostgreSQL
            tables = databaseMetadata.getTables(connection.getCatalog(), schemaPattern, normalizeTableName(tableMetadata.getTableName().toLowerCase()), null);
        }
        while (tables.next()) {
            tableMetadata.setTableType(tables.getString("TABLE_TYPE"));
        }
    }
    
    public static String getTableSchema(DataSource dataSource, String tableName) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData databaseMetaData = connection.getMetaData();
            ResultSet rs = databaseMetaData.getTables(connection.getCatalog(), null, tableName, new String[]{ISqlKeywords.KEYWORD_TABLE});
            if (rs.next()) {
                return rs.getString("TABLE_SCHEM");
            }
            return null;
        }
    }

}
