package com.erp.client

import com.erp.client.dto.AuditEntry
import com.erp.client.dto.AuthRequest
import com.erp.client.dto.Country
import com.erp.client.dto.LoginData
import com.erp.client.dto.MeData
import com.erp.client.dto.RegisterRequest
import com.erp.client.dto.RegisteredUser
import com.erp.client.dto.StatusData
import com.erp.client.dto.TenantContextData
import com.erp.client.dto.TenantProfile
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.serializer
import java.net.URLEncoder

class ErpClient(
    private val baseUrl: String,
    private val transport: HttpTransport,
    private val tokenStore: TokenStore,
    private val json: Json = Json { ignoreUnknownKeys = true },
) {

    fun login(email: String, password: String): AuthTokens {
        val data = request<LoginData>("POST", "$API/auth/login", body = json.encodeToString(AuthRequest(email, password)), public = true)
        val tokens = AuthTokens(data.accessToken, tokenStore.load()?.tenantId)
        tokenStore.save(tokens)
        return tokens
    }

    fun register(email: String, password: String, firstName: String, lastName: String): RegisteredUser =
        request(
            "POST",
            "$API/auth/register",
            body = json.encodeToString(RegisterRequest(email, password, firstName, lastName)),
            public = true,
        )

    fun me(): MeData = request("GET", "$API/auth/me")

    fun status(): StatusData = request("GET", "$API/status", public = true)

    fun countries(activeOnly: Boolean = true): List<Country> {
        val query = if (activeOnly) emptyMap() else mapOf("active" to "false")
        return request("GET", "$API/master-data/countries", query = query)
    }

    fun upsertCountry(code: String, name: String, isActive: Boolean = true): Country =
        request(
            "POST",
            "$API/master-data/countries",
            body = json.encodeToString(Country.Upsert(code, name, isActive)),
        )

    fun tenantContext(): TenantContextData = request("GET", "$API/tenants/context")

    fun tenantProfile(tenantId: String): TenantProfile = request("GET", "$API/tenants/$tenantId")

    fun audit(entityType: String? = null, actorId: String? = null, limit: Int = 50, offset: Int = 0): List<AuditEntry> {
        val query = buildMap {
            entityType?.let { put("entityType", it) }
            actorId?.let { put("actorId", it) }
            put("limit", limit.toString())
            put("offset", offset.toString())
        }
        return request("GET", "$API/audit", query = query)
    }

    private inline fun <reified T> request(
        method: String,
        path: String,
        body: String? = null,
        query: Map<String, String> = emptyMap(),
        public: Boolean = false,
    ): T {
        val url = absoluteUrl(path, query)
        val headers = if (public) emptyMap() else authorizedHeaders()
        val response = transport.execute(HttpRequest(method, url, headers, body))
        if (response.status !in 200..299) {
            val error = runCatching { json.decodeFromString<Envelope>(response.body).error }.getOrNull()
            throw ErpApiException(
                response.status,
                error?.code ?: "HTTP_${response.status}",
                error?.message ?: response.body.take(200),
                error?.details,
            )
        }
        val envelope = json.decodeFromString<Envelope>(response.body)
        val data = envelope.data ?: throw ErpApiException(response.status, "EMPTY_BODY", "Response contained no data")
        return json.decodeFromJsonElement(serializer<T>(), data)
    }

    private fun authorizedHeaders(): Map<String, String> {
        val tokens = tokenStore.load() ?: throw ErpApiException(401, "NO_TOKEN", "No access token stored")
        return buildMap {
            put(AUTHORIZATION, "Bearer ${tokens.accessToken}")
            tokens.tenantId?.let { put(TENANT_ID_HEADER, it) }
        }
    }

    private fun absoluteUrl(path: String, query: Map<String, String>): String {
        val suffix = if (query.isEmpty()) "" else query.entries.joinToString("&", prefix = "?") { (k, v) ->
            "${URLEncoder.encode(k, "UTF-8")}=${URLEncoder.encode(v, "UTF-8")}"
        }
        return baseUrl.trimEnd('/') + path + suffix
    }

    companion object {
        private const val API = "/api/v1"
    }
}