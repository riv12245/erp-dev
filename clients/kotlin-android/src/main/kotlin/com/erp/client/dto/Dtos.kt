package com.erp.client.dto

import kotlinx.serialization.Serializable

@Serializable
data class AuthRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
)

@Serializable
data class LoginData(val accessToken: String, val user: UserRef)

@Serializable
data class UserRef(val userId: String, val email: String)

@Serializable
data class RegisteredUser(val userId: String, val email: String)

@Serializable
data class MeData(val requesterId: String?, val tenantId: String?)

@Serializable
data class Country(
    val id: String,
    val code: String,
    val name: String,
    val isActive: Boolean = true,
) {
    @Serializable
    data class Upsert(val code: String, val name: String, val isActive: Boolean = true)
}

@Serializable
data class TenantContextData(
    val tenantId: String?,
    val companyId: String?,
    val branchId: String?,
    val locale: String?,
    val timezone: String?,
)

@Serializable
data class TenantProfile(
    val tenantId: String,
    val name: String,
    val slug: String,
    val plan: String,
    val isolationMode: String,
)

@Serializable
data class AuditEntry(
    val id: String,
    val tenantId: String,
    val entityType: String,
    val entityId: String? = null,
    val actorId: String? = null,
    val action: String,
    val occurredAt: String,
)

@Serializable
data class StatusData(
    val status: String,
    val service: String,
    val version: String,
    val time: String,
)