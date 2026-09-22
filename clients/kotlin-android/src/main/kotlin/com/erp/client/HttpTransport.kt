package com.erp.client

data class HttpRequest(
    val method: String,
    val path: String,
    val headers: Map<String, String> = emptyMap(),
    val body: String? = null,
)

data class HttpResponse(
    val status: Int,
    val body: String,
)

interface HttpTransport {
    fun execute(request: HttpRequest): HttpResponse
}