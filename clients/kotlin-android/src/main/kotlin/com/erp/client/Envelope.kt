package com.erp.client

import kotlinx.serialization.Serializable

@Serializable
data class ApiErrorBody(
    val code: String,
    val message: String,
    val details: kotlinx.serialization.json.JsonElement? = null,
)

@Serializable
data class Envelope(
    val data: kotlinx.serialization.json.JsonElement? = null,
    val meta: kotlinx.serialization.json.JsonObject? = null,
    val error: ApiErrorBody? = null,
    val correlationId: String? = null,
)

class ErpApiException(
    val statusCode: Int,
    val code: String,
    apiMessage: String? = null,
    val details: kotlinx.serialization.json.JsonElement? = null,
) : Exception(apiMessage ?: "HTTP $statusCode")