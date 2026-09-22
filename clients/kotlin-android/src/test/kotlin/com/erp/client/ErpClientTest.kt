package com.erp.client

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ErpClientTest {

    @Test
    fun loginPostsCredentialsAndStoresToken() {
        val client = erpClientQueued({
            listOf(HttpResponse(200, """{"data":{"accessToken":"tok-123","user":{"userId":"u1","email":"a@b.io"}},"correlationId":"c1"}"""))
        })
        val tokens = client.login("a@b.io", "Secret123!")
        assertEquals("tok-123", tokens.accessToken)
        val call = transportsOf(client).calls.single()
        assertEquals("POST", call.method)
        assertEquals("http://localhost:3000/api/v1/auth/login", call.path)
        assertTrue(call.body!!.contains("\"email\":\"a@b.io\""))
        assertTrue(call.headers.isEmpty())
    }

    @Test
    fun countriesAttachesAuthAndTenantHeaders() {
        val client = erpClientQueued(
            {
                listOf(HttpResponse(200, """{"data":[{"id":"r1","code":"US","name":"United States","isActive":true},{"id":"r2","code":"DE","name":"Germany","isActive":true}],"meta":{"count":2},"correlationId":"c2"}"""))
            },
            AuthTokens("tok-9", "tenant-9"),
        )
        val countries = client.countries()
        assertEquals(2, countries.size)
        assertEquals("US", countries.first().code)
        val call = transportsOf(client).calls.single()
        assertEquals("GET", call.method)
        assertEquals("Bearer tok-9", call.headers["Authorization"])
        assertEquals("tenant-9", call.headers["x-tenant-id"])
    }

    @Test
    fun protectedCallWithoutTokenFails() {
        val client = erpClientQueued({ emptyList() })
        val error = assertFailsWith<ErpApiException> { client.countries() }
        assertEquals(401, error.statusCode)
        assertEquals("NO_TOKEN", error.code)
    }

    @Test
    fun nonJsonErrorStillMapsToException() {
        val client = erpClientQueued(
            { listOf(HttpResponse(502, "<html>bad gateway</html>")) },
            AuthTokens("t", "tenant-7"),
        )
        val error = assertFailsWith<ErpApiException> { client.me() }
        assertEquals(502, error.statusCode)
        assertEquals("HTTP_502", error.code)
    }

    @Test
    fun inactiveCountriesAddsQueryFlag() {
        val client = erpClientQueued(
            { listOf(HttpResponse(200, """{"data":[],"meta":{"count":0},"correlationId":"c3"}""")) },
            AuthTokens("t", "tenant-7"),
        )
        client.countries(activeOnly = false)
        assertTrue(transportsOf(client).calls.single().path.endsWith("?active=false"))
    }

    @Test
    fun upsertCountryPostsEnvelopeBody() {
        val client = erpClientQueued(
            {
                listOf(HttpResponse(200, """{"data":{"id":"r1","code":"MX","name":"Mexico","isActive":true},"meta":{"action":"upsert"},"correlationId":"c4"}"""))
            },
            AuthTokens("t", "tenant-7"),
        )
        val country = client.upsertCountry("MX", "Mexico")
        assertEquals("MX", country.code)
        val call = transportsOf(client).calls.single()
        assertEquals("POST", call.method)
        assertTrue(call.body!!.contains("\"code\":\"MX\""))
    }

    @Test
    fun meParsesNullableRequester() {
        val client = erpClientQueued(
            { listOf(HttpResponse(200, """{"data":{"requesterId":null,"tenantId":"tenant-7"},"correlationId":"c5"}""")) },
            AuthTokens("t", "tenant-7"),
        )
        val me = client.me()
        assertEquals(null, me.requesterId)
        assertEquals("tenant-7", me.tenantId)
    }

    private fun transportsOf(client: ErpClient): FakeTransport {
        val field = ErpClient::class.java.getDeclaredField("transport")
        field.isAccessible = true
        return field.get(client) as FakeTransport
    }
}