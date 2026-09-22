package com.erp.client

const val AUTHORIZATION = "Authorization"
const val TENANT_ID_HEADER = "x-tenant-id"

data class AuthTokens(
    val accessToken: String,
    val tenantId: String? = null,
)

interface TokenStore {
    fun load(): AuthTokens?
    fun save(tokens: AuthTokens)
    fun clear()
}