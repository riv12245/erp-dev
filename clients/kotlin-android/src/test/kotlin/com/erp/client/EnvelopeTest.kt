package com.erp.client

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class EnvelopeTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun parsesSuccessEnvelope() {
        val payload = """{"data":{"status":"ok","service":"erp-api","version":"0.1.0","time":"2026-09-21T00:00:00Z"},"correlationId":"c-1"}"""
        val envelope = json.decodeFromString<Envelope>(payload)
        assertEquals("c-1", envelope.correlationId)
        assertEquals(null, envelope.error)
        assertEquals("ok", envelope.data!!.jsonObject["status"]!!.jsonPrimitive.content)
    }

    @Test
    fun parsesErrorEnvelope() {
        val payload = """{"error":{"code":"NOT_FOUND","message":"Tenant not found","details":{}},"correlationId":"c-2"}"""
        val envelope = json.decodeFromString<Envelope>(payload)
        assertEquals("NOT_FOUND", envelope.error!!.code)
        assertEquals("Tenant not found", envelope.error!!.message)
        assertNull(envelope.data)
    }

    @Test
    fun mapsErrorEnvelopeToException() {
        val client = erpClientQueued(
            { listOf(HttpResponse(404, """{"error":{"code":"NOT_FOUND","message":"Tenant not found"},"correlationId":"c-3"}""")) },
            AuthTokens("t", "tenant-7"),
        )
        val error = assertFailsWith<ErpApiException> { client.tenantProfile("nope") }
        assertEquals(404, error.statusCode)
        assertEquals("NOT_FOUND", error.code)
    }
}